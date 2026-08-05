import { createPublicClient } from "@/lib/supabase/public";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { fallbackProducts } from "@/lib/products/fallback";
import { PRODUCT_COLUMNS } from "@/lib/products/columns";
import { mapProductRow, shuffleRelatedProducts } from "@/lib/products/mappers";
import type { Product } from "@/types/product";
import type { ProductRow } from "@/types/database";

async function fetchProductsFromDb(): Promise<Product[] | null> {
  if (!hasSupabaseEnv()) return null;

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.warn("[products] Supabase query failed, using fallback:", error.message);
      return null;
    }

    if (!data || data.length === 0) {
      console.warn("[products] Empty catalog in Supabase, using fallback");
      return null;
    }

    return (data as ProductRow[]).map(mapProductRow);
  } catch (error) {
    console.warn("[products] Unexpected catalog error, using fallback:", error);
    return null;
  }
}

/** Catálogo completo — prioriza Supabase, fallback local na transição */
export async function getProducts(): Promise<Product[]> {
  const fromDb = await fetchProductsFromDb();
  return fromDb ?? fallbackProducts;
}

export async function getProductBySlug(
  slug: string
): Promise<Product | undefined> {
  if (hasSupabaseEnv()) {
    try {
      const supabase = createPublicClient();
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_COLUMNS)
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (!error && data) {
        return mapProductRow(data as ProductRow);
      }
    } catch {
      // fall through to full catalog / fallback
    }
  }

  const products = await getProducts();
  return products.find((product) => product.slug === slug);
}

export async function getProductById(
  id: string
): Promise<Product | undefined> {
  const products = await getProducts();
  return products.find((product) => product.id === id);
}

export async function getAllProductSlugs(): Promise<string[]> {
  const products = await getProducts();
  return products.map((product) => product.slug);
}

export async function getRelatedProducts(
  excludeId: string
): Promise<Product[]> {
  const products = await getProducts();
  return shuffleRelatedProducts(products, excludeId);
}
