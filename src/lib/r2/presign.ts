import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client } from "@/lib/r2/client";
import { getR2Bucket } from "@/lib/r2/env";

/** TTL padrão de URLs de download (15 min). */
export const R2_DEFAULT_PRESIGN_EXPIRES_IN = 60 * 15;

export type CreatePresignedDownloadUrlInput = {
  /** Chave do objeto no bucket (ex.: `products/animes/pack.zip`) */
  key: string;
  /** Segundos até expirar (padrão: 15 min, máx. recomendado curto). */
  expiresIn?: number;
  /** Nome sugerido no download do browser (Content-Disposition). */
  downloadFileName?: string;
};

/**
 * Gera URL temporária (pré-assinada) para GET de um objeto privado no R2.
 * Usar apenas em rotas/server actions autenticadas nas próximas etapas.
 *
 * Não altera o bucket nem expõe credenciais ao client — só a URL assinada.
 */
export async function createPresignedDownloadUrl(
  input: CreatePresignedDownloadUrlInput
): Promise<string> {
  const key = input.key.trim().replace(/^\/+/, "");
  if (!key) {
    throw new Error("Chave do objeto R2 inválida.");
  }

  const expiresIn = Math.min(
    Math.max(input.expiresIn ?? R2_DEFAULT_PRESIGN_EXPIRES_IN, 1),
    60 * 60 * 24
  );

  const command = new GetObjectCommand({
    Bucket: getR2Bucket(),
    Key: key,
    ...(input.downloadFileName
      ? {
          ResponseContentDisposition: `attachment; filename="${input.downloadFileName.replace(/"/g, "")}"`,
        }
      : {}),
  });

  return getSignedUrl(getR2Client(), command, { expiresIn });
}
