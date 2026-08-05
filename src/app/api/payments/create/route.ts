import { NextResponse } from "next/server";
import { createPaymentSession } from "@/lib/payments/create-payment-session";

type CreatePaymentBody = {
  productIds?: unknown;
};

/**
 * POST /api/payments/create
 *
 * - Autenticado
 * - Body: { productIds: string[] } (sem preços)
 * - Recalcula total no servidor via tabela products
 * - Cria order pending + order_items
 * - Retorna dados para o Payment Brick (amount / orderId)
 *
 * Não processa cobrança nem webhook nesta etapa.
 */
export async function POST(request: Request) {
  let body: CreatePaymentBody;

  try {
    body = (await request.json()) as CreatePaymentBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_body",
        message: "JSON inválido.",
      },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.productIds)) {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_body",
        message: "Envie productIds como array de strings.",
      },
      { status: 400 }
    );
  }

  const productIds = body.productIds.filter(
    (id): id is string => typeof id === "string" && id.trim().length > 0
  );

  try {
    const result = await createPaymentSession({ productIds });

    if (!result.ok) {
      const status =
        result.code === "unauthenticated"
          ? 401
          : result.code === "mp_not_configured" || result.code === "order_failed"
            ? 503
            : 400;

      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("[api/payments/create]", error);
    return NextResponse.json(
      {
        ok: false,
        code: "internal_error",
        message: "Erro interno ao iniciar o pagamento.",
      },
      { status: 500 }
    );
  }
}
