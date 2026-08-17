"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { createAsaasCheckoutRequest } from "@/lib/payments/client";
import { formatPrice } from "@/lib/format";

type CheckoutAsaasPanelProps = {
  productIds: string[];
  displayTotal: number;
};

/**
 * Asaas Checkout hospedado: cria sessão no servidor e redireciona (Pix + cartão).
 */
export function CheckoutAsaasPanel({
  productIds,
  displayTotal,
}: CheckoutAsaasPanelProps) {
  const { clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    if (loading || productIds.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const result = await createAsaasCheckoutRequest(productIds);

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

      clearCart();
      window.location.assign(result.checkoutUrl);
    } catch {
      setError("Falha de rede ao iniciar o checkout Asaas. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="checkout-pro-panel">
      <p className="checkout-pro-lead">
        Nós usamos o checkout seguro do Asaas.com. Basta concluir sua compra no
        botão abaixo que o envio do seu acesso é imediato.
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
        className="btn btn-pay btn-block"
        onClick={() => void handlePay()}
        disabled={loading || productIds.length === 0}
      >
        {loading ? "Abrindo pagamento…" : "Realizar Pagamento"}
      </button>

      <p className="checkout-summary-note">
        Nenhum de seus dados fica armazenado em nosso sistema. Apenas recebemos
        as confirmações de compra. Suas informações estão 100% protegidas.
      </p>

      <Link href="/carrinho" className="btn btn-secondary btn-block">
        Voltar ao carrinho
      </Link>
    </div>
  );
}
