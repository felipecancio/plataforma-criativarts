import { createClient } from "@/lib/supabase/server";
import { mapUserLibraryRow } from "@/lib/orders/mappers";
import { mapProductRow } from "@/lib/products/mappers";
import type { ProductRow, UserLibraryRow } from "@/types/database";
import type {
  UserLibraryEntry,
  UserLibraryProduct,
} from "@/types/order";

type LibraryJoinRow = UserLibraryRow & {
  products: ProductRow | ProductRow[] | null;
};

function unwrapProduct(
  products: ProductRow | ProductRow[] | null
): ProductRow | null {
  if (!products) return null;
  return Array.isArray(products) ? products[0] ?? null : products;
}

/**
 * Garante que pedidos `paid` do usuário estejam refletidos em user_library.
 * Idempotente — seguro chamar a cada carga da biblioteca.
 */
async function syncPaidOrdersIntoLibrary(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("sync_my_paid_orders_library");
  if (error) {
    console.warn(
      "[library] sync_my_paid_orders_library failed (apply migration 005?):",
      error.message
    );
  }
}

/**
 * Biblioteca digital ativa do usuário autenticado (RLS: só o próprio acervo).
 * Join com `products` para montar os mesmos cards da loja.
 */
export async function getCurrentUserLibrary(): Promise<UserLibraryProduct[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  await syncPaidOrdersIntoLibrary();

  const { data, error } = await supabase
    .from("user_library")
    .select(
      `
      id,
      user_id,
      product_id,
      order_id,
      order_item_id,
      status,
      granted_at,
      created_at,
      updated_at,
      products (
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
      )
    `
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("granted_at", { ascending: false });

  if (error) {
    console.warn("[library] Failed to load library:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as LibraryJoinRow[]).flatMap((row) => {
    const productRow = unwrapProduct(row.products);
    // Produto precisa existir; adquiridos permanecem visíveis mesmo se saírem da loja.
    if (!productRow) return [];

    return [
      {
        ...mapUserLibraryRow(row),
        product: mapProductRow(productRow),
      },
    ];
  });
}

export async function userOwnsProduct(productId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data, error } = await supabase
    .from("user_library")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.warn("[library] Ownership check failed:", error.message);
    return false;
  }

  return Boolean(data);
}

export async function getLibraryEntry(
  productId: string
): Promise<UserLibraryEntry | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("user_library")
    .select(
      "id, user_id, product_id, order_id, order_item_id, status, granted_at, created_at, updated_at"
    )
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (error || !data) return null;
  return mapUserLibraryRow(data);
}
