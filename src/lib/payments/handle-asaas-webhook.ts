import { asaasFetch } from "@/lib/asaas/client";
import {
  getAsaasWebhookToken,
  hasAsaasApiKey,
  hasAsaasWebhookToken,
} from "@/lib/asaas/env";
import { findUserIdByEmail } from "@/lib/orders/claim";
import { sendCheckoutExpiredEmailIfNeeded } from "@/lib/resend/send-checkout-expired-email";
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
  checkoutSession?: string | null;
  billingType?: string | null;
  paymentDate?: string | null;
  clientPaymentDate?: string | null;
};

type AsaasCheckout = {
  id?: string;
  status?: string;
  externalReference?: string | null;
  customer?: string | null;
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

const CHECKOUT_ABANDONED_EVENTS = new Set([
  "CHECKOUT_EXPIRED",
  "CHECKOUT_CANCELED",
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

async function fetchPaymentsByExternalReference(
  externalReference: string
): Promise<AsaasPayment[]> {
  const result = await asaasFetch<{ data?: AsaasPayment[] }>(
    `/payments?externalReference=${encodeURIComponent(externalReference)}&limit=20`
  );
  if (!result.ok) {
    console.error(
      "[asaas webhook] list payments by externalReference failed",
      result.error
    );
    return [];
  }
  return Array.isArray(result.data.data) ? result.data.data : [];
}

/**
 * Cobranças geradas por um Checkout Session.
 * Importante: no Asaas, o payment muitas vezes NÃO herda externalReference do checkout.
 */
async function fetchPaymentsByCheckoutSession(
  checkoutSessionId: string
): Promise<AsaasPayment[]> {
  const result = await asaasFetch<{ data?: AsaasPayment[] }>(
    `/payments?checkoutSession=${encodeURIComponent(checkoutSessionId)}&limit=20`
  );
  if (!result.ok) {
    console.error(
      "[asaas webhook] list payments by checkoutSession failed",
      result.error
    );
    return [];
  }
  return Array.isArray(result.data.data) ? result.data.data : [];
}

function pickPaidPayment(payments: AsaasPayment[]): AsaasPayment | null {
  if (payments.length === 0) return null;
  return (
    payments.find((p) =>
      PAID_PAYMENT_STATUSES.has(String(p.status ?? "").toUpperCase())
    ) ?? payments[0]
  );
}

function isAsaasPaymentId(id: string): boolean {
  return id.startsWith("pay_");
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
 * Enriquece pagamento/e-mail a partir da API Asaas quando o webhook
 * (ex.: CHECKOUT_PAID) não traz customerData.
 */
async function resolvePaymentContext(input: {
  orderId: string;
  payment: AsaasPayment | null;
  checkout: AsaasCheckout | null;
  checkoutSessionId?: string | null;
}): Promise<{
  payment: AsaasPayment | null;
  paymentId: string;
  payerEmail: string | null;
  amount: number | undefined;
}> {
  let payment = input.payment;
  let payerEmail =
    input.checkout?.customerData?.email?.trim() || null;

  if (!payerEmail && input.checkout?.customer?.trim()) {
    payerEmail = await fetchCustomerEmail(input.checkout.customer.trim());
  }

  const checkoutSessionId =
    input.checkoutSessionId?.trim() ||
    input.checkout?.id?.trim() ||
    (payment?.checkoutSession ? String(payment.checkoutSession).trim() : "") ||
    (payment?.id && !isAsaasPaymentId(String(payment.id))
      ? String(payment.id).trim()
      : "");

  // Se o "payment.id" do webhook for o UUID do checkout, não chamar /payments/{uuid}.
  if (payment?.id && isAsaasPaymentId(String(payment.id))) {
    if (payment.value == null || !payment.customer) {
      payment = (await fetchPayment(String(payment.id))) ?? payment;
    }
  } else if (payment?.id && !isAsaasPaymentId(String(payment.id))) {
    payment = null;
  }

  if (!payment?.id || payment.value == null || !payment.customer) {
    const listed = await fetchPaymentsByExternalReference(input.orderId);
    const preferred = pickPaidPayment(listed);
    if (preferred) payment = preferred;
  }

  if (
    (!payment?.id || payment.value == null || !payment.customer) &&
    checkoutSessionId
  ) {
    const listed = await fetchPaymentsByCheckoutSession(checkoutSessionId);
    const preferred = pickPaidPayment(listed);
    if (preferred) payment = preferred;
  }

  if (!payerEmail && payment?.customer) {
    payerEmail = await fetchCustomerEmail(String(payment.customer));
  }

  let amount: number | undefined =
    typeof payment?.value === "number" ? payment.value : undefined;
  if (amount == null && input.checkout?.items?.length) {
    amount = input.checkout.items.reduce((sum, item) => {
      const value = Number(item.value ?? 0);
      const qty = Number(item.quantity ?? 1);
      return sum + value * qty;
    }, 0);
  }

  const paymentId =
    (typeof payment?.id === "string" &&
      isAsaasPaymentId(payment.id.trim()) &&
      payment.id.trim()) ||
    (checkoutSessionId ? `checkout_${checkoutSessionId}` : "") ||
    `asaas_${input.orderId}`;

  return { payment, paymentId, payerEmail, amount };
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

  const paymentRaw = asRecord(body?.payment) as AsaasPayment | null;
  const checkoutRaw = asRecord(body?.checkout) as AsaasCheckout | null;

  const orderIdCandidate =
    (typeof paymentRaw?.externalReference === "string" &&
      paymentRaw.externalReference.trim()) ||
    (typeof checkoutRaw?.externalReference === "string" &&
      checkoutRaw.externalReference.trim()) ||
    "";

  const checkoutId =
    typeof checkoutRaw?.id === "string" ? checkoutRaw.id.trim() : "";
  const paymentIdHint =
    typeof paymentRaw?.id === "string" ? paymentRaw.id.trim() : "";

  if (!orderIdCandidate && !checkoutId && !paymentIdHint) {
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
    orderQuery = orderQuery.eq("payment_id", paymentIdHint);
  }

  const { data: orderRow, error: orderError } = await orderQuery.maybeSingle();

  if (orderError || !orderRow) {
    return {
      ok: false,
      event,
      paymentId: paymentIdHint || undefined,
      message: "Pedido não encontrado para o webhook Asaas.",
    };
  }

  if (CHECKOUT_ABANDONED_EVENTS.has(event)) {
    const hintEmail =
      checkoutRaw?.customerData?.email?.trim() ||
      orderRow.customer_email?.trim() ||
      null;
    const hintName = checkoutRaw?.customerData?.name?.trim() || null;

    try {
      const emailResult = await sendCheckoutExpiredEmailIfNeeded(orderRow.id, {
        customerEmailHint: hintEmail,
        customerNameHint: hintName,
      });
      if (!emailResult.ok && !emailResult.skipped) {
        console.error(
          "[asaas webhook] checkout expired email failed:",
          emailResult.message
        );
      }
    } catch (emailError) {
      console.error(
        "[asaas webhook] checkout expired email unexpected:",
        emailError
      );
    }

    return {
      ok: true,
      event,
      orderId: orderRow.id,
      message: `Checkout Asaas ${event === "CHECKOUT_EXPIRED" ? "expirado" : "cancelado"} — e-mail de recuperação processado.`,
    };
  }

  if (!PAID_EVENTS.has(event)) {
    return {
      ok: true,
      ignored: true,
      event,
      orderId: orderRow.id,
      message: `Evento ${event} ignorado (não confirma pagamento).`,
    };
  }

  const resolved = await resolvePaymentContext({
    orderId: orderRow.id,
    payment: paymentRaw,
    checkout: checkoutRaw,
    checkoutSessionId: checkoutId || orderRow.preference_id,
  });

  const payment = resolved.payment;
  const paymentId = resolved.paymentId;

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
      paymentId,
      message: `Pagamento ainda não confirmado (status=${payment?.status ?? "n/a"}).`,
    };
  }

  const amount = resolved.amount;
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
      paymentId,
      message: "Valor do pagamento não confere com o pedido.",
    };
  }

  const payerEmail =
    resolved.payerEmail || orderRow.customer_email?.trim() || null;

  let linkUserId: string | null = null;
  if (!orderRow.user_id && payerEmail) {
    linkUserId = await findUserIdByEmail(payerEmail);
  }

  const { data: finalized, error: finalizeError } = await admin.rpc(
    "finalize_order_from_mercadopago",
    {
      p_order_id: orderRow.id,
      p_payment_id: paymentId,
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
      paymentId,
      message: finalizeError.message,
    };
  }

  // Garante payment_provider = asaas (finalize não sobrescreve provider se já setado).
  await admin
    .from("orders")
    .update({
      payment_provider: "asaas",
      preference_id: checkoutId || orderRow.preference_id,
      ...(payerEmail ? { customer_email: payerEmail } : {}),
    })
    .eq("id", orderRow.id);

  const finalUserId =
    (finalized && typeof finalized === "object" && "user_id" in finalized
      ? (finalized as { user_id: string | null }).user_id
      : null) ??
    linkUserId ??
    orderRow.user_id;

  // Reforço idempotente: se já há user, garante library mesmo se finalize antigo falhar parcialmente.
  if (finalUserId) {
    const { error: grantError } = await admin.rpc(
      "grant_library_from_paid_order",
      { p_order_id: orderRow.id }
    );
    if (grantError) {
      console.error("[asaas webhook] grant_library failed:", grantError.message);
    }
  }

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

  // Purchase Meta CAPI (servidor) — cobre Pix sem retorno ao /checkout/sucesso.
  // Não bloqueia o webhook se a Meta falhar.
  try {
    const { sendMetaCapiPurchaseIfNeeded } = await import(
      "@/lib/analytics/send-meta-capi-purchase"
    );
    const capiResult = await sendMetaCapiPurchaseIfNeeded(orderRow.id, {
      customerEmailHint: payerEmail,
    });
    if (!capiResult.ok && !capiResult.skipped) {
      console.error("[asaas webhook] meta CAPI failed:", capiResult.message);
    }
  } catch (capiError) {
    console.error("[asaas webhook] meta CAPI unexpected:", capiError);
  }

  return {
    ok: true,
    event,
    orderId: orderRow.id,
    paymentId,
    libraryGranted,
    message: libraryGranted
      ? "Pagamento Asaas confirmado — pedido pago e biblioteca liberada."
      : "Pagamento Asaas confirmado — pedido pago; aguardando criação de acesso.",
  };
}
