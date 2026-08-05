export const ANALYTICS_CURRENCY = "BRL";
export const ANALYTICS_CONTENT_TYPE = "product";

export type AnalyticsProductPayload = {
  product_id: string;
  product_name: string;
  value: number;
  currency: string;
  quantity: number;
  content_type: string;
};

export type AnalyticsCartPayload = {
  products: AnalyticsProductPayload[];
  value: number;
  currency: string;
  content_type: string;
  num_items: number;
};

export type AnalyticsPurchasePayload = AnalyticsCartPayload & {
  order_id?: string;
};

export type AnalyticsProvider = {
  name: string;
  pageView?: () => void;
  viewContent?: (payload: AnalyticsProductPayload) => void;
  addToCart?: (payload: AnalyticsProductPayload) => void;
  initiateCheckout?: (payload: AnalyticsCartPayload) => void;
  purchase?: (payload: AnalyticsPurchasePayload) => void;
};
