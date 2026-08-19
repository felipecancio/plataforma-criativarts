import { createHash } from "crypto";
import {
  getMetaCapiAccessToken,
  getMetaPixelIdForCapi,
  isMetaCapiConfigured,
} from "@/lib/analytics/meta-capi-env";
import { getResendAppBaseUrl } from "@/lib/resend/env";
import {
  createAdminClient,
  hasSupabaseServiceRole,
} from "@/lib/supabase/admin";

export type SendMetaCapiPurchaseResult = {
  ok: boolean;
  skipped?: boolean;
  sent?: boolean;
  message: string;
};

type OrderMetadata = Record<string, unknown>;

function sha256Normalize(value: string): string {
  return createHash("sha256")
    .update(value.trim().toLowerCase())
    .digest("hex");
}

/**
 * Envia Purchase para a Meta Conversions API (servidor).
 * Idempotente via orders.metadata.meta_capi_purchase_sent_at.
 * Usa event_id = orderId para deduplicar com o Pixel do browser.
 */
export async function sendMetaCapiPurchaseIfNeeded(
  orderId: string,
  options?: { customerEmailHint?: string | null }
): Promise<SendMetaCapiPurchaseResult> {
  try {
    if (!orderId?.trim()) {
      return { ok: false, message: "orderId inválido." };
    }

    if (!isMetaCapiConfigured()) {
      return {
        ok: true,
        skipped: true,
        message: "Meta CAPI não configurada.",
      };
    }

    if (!hasSupabaseServiceRole()) {
      return {
        ok: false,
        skipped: true,
        message: "Service role ausente.",
      };
    }

    const pixelId = getMetaPixelIdForCapi();
    const accessToken = getMetaCapiAccessToken();
    if (!pixelId || !accessToken) {
      return {
        ok: true,
        skipped: true,
        message: "Meta CAPI não configurada.",
      };
    }

    const admin = createAdminClient();
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select(
        "id, status, total, currency, customer_email, metadata, order_items ( product_id, product_name, quantity, unit_price )"
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return { ok: false, message: "Pedido não encontrado." };
    }

    if (order.status !== "paid") {
      return {
        ok: true,
        skipped: true,
        message: "Pedido ainda não está pago.",
      };
    }

    const metadata = (order.metadata ?? {}) as OrderMetadata;
    if (typeof metadata.meta_capi_purchase_sent_at === "string") {
      return {
        ok: true,
        skipped: true,
        message: "Purchase CAPI já enviado.",
      };
    }

    const email =
      options?.customerEmailHint?.trim() ||
      order.customer_email?.trim() ||
      "";

    const items = Array.isArray(order.order_items) ? order.order_items : [];
    const contentIds = items
      .map((item) =>
        item && typeof item === "object" && "product_id" in item
          ? String(item.product_id ?? "").trim()
          : ""
      )
      .filter(Boolean);

    const contents = items
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as {
          product_id?: string;
          quantity?: number;
          unit_price?: number;
        };
        const id = String(row.product_id ?? "").trim();
        if (!id) return null;
        return {
          id,
          quantity: Number(row.quantity ?? 1) || 1,
          item_price: Number(row.unit_price ?? 0) || undefined,
        };
      })
      .filter(Boolean);

    const value = Number(order.total);
    const currency = (order.currency || "BRL").toUpperCase();
    const eventTime = Math.floor(Date.now() / 1000);
    const baseUrl = getResendAppBaseUrl();

    const userData: Record<string, unknown> = {};
    if (email) {
      userData.em = [sha256Normalize(email)];
    }

    const body = {
      data: [
        {
          event_name: "Purchase",
          event_time: eventTime,
          event_id: order.id,
          action_source: "website",
          ...(baseUrl
            ? { event_source_url: `${baseUrl}/checkout/sucesso` }
            : {}),
          user_data: userData,
          custom_data: {
            currency,
            value: Number.isFinite(value) ? Number(value.toFixed(2)) : 0,
            content_type: "product",
            content_ids: contentIds,
            contents,
            num_items: contents.reduce(
              (sum, item) => sum + (item?.quantity ?? 0),
              0
            ),
            order_id: order.id,
          },
        },
      ],
    };

    const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(
      pixelId
    )}/events?access_token=${encodeURIComponent(accessToken)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    let responseJson: unknown = null;
    try {
      responseJson = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseJson = null;
    }

    if (!response.ok) {
      console.error("[meta-capi] Purchase failed", {
        orderId,
        status: response.status,
        body: responseJson ?? responseText.slice(0, 500),
      });
      return {
        ok: false,
        message: `Meta CAPI HTTP ${response.status}`,
      };
    }

    await admin
      .from("orders")
      .update({
        metadata: {
          ...metadata,
          meta_capi_purchase_sent_at: new Date().toISOString(),
          meta_capi_purchase_event_id: order.id,
        },
      })
      .eq("id", orderId);

    console.info("[meta-capi] Purchase sent", { orderId, eventId: order.id });

    return {
      ok: true,
      sent: true,
      message: "Purchase enviado à Meta CAPI.",
    };
  } catch (error) {
    console.error("[meta-capi] unexpected", error);
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Erro inesperado ao enviar Purchase CAPI.",
    };
  }
}
