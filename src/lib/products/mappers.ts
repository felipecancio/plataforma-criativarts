import type { ProductRow } from "@/types/database";
import type { Product, ProductStorageProvider } from "@/types/product";

/** @deprecated Use ProductRow from @/types/database */
export type { ProductRow };

function mapStorageProvider(
  value: string | null | undefined
): ProductStorageProvider | null {
  if (value === "r2") return "r2";
  return null;
}

export function mapProductRow(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    quantity: row.quantity,
    style: row.style,
    price: Number(row.price),
    compareAtPrice: Number(row.compare_at_price),
    soldCount: row.sold_count,
    image: row.image,
    gallery: Array.isArray(row.gallery) ? row.gallery : [],
    storageProvider: mapStorageProvider(row.storage_provider),
    storageKey: row.storage_key ?? null,
  };
}

/** True quando o produto tem arquivo associado no storage (ex.: R2). */
export function productHasStorageFile(product: Product): boolean {
  return Boolean(product.storageProvider && product.storageKey?.trim());
}

export function getDiscountPercent(product: Product): number {
  if (product.compareAtPrice <= product.price) return 0;
  return Math.round(
    ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100
  );
}

export function getSavings(product: Product): number {
  return Math.max(0, product.compareAtPrice - product.price);
}

export function shuffleRelatedProducts(
  products: Product[],
  excludeId: string
): Product[] {
  const pool = products.filter((product) => product.id !== excludeId);
  const shuffled = [...pool];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}
