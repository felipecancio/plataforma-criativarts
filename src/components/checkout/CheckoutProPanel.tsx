"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { stashPendingPurchase } from "@/lib/analytics/pending-purchase";
import { createCheckoutPreferenceRequest } from "@/lib/payments/client";
import { formatPrice } from "@/lib/format";

type CheckoutProPanelProps = {
  productIds: string[];
  /** Total estimado do carrinho (só exibição; valor cobrado vem do servidor) */
  displayTotal: number;
};

/**
 * Checkout Pro: cria Preference no servidor e redireciona ao Mercado Pago.
 * Não coleta cartão/CPF — o MP hospeda o formulário.
 */
export function CheckoutProPanel({
  productIds,
  displayTotal,
}: CheckoutProPanelProps) {
  const { clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    if (loading || productIds.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const result = await createCheckoutPreferenceRequest(productIds);

      if (!result.ok) {
        setError(result.message);
        setLoading(false);
        return;
      }

      try {
        const keys = Object.keys(sessionStorage).filter((key) =>
          key.startsWith("criativarts-payment-session:")
        );
        keys.forEach((key) => sessionStorage.removeItem(key));
      } catch {
        // ignore
      }

      stashPendingPurchase({
        orderId: result.orderId,
        amount: result.amount,
        currency: result.currency,
        items: result.items,
      });

      clearCart();
      window.location.assign(result.initPoint);
    } catch {
      setError("Falha de rede ao iniciar o Checkout Pro. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="checkout-pro-panel">
      <p className="checkout-pro-lead">
        Você será redirecionado ao Mercado Pago para pagar com cartão, PIX ou
        outros meios. O acesso aos packs só é liberado após a confirmação do
        pagamento.
      </p>

      <p className="checkout-pro-total">
        Total a pagar: <strong>{formatPrice(displayTotal)}</strong>
      </p>

      {error && (
        <div className="checkout-brick-fallback" role="alert">
          <p className="checkout-brick-fallback-title">Não foi possível continuar</p>
          <p>{error}</p>
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={() => void handlePay()}
        disabled={loading || productIds.length === 0}
      >
        {loading ? "Abrindo Mercado Pago…" : "Pagar com Mercado Pago"}
      </button>

      <p className="checkout-summary-note">
        Ao continuar, um pedido é criado no servidor com o valor oficial dos
        produtos. A confirmação final vem pelo webhook do Mercado Pago.
      </p>

      <Link href="/carrinho" className="btn btn-secondary btn-block">
        Voltar ao carrinho
      </Link>
    </div>
  );
}
