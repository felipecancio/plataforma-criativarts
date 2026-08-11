import { randomUUID } from "crypto";
import { Preference } from "mercadopago";
import { createPaymentSession } from "@/lib/payments/create-payment-session";
import {
  attachPaymentReferences,
  attachPaymentReferencesAdmin,
  createGuestPendingOrder,
} from "@/lib/orders/queries";
import { getMercadoPagoServerClient } from "@/lib/mercadopago/server";
import {
  getAppBaseUrl,
  getMercadoPagoCredentialMode,
  getMercadoPagoNotificationUrl,
  hasMercadoPagoAccessToken,
} from "@/lib/mercadopago/env";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseServiceRole } from "@/lib/supabase/admin";
import { mapProductRow } from "@/lib/products/mappers";
import type { ProductRow } from "@/types/database";
import type { Product } from "@/types/product";

export type CreateCheckoutPreferenceInput = {
  productIds: string[];
};

export type CreateCheckoutPreferenceSuccess = {
  ok: true;
  orderId: string;
  preferenceId: string;
  amount: number;
  currency: string;
  externalReference: string;
  /** URL de redirecionamento (live ou sandbox conforme credenciais) */
  initPoint: string;
  items: Array<{
    productId: string;
    name: string;
    slug: string;
    unitPrice: number;
    quantity: number;
  }>;
};

export type CreateCheckoutPreferenceFailure = {
  ok: false;
  code:
    | "unauthenticated"
    | "empty_cart"
    | "invalid_products"
    | "inactive_products"
    | "order_failed"
    | "mp_not_configured"
    | "app_url_missing"
    | "preference_failed"
    | "service_role_missing";
  message: string;
};

export type CreateCheckoutPreferenceResult =
  | CreateCheckoutPreferenceSuccess
  | CreateCheckoutPreferenceFailure;

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

  return ids
    .map((id) => byId.get(id))
    .filter((product): product is Product => Boolean(product));
}

/**
 * Checkout Pro: cria order pending + Preference MP.
 * - Logado: reutiliza createPaymentSession (user_id preenchido).
 * - Guest: order com user_id NULL via service role (sem cadastro prévio).
 */
export async function createCheckoutPreference(
  input: CreateCheckoutPreferenceInput
): Promise<CreateCheckoutPreferenceResult> {
  if (!hasMercadoPagoAccessToken()) {
    return {
      ok: false,
      code: "mp_not_configured",
      message: "Credenciais do Mercado Pago não configuradas no servidor.",
    };
  }

  const baseUrl = getAppBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      code: "app_url_missing",
      message:
        "Defina APP_URL (ex.: https://criativarts.com) para back_urls e notification_url.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let orderId: string;
  let amount: number;
  let currency: string;
  let externalReference: string;
  let items: CreateCheckoutPreferenceSuccess["items"];
  let payerEmail: string | undefined;
  let isGuest = false;

  if (user) {
    const session = await createPaymentSession({ productIds: input.productIds });
    if (!session.ok) {
      return {
        ok: false,
        code: session.code,
        message: session.message,
      };
    }
    orderId = session.orderId;
    amount = session.amount;
    currency = session.currency;
    externalReference = session.externalReference;
    items = session.items;
    payerEmail = user.email?.trim() || undefined;
  } else {
    if (!hasSupabaseServiceRole()) {
      return {
        ok: false,
        code: "service_role_missing",
        message:
          "Guest checkout requer SUPABASE_SERVICE_ROLE_KEY no servidor.",
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

    const products = await fetchOfficialProducts(productIds);
    if (products.length !== productIds.length) {
      return {
        ok: false,
        code: "invalid_products",
        message:
          "Um ou mais produtos são inválidos ou indisponíveis. Atualize o carrinho.",
      };
    }

    amount = Number(
      products.reduce((sum, product) => sum + product.price, 0).toFixed(2)
    );
    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        ok: false,
        code: "invalid_products",
        message: "Não foi possível calcular o total do pedido.",
      };
    }

    const order = await createGuestPendingOrder({
      products,
      paymentProvider: "mercadopago",
      metadata: {
        source: "checkout_pro_guest",
        product_ids: productIds,
        provider: "mercadopago",
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

  const notificationUrl = getMercadoPagoNotificationUrl();

  try {
    const preferenceClient = new Preference(getMercadoPagoServerClient());
    const preference = await preferenceClient.create({
      body: {
        external_reference: orderId,
        notification_url: notificationUrl ?? undefined,
        auto_return: "approved",
        back_urls: {
          success: `${baseUrl}/checkout/sucesso`,
          pending: `${baseUrl}/checkout/pendente`,
          failure: `${baseUrl}/checkout/erro`,
        },
        items: items.map((item) => ({
          id: item.productId,
          title: item.name,
          quantity: item.quantity,
          unit_price: Number(item.unitPrice.toFixed(2)),
          currency_id: "BRL",
          description: item.slug,
        })),
        ...(payerEmail ? { payer: { email: payerEmail } } : {}),
        metadata: {
          order_id: orderId,
          source: isGuest ? "checkout_pro_guest" : "checkout_pro",
        },
      },
      requestOptions: {
        idempotencyKey: randomUUID(),
      },
    });

    const preferenceId =
      typeof preference.id === "string"
        ? preference.id
        : String(preference.id ?? "");

    if (!preferenceId) {
      return {
        ok: false,
        code: "preference_failed",
        message: "Mercado Pago não retornou preference_id.",
      };
    }

    const mode = getMercadoPagoCredentialMode();
    const initPoint =
      mode === "test"
        ? preference.sandbox_init_point || preference.init_point
        : preference.init_point || preference.sandbox_init_point;

    if (!initPoint) {
      return {
        ok: false,
        code: "preference_failed",
        message: "Mercado Pago não retornou init_point.",
      };
    }

    if (isGuest) {
      await attachPaymentReferencesAdmin(orderId, {
        preferenceId,
        paymentProvider: "mercadopago",
      });
    } else {
      await attachPaymentReferences(orderId, {
        preferenceId,
        paymentProvider: "mercadopago",
      });
    }

    return {
      ok: true,
      orderId,
      preferenceId,
      amount,
      currency,
      externalReference,
      initPoint,
      items,
    };
  } catch (error) {
    console.error("[payments] Preference.create failed", error);

    let message = "Não foi possível criar a Preference no Mercado Pago.";
    if (error && typeof error === "object") {
      const err = error as {
        message?: unknown;
        cause?: Array<{ description?: string; message?: string }>;
      };
      const causeMessage =
        err.cause?.[0]?.description || err.cause?.[0]?.message;
      if (typeof causeMessage === "string" && causeMessage.trim()) {
        message = causeMessage;
      } else if (typeof err.message === "string" && err.message.trim()) {
        message = err.message;
      }
    }

    return {
      ok: false,
      code: "preference_failed",
      message,
    };
  }
}
