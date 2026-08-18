import { getResendClient } from "@/lib/resend/client";
import {
  getResendAppBaseUrl,
  getResendFrom,
  isResendConfigured,
} from "@/lib/resend/env";
import { buildCheckoutExpiredEmailContent } from "@/lib/resend/templates/checkout-expired";
import {
  createAdminClient,
  hasSupabaseServiceRole,
} from "@/lib/supabase/admin";

export type SendCheckoutExpiredEmailResult = {
  ok: boolean;
  skipped?: boolean;
  sent?: boolean;
  message: string;
  resendId?: string;
};

type OrderMetadata = Record<string, unknown>;

/**
 * E-mail de checkout Asaas expirado/cancelado.
 * Idempotente via orders.metadata.checkout_expired_email_sent_at (+ Idempotency-Key Resend).
 */
export async function sendCheckoutExpiredEmailIfNeeded(
  orderId: string,
  options?: {
    customerEmailHint?: string | null;
    customerNameHint?: string | null;
  }
): Promise<SendCheckoutExpiredEmailResult> {
  try {
    if (!orderId?.trim()) {
      return { ok: false, message: "orderId inválido." };
    }

    if (!isResendConfigured()) {
      return {
        ok: false,
        skipped: true,
        message: "Resend não configurado.",
      };
    }

    if (!hasSupabaseServiceRole()) {
      return {
        ok: false,
        skipped: true,
        message: "Service role não configurado.",
      };
    }

    const baseUrl = getResendAppBaseUrl();
    if (!baseUrl) {
      return {
        ok: false,
        skipped: true,
        message: "APP_URL não configurado.",
      };
    }

    const admin = createAdminClient();
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, status, user_id, customer_email, metadata")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return { ok: false, message: "Pedido não encontrado." };
    }

    if (order.status === "paid") {
      return {
        ok: true,
        skipped: true,
        message: "Pedido já pago — e-mail de expiração não enviado.",
      };
    }

    const metadata = (order.metadata ?? {}) as OrderMetadata;
    if (typeof metadata.checkout_expired_email_sent_at === "string") {
      return {
        ok: true,
        skipped: true,
        message: "E-mail de checkout expirado já enviado.",
      };
    }

    let customerEmail =
      options?.customerEmailHint?.trim() ||
      order.customer_email?.trim() ||
      "";

    if (!customerEmail && order.user_id) {
      const { data: authData } = await admin.auth.admin.getUserById(
        order.user_id
      );
      customerEmail = authData?.user?.email?.trim() || "";
    }

    if (!customerEmail) {
      console.warn("[resend] checkout expired: no customer email", { orderId });
      return {
        ok: true,
        skipped: true,
        message: "Sem e-mail do cliente para notificar expiração.",
      };
    }

    if (!order.customer_email && customerEmail) {
      await admin
        .from("orders")
        .update({ customer_email: customerEmail })
        .eq("id", orderId);
    }

    let customerName = options?.customerNameHint?.trim() || "";
    if (!customerName && order.user_id) {
      const { data: profile } = await admin
        .from("profiles")
        .select("name")
        .eq("id", order.user_id)
        .maybeSingle();
      customerName = profile?.name?.trim() || "";
    }
    if (!customerName) {
      customerName = customerEmail.split("@")[0] || "Cliente";
    }

    const content = buildCheckoutExpiredEmailContent({
      customerName,
      cartUrl: `${baseUrl}/carrinho`,
      orderIdShort: order.id.slice(0, 8),
    });

    const { data, error: sendError } = await getResendClient().emails.send({
      from: getResendFrom(),
      to: customerEmail,
      subject: content.subject,
      html: content.html,
      text: content.text,
      headers: {
        "Idempotency-Key": `checkout-expired:${orderId}`,
      },
    });

    if (sendError) {
      console.error("[resend] checkout expired send failed", {
        orderId,
        error: sendError,
      });
      return {
        ok: false,
        message: sendError.message || "Falha no Resend.",
      };
    }

    await admin
      .from("orders")
      .update({
        metadata: {
          ...metadata,
          checkout_expired_email_sent_at: new Date().toISOString(),
          checkout_expired_email_resend_id: data?.id ?? null,
        },
      })
      .eq("id", orderId);

    console.info("[resend] checkout expired email sent", {
      orderId,
      resendId: data?.id,
    });

    return {
      ok: true,
      sent: true,
      resendId: data?.id ?? undefined,
      message: "E-mail de checkout expirado enviado.",
    };
  } catch (error) {
    console.error("[resend] checkout expired unexpected", error);
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Erro inesperado ao enviar e-mail de checkout expirado.",
    };
  }
}
