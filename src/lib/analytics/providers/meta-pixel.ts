import type {
  AnalyticsCartPayload,
  AnalyticsProductPayload,
  AnalyticsProvider,
  AnalyticsPurchasePayload,
} from "@/lib/analytics/types";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: (...args: unknown[]) => void;
  }
}

function getPixelId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  return id && id.trim().length > 0 ? id.trim() : undefined;
}

function canTrack(): boolean {
  return typeof window !== "undefined" && typeof window.fbq === "function";
}

/**
 * Meta Pixel provider.
 * Activate by setting NEXT_PUBLIC_META_PIXEL_ID and loading the base pixel script.
 */
export const metaPixelProvider: AnalyticsProvider = {
  name: "meta-pixel",

  pageView() {
    if (!getPixelId() || !canTrack()) return;
    window.fbq?.("track", "PageView");
  },

  viewContent(payload: AnalyticsProductPayload) {
    if (!getPixelId() || !canTrack()) return;
    window.fbq?.("track", "ViewContent", {
      content_ids: [payload.product_id],
      content_name: payload.product_name,
      content_type: payload.content_type,
      value: payload.value,
      currency: payload.currency,
      contents: [
        {
          id: payload.product_id,
          quantity: payload.quantity,
        },
      ],
    });
  },

  addToCart(payload: AnalyticsProductPayload) {
    if (!getPixelId() || !canTrack()) return;
    window.fbq?.("track", "AddToCart", {
      content_ids: [payload.product_id],
      content_name: payload.product_name,
      content_type: payload.content_type,
      value: payload.value,
      currency: payload.currency,
      contents: [
        {
          id: payload.product_id,
          quantity: payload.quantity,
        },
      ],
    });
  },

  initiateCheckout(payload: AnalyticsCartPayload) {
    if (!getPixelId() || !canTrack()) return;
    window.fbq?.("track", "InitiateCheckout", {
      content_ids: payload.products.map((item) => item.product_id),
      content_type: payload.content_type,
      value: payload.value,
      currency: payload.currency,
      num_items: payload.num_items,
      contents: payload.products.map((item) => ({
        id: item.product_id,
        quantity: item.quantity,
      })),
    });
  },

  purchase(payload: AnalyticsPurchasePayload) {
    if (!getPixelId() || !canTrack()) return;
    const eventData = {
      content_ids: payload.products.map((item) => item.product_id),
      content_type: payload.content_type,
      value: payload.value,
      currency: payload.currency,
      num_items: payload.num_items,
      contents: payload.products.map((item) => ({
        id: item.product_id,
        quantity: item.quantity,
      })),
      ...(payload.order_id ? { order_id: payload.order_id } : {}),
    };
    // eventID = order_id deduplica com Meta CAPI no webhook (mesmo event_id).
    if (payload.order_id) {
      window.fbq?.("track", "Purchase", eventData, {
        eventID: payload.order_id,
      });
      return;
    }
    window.fbq?.("track", "Purchase", eventData);
  },
};
