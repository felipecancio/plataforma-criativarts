import { NextResponse } from "next/server";
import { prepareCheckoutOrder } from "@/lib/checkout/prepare-order";

type PrepareBody = {
  productIds?: unknown;
};

/**
 * POST /api/checkout/prepare
 * Cria pedido pending + order_items.
 * Futuro: retornar também init_point do Mercado Pago.
 */
export async function POST(request: Request) {
  let body: PrepareBody;

  try {
    body = (await request.json()) as PrepareBody;
  } catch {
    return NextResponse.json(
      { ok: false, code: "invalid_body", message: "JSON inválido." },
      { status: 400 }
    );
  }

  const productIds = Array.isArray(body.productIds)
    ? body.productIds.filter((id): id is string => typeof id === "string")
    : [];

  const result = await prepareCheckoutOrder(productIds);

  if (!result.ok) {
    const status =
      result.code === "unauthenticated"
        ? 401
        : result.code === "empty_cart" || result.code === "invalid_products"
          ? 400
          : 500;

    return NextResponse.json(result, { status });
  }

  return NextResponse.json({
    ok: true,
    orderId: result.order.id,
    total: result.order.total,
    currency: result.order.currency,
    status: result.order.status,
    // Reservado para Preference do Mercado Pago
    initPoint: null as string | null,
    requiresPayment: true,
  });
}
