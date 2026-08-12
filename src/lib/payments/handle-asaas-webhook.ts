import { asaasFetch } from "@/lib/asaas/client";
import {
  getAsaasWebhookToken,
  hasAsaasApiKey,
  hasAsaasWebhookToken,
} from "@/lib/asaas/env";
import { findUserIdByEmail } from "@/lib/orders/claim";
import { sendOrderAccessEmailIfNeeded } from "@/lib/resend/send-order-access-email";
import { sendOrderClaimEmailIfNeeded } from "@/lib/resend/send-order-claim-email";
import { createAdminClient, hasSupabaseServiceRole } from "@/lib/supabase/admin";

export type AsaasWebhookHandleResult = {
  ok: boolean;
  ignored?: boolean;
  orderId?: string;
  paymentId?: string;
  event?: string;
  libraryGranted?: boolean;
  message: string;
};

type AsaasPayment = {
  id?: string;
  status?: string;
  value?: number;
  netValue?: number;
  externalReference?: string | null;
  customer?: string | null;
  billingType?: string | null;
  paymentDate?: string | null;
  clientPaymentDate?: string | null;
};

type AsaasCheckout = {
  id?: string;
  status?: string;
  externalReference?: string | null;
  customerData?: {
    email?: string | null;
    name?: string | null;
  } | null;
  items?: Array<{ value?: number; quantity?: number }>;
};

const PAID_PAYMENT_STATUSES = new Set([
  "CONFIRMED",
  "RECEIVED",
  "RECEIVED_IN_CASH",
]);

const PAID_EVENTS = new Set([
  "CHECKOUT_PAID",
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function amountsMatch(expected: number, received: number | undefined): boolean {
  if (received == null || !Number.isFinite(received)) return false;
  return Math.abs(Number(expected) - Number(received)) < 0.01;
}

async function fetchPayment(paymentId: string): Promise<AsaasPayment | null> {
  const result = await asaasFetch<AsaasPayment>(`/payments/${paymentId}`);
  if (!result.ok) {
    console.error("[asaas webhook] fetch payment failed", result.error);
    return null;
  }
  return result.data;
}

async function fetchCustomerEmail(customerId: string): Promise<string | null> {
  const result = await asaasFetch<{ email?: string | null }>(
    `/customers/${customerId}`
  );
  if (!result.ok) return null;
  const email = result.data.email?.trim();
  return email || null;
}

/**
 * Processa webhook Asaas (Checkout + Cobranças).
 * Fonte de verdade do paid; guest: user_id pode permanecer NULL.
 */
export async function handleAsaasWebhook(input: {
  headers: Headers;
  body: unknown;
}): Promise<AsaasWebhookHandleResult> {
  if (!hasAsaasApiKey()) {
    return { ok: false, message: "ASAAS_API_KEY não configurada." };
  }
  if (!hasSupabaseServiceRole()) {
    return { ok: false, message: "SUPABASE_SERVICE_ROLE_KEY não configurado." };
  }

  if (hasAsaasWebhookToken()) {
    const expected = getAsaasWebhookToken();
    const received = input.headers.get("asaas-access-token")?.trim() || "";
    if (!expected || received !== expected) {
      return { ok: false, message: "Token de webhook Asaas inválido." };
    }
  }

  const body = asRecord(input.body);
  const event = typeof body?.event === "string" ? body.event : "";

  if (!event) {
    return { ok: true, ignored: true, message: "Evento Asaas sem campo event." };
  }

  if (!PAID_EVENTS.has(event)) {
    return {
      ok: true,
      ignored: true,
      event,
      message: `Evento ${event} ignorado (não confirma pagamento).`,
    };
  }

  const paymentRaw = asRecord(body?.payment) as AsaasPayment | null;
  const checkoutRaw = asRecord(body?.checkout) as AsaasCheckout | null;

  let payment: AsaasPayment | null = paymentRaw;
  if (paymentRaw?.id && (!paymentRaw.status || paymentRaw.value == null)) {
    payment = (await fetchPayment(String(paymentRaw.id))) ?? paymentRaw;
  }

  const orderIdCandidate =
    (typeof payment?.externalReference === "string" &&
      payment.externalReference.trim()) ||
    (typeof checkoutRaw?.externalReference === "string" &&
      checkoutRaw.externalReference.trim()) ||
    "";

  const checkoutId =
    typeof checkoutRaw?.id === "string" ? checkoutRaw.id.trim() : "";
  const paymentId =
    typeof payment?.id === "string" ? payment.id.trim() : checkoutId || "";

  if (!orderIdCandidate && !checkoutId && !paymentId) {
    return {
      ok: true,
      ignored: true,
      event,
      message: "Webhook sem referência de pedido/pagamento.",
    };
  }

  const admin = createAdminClient();

  let orderQuery = admin
    .from("orders")
    .select("id, user_id, status, total, payment_id, preference_id, customer_email")
    .limit(1);

  if (orderIdCandidate) {
    orderQuery = orderQuery.eq("id", orderIdCandidate);
  } else if (checkoutId) {
    orderQuery = orderQuery.eq("preference_id", checkoutId);
  } else {
    orderQuery = orderQuery.eq("payment_id", paymentId);
  }

  const { data: orderRow, error: orderError } = await orderQuery.maybeSingle();

  if (orderError || !orderRow) {
    return {
      ok: false,
      event,
      paymentId: paymentId || undefined,
      message: "Pedido não encontrado para o webhook Asaas.",
    };
  }

  const isPaidEvent =
    event === "CHECKOUT_PAID" ||
    (payment?.status
      ? PAID_PAYMENT_STATUSES.has(String(payment.status).toUpperCase())
      : false);

  if (!isPaidEvent) {
    return {
      ok: true,
      ignored: true,
      event,
      orderId: orderRow.id,
      paymentId: paymentId || undefined,
      message: `Pagamento ainda não confirmado (status=${payment?.status ?? "n/a"}).`,
    };
  }

  let amount: number | undefined =
    typeof payment?.value === "number" ? payment.value : undefined;
  if (amount == null && checkoutRaw?.items?.length) {
    amount = checkoutRaw.items.reduce((sum, item) => {
      const value = Number(item.value ?? 0);
      const qty = Number(item.quantity ?? 1);
      return sum + value * qty;
    }, 0);
  }

  if (amount != null && !amountsMatch(Number(orderRow.total), amount)) {
    console.error("[asaas webhook] amount mismatch", {
      orderId: orderRow.id,
      expected: orderRow.total,
      received: amount,
    });
    return {
      ok: false,
      event,
      orderId: orderRow.id,
      paymentId: paymentId || undefined,
      message: "Valor do pagamento não confere com o pedido.",
    };
  }

  let payerEmail: string | null =
    checkoutRaw?.customerData?.email?.trim() ||
    orderRow.customer_email?.trim() ||
    null;

  if (!payerEmail && payment?.customer) {
    payerEmail = await fetchCustomerEmail(String(payment.customer));
  }

  let linkUserId: string | null = null;
  if (!orderRow.user_id && payerEmail) {
    linkUserId = await findUserIdByEmail(payerEmail);
  }

  const finalizePaymentId = paymentId || `asaas_checkout_${checkoutId || orderRow.id}`;

  const { data: finalized, error: finalizeError } = await admin.rpc(
    "finalize_order_from_mercadopago",
    {
      p_order_id: orderRow.id,
      p_payment_id: finalizePaymentId,
      p_mp_status: "approved",
      p_mp_status_detail: event,
      p_customer_email: payerEmail,
      p_link_user_id: linkUserId,
    }
  );

  if (finalizeError) {
    console.error("[asaas webhook] finalize failed", finalizeError);
    return {
      ok: false,
      event,
      orderId: orderRow.id,
      paymentId: finalizePaymentId,
      message: finalizeError.message,
    };
  }

  // Garante payment_provider = asaas (finalize não sobrescreve provider se já setado).
  await admin
    .from("orders")
    .update({
      payment_provider: "asaas",
      preference_id: checkoutId || orderRow.preference_id,
    })
    .eq("id", orderRow.id);

  const finalUserId =
    (finalized && typeof finalized === "object" && "user_id" in finalized
      ? (finalized as { user_id: string | null }).user_id
      : null) ??
    linkUserId ??
    orderRow.user_id;

  const libraryGranted = Boolean(finalUserId);

  try {
    if (finalUserId) {
      const emailResult = await sendOrderAccessEmailIfNeeded(orderRow.id);
      if (!emailResult.ok && !emailResult.skipped) {
        console.error("[asaas webhook] access email failed:", emailResult.message);
      }
    } else {
      const claimResult = await sendOrderClaimEmailIfNeeded(orderRow.id);
      if (!claimResult.ok && !claimResult.skipped) {
        console.error("[asaas webhook] claim email failed:", claimResult.message);
      }
    }
  } catch (emailError) {
    console.error("[asaas webhook] post-paid email unexpected:", emailError);
  }

  return {
    ok: true,
    event,
    orderId: orderRow.id,
    paymentId: finalizePaymentId,
    libraryGranted,
    message: libraryGranted
      ? "Pagamento Asaas confirmado — pedido pago e biblioteca liberada."
      : "Pagamento Asaas confirmado — pedido pago; aguardando criação de acesso.",
  };
}
