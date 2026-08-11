import { NextResponse } from "next/server";
import {
  createAdminClient,
  hasSupabaseServiceRole,
} from "@/lib/supabase/admin";
import { findUserIdByEmail } from "@/lib/orders/claim";
import { sendOrderClaimEmailIfNeeded } from "@/lib/resend/send-order-claim-email";
import { sendOrderAccessEmailIfNeeded } from "@/lib/resend/send-order-access-email";

type RecoverBody = {
  email?: unknown;
};

/**
 * POST /api/access/recover
 *
 * "Já fiz uma compra" — reenvia link de criar acesso ou orienta login.
 * Não libera compra só porque alguém digitou um e-mail.
 */
export async function POST(request: Request) {
  if (!hasSupabaseServiceRole()) {
    return NextResponse.json(
      {
        ok: false,
        code: "misconfigured",
        message: "Serviço indisponível.",
      },
      { status: 503 }
    );
  }

  let body: RecoverBody;
  try {
    body = (await request.json()) as RecoverBody;
  } catch {
    return NextResponse.json(
      { ok: false, code: "invalid_body", message: "JSON inválido." },
      { status: 400 }
    );
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_email",
        message: "Informe o e-mail usado no pagamento.",
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const existingUserId = await findUserIdByEmail(email);

  const { data: orders } = await admin
    .from("orders")
    .select("id, status, user_id, customer_email, metadata")
    .eq("status", "paid")
    .ilike("customer_email", email)
    .order("paid_at", { ascending: false })
    .limit(10);

  const paidOrders = orders ?? [];

  if (existingUserId) {
    for (const order of paidOrders) {
      if (order.user_id) continue;
      const { error } = await admin
        .from("orders")
        .update({ user_id: existingUserId })
        .eq("id", order.id)
        .eq("status", "paid")
        .is("user_id", null)
        .ilike("customer_email", email);

      if (!error) {
        await admin.rpc("grant_library_from_paid_order", {
          p_order_id: order.id,
        });
        try {
          await sendOrderAccessEmailIfNeeded(order.id);
        } catch {
          // ignore
        }
      }
    }

    return NextResponse.json({
      ok: true,
      code: "login_required",
      message:
        "Encontramos uma conta com este e-mail. Faça login para acessar sua biblioteca.",
    });
  }

  const guestPaid = paidOrders.find((o) => !o.user_id);
  if (guestPaid) {
    await admin.rpc("release_order_access_email_claim", {
      p_order_id: guestPaid.id,
      p_error: "recover_resend",
    });

    const meta = {
      ...((guestPaid.metadata as Record<string, unknown>) ?? {}),
    };
    delete meta.access_email_sent_at;
    delete meta.access_email_id;
    delete meta.access_email_claimed_at;
    await admin
      .from("orders")
      .update({ metadata: meta as import("@/types/database").Json })
      .eq("id", guestPaid.id);

    const result = await sendOrderClaimEmailIfNeeded(guestPaid.id);
    if (!result.ok && !result.skipped) {
      return NextResponse.json(
        {
          ok: false,
          code: "email_failed",
          message: "Não foi possível reenviar o e-mail. Tente mais tarde.",
        },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    code: "check_email",
    message:
      "Se houver uma compra paga com este e-mail, enviamos instruções de acesso.",
  });
}
