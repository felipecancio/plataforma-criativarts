import { S3Client } from "@aws-sdk/client-s3";
import { getR2Env, hasR2Env } from "@/lib/r2/env";

let cachedClient: S3Client | null = null;

/**
 * Cliente S3 reutilizável apontando para o bucket privado no Cloudflare R2.
 * Preparado para GetObject / PutObject / URLs pré-assinadas nas próximas etapas.
 *
 * Nunca importe este módulo em Client Components.
 */
export function getR2Client(): S3Client {
  if (!hasR2Env()) {
    throw new Error(
      "Credenciais R2 ausentes — defina R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_BUCKET."
    );
  }

  if (!cachedClient) {
    const env = getR2Env();

    cachedClient = new S3Client({
      region: "auto",
      endpoint: env.endpoint,
      credentials: {
        accessKeyId: env.accessKeyId,
        secretAccessKey: env.secretAccessKey,
      },
      // R2 não usa path-style virtual-host da AWS da mesma forma;
      // forcePathStyle evita inconsistências com o endpoint customizado.
      forcePathStyle: true,
    });
  }

  return cachedClient;
}

/** Invalida o cache (útil em testes). */
export function resetR2Client(): void {
  if (cachedClient) {
    cachedClient.destroy();
    cachedClient = null;
  }
}
