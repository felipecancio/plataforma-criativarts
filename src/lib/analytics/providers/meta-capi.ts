import type {
  AnalyticsCartPayload,
  AnalyticsProductPayload,
  AnalyticsProvider,
  AnalyticsPurchasePayload,
} from "@/lib/analytics/types";

/**
 * Meta Conversions API (server-side) stub.
 * Replace the body with authenticated POSTs to Graph API when ready.
 */
export const metaCapiProvider: AnalyticsProvider = {
  name: "meta-capi",

  pageView() {
    // TODO: POST /api/analytics/meta event_name=PageView
  },

  viewContent(_payload: AnalyticsProductPayload) {
    // TODO: POST /api/analytics/meta event_name=ViewContent
  },

  addToCart(_payload: AnalyticsProductPayload) {
    // TODO: POST /api/analytics/meta event_name=AddToCart
  },

  initiateCheckout(_payload: AnalyticsCartPayload) {
    // TODO: POST /api/analytics/meta event_name=InitiateCheckout
  },

  purchase(_payload: AnalyticsPurchasePayload) {
    // TODO: POST /api/analytics/meta event_name=Purchase
  },
};
