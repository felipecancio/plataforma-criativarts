/**
 * Credenciais Cloudflare R2 (API S3-compatible).
 * Somente servidor — nunca prefixar com NEXT_PUBLIC_.
 */

export type R2Env = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** Endpoint S3 do R2: https://{accountId}.r2.cloudflarestorage.com */
  endpoint: string;
};

function readRequired(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Defina ${name} no .env.local (Cloudflare R2 — uso exclusivo no servidor).`
    );
  }
  return value;
}

export function hasR2Env(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID?.trim() &&
      process.env.R2_ACCESS_KEY_ID?.trim() &&
      process.env.R2_SECRET_ACCESS_KEY?.trim() &&
      process.env.R2_BUCKET?.trim()
  );
}

/**
 * Lê e valida as variáveis R2.
 * Lança se alguma estiver ausente.
 */
export function getR2Env(): R2Env {
  const accountId = readRequired("R2_ACCOUNT_ID");
  const accessKeyId = readRequired("R2_ACCESS_KEY_ID");
  const secretAccessKey = readRequired("R2_SECRET_ACCESS_KEY");
  const bucket = readRequired("R2_BUCKET");

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  };
}

export function getR2Bucket(): string {
  return getR2Env().bucket;
}
