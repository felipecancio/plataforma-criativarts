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
import { buildOrderAccessEmailContent } from "@/lib/resend/templates/order-access";

export type SendOrderAccessEmailResult = {
  ok: boolean;
  skipped?: boolean;
  sent?: boolean;
  message: string;
  resendId?: string;
};

/**
 * Envia e-mail de acesso após compra aprovada + biblioteca liberada.
 * Idempotente via claim em orders.metadata (RPC service_role).
 * Nunca lança — falhas só logam e retornam ok:false.
 */
export async function sendOrderAccessEmailIfNeeded(
  orderId: string
): Promise<SendOrderAccessEmailResult> {
  try {
    if (!orderId?.trim()) {
      return { ok: false, message: "orderId inválido." };
    }

    if (!isResendConfigured()) {
      console.warn(
        "[resend] RESEND_API_KEY / RESEND_FROM não configurados — e-mail não enviado."
      );
      return {
        ok: false,
        skipped: true,
        message: "Resend não configurado.",
      };
    }

    if (!hasSupabaseServiceRole()) {
      console.warn(
        "[resend] SUPABASE_SERVICE_ROLE_KEY ausente — e-mail não enviado."
      );
      return {
        ok: false,
        skipped: true,
        message: "Service role não configurado.",
      };
    }

    const baseUrl = getResendAppBaseUrl();
    if (!baseUrl) {
      console.warn("[resend] APP_URL ausente — e-mail não enviado.");
      return {
        ok: false,
        skipped: true,
        message: "APP_URL não configurado.",
      };
    }

    const admin = createAdminClient();

    const { data: claimed, error: claimError } = await admin.rpc(
      "claim_order_access_email",
      { p_order_id: orderId }
    );

    if (claimError) {
      console.error("[resend] claim failed (apply migration 013?):", claimError);
      return {
        ok: false,
        message: claimError.message,
      };
    }

    if (!claimed) {
      return {
        ok: true,
        skipped: true,
        message: "E-mail já enviado ou claim em andamento.",
      };
    }

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select(
        "id, user_id, status, customer_email, order_items ( product_name )"
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      await releaseClaim(admin, orderId, "Pedido não encontrado após claim.");
      return {
        ok: false,
        message: "Pedido não encontrado.",
      };
    }

    if (order.status !== "paid") {
      await releaseClaim(admin, orderId, `Pedido status=${order.status}`);
      return {
        ok: false,
        message: "Pedido não está pago.",
      };
    }

    const { data: profile } = order.user_id
      ? await admin
          .from("profiles")
          .select("name")
          .eq("id", order.user_id)
          .maybeSingle()
      : { data: null };

    let customerEmail = order.customer_email?.trim() || "";
    if (!customerEmail && order.user_id) {
      const { data: authData, error: authError } =
        await admin.auth.admin.getUserById(order.user_id);
      if (authError) {
        console.error("[resend] getUserById failed:", authError.message);
      }
      customerEmail = authData?.user?.email?.trim() || "";
    }

    if (!customerEmail) {
      await releaseClaim(admin, orderId, "E-mail do cliente ausente.");
      console.error("[resend] customer email missing", { orderId });
      return {
        ok: false,
        message: "E-mail do cliente ausente.",
      };
    }

    // Pedido guest pago sem user: não envia e-mail de biblioteca aqui.
    if (!order.user_id) {
      await releaseClaim(admin, orderId, "guest order — use claim email");
      return {
        ok: true,
        skipped: true,
        message: "Pedido guest — e-mail de claim é enviado à parte.",
      };
    }

    const items = Array.isArray(order.order_items) ? order.order_items : [];
    const productNames = items
      .map((item) =>
        item && typeof item === "object" && "product_name" in item
          ? String(item.product_name ?? "").trim()
          : ""
      )
      .filter(Boolean);

    if (productNames.length === 0) {
      await releaseClaim(admin, orderId, "Pedido sem produtos.");
      console.error("[resend] order has no products", { orderId });
      return {
        ok: false,
        message: "Pedido sem produtos.",
      };
    }

    const customerName =
      profile?.name?.trim() ||
      customerEmail.split("@")[0] ||
      "Cliente";

    const libraryUrl = `${baseUrl}/biblioteca`;
    const content = buildOrderAccessEmailContent({
      customerName,
      productNames,
      libraryUrl,
      orderIdShort: order.id.slice(0, 8),
    });

    const resend = getResendClient();
    const { data, error: sendError } = await resend.emails.send({
      from: getResendFrom(),
      to: customerEmail,
      subject: content.subject,
      html: content.html,
      text: content.text,
      headers: {
        "Idempotency-Key": order.id,
      },
    });

    if (sendError) {
      const errMsg = sendError.message || "Falha no Resend.";
      console.error("[resend] send failed", { orderId, error: sendError });
      await releaseClaim(admin, orderId, errMsg);
      return {
        ok: false,
        message: errMsg,
      };
    }

    const resendId = data?.id ?? null;
    const { error: markError } = await admin.rpc(
      "mark_order_access_email_sent",
      {
        p_order_id: orderId,
        p_resend_id: resendId,
      }
    );

    if (markError) {
      // E-mail já saiu — loga, mas não libera claim (evita reenvio).
      console.error(
        "[resend] mark sent failed (email may already be delivered):",
        markError.message
      );
    }

    console.info("[resend] access email sent", { orderId, resendId });

    return {
      ok: true,
      sent: true,
      resendId: resendId ?? undefined,
      message: "E-mail de acesso enviado.",
    };
  } catch (error) {
    console.error("[resend] unexpected error", error);
    try {
      if (hasSupabaseServiceRole() && orderId?.trim()) {
        const admin = createAdminClient();
        await releaseClaim(
          admin,
          orderId,
          error instanceof Error ? error.message : "unexpected error"
        );
      }
    } catch {
      // ignore release failure
    }
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Erro inesperado ao enviar e-mail.",
    };
  }
}

async function releaseClaim(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string,
  errorMessage: string
) {
  const { error } = await admin.rpc("release_order_access_email_claim", {
    p_order_id: orderId,
    p_error: errorMessage.slice(0, 500),
  });
  if (error) {
    console.error("[resend] release claim failed:", error.message);
  }
}
