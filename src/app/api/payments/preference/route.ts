import { NextResponse } from "next/server";
import { createCheckoutPreference } from "@/lib/payments/create-checkout-preference";

type PreferenceBody = {
  productIds?: unknown;
};

/**
 * POST /api/payments/preference
 *
 * Checkout Pro: cria order pending (preços no servidor) + Preference MP.
 * Retorna init_point para redirect. Não libera biblioteca.
 */
export async function POST(request: Request) {
  let body: PreferenceBody;

  try {
    body = (await request.json()) as PreferenceBody;
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
    const result = await createCheckoutPreference({ productIds });

    if (!result.ok) {
      const status =
        result.code === "unauthenticated"
          ? 401
          : result.code === "mp_not_configured" ||
              result.code === "order_failed" ||
              result.code === "app_url_missing" ||
              result.code === "preference_failed"
            ? 503
            : 400;

      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("[api/payments/preference]", error);
    return NextResponse.json(
      {
        ok: false,
        code: "internal_error",
        message: "Erro interno ao criar Preference.",
      },
      { status: 500 }
    );
  }
}
