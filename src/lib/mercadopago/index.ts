/**
 * API pública do módulo Mercado Pago.
 * Para o SDK Node (Access Token), importe de `@/lib/mercadopago/server`.
 */

export {
  getMercadoPagoPublicKey,
  hasMercadoPagoPublicKey,
  hasMercadoPagoAccessToken,
  getMercadoPagoCredentialMode,
  getAppBaseUrl,
  getMercadoPagoNotificationUrl,
} from "@/lib/mercadopago/env";

export {
  ensureMercadoPagoBrowserSdk,
  ensureMercadoPagoSecurityScript,
  getMercadoPagoDeviceSessionId,
} from "@/lib/mercadopago/browser";
