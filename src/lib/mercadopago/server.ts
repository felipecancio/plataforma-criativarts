import { MercadoPagoConfig } from "mercadopago";
import {
  assertMercadoPagoCredentialPair,
  getMercadoPagoAccessToken,
  hasMercadoPagoAccessToken,
} from "@/lib/mercadopago/env";

let cachedClient: MercadoPagoConfig | null = null;

/**
 * Cliente reutilizável do SDK Node (servidor).
 * Preparado para Preferences / Payments / webhook.
 * Nunca importe este módulo em Client Components.
 */
export function getMercadoPagoServerClient() {
  if (!hasMercadoPagoAccessToken()) {
    throw new Error(
      "MERCADOPAGO_ACCESS_TOKEN ausente — necessário para operações server-side."
    );
  }

  assertMercadoPagoCredentialPair();

  if (!cachedClient) {
    cachedClient = new MercadoPagoConfig({
      accessToken: getMercadoPagoAccessToken(),
      options: {
        timeout: 10_000,
      },
    });
  }

  return cachedClient;
}
