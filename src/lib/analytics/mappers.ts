import type { Product } from "@/types/product";
import {
  ANALYTICS_CONTENT_TYPE,
  ANALYTICS_CURRENCY,
  type AnalyticsCartPayload,
  type AnalyticsProductPayload,
  type AnalyticsPurchasePayload,
} from "@/lib/analytics/types";

export function toProductPayload(
  product: Product,
  quantity = 1
): AnalyticsProductPayload {
  return {
    product_id: product.id,
    product_name: product.name,
    value: Number((product.price * quantity).toFixed(2)),
    currency: ANALYTICS_CURRENCY,
    quantity,
    content_type: ANALYTICS_CONTENT_TYPE,
  };
}

export function toCartPayload(
  products: Product[],
  quantityPerItem = 1
): AnalyticsCartPayload {
  const items = products.map((product) =>
    toProductPayload(product, quantityPerItem)
  );

  return {
    products: items,
    value: Number(
      items.reduce((sum, item) => sum + item.value, 0).toFixed(2)
    ),
    currency: ANALYTICS_CURRENCY,
    content_type: ANALYTICS_CONTENT_TYPE,
    num_items: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export function toPurchasePayload(
  products: Product[],
  orderId?: string,
  quantityPerItem = 1
): AnalyticsPurchasePayload {
  return {
    ...toCartPayload(products, quantityPerItem),
    order_id: orderId,
  };
}
