"use client";

import { initMercadoPago } from "@mercadopago/sdk-react";
import { getMercadoPagoPublicKey, hasMercadoPagoPublicKey } from "@/lib/mercadopago/env";

let initialized = false;

/**
 * Inicializa o SDK React do Mercado Pago (Checkout Bricks) uma única vez.
 * Usar apenas no client.
 */
export function ensureMercadoPagoBrowserSdk() {
  if (typeof window === "undefined") return false;
  if (initialized) return true;
  if (!hasMercadoPagoPublicKey()) return false;

  initMercadoPago(getMercadoPagoPublicKey(), {
    locale: "pt-BR",
  });
  initialized = true;
  return true;
}
