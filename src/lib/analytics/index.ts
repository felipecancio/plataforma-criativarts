import { googleAnalyticsProvider } from "@/lib/analytics/providers/google-analytics";
import { metaCapiProvider } from "@/lib/analytics/providers/meta-capi";
import { metaPixelProvider } from "@/lib/analytics/providers/meta-pixel";
import type {
  AnalyticsCartPayload,
  AnalyticsProductPayload,
  AnalyticsProvider,
  AnalyticsPurchasePayload,
} from "@/lib/analytics/types";

const providers: AnalyticsProvider[] = [
  metaPixelProvider,
  metaCapiProvider,
  googleAnalyticsProvider,
];

function dispatch(
  method: keyof Omit<AnalyticsProvider, "name">,
  payload?: AnalyticsProductPayload | AnalyticsCartPayload | AnalyticsPurchasePayload
) {
  for (const provider of providers) {
    const handler = provider[method];
    if (!handler) continue;

    try {
      if (payload === undefined) {
        (handler as () => void)();
      } else {
        (handler as (data: typeof payload) => void)(payload);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[analytics:${provider.name}] ${method} failed`, error);
      }
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.info(`[analytics] ${method}`, payload ?? {});
  }
}

/** Isolado — PageView */
export function trackPageView() {
  dispatch("pageView");
}

/** Isolado — ViewContent */
export function trackViewContent(payload: AnalyticsProductPayload) {
  dispatch("viewContent", payload);
}

/** Isolado — AddToCart */
export function trackAddToCart(payload: AnalyticsProductPayload) {
  dispatch("addToCart", payload);
}

/** Isolado — InitiateCheckout */
export function trackInitiateCheckout(payload: AnalyticsCartPayload) {
  dispatch("initiateCheckout", payload);
}

/** Isolado — Purchase */
export function trackPurchase(payload: AnalyticsPurchasePayload) {
  dispatch("purchase", payload);
}
