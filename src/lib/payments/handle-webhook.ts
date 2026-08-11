import { Payment } from "mercadopago";
import { createAdminClient, hasSupabaseServiceRole } from "@/lib/supabase/admin";
import { getMercadoPagoServerClient } from "@/lib/mercadopago/server";
import { hasMercadoPagoAccessToken } from "@/lib/mercadopago/env";
import { sendOrderAccessEmailIfNeeded } from "@/lib/resend/send-order-access-email";
import { sendOrderClaimEmailIfNeeded } from "@/lib/resend/send-order-claim-email";
import { findUserIdByEmail } from "@/lib/orders/claim";

export type WebhookHandleResult = {
  ok: boolean;
  ignored?: boolean;
  orderId?: string;
  paymentId?: string;
  mpStatus?: string;
  libraryGranted?: boolean;
  message: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/**
 * Extrai o ID do pagamento a partir do querystring ou body do IPN/Webhook MP.
 */
export function extractMercadoPagoPaymentId(input: {
  searchParams: URLSearchParams;
  body: unknown;
}): string | null {
  const topic =
    input.searchParams.get("topic") ||
    input.searchParams.get("type") ||
    "";
  const queryId =
    input.searchParams.get("id") ||
    input.searchParams.get("data.id") ||
    "";

  const body = asRecord(input.body);
  const bodyType =
    (typeof body?.type === "string" && body.type) ||
    (typeof body?.action === "string" && body.action) ||
    "";
  const data = asRecord(body?.data);
  const bodyId =
    (typeof data?.id === "string" || typeof data?.id === "number"
      ? String(data.id)
      : null) ||
    (typeof body?.id === "string" || typeof body?.id === "number"
      ? String(body.id)
      : null);

  const looksLikePayment =
    topic.toLowerCase().includes("payment") ||
    bodyType.toLowerCase().includes("payment") ||
    Boolean(queryId) ||
    Boolean(bodyId);

  if (!looksLikePayment) {
    return null;
  }

  const id = (queryId || bodyId || "").trim();
  return id || null;
}

function amountsMatch(expected: number, received: number | undefined): boolean {
  if (received == null || !Number.isFinite(received)) return false;
  return Math.abs(Number(expected) - Number(received)) < 0.01;
}

function extractPayerEmail(payment: {
  payer?: { email?: string | null } | null;
}): string | null {
  const email = payment.payer?.email?.trim();
  return email || null;
}

/**
 * Processa notificação do Mercado Pago:
 * busca o pagamento oficial → valida pedido/valor → finaliza no banco.
 * Guest: paid sem user_id; conta existente é vinculada; library só com user.
 */
export async function handleMercadoPagoWebhook(input: {
  searchParams: URLSearchParams;
  body: unknown;
}): Promise<WebhookHandleResult> {
  if (!hasMercadoPagoAccessToken()) {
    return {
      ok: false,
      message: "MERCADOPAGO_ACCESS_TOKEN não configurado.",
    };
  }

  if (!hasSupabaseServiceRole()) {
    return {
      ok: false,
      message: "SUPABASE_SERVICE_ROLE_KEY não configurado.",
    };
  }

  const paymentId = extractMercadoPagoPaymentId(input);
  if (!paymentId) {
    return {
      ok: true,
      ignored: true,
      message: "Notificação ignorada (não é payment).",
    };
  }

  const paymentClient = new Payment(getMercadoPagoServerClient());
  const payment = await paymentClient.get({ id: paymentId });

  const orderId =
    (typeof payment.external_reference === "string" &&
      payment.external_reference.trim()) ||
    (payment.metadata &&
    typeof payment.metadata === "object" &&
    "order_id" in payment.metadata &&
    typeof (payment.metadata as { order_id?: unknown }).order_id === "string"
      ? String((payment.metadata as { order_id: string }).order_id)
      : "");

  if (!orderId) {
    return {
      ok: false,
      paymentId,
      message: "Pagamento sem external_reference (orderId).",
    };
  }

  const admin = createAdminClient();
  const { data: orderRow, error: orderError } = await admin
    .from("orders")
    .select("id, user_id, status, total, payment_id, customer_email")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !orderRow) {
    return {
      ok: false,
      paymentId,
      orderId,
      message: "Pedido não encontrado para este pagamento.",
    };
  }

  const mpStatus = payment.status ?? "pending";

  if (
    mpStatus === "approved" &&
    !amountsMatch(Number(orderRow.total), payment.transaction_amount)
  ) {
    console.error("[webhook] amount mismatch", {
      orderId,
      paymentId,
      expected: orderRow.total,
      received: payment.transaction_amount,
    });
    return {
      ok: false,
      paymentId,
      orderId,
      mpStatus,
      message: "Valor do pagamento não confere com o pedido.",
    };
  }

  const payerEmail = extractPayerEmail(payment);
  let linkUserId: string | null = null;

  if (mpStatus === "approved" && !orderRow.user_id && payerEmail) {
    linkUserId = await findUserIdByEmail(payerEmail);
  }

  const { data: finalized, error: finalizeError } = await admin.rpc(
    "finalize_order_from_mercadopago",
    {
      p_order_id: orderId,
      p_payment_id: String(payment.id ?? paymentId),
      p_mp_status: mpStatus,
      p_mp_status_detail: payment.status_detail ?? null,
      p_customer_email: payerEmail,
      p_link_user_id: linkUserId,
    }
  );

  if (finalizeError) {
    console.error("[webhook] finalize failed", finalizeError);
    return {
      ok: false,
      paymentId,
      orderId,
      mpStatus,
      message: finalizeError.message,
    };
  }

  const paid = mpStatus === "approved";
  const finalUserId =
    (finalized && typeof finalized === "object" && "user_id" in finalized
      ? (finalized as { user_id: string | null }).user_id
      : null) ??
    linkUserId ??
    orderRow.user_id;
  const libraryGranted = Boolean(paid && finalUserId);

  if (paid) {
    try {
      if (finalUserId) {
        const emailResult = await sendOrderAccessEmailIfNeeded(orderId);
        if (!emailResult.ok && !emailResult.skipped) {
          console.error("[webhook] access email failed:", emailResult.message);
        }
      } else {
        const claimResult = await sendOrderClaimEmailIfNeeded(orderId);
        if (!claimResult.ok && !claimResult.skipped) {
          console.error("[webhook] claim email failed:", claimResult.message);
        }
      }
    } catch (emailError) {
      console.error("[webhook] post-paid email unexpected error:", emailError);
    }
  }

  return {
    ok: true,
    paymentId: String(payment.id ?? paymentId),
    orderId,
    mpStatus,
    libraryGranted,
    message: paid
      ? libraryGranted
        ? "Pagamento aprovado — pedido pago e biblioteca liberada."
        : "Pagamento aprovado — pedido pago; aguardando criação de acesso."
      : `Pagamento ${mpStatus} — biblioteca não liberada.`,
  };
}
