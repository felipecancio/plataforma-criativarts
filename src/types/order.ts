import type {
  OrderItemRow,
  OrderRow,
  UserLibraryRow,
  Enums,
} from "@/types/database";
import type { Product } from "@/types/product";

export type OrderStatus = Enums<"order_status">;
export type LibraryStatus = Enums<"library_status">;

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "cancelled",
  "refunded",
  "failed",
  "expired",
] as const satisfies readonly OrderStatus[];

export const LIBRARY_STATUSES = [
  "active",
  "revoked",
] as const satisfies readonly LibraryStatus[];

export type Order = {
  id: string;
  userId: string | null;
  status: OrderStatus;
  currency: string;
  subtotal: number;
  total: number;
  customerEmail: string | null;
  paymentProvider: string | null;
  paymentId: string | null;
  preferenceId: string | null;
  paidAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productSlug: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  createdAt: string;
  updatedAt: string;
};

export type OrderWithItems = Order & {
  items: OrderItem[];
};

export type UserLibraryEntry = {
  id: string;
  userId: string;
  productId: string;
  orderId: string;
  orderItemId: string | null;
  status: LibraryStatus;
  grantedAt: string;
  createdAt: string;
  updatedAt: string;
};

/** Entrada da biblioteca com produto completo para os cards da loja */
export type UserLibraryProduct = UserLibraryEntry & {
  product: Product;
};

export type { OrderRow, OrderItemRow, UserLibraryRow };
