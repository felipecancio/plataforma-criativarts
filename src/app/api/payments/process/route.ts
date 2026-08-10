import { NextResponse } from "next/server";
import { processPayment } from "@/lib/payments/process-payment";

type ProcessPaymentBody = {
  orderId?: unknown;
  formData?: unknown;
  selectedPaymentMethod?: unknown;
  idempotencyKey?: unknown;
  meliSessionId?: unknown;
};

/**
 * POST /api/payments/process
 *
 * Recebe formData do Payment Brick + orderId da sessão /api/payments/create.
 * Cobra com o SDK oficial usando exclusivamente o total do pedido no servidor.
 * Em approved: marca paid e libera biblioteca (também reforçado pelo webhook).
 */
export async function POST(request: Request) {
  let body: ProcessPaymentBody;

  try {
    body = (await request.json()) as ProcessPaymentBody;
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

  if (typeof body.orderId !== "string" || !body.orderId.trim()) {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_body",
        message: "Informe o orderId do pedido.",
      },
      { status: 400 }
    );
  }

  if (!body.formData || typeof body.formData !== "object" || Array.isArray(body.formData)) {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_body",
        message: "Envie o formData retornado pelo Payment Brick.",
      },
      { status: 400 }
    );
  }

  try {
    const result = await processPayment({
      orderId: body.orderId,
      formData: body.formData as Record<string, unknown>,
      selectedPaymentMethod:
        typeof body.selectedPaymentMethod === "string"
          ? body.selectedPaymentMethod
          : null,
      idempotencyKey:
        typeof body.idempotencyKey === "string" ? body.idempotencyKey : null,
      meliSessionId:
        typeof body.meliSessionId === "string" ? body.meliSessionId : null,
    });

    if (!result.ok) {
      const status =
        result.code === "unauthenticated"
          ? 401
          : result.code === "order_not_found"
            ? 404
            : result.code === "mp_not_configured"
              ? 503
              : result.code === "mp_error"
                ? 502
                : 400;

      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[api/payments/process]", error);
    return NextResponse.json(
      {
        ok: false,
        code: "internal_error",
        message: "Erro interno ao processar o pagamento.",
      },
      { status: 500 }
    );
  }
}
