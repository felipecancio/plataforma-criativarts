/**
 * Credenciais Resend — somente servidor.
 * Nunca use NEXT_PUBLIC_* para a API key.
 */

export function getResendApiKey(): string {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error("Defina RESEND_API_KEY no servidor (envio de e-mails).");
  }
  return key;
}

export function hasResendApiKey(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function getResendFrom(): string {
  const from = process.env.RESEND_FROM?.trim();
  if (!from) {
    throw new Error(
      "Defina RESEND_FROM no servidor (ex.: Criativarts <noreply@criativarts.com>)."
    );
  }
  return from;
}

export function hasResendFrom(): boolean {
  return Boolean(process.env.RESEND_FROM?.trim());
}

/** URL pública do site (link da biblioteca). Somente APP_URL / VERCEL_URL. */
export function getResendAppBaseUrl(): string | null {
  const explicit = process.env.APP_URL?.trim();

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

export function isResendConfigured(): boolean {
  return hasResendApiKey() && hasResendFrom();
}
