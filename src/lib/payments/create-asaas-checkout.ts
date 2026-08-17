import { asaasFetch } from "@/lib/asaas/client";
import { hasAsaasApiKey } from "@/lib/asaas/env";
import { getAppBaseUrl } from "@/lib/mercadopago/env";
import {
  attachPaymentReferences,
  attachPaymentReferencesAdmin,
  createGuestPendingOrder,
  createPendingOrder,
} from "@/lib/orders/queries";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseServiceRole } from "@/lib/supabase/admin";
import { mapProductRow } from "@/lib/products/mappers";
import type { ProductRow } from "@/types/database";
import type { Product } from "@/types/product";

export type CreateAsaasCheckoutInput = {
  productIds: string[];
};

export type CreateAsaasCheckoutSuccess = {
  ok: true;
  orderId: string;
  checkoutId: string;
  amount: number;
  currency: string;
  externalReference: string;
  /** URL hospedada pelo Asaas (Pix + cartão) */
  checkoutUrl: string;
  items: Array<{
    productId: string;
    name: string;
    slug: string;
    unitPrice: number;
    quantity: number;
  }>;
};

export type CreateAsaasCheckoutFailure = {
  ok: false;
  code:
    | "unauthenticated"
    | "empty_cart"
    | "invalid_products"
    | "inactive_products"
    | "order_failed"
    | "asaas_not_configured"
    | "app_url_missing"
    | "checkout_failed"
    | "service_role_missing";
  message: string;
};

export type CreateAsaasCheckoutResult =
  | CreateAsaasCheckoutSuccess
  | CreateAsaasCheckoutFailure;

type AsaasCheckoutResponse = {
  id?: string;
  link?: string | null;
  status?: string;
  externalReference?: string | null;
};

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
    console.warn("[asaas] Failed to load products:", error.message);
    return [];
  }

  const rows = (data ?? []) as ProductRow[];
  const byId = new Map(rows.map((row) => [row.id, mapProductRow(row)]));

  return ids
    .map((id) => byId.get(id))
    .filter((product): product is Product => Boolean(product));
}

/**
 * Asaas Checkout hospedado (Pix + cartão), paralelo ao Checkout Pro.
 * - Logado: reutiliza createPaymentSession.
 * - Guest: order user_id NULL via service role.
 */
export async function createAsaasCheckout(
  input: CreateAsaasCheckoutInput
): Promise<CreateAsaasCheckoutResult> {
  if (!hasAsaasApiKey()) {
    return {
      ok: false,
      code: "asaas_not_configured",
      message: "Credenciais do Asaas não configuradas no servidor.",
    };
  }

  const baseUrl = getAppBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      code: "app_url_missing",
      message:
        "Defina APP_URL (ex.: https://criativarts.com) para callbacks do Asaas.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const products = await fetchOfficialProducts(productIds);
  if (products.length !== productIds.length) {
    return {
      ok: false,
      code: "invalid_products",
      message:
        "Um ou mais produtos são inválidos ou indisponíveis. Atualize o carrinho.",
    };
  }

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

  let orderId: string;
  let currency: string;
  let externalReference: string;
  let items: CreateAsaasCheckoutSuccess["items"];
  let isGuest = false;

  if (user) {
    const order = await createPendingOrder({
      userId: user.id,
      customerEmail: user.email ?? null,
      products,
      paymentProvider: "asaas",
      metadata: {
        source: "asaas_checkout",
        product_ids: productIds,
        provider: "asaas",
      },
    });

    if (!order) {
      return {
        ok: false,
        code: "order_failed",
        message: "Não foi possível criar o pedido. Tente novamente.",
      };
    }

    orderId = order.id;
    currency = order.currency;
    externalReference = order.id;
    items = products.map((product) => ({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      unitPrice: product.price,
      quantity: 1,
    }));
  } else {
    if (!hasSupabaseServiceRole()) {
      return {
        ok: false,
        code: "service_role_missing",
        message:
          "Guest checkout requer SUPABASE_SERVICE_ROLE_KEY no servidor.",
      };
    }

    const order = await createGuestPendingOrder({
      products,
      paymentProvider: "asaas",
      metadata: {
        source: "asaas_checkout_guest",
        product_ids: productIds,
        provider: "asaas",
      },
    });

    if (!order) {
      return {
        ok: false,
        code: "order_failed",
        message: "Não foi possível criar o pedido. Tente novamente.",
      };
    }

    isGuest = true;
    orderId = order.id;
    currency = order.currency;
    externalReference = order.id;
    items = products.map((product) => ({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      unitPrice: product.price,
      quantity: 1,
    }));
  }

  const body: Record<string, unknown> = {
    billingTypes: ["PIX", "CREDIT_CARD"],
    chargeTypes: ["DETACHED"],
    minutesToExpire: 60,
    externalReference: orderId,
    callback: {
      successUrl: `${baseUrl}/checkout/sucesso`,
      cancelUrl: `${baseUrl}/checkout/erro`,
      expiredUrl: `${baseUrl}/checkout/pendente`,
    },
    items: items.map((item) => ({
      externalReference: item.productId,
      name: item.name,
      description: item.slug,
      quantity: item.quantity,
      value: Number(item.unitPrice.toFixed(2)),
    })),
  };

  // Não enviar customerData parcial: o Asaas exige cpfCnpj nesse objeto.
  // Sem customerData, o checkout hospedado coleta CPF/e-mail (guest e logado).

  const created = await asaasFetch<AsaasCheckoutResponse>("/checkouts", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!created.ok) {
    console.error("[asaas] checkout create failed", created.error);
    return {
      ok: false,
      code: "checkout_failed",
      message: created.error.message,
    };
  }

  const checkoutId =
    typeof created.data.id === "string" ? created.data.id.trim() : "";
  const checkoutUrl =
    typeof created.data.link === "string" ? created.data.link.trim() : "";

  if (!checkoutId || !checkoutUrl) {
    return {
      ok: false,
      code: "checkout_failed",
      message: "Asaas não retornou link do checkout.",
    };
  }

  if (isGuest) {
    await attachPaymentReferencesAdmin(orderId, {
      preferenceId: checkoutId,
      paymentProvider: "asaas",
    });
  } else {
    await attachPaymentReferences(orderId, {
      preferenceId: checkoutId,
      paymentProvider: "asaas",
    });
  }

  return {
    ok: true,
    orderId,
    checkoutId,
    amount,
    currency,
    externalReference,
    checkoutUrl,
    items,
  };
}
