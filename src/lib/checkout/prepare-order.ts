import { createPendingOrder } from "@/lib/orders/queries";
import { getProducts } from "@/lib/products/queries";
import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/types/order";
import type { Product } from "@/types/product";

export type PrepareCheckoutResult =
  | {
      ok: true;
      order: Order;
      products: Product[];
      requiresPayment: true;
    }
  | {
      ok: false;
      code:
        | "unauthenticated"
        | "empty_cart"
        | "invalid_products"
        | "order_failed";
      message: string;
    };

/**
 * Prepara um pedido `pending` a partir dos IDs do carrinho.
 * Próximo passo (Mercado Pago): criar Preference com `order.id` e redirecionar.
 */
export async function prepareCheckoutOrder(
  productIds: string[]
): Promise<PrepareCheckoutResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      code: "unauthenticated",
      message: "Faça login para finalizar a compra.",
    };
  }

  const uniqueIds = [...new Set(productIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return {
      ok: false,
      code: "empty_cart",
      message: "Seu carrinho está vazio.",
    };
  }

  const catalog = await getProducts();
  const products = uniqueIds
    .map((id) => catalog.find((product) => product.id === id))
    .filter((product): product is Product => Boolean(product));

  if (products.length !== uniqueIds.length) {
    return {
      ok: false,
      code: "invalid_products",
      message: "Um ou mais produtos do carrinho não estão disponíveis.",
    };
  }

  const order = await createPendingOrder({
    userId: user.id,
    customerEmail: user.email,
    products,
    metadata: {
      source: "cart",
      product_ids: uniqueIds,
    },
  });

  if (!order) {
    return {
      ok: false,
      code: "order_failed",
      message: "Não foi possível criar o pedido. Tente novamente.",
    };
  }

  return {
    ok: true,
    order,
    products,
    requiresPayment: true,
  };
}
