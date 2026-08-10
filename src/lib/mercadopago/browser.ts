"use client";

import { initMercadoPago } from "@mercadopago/sdk-react";
import { getMercadoPagoPublicKey, hasMercadoPagoPublicKey } from "@/lib/mercadopago/env";

const SECURITY_SCRIPT_ID = "mp-security-js";

let initialized = false;

type WindowWithMpDevice = Window & {
  MP_DEVICE_SESSION_ID?: unknown;
};

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

/**
 * Carrega o script oficial de Device ID do Mercado Pago (security.js).
 * O @mercadopago/sdk-react não expõe getter de Device ID; a doc oficial
 * usa https://www.mercadopago.com/v2/security.js → MP_DEVICE_SESSION_ID.
 */
export function ensureMercadoPagoSecurityScript() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  if (document.getElementById(SECURITY_SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = SECURITY_SCRIPT_ID;
  script.src = "https://www.mercadopago.com/v2/security.js";
  script.setAttribute("view", "checkout");
  document.body.appendChild(script);
}

/**
 * Lê o Device ID / sessão gerado pelo security.js (ou input #deviceId).
 * Retorna null se ainda não estiver disponível — não deve bloquear o pagamento.
 */
export function getMercadoPagoDeviceSessionId(): string | null {
  if (typeof window === "undefined") return null;

  const fromGlobal = (window as WindowWithMpDevice).MP_DEVICE_SESSION_ID;
  if (typeof fromGlobal === "string") {
    const trimmed = fromGlobal.trim();
    if (trimmed) return trimmed;
  }

  const el = document.getElementById("deviceId");
  if (el instanceof HTMLInputElement) {
    const value = el.value.trim();
    if (value) return value;
  }

  return null;
}
