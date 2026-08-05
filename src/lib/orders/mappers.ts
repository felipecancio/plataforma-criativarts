import type { Json, OrderItemRow, OrderRow, UserLibraryRow } from "@/types/database";
import type {
  Order,
  OrderItem,
  OrderWithItems,
  UserLibraryEntry,
} from "@/types/order";

export function mapOrderRow(row: OrderRow): Order {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    currency: row.currency,
    subtotal: Number(row.subtotal),
    total: Number(row.total),
    customerEmail: row.customer_email,
    paymentProvider: row.payment_provider,
    paymentId: row.payment_id,
    preferenceId: row.preference_id,
    paidAt: row.paid_at,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapOrderItemRow(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    productName: row.product_name,
    productSlug: row.product_slug,
    unitPrice: Number(row.unit_price),
    quantity: row.quantity,
    lineTotal: Number(row.line_total),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapOrderWithItems(
  row: OrderRow & { order_items?: OrderItemRow[] | null }
): OrderWithItems {
  return {
    ...mapOrderRow(row),
    items: (row.order_items ?? []).map(mapOrderItemRow),
  };
}

export function mapUserLibraryRow(row: UserLibraryRow): UserLibraryEntry {
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    orderId: row.order_id,
    orderItemId: row.order_item_id,
    status: row.status,
    grantedAt: row.granted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toOrderMetadata(value: Record<string, unknown>): Json {
  return value as Json;
}
