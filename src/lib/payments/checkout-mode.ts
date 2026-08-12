/**
 * Modo de checkout:
 * - brick  → Payment Brick (Mercado Pago) — exige login
 * - pro    → Checkout Pro (Mercado Pago) — guest ok
 * - asaas  → Asaas Checkout hospedado (Pix + cartão) — guest ok
 *
 * Default: brick. Troca via NEXT_PUBLIC_CHECKOUT_MODE + redeploy.
 */

export type CheckoutMode = "brick" | "pro" | "asaas";

export function getCheckoutMode(): CheckoutMode {
  const raw = (
    process.env.NEXT_PUBLIC_CHECKOUT_MODE?.trim() ||
    process.env.CHECKOUT_MODE?.trim() ||
    "brick"
  ).toLowerCase();

  if (raw === "pro") return "pro";
  if (raw === "asaas") return "asaas";
  return "brick";
}

export function isCheckoutProEnabled(): boolean {
  return getCheckoutMode() === "pro";
}

export function isAsaasCheckoutEnabled(): boolean {
  return getCheckoutMode() === "asaas";
}

/** Fluxos com redirect hospedado (sem Brick) e guest checkout. */
export function isHostedCheckoutMode(): boolean {
  const mode = getCheckoutMode();
  return mode === "pro" || mode === "asaas";
}
