/**
 * Meta Conversions API — somente servidor.
 * Pixel ID pode reutilizar NEXT_PUBLIC_META_PIXEL_ID.
 */

export function getMetaPixelIdForCapi(): string | null {
  const id =
    process.env.META_PIXEL_ID?.trim() ||
    process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ||
    "";
  return id || null;
}

export function getMetaCapiAccessToken(): string | null {
  const token = process.env.META_CAPI_ACCESS_TOKEN?.trim() || "";
  return token || null;
}

export function isMetaCapiConfigured(): boolean {
  return Boolean(getMetaPixelIdForCapi() && getMetaCapiAccessToken());
}
