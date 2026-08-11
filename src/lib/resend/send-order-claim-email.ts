import {
  createAdminClient,
  hasSupabaseServiceRole,
} from "@/lib/supabase/admin";
import { getResendClient } from "@/lib/resend/client";
import {
  getResendAppBaseUrl,
  getResendFrom,
  isResendConfigured,
} from "@/lib/resend/env";
import { issueOrderClaimToken } from "@/lib/orders/claim";

/**
 * E-mail pós-pago para guest: link "Criar meu acesso" (sem senha).
 * Idempotente via claim_order_access_email (mesmo RPC do e-mail de biblioteca).
 */
export async function sendOrderClaimEmailIfNeeded(
  orderId: string
): Promise<{ ok: boolean; skipped?: boolean; message: string }> {
  try {
    if (!isResendConfigured() || !hasSupabaseServiceRole()) {
      return { ok: false, skipped: true, message: "Resend/service role ausente." };
    }

    const baseUrl = getResendAppBaseUrl();
    if (!baseUrl) {
      return { ok: false, skipped: true, message: "APP_URL ausente." };
    }

    const admin = createAdminClient();
    const { data: claimed, error: claimError } = await admin.rpc(
      "claim_order_access_email",
      { p_order_id: orderId }
    );

    if (claimError) {
      console.error("[resend] claim email lock failed:", claimError.message);
      return { ok: false, message: claimError.message };
    }
    if (!claimed) {
      return {
        ok: true,
        skipped: true,
        message: "E-mail de acesso já enviado ou em andamento.",
      };
    }

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, status, user_id, customer_email, order_items ( product_name )")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order || order.status !== "paid") {
      await admin.rpc("release_order_access_email_claim", {
        p_order_id: orderId,
        p_error: "order not paid/found",
      });
      return { ok: false, message: "Pedido inválido para e-mail de claim." };
    }

    if (order.user_id) {
      await admin.rpc("release_order_access_email_claim", {
        p_order_id: orderId,
        p_error: "order already has user",
      });
      return {
        ok: true,
        skipped: true,
        message: "Pedido já vinculado — use e-mail de biblioteca.",
      };
    }

    const email = order.customer_email?.trim();
    if (!email) {
      await admin.rpc("release_order_access_email_claim", {
        p_order_id: orderId,
        p_error: "missing customer_email",
      });
      return { ok: false, message: "E-mail do pagamento ausente." };
    }

    const issued = await issueOrderClaimToken(orderId);
    if (!issued) {
      await admin.rpc("release_order_access_email_claim", {
        p_order_id: orderId,
        p_error: "failed to issue claim token",
      });
      return { ok: false, message: "Falha ao gerar token de claim." };
    }

    const items = Array.isArray(order.order_items) ? order.order_items : [];
    const productNames = items
      .map((item) =>
        item && typeof item === "object" && "product_name" in item
          ? String(item.product_name ?? "").trim()
          : ""
      )
      .filter(Boolean);

    const productsHtml = productNames
      .map((n) => `<li>${escapeHtml(n)}</li>`)
      .join("");

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><body style="font-family:Georgia,serif;color:#1a1a1a;background:#f6f4f1;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fffaf5;border:1px solid #e8e0d6;padding:28px;">
    <p style="margin:0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#8a7a68;">Criativarts</p>
    <h1 style="margin:12px 0 16px;font-size:24px;font-weight:normal;">Pagamento confirmado</h1>
    <p style="line-height:1.5;">Seu pagamento foi aprovado${
      productNames.length
        ? " para:"
        : "."
    }</p>
    ${productNames.length ? `<ul>${productsHtml}</ul>` : ""}
    <p style="line-height:1.5;">Agora crie seu acesso (apenas uma senha) para entrar na biblioteca e baixar seu material.</p>
    <p style="margin:24px 0;"><a href="${escapeHtml(issued.claimUrl)}"
      style="display:inline-block;background:#1a1a1a;color:#fffaf5;text-decoration:none;padding:12px 20px;">Criar meu acesso</a></p>
    <p style="font-size:13px;color:#6b635a;">E-mail da compra: ${escapeHtml(email)}<br/>
    Se o botão não funcionar: ${escapeHtml(issued.claimUrl)}</p>
  </div>
</body></html>`;

    const { data, error: sendError } = await getResendClient().emails.send({
      from: getResendFrom(),
      to: email,
      subject: "Pagamento confirmado — crie seu acesso Criativarts",
      html,
      text: [
        "Pagamento confirmado na Criativarts.",
        "",
        "Crie seu acesso para baixar o material:",
        issued.claimUrl,
        "",
        `E-mail da compra: ${email}`,
      ].join("\n"),
      headers: { "Idempotency-Key": `claim-${orderId}` },
    });

    if (sendError) {
      console.error("[resend] claim email failed:", sendError);
      await admin.rpc("release_order_access_email_claim", {
        p_order_id: orderId,
        p_error: sendError.message?.slice(0, 500) ?? "send failed",
      });
      return { ok: false, message: sendError.message };
    }

    await admin.rpc("mark_order_access_email_sent", {
      p_order_id: orderId,
      p_resend_id: data?.id ?? null,
    });

    return { ok: true, message: "E-mail de criação de acesso enviado." };
  } catch (error) {
    console.error("[resend] claim email unexpected:", error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Erro inesperado.",
    };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
