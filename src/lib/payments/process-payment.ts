import { randomUUID } from "crypto";
import { Payment } from "mercadopago";
import type { PaymentCreateRequest } from "mercadopago/dist/clients/payment/create/types";
import type { PaymentResponse } from "mercadopago/dist/clients/payment/commonTypes";
import { getOrderById } from "@/lib/orders/queries";
import { getMercadoPagoServerClient } from "@/lib/mercadopago/server";
import {
  hasMercadoPagoAccessToken,
  getMercadoPagoNotificationUrl,
} from "@/lib/mercadopago/env";
import { createClient } from "@/lib/supabase/server";
import { sendOrderAccessEmailIfNeeded } from "@/lib/resend/send-order-access-email";
import type { Order } from "@/types/order";

export type ProcessPaymentInput = {
  orderId: string;
  formData: Record<string, unknown>;
  selectedPaymentMethod?: string | null;
  idempotencyKey?: string | null;
  /** Device ID → X-Meli-Session-Id (opcional; ausência não bloqueia) */
  meliSessionId?: string | null;
};

export type PaymentUiStatus =
  | "approved"
  | "rejected"
  | "pending"
  | "in_process";

export type ProcessPaymentSuccess = {
  ok: true;
  orderId: string;
  paymentId: string;
  status: PaymentUiStatus;
  statusDetail: string | null;
  amount: number;
  paymentMethodId: string | null;
  /** Dados úteis para PIX / boleto (quando houver) */
  ticketUrl: string | null;
  qrCode: string | null;
  qrCodeBase64: string | null;
};

export type ProcessPaymentFailure = {
  ok: false;
  code:
    | "unauthenticated"
    | "invalid_body"
    | "order_not_found"
    | "order_not_payable"
    | "mp_not_configured"
    | "mp_error"
    | "invalid_amount";
  message: string;
};

export type ProcessPaymentResult = ProcessPaymentSuccess | ProcessPaymentFailure;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function mapMpStatus(status: string | undefined): PaymentUiStatus {
  if (status === "approved") return "approved";
  if (status === "rejected" || status === "cancelled") return "rejected";
  if (status === "in_process") return "in_process";
  return "pending";
}

/**
 * Normaliza Device ID / meliSessionId do client.
 * Ausência ou formato inválido → null (pagamento segue sem o header).
 */
function normalizeMeliSessionId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Limite defensivo — não usar como fonte de confiança de negócio.
  if (trimmed.length < 8 || trimmed.length > 256) return null;
  if (!/^[a-zA-Z0-9._:-]+$/.test(trimmed)) return null;
  return trimmed;
}

function buildPaymentBody(
  formData: Record<string, unknown>,
  order: Order,
  payerEmail: string
): PaymentCreateRequest {
  const payerBrick = asRecord(formData.payer) ?? {};
  const identification = asRecord(payerBrick.identification);
  const email =
    (typeof payerBrick.email === "string" && payerBrick.email.trim()) ||
    payerEmail;

  const body: PaymentCreateRequest = {
    // Sempre o total oficial do pedido — nunca confiar no client.
    transaction_amount: Number(order.total.toFixed(2)),
    description: `Criativarts — pedido ${order.id.slice(0, 8)}`,
    external_reference: order.id,
    payment_method_id:
      typeof formData.payment_method_id === "string"
        ? formData.payment_method_id
        : undefined,
    payer: {
      email,
      ...(typeof payerBrick.first_name === "string"
        ? { first_name: payerBrick.first_name }
        : {}),
      ...(typeof payerBrick.last_name === "string"
        ? { last_name: payerBrick.last_name }
        : {}),
      ...(identification
        ? {
            identification: {
              type:
                typeof identification.type === "string"
                  ? identification.type
                  : undefined,
              number:
                typeof identification.number === "string"
                  ? identification.number
                  : undefined,
            },
          }
        : {}),
    },
    metadata: {
      order_id: order.id,
      source: "payment_brick",
    },
  };

  const notificationUrl = getMercadoPagoNotificationUrl();
  if (notificationUrl) {
    body.notification_url = notificationUrl;
  }

  if (typeof formData.token === "string" && formData.token) {
    body.token = formData.token;
  }

  if (formData.installments != null && formData.installments !== "") {
    const installments = Number(formData.installments);
    if (Number.isFinite(installments) && installments > 0) {
      body.installments = installments;
    }
  }

  if (formData.issuer_id != null && formData.issuer_id !== "") {
    const issuerId = Number(formData.issuer_id);
    if (Number.isFinite(issuerId)) {
      body.issuer_id = issuerId;
    }
  }

  const transactionDetails = asRecord(formData.transaction_details);
  if (transactionDetails) {
    body.transaction_details = transactionDetails as PaymentCreateRequest["transaction_details"];
  }

  const additionalInfo = asRecord(formData.additional_info);
  if (additionalInfo) {
    body.additional_info = additionalInfo as PaymentCreateRequest["additional_info"];
  }

  return body;
}

function extractTicketData(payment: PaymentResponse) {
  const tx = payment.point_of_interaction?.transaction_data;
  const details = payment.transaction_details;

  return {
    ticketUrl:
      tx?.ticket_url ??
      details?.external_resource_url ??
      null,
    qrCode: tx?.qr_code ?? null,
    qrCodeBase64: tx?.qr_code_base64 ?? null,
  };
}

/**
 * Persiste payment_id / status e libera biblioteca quando approved.
 */
async function recordPaymentOnOrder(
  orderId: string,
  payment: PaymentResponse,
  productIds: string[]
): Promise<void> {
  const supabase = await createClient();
  const paymentId = payment.id != null ? String(payment.id) : null;
  if (!paymentId) return;

  const { error } = await supabase.rpc("record_order_payment", {
    p_order_id: orderId,
    p_payment_id: paymentId,
    p_mp_status: payment.status ?? "pending",
    p_mp_status_detail: payment.status_detail ?? null,
  });

  if (error) {
    console.error(
      "[payments] record_order_payment failed (apply migrations 004–008?):",
      error.message
    );
  }

  if (payment.status !== "approved") return;

  // Liberação explícita com product_ids (cobre pedido sem order_items).
  const { data: granted, error: grantError } = await supabase.rpc(
    "grant_library_for_order",
    {
      p_order_id: orderId,
      p_product_ids: productIds.length > 0 ? productIds : null,
    }
  );

  if (grantError) {
    console.error(
      "[payments] grant_library_for_order failed (apply migration 008?):",
      grantError.message
    );

    const { error: syncError } = await supabase.rpc(
      "sync_my_paid_orders_library"
    );
    if (syncError) {
      console.error(
        "[payments] sync_my_paid_orders_library failed:",
        syncError.message
      );
    }
    return;
  }

  console.info("[payments] library granted rows:", granted);

  // E-mail pós-compra: nunca interrompe o fluxo de pagamento.
  try {
    const emailResult = await sendOrderAccessEmailIfNeeded(orderId);
    if (!emailResult.ok && !emailResult.skipped) {
      console.error("[payments] access email failed:", emailResult.message);
    }
  } catch (emailError) {
    console.error("[payments] access email unexpected error:", emailError);
  }

  try {
    const { sendMetaCapiPurchaseIfNeeded } = await import(
      "@/lib/analytics/send-meta-capi-purchase"
    );
    const capiResult = await sendMetaCapiPurchaseIfNeeded(orderId);
    if (!capiResult.ok && !capiResult.skipped) {
      console.error("[payments] meta CAPI failed:", capiResult.message);
    }
  } catch (capiError) {
    console.error("[payments] meta CAPI unexpected:", capiError);
  }
}

/**
 * Processa o formData do Payment Brick com o SDK oficial.
 * Valor cobrado = total do pedido pending no banco.
 */
export async function processPayment(
  input: ProcessPaymentInput
): Promise<ProcessPaymentResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      code: "unauthenticated",
      message: "Faça login para concluir o pagamento.",
    };
  }

  const orderId = input.orderId?.trim();
  if (!orderId || !input.formData || typeof input.formData !== "object") {
    return {
      ok: false,
      code: "invalid_body",
      message: "Dados de pagamento inválidos.",
    };
  }

  if (!hasMercadoPagoAccessToken()) {
    return {
      ok: false,
      code: "mp_not_configured",
      message: "Credenciais do Mercado Pago não configuradas no servidor.",
    };
  }

  const order = await getOrderById(orderId);
  if (!order) {
    return {
      ok: false,
      code: "order_not_found",
      message: "Pedido não encontrado.",
    };
  }

  if (order.status === "paid") {
    return {
      ok: false,
      code: "order_not_payable",
      message: "Este pedido já foi pago.",
    };
  }

  if (order.status !== "pending") {
    return {
      ok: false,
      code: "order_not_payable",
      message: "Este pedido não está disponível para pagamento.",
    };
  }

  const amount = Number(order.total.toFixed(2));
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      ok: false,
      code: "invalid_amount",
      message: "Valor do pedido inválido.",
    };
  }

  const payerEmail = user.email ?? order.customerEmail ?? "";
  if (!payerEmail) {
    return {
      ok: false,
      code: "invalid_body",
      message: "E-mail do pagador é obrigatório.",
    };
  }

  const body = buildPaymentBody(input.formData, order, payerEmail);

  if (!body.payment_method_id) {
    return {
      ok: false,
      code: "invalid_body",
      message: "Método de pagamento não informado.",
    };
  }

  const productIdsFromItems = order.items.map((item) => item.productId);
  const productIdsFromMeta = Array.isArray(order.metadata.product_ids)
    ? order.metadata.product_ids.filter(
        (id): id is string => typeof id === "string" && id.length > 0
      )
    : [];
  const productIds = [
    ...new Set(
      productIdsFromItems.length > 0 ? productIdsFromItems : productIdsFromMeta
    ),
  ];

  const idempotencyKey =
    (typeof input.idempotencyKey === "string" && input.idempotencyKey.trim()) ||
    randomUUID();

  const meliSessionId = normalizeMeliSessionId(input.meliSessionId);
  if (!meliSessionId) {
    console.warn("[payments] meliSessionId present: false");
  }

  try {
    const client = getMercadoPagoServerClient();
    const paymentClient = new Payment(client);
    const payment = await paymentClient.create({
      body,
      requestOptions: {
        idempotencyKey,
        ...(meliSessionId ? { meliSessionId } : {}),
      },
    });

    await recordPaymentOnOrder(order.id, payment, productIds);

    const ticket = extractTicketData(payment);
    const status = mapMpStatus(payment.status);

    return {
      ok: true,
      orderId: order.id,
      paymentId: payment.id != null ? String(payment.id) : "",
      status,
      statusDetail: payment.status_detail ?? null,
      amount,
      paymentMethodId: payment.payment_method_id ?? body.payment_method_id ?? null,
      ticketUrl: ticket.ticketUrl,
      qrCode: ticket.qrCode,
      qrCodeBase64: ticket.qrCodeBase64,
    };
  } catch (error) {
    console.error("[payments] Mercado Pago create failed", error);

    let message = "Não foi possível processar o pagamento no Mercado Pago.";

    if (error && typeof error === "object") {
      const err = error as {
        message?: unknown;
        cause?: Array<{ description?: string; message?: string }>;
      };
      const causeMessage = err.cause?.[0]?.description || err.cause?.[0]?.message;
      if (typeof causeMessage === "string" && causeMessage.trim()) {
        message = causeMessage;
      } else if (typeof err.message === "string" && err.message.trim()) {
        message = err.message;
      }
    }

    return {
      ok: false,
      code: "mp_error",
      message,
    };
  }
}
