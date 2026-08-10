"use client";

/**
 * Client tipado para rotas /api/payments/*
 */

export type CreatePaymentResponse =
  | {
      ok: true;
      orderId: string;
      status: string;
      currency: string;
      amount: number;
      externalReference: string;
      items: Array<{
        productId: string;
        name: string;
        slug: string;
        unitPrice: number;
        quantity: number;
      }>;
      brick: {
        amount: number;
        preferenceId: string | null;
      };
      mercadoPago: {
        configured: boolean;
      };
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

export type ProcessPaymentResponse =
  | {
      ok: true;
      orderId: string;
      paymentId: string;
      status: "approved" | "rejected" | "pending" | "in_process";
      statusDetail: string | null;
      amount: number;
      paymentMethodId: string | null;
      ticketUrl: string | null;
      qrCode: string | null;
      qrCodeBase64: string | null;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

export async function createPaymentSessionRequest(
  productIds: string[]
): Promise<CreatePaymentResponse> {
  const response = await fetch("/api/payments/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productIds }),
  });

  const payload = (await response.json()) as CreatePaymentResponse;
  return payload;
}

export async function processPaymentRequest(input: {
  orderId: string;
  formData: Record<string, unknown>;
  selectedPaymentMethod?: string | null;
  idempotencyKey?: string;
  /** Device ID / sessão MP → requestOptions.meliSessionId no Payment.create */
  meliSessionId?: string;
}): Promise<ProcessPaymentResponse> {
  const response = await fetch("/api/payments/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: input.orderId,
      formData: input.formData,
      selectedPaymentMethod: input.selectedPaymentMethod ?? null,
      idempotencyKey: input.idempotencyKey ?? crypto.randomUUID(),
      ...(input.meliSessionId ? { meliSessionId: input.meliSessionId } : {}),
    }),
  });

  const payload = (await response.json()) as ProcessPaymentResponse;
  return payload;
}
