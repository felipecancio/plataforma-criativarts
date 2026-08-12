import { NextResponse } from "next/server";
import { handleAsaasWebhook } from "@/lib/payments/handle-asaas-webhook";

/**
 * POST /api/payments/asaas/webhook
 *
 * Webhooks Asaas (Cobranças + Checkout).
 * Configure: https://criativarts.com/api/payments/asaas/webhook
 * Header validado: asaas-access-token = ASAAS_WEBHOOK_TOKEN
 */

export async function POST(request: Request) {
  let body: unknown = null;

  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  try {
    const result = await handleAsaasWebhook({
      headers: request.headers,
      body,
    });

    const status =
      !result.ok && result.message.toLowerCase().includes("token")
        ? 401
        : !result.ok && result.message.includes("não configurado")
          ? 503
          : 200;

    return NextResponse.json(result, { status });
  } catch (error) {
    console.error("[api/payments/asaas/webhook]", error);
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro ao processar webhook Asaas.",
      },
      { status: 500 }
    );
  }
}
