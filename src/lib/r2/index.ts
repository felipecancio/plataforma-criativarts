/**
 * Cloudflare R2 (S3-compatible) — API pública do módulo.
 *
 * Uso exclusivo no servidor. Não importe em Client Components.
 *
 * Próximas etapas: rotas autenticadas de download com createPresignedDownloadUrl.
 */

export {
  getR2Env,
  getR2Bucket,
  hasR2Env,
  type R2Env,
} from "@/lib/r2/env";

export { getR2Client, resetR2Client } from "@/lib/r2/client";

export {
  createPresignedDownloadUrl,
  R2_DEFAULT_PRESIGN_EXPIRES_IN,
  type CreatePresignedDownloadUrlInput,
} from "@/lib/r2/presign";
