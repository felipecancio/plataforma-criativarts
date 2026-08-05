import type {
  AnalyticsCartPayload,
  AnalyticsProductPayload,
  AnalyticsProvider,
  AnalyticsPurchasePayload,
} from "@/lib/analytics/types";

/**
 * Google Analytics 4 provider stub.
 * Activate later with gtag + NEXT_PUBLIC_GA_MEASUREMENT_ID.
 */
export const googleAnalyticsProvider: AnalyticsProvider = {
  name: "google-analytics",

  pageView() {
    // TODO: gtag('event', 'page_view', ...)
  },

  viewContent(payload: AnalyticsProductPayload) {
    // TODO: gtag('event', 'view_item', { ...payload })
    void payload;
  },

  addToCart(payload: AnalyticsProductPayload) {
    // TODO: gtag('event', 'add_to_cart', { ...payload })
    void payload;
  },

  initiateCheckout(payload: AnalyticsCartPayload) {
    // TODO: gtag('event', 'begin_checkout', { ...payload })
    void payload;
  },

  purchase(payload: AnalyticsPurchasePayload) {
    // TODO: gtag('event', 'purchase', { ...payload })
    void payload;
  },
};
