import type {
  AnalyticsCartPayload,
  AnalyticsProductPayload,
  AnalyticsProvider,
  AnalyticsPurchasePayload,
} from "@/lib/analytics/types";

/**
 * Meta Conversions API — provider browser fica vazio de propósito
 * (token secreto só no servidor). Purchase real: sendMetaCapiPurchaseIfNeeded
 * chamado nos webhooks / pós-pagamento.
 */
export const metaCapiProvider: AnalyticsProvider = {
  name: "meta-capi",

  pageView() {},

  viewContent(_payload: AnalyticsProductPayload) {},

  addToCart(_payload: AnalyticsProductPayload) {},

  initiateCheckout(_payload: AnalyticsCartPayload) {},

  purchase(_payload: AnalyticsPurchasePayload) {},
};
