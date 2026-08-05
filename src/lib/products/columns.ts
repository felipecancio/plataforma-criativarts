/**
 * Colunas do catálogo `products` usadas nas queries tipadas.
 * Inclui storage_* para associação com Cloudflare R2 (download futuro).
 */
export const PRODUCT_COLUMNS =
  "id, name, slug, quantity, style, price, compare_at_price, sold_count, image, gallery, sort_order, is_active, storage_provider, storage_key, created_at, updated_at" as const;

/** Subselect embutido em joins (ex.: user_library → products). */
export const PRODUCT_EMBED_COLUMNS = `
        id,
        name,
        slug,
        quantity,
        style,
        price,
        compare_at_price,
        sold_count,
        image,
        gallery,
        sort_order,
        is_active,
        storage_provider,
        storage_key,
        created_at,
        updated_at
` as const;
