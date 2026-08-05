import { createPendingOrder } from "@/lib/orders/queries";
import { getMercadoPagoServerClient } from "@/lib/mercadopago/server";
import { hasMercadoPagoAccessToken } from "@/lib/mercadopago/env";
import { createClient } from "@/lib/supabase/server";
import { mapProductRow } from "@/lib/products/mappers";
import type { ProductRow } from "@/types/database";
import type { Order } from "@/types/order";
import type { Product } from "@/types/product";

export type CreatePaymentSessionInput = {
  productIds: string[];
};

export type CreatePaymentSessionSuccess = {
  ok: true;
  orderId: string;
  status: Order["status"];
  currency: string;
  /** Valor oficial recalculado no servidor — usar no Payment Brick */
  amount: number;
  /** external_reference para o Payment.create nas próximas etapas */
  externalReference: string;
  items: Array<{
    productId: string;
    name: string;
    slug: string;
    unitPrice: number;
    quantity: number;
  }>;
  /**
   * Dados prontos para inicializar o Payment Brick.
   * preferenceId fica null até a etapa de Wallet/Preference.
   */
  brick: {
    amount: number;
    preferenceId: null;
  };
  mercadoPago: {
    configured: boolean;
  };
};

export type CreatePaymentSessionFailure = {
  ok: false;
  code:
    | "unauthenticated"
    | "empty_cart"
    | "invalid_products"
    | "inactive_products"
    | "order_failed"
    | "mp_not_configured";
  message: string;
};

export type CreatePaymentSessionResult =
  | CreatePaymentSessionSuccess
  | CreatePaymentSessionFailure;

function normalizeProductIds(productIds: string[]): string[] {
  return [...new Set(productIds.map((id) => id.trim()).filter(Boolean))];
}

async function fetchOfficialProducts(ids: string[]): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, slug, quantity, style, price, compare_at_price, sold_count, image, gallery, sort_order, is_active, storage_provider, storage_key, created_at, updated_at"
    )
    .in("id", ids)
    .eq("is_active", true);

  if (error) {
    console.warn("[payments] Failed to load products:", error.message);
    return [];
  }

  const rows = (data ?? []) as ProductRow[];
  const byId = new Map(rows.map((row) => [row.id, mapProductRow(row)]));

  // Preserva a ordem pedida pelo cliente, sem inventar produtos.
  return ids
    .map((id) => byId.get(id))
    .filter((product): product is Product => Boolean(product));
}

/**
 * Cria sessão de checkout:
 * - autenticação obrigatória
 * - preços só do banco
 * - order pending + itens
 * - SDK MP validado no servidor (Payment Brick na próxima etapa de cobrança)
 */
export async function createPaymentSession(
  input: CreatePaymentSessionInput
): Promise<CreatePaymentSessionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      code: "unauthenticated",
      message: "Faça login para iniciar o pagamento.",
    };
  }

  const productIds = normalizeProductIds(input.productIds);
  if (productIds.length === 0) {
    return {
      ok: false,
      code: "empty_cart",
      message: "Informe ao menos um produto do carrinho.",
    };
  }

  if (productIds.length > 50) {
    return {
      ok: false,
      code: "invalid_products",
      message: "Quantidade de produtos inválida.",
    };
  }

  if (!hasMercadoPagoAccessToken()) {
    return {
      ok: false,
      code: "mp_not_configured",
      message: "Credenciais do Mercado Pago não configuradas no servidor.",
    };
  }

  // Garante que o Access Token carrega o client oficial (sem criar cobrança ainda).
  try {
    getMercadoPagoServerClient();
  } catch {
    return {
      ok: false,
      code: "mp_not_configured",
      message: "Não foi possível inicializar o SDK do Mercado Pago.",
    };
  }

  const products = await fetchOfficialProducts(productIds);

  if (products.length !== productIds.length) {
    return {
      ok: false,
      code: "invalid_products",
      message:
        "Um ou mais produtos são inválidos ou indisponíveis. Atualize o carrinho.",
    };
  }

  // Total oficial — nunca confiar em preço do client.
  const amount = Number(
    products.reduce((sum, product) => sum + product.price, 0).toFixed(2)
  );

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      ok: false,
      code: "invalid_products",
      message: "Não foi possível calcular o total do pedido.",
    };
  }

  const order = await createPendingOrder({
    userId: user.id,
    customerEmail: user.email ?? null,
    products,
    paymentProvider: "mercadopago",
    metadata: {
      source: "payments_create",
      product_ids: productIds,
      provider: "mercadopago",
      brick: "payment",
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
    orderId: order.id,
    status: "pending",
    currency: "BRL",
    amount,
    externalReference: order.id,
    items: products.map((product) => ({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      unitPrice: product.price,
      quantity: 1,
    })),
    brick: {
      amount,
      preferenceId: null,
    },
    mercadoPago: {
      configured: true,
    },
  };
}
