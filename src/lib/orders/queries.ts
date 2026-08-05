import { createClient } from "@/lib/supabase/server";
import { mapOrderRow, mapOrderWithItems, toOrderMetadata } from "@/lib/orders/mappers";
import type { TablesInsert } from "@/types/database";
import type { Order, OrderWithItems } from "@/types/order";
import type { Product } from "@/types/product";

const ORDER_COLUMNS =
  "id, user_id, status, currency, subtotal, total, customer_email, payment_provider, payment_id, preference_id, paid_at, metadata, created_at, updated_at" as const;

/**
 * Lista pedidos do usuário autenticado (mais recentes primeiro).
 */
export async function getCurrentUserOrders(): Promise<OrderWithItems[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("orders")
    .select(`${ORDER_COLUMNS}, order_items (*)`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[orders] Failed to load orders:", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapOrderWithItems(row));
}

export async function getOrderById(
  orderId: string
): Promise<OrderWithItems | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("orders")
    .select(`${ORDER_COLUMNS}, order_items (*)`)
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.warn("[orders] Failed to load order:", error.message);
    }
    return null;
  }

  return mapOrderWithItems(data);
}

export type CreatePendingOrderInput = {
  userId: string;
  customerEmail?: string | null;
  products: Product[];
  metadata?: Record<string, unknown>;
  paymentProvider?: string | null;
};

/**
 * Cria pedido `pending` + itens (snapshot).
 * Pronto para o fluxo futuro do Mercado Pago — não altera status nem biblioteca.
 */
export async function createPendingOrder(
  input: CreatePendingOrderInput
): Promise<Order | null> {
  if (input.products.length === 0) return null;

  const supabase = await createClient();
  const subtotal = input.products.reduce((sum, product) => sum + product.price, 0);
  const total = subtotal;

  const orderInsert: TablesInsert<"orders"> = {
    user_id: input.userId,
    status: "pending",
    currency: "BRL",
    subtotal,
    total,
    customer_email: input.customerEmail ?? null,
    payment_provider: input.paymentProvider ?? null,
    metadata: toOrderMetadata(input.metadata ?? {}),
  };

  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .insert(orderInsert)
    .select(ORDER_COLUMNS)
    .single();

  if (orderError || !orderRow) {
    console.warn("[orders] Failed to create order:", orderError?.message);
    return null;
  }

  const order = mapOrderRow(orderRow);

  const itemsPayload: TablesInsert<"order_items">[] = input.products.map(
    (product) => ({
      order_id: order.id,
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug,
      unit_price: product.price,
      quantity: 1,
      line_total: product.price,
    })
  );

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(itemsPayload);

  if (itemsError) {
    console.error("[orders] Failed to create order items:", itemsError.message);
    return null;
  }

  return order;
}

/**
 * Atualiza campos de pagamento do pedido (uso futuro: Preference / webhook MP).
 * Em produção, preferir service role no webhook; aqui fica tipado para o server.
 */
export async function attachPaymentReferences(
  orderId: string,
  refs: {
    preferenceId?: string | null;
    paymentId?: string | null;
    paymentProvider?: string | null;
  }
): Promise<Order | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("orders")
    .update({
      preference_id: refs.preferenceId ?? undefined,
      payment_id: refs.paymentId ?? undefined,
      payment_provider: refs.paymentProvider ?? undefined,
    })
    .eq("id", orderId)
    .eq("user_id", user.id)
    .select(ORDER_COLUMNS)
    .single();

  if (error || !data) {
    console.warn("[orders] Failed to attach payment refs:", error?.message);
    return null;
  }

  return mapOrderRow(data);
}
