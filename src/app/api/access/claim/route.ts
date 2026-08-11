import { NextResponse } from "next/server";
import {
  createAdminClient,
  hasSupabaseServiceRole,
} from "@/lib/supabase/admin";
import { hashClaimToken } from "@/lib/orders/claim";
import { sendOrderAccessEmailIfNeeded } from "@/lib/resend/send-order-access-email";

type ClaimBody = {
  orderId?: unknown;
  token?: unknown;
  password?: unknown;
};

/**
 * POST /api/access/claim
 *
 * Cliente novo: cria conta com e-mail do pedido + senha, valida claim token,
 * vincula order.user_id e libera biblioteca.
 */
export async function POST(request: Request) {
  if (!hasSupabaseServiceRole()) {
    return NextResponse.json(
      {
        ok: false,
        code: "misconfigured",
        message: "Serviço de acesso indisponível.",
      },
      { status: 503 }
    );
  }

  let body: ClaimBody;
  try {
    body = (await request.json()) as ClaimBody;
  } catch {
    return NextResponse.json(
      { ok: false, code: "invalid_body", message: "JSON inválido." },
      { status: 400 }
    );
  }

  const orderId =
    typeof body.orderId === "string" ? body.orderId.trim() : "";
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const password =
    typeof body.password === "string" ? body.password : "";

  if (!orderId || !token) {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_body",
        message: "Informe orderId e token de acesso.",
      },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      {
        ok: false,
        code: "weak_password",
        message: "A senha deve ter pelo menos 8 caracteres.",
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id, status, user_id, customer_email, metadata")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return NextResponse.json(
      { ok: false, code: "not_found", message: "Pedido não encontrado." },
      { status: 404 }
    );
  }

  if (order.status !== "paid") {
    return NextResponse.json(
      {
        ok: false,
        code: "not_paid",
        message: "Este pedido ainda não está pago.",
      },
      { status: 400 }
    );
  }

  const email = order.customer_email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json(
      {
        ok: false,
        code: "missing_email",
        message: "Pedido sem e-mail do pagamento.",
      },
      { status: 400 }
    );
  }

  const tokenHash = hashClaimToken(token);

  // Já vinculado: se o token ainda bate, apenas autentica (idempotente).
  if (order.user_id) {
    return NextResponse.json(
      {
        ok: false,
        code: "already_claimed",
        message:
          "Este pedido já possui acesso. Faça login com o e-mail da compra.",
        email,
      },
      { status: 409 }
    );
  }

  const meta = (order.metadata ?? {}) as Record<string, unknown>;
  if (
    typeof meta.claim_token_hash !== "string" ||
    meta.claim_token_hash !== tokenHash
  ) {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_token",
        message: "Link de acesso inválido ou expirado.",
      },
      { status: 403 }
    );
  }

  if (typeof meta.claim_consumed_at === "string" && meta.claim_consumed_at) {
    return NextResponse.json(
      {
        ok: false,
        code: "token_used",
        message: "Este link já foi utilizado. Faça login.",
      },
      { status: 403 }
    );
  }

  if (typeof meta.claim_expires_at === "string") {
    const expires = Date.parse(meta.claim_expires_at);
    if (Number.isFinite(expires) && expires < Date.now()) {
      return NextResponse.json(
        {
          ok: false,
          code: "token_expired",
          message: "Link expirado. Use “Já fiz uma compra” para receber outro.",
        },
        { status: 403 }
      );
    }
  }

  // Cria usuário com e-mail do pagamento (já confirmado via MP).
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { source: "guest_order_claim" },
    });

  let userId = created?.user?.id ?? null;

  if (createError || !userId) {
    // E-mail já existe: não inventar vínculo — orientar login.
    const msg = createError?.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered")) {
      return NextResponse.json(
        {
          ok: false,
          code: "email_exists",
          message:
            "Este e-mail já possui conta. Faça login para acessar sua biblioteca.",
          email,
        },
        { status: 409 }
      );
    }
    console.error("[access/claim] createUser failed:", createError?.message);
    return NextResponse.json(
      {
        ok: false,
        code: "create_failed",
        message: "Não foi possível criar o acesso. Tente novamente.",
      },
      { status: 500 }
    );
  }

  // Garante profile (trigger pode ser assíncrono o suficiente; upsert defensivo)
  await admin.from("profiles").upsert(
    { id: userId, name: email.split("@")[0] ?? null },
    { onConflict: "id" }
  );

  const { error: claimError } = await admin.rpc("claim_paid_guest_order", {
    p_order_id: orderId,
    p_token_hash: tokenHash,
    p_user_id: userId,
  });

  if (claimError) {
    console.error("[access/claim] claim_paid_guest_order failed:", claimError);
    return NextResponse.json(
      {
        ok: false,
        code: "claim_failed",
        message:
          claimError.message ||
          "Conta criada, mas falhou ao vincular o pedido. Contate o suporte.",
      },
      { status: 500 }
    );
  }

  try {
    await sendOrderAccessEmailIfNeeded(orderId);
  } catch {
    // não bloqueia
  }

  return NextResponse.json({
    ok: true,
    email,
    message: "Acesso criado. Faça login com seu e-mail e a senha definida.",
  });
}
