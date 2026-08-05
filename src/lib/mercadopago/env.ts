/**
 * Credenciais Mercado Pago.
 * - Public Key: cliente (Bricks)
 * - Access Token: apenas servidor (API)
 *
 * Teste vs produção: use o par correspondente do mesmo aplicativo.
 * TEST-* = sandbox | chaves live = produção. Não misture os dois.
 */

export type MercadoPagoCredentialMode = "test" | "production" | "unknown";

export function getMercadoPagoPublicKey() {
  const key = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY?.trim();
  if (!key) {
    throw new Error(
      "Defina NEXT_PUBLIC_MP_PUBLIC_KEY no .env.local (Public Key do Mercado Pago)."
    );
  }
  return key;
}

export function hasMercadoPagoPublicKey() {
  return Boolean(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY?.trim());
}

export function getMercadoPagoAccessToken() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "Defina MERCADOPAGO_ACCESS_TOKEN no .env.local (Access Token do Mercado Pago)."
    );
  }
  return token;
}

export function hasMercadoPagoAccessToken() {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN?.trim());
}

/**
 * Infere o ambiente pelas próprias chaves (TEST-… = teste).
 */
export function getMercadoPagoCredentialMode(): MercadoPagoCredentialMode {
  if (!hasMercadoPagoPublicKey() || !hasMercadoPagoAccessToken()) {
    return "unknown";
  }

  const publicKey = getMercadoPagoPublicKey();
  const accessToken = getMercadoPagoAccessToken();
  const publicIsTest = publicKey.startsWith("TEST-");
  const tokenIsTest = accessToken.startsWith("TEST-");

  if (publicIsTest && tokenIsTest) return "test";
  if (!publicIsTest && !tokenIsTest) return "production";
  return "unknown";
}

/**
 * Garante que Public Key e Access Token sejam do mesmo ambiente.
 */
export function assertMercadoPagoCredentialPair() {
  if (!hasMercadoPagoPublicKey() || !hasMercadoPagoAccessToken()) return;

  const mode = getMercadoPagoCredentialMode();
  if (mode === "unknown") {
    throw new Error(
      "Credenciais Mercado Pago inconsistentes: Public Key e Access Token devem ser ambos de teste (TEST-) ou ambos de produção."
    );
  }

  const explicit = process.env.MP_ENV?.trim().toLowerCase();
  if (explicit === "production" && mode === "test") {
    throw new Error(
      "MP_ENV=production mas as chaves são de teste (TEST-). Use as credenciais live."
    );
  }
  if (explicit === "test" && mode === "production") {
    throw new Error(
      "MP_ENV=test mas as chaves são de produção. Use as credenciais TEST-."
    );
  }
}

/**
 * URL pública da aplicação (webhook / redirects).
 * Preferir APP_URL; fallbacks: NEXT_PUBLIC_APP_URL, VERCEL_URL.
 */
export function getAppBaseUrl(): string | null {
  const explicit =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`.replace(/\/$/, "");
  }

  return null;
}

/** notification_url registrada no Payment.create */
export function getMercadoPagoNotificationUrl(): string | null {
  const base = getAppBaseUrl();
  if (!base) return null;
  return `${base}/api/payments/webhook`;
}
