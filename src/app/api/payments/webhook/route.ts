import { NextResponse } from "next/server";
import { handleMercadoPagoWebhook } from "@/lib/payments/handle-webhook";

/**
 * POST|GET /api/payments/webhook
 *
 * Notificações do Mercado Pago (IPN / Webhooks).
 * - Busca o pagamento na API oficial
 * - Valida pedido + valor
 * - approved → paid + user_library
 * - pending / rejected → não libera
 *
 * Configure no painel MP: URL = https://SEU_DOMINIO/api/payments/webhook
 * Requer: MERCADOPAGO_ACCESS_TOKEN + SUPABASE_SERVICE_ROLE_KEY + APP_URL
 */

async function handleRequest(request: Request) {
  const url = new URL(request.url);
  let body: unknown = null;

  if (request.method === "POST") {
    try {
      const text = await request.text();
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
  }

  try {
    const result = await handleMercadoPagoWebhook({
      searchParams: url.searchParams,
      body,
    });

    // MP espera 200 para não reenviar em loop agressivo.
    // Erros de validação também retornam 200 com ok:false no body (exceto config).
    const status =
      !result.ok &&
      (result.message.includes("não configurado") ||
        result.message.includes("não confere"))
        ? result.message.includes("não configurado")
          ? 503
          : 200
        : 200;

    return NextResponse.json(result, { status });
  } catch (error) {
    console.error("[api/payments/webhook]", error);
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro ao processar webhook.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return handleRequest(request);
}

export async function GET(request: Request) {
  return handleRequest(request);
}
