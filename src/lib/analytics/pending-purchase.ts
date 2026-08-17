import type { AnalyticsPurchasePayload } from "@/lib/analytics/types";
import {
  ANALYTICS_CONTENT_TYPE,
  ANALYTICS_CURRENCY,
} from "@/lib/analytics/types";

const STORAGE_KEY = "criativarts-pending-purchase";

export type PendingPurchaseItems = Array<{
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}>;

/**
 * Guarda dados do Purchase no browser antes do redirect (Asaas / Checkout Pro).
 * A página /checkout/sucesso dispara o Pixel e limpa.
 */
export function stashPendingPurchase(input: {
  orderId: string;
  amount: number;
  currency?: string;
  items: PendingPurchaseItems;
}): void {
  if (typeof window === "undefined") return;

  const products = input.items.map((item) => ({
    product_id: item.productId,
    product_name: item.name,
    value: Number((item.unitPrice * item.quantity).toFixed(2)),
    currency: input.currency || ANALYTICS_CURRENCY,
    quantity: item.quantity,
    content_type: ANALYTICS_CONTENT_TYPE,
  }));

  const payload: AnalyticsPurchasePayload = {
    products,
    value: Number(input.amount.toFixed(2)),
    currency: input.currency || ANALYTICS_CURRENCY,
    content_type: ANALYTICS_CONTENT_TYPE,
    num_items: products.reduce((sum, item) => sum + item.quantity, 0),
    order_id: input.orderId,
  };

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

export function consumePendingPurchase(): AnalyticsPurchasePayload | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    const parsed = JSON.parse(raw) as AnalyticsPurchasePayload;
    if (!parsed || !Array.isArray(parsed.products) || typeof parsed.value !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
