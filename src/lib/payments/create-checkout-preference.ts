import { randomUUID } from "crypto";
import { Preference } from "mercadopago";
import { createPaymentSession } from "@/lib/payments/create-payment-session";
import { attachPaymentReferences } from "@/lib/orders/queries";
import { getMercadoPagoServerClient } from "@/lib/mercadopago/server";
import {
  getAppBaseUrl,
  getMercadoPagoCredentialMode,
  getMercadoPagoNotificationUrl,
  hasMercadoPagoAccessToken,
} from "@/lib/mercadopago/env";
import { createClient } from "@/lib/supabase/server";

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
    | "preference_failed";
  message: string;
};

export type CreateCheckoutPreferenceResult =
  | CreateCheckoutPreferenceSuccess
  | CreateCheckoutPreferenceFailure;

/**
 * Checkout Pro: cria order pending (mesma lógica do Brick) + Preference MP.
 * Liberação de biblioteca permanece exclusivamente via webhook/API MP.
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

  const session = await createPaymentSession({ productIds: input.productIds });
  if (!session.ok) {
    return {
      ok: false,
      code: session.code,
      message: session.message,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payerEmail = user?.email?.trim() || undefined;
  const notificationUrl = getMercadoPagoNotificationUrl();

  try {
    const preferenceClient = new Preference(getMercadoPagoServerClient());
    const preference = await preferenceClient.create({
      body: {
        external_reference: session.orderId,
        notification_url: notificationUrl ?? undefined,
        auto_return: "approved",
        back_urls: {
          success: `${baseUrl}/checkout/sucesso`,
          pending: `${baseUrl}/checkout/pendente`,
          failure: `${baseUrl}/checkout/erro`,
        },
        items: session.items.map((item) => ({
          id: item.productId,
          title: item.name,
          quantity: item.quantity,
          unit_price: Number(item.unitPrice.toFixed(2)),
          currency_id: "BRL",
          description: item.slug,
        })),
        ...(payerEmail ? { payer: { email: payerEmail } } : {}),
        metadata: {
          order_id: session.orderId,
          source: "checkout_pro",
        },
      },
      requestOptions: {
        idempotencyKey: randomUUID(),
      },
    });

    const preferenceId =
      typeof preference.id === "string" ? preference.id : String(preference.id ?? "");

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

    await attachPaymentReferences(session.orderId, {
      preferenceId,
      paymentProvider: "mercadopago",
    });

    return {
      ok: true,
      orderId: session.orderId,
      preferenceId,
      amount: session.amount,
      currency: session.currency,
      externalReference: session.externalReference,
      initPoint,
      items: session.items,
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
