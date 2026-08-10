/**
 * Modo de checkout: Payment Brick (atual) vs Checkout Pro.
 * Default: brick — Pro só após NEXT_PUBLIC_CHECKOUT_MODE=pro + redeploy.
 */

export type CheckoutMode = "brick" | "pro";

export function getCheckoutMode(): CheckoutMode {
  const raw = (
    process.env.NEXT_PUBLIC_CHECKOUT_MODE?.trim() ||
    process.env.CHECKOUT_MODE?.trim() ||
    "brick"
  ).toLowerCase();

  return raw === "pro" ? "pro" : "brick";
}

export function isCheckoutProEnabled(): boolean {
  return getCheckoutMode() === "pro";
}
