import type { Product } from "@/types/product";
import { trackPurchase } from "@/lib/analytics";
import { toPurchasePayload } from "@/lib/analytics/mappers";

export type CheckoutItem = {
  product: Product;
  quantity: number;
};

export type PrepareCheckoutResponse =
  | {
      ok: true;
      orderId: string;
      total: number;
      currency: string;
      status: string;
      initPoint: string | null;
      requiresPayment: boolean;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

/**
 * Chama a API que cria `orders` + `order_items` (pending).
 * Quando o Mercado Pago existir, use `initPoint` para redirecionar.
 */
export async function prepareCheckout(
  productIds: string[]
): Promise<PrepareCheckoutResponse> {
  const response = await fetch("/api/checkout/prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productIds }),
  });

  const payload = (await response.json()) as PrepareCheckoutResponse;
  return payload;
}

/**
 * Checkout do carrinho — prepara o pedido e segue para /checkout (Payment Brick).
 * Fluxo atual:
 * 1. prepareCheckout() / payments/create
 * 2. Payment Brick → payments/process
 * 3. approved → order paid + grant_library_from_paid_order
 * 4. completePurchase() analytics (opcional)
 */
export async function checkout(items: CheckoutItem[]): Promise<void> {
  if (items.length === 0) return;

  const result = await prepareCheckout(items.map((item) => item.product.id));

  if (!result.ok) {
    if (result.code === "unauthenticated") {
      window.location.href = `/entrar?next=${encodeURIComponent("/carrinho")}`;
      return;
    }
    alert(result.message || "Não foi possível iniciar o checkout.");
    return;
  }

  // Sem gateway ainda: pedido pending criado e pronto para Preference.
  console.info("[Criativarts] pending order ready for Mercado Pago", result);

  if (result.initPoint) {
    window.location.href = result.initPoint;
    return;
  }

  alert(
    `Pedido criado (${result.orderId.slice(0, 8)}…). A integração com Mercado Pago será o próximo passo para pagamento.`
  );
}

/**
 * Call this only after a confirmed payment (Mercado Pago success).
 */
export function completePurchase(
  products: Product[],
  orderId?: string
): void {
  trackPurchase(toPurchasePayload(products, orderId, 1));
}
