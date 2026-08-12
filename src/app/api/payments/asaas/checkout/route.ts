import { NextResponse } from "next/server";
import { createAsaasCheckout } from "@/lib/payments/create-asaas-checkout";

type Body = {
  productIds?: unknown;
};

/**
 * POST /api/payments/asaas/checkout
 *
 * Cria order pending + Asaas Checkout (Pix + cartão) e retorna URL de redirect.
 */
export async function POST(request: Request) {
  let body: Body;

  try {
    body = (await request.json()) as Body;
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
    const result = await createAsaasCheckout({ productIds });

    if (!result.ok) {
      const status =
        result.code === "unauthenticated"
          ? 401
          : result.code === "asaas_not_configured" ||
              result.code === "order_failed" ||
              result.code === "app_url_missing" ||
              result.code === "checkout_failed" ||
              result.code === "service_role_missing"
            ? 503
            : 400;

      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("[api/payments/asaas/checkout]", error);
    return NextResponse.json(
      {
        ok: false,
        code: "internal_error",
        message: "Erro interno ao criar checkout Asaas.",
      },
      { status: 500 }
    );
  }
}
