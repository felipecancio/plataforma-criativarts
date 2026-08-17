/**
 * Credenciais Asaas (somente servidor, exceto flag de modo no checkout).
 *
 * Ambiente da API:
 * - Produção: https://api.asaas.com/v3
 * - Sandbox:  https://api-sandbox.asaas.com/v3
 *
 * Defina ASAAS_ENV=sandbox|production (default: production se a key não indicar sandbox).
 *
 * Chaves Asaas começam com `$`. No `.env.local`, escape: ASAAS_API_KEY=\$aact_...
 * (o Next faz expand de `$VAR` e esvazia a chave se não escapar). Na Vercel, cole sem `\`.
 */

export type AsaasEnv = "sandbox" | "production";

export function hasAsaasApiKey(): boolean {
  return Boolean(process.env.ASAAS_API_KEY?.trim());
}

export function getAsaasApiKey(): string {
  const key = process.env.ASAAS_API_KEY?.trim();
  if (!key) {
    throw new Error("Defina ASAAS_API_KEY no servidor (chave de API do Asaas).");
  }
  return key;
}

export function getAsaasEnv(): AsaasEnv {
  const raw = process.env.ASAAS_ENV?.trim().toLowerCase();
  if (raw === "sandbox" || raw === "test") return "sandbox";
  if (raw === "production" || raw === "prod") return "production";
  // Heurística: keys de sandbox às vezes vêm documentadas; default produção.
  return "production";
}

export function getAsaasApiBaseUrl(): string {
  return getAsaasEnv() === "sandbox"
    ? "https://api-sandbox.asaas.com/v3"
    : "https://api.asaas.com/v3";
}

export function getAsaasWebhookToken(): string | null {
  return process.env.ASAAS_WEBHOOK_TOKEN?.trim() || null;
}

export function hasAsaasWebhookToken(): boolean {
  return Boolean(getAsaasWebhookToken());
}
