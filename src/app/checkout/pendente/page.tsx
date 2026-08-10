import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pagamento pendente | Criativarts",
  description: "Seu pagamento no Mercado Pago ainda está pendente.",
};

/**
 * Retorno Checkout Pro (pendente). Não libera acesso — só UX.
 */
export default function CheckoutPendentePage() {
  return (
    <div className="checkout-page">
      <div className="container checkout-return">
        <h1>Pagamento pendente</h1>
        <p>
          Seu pagamento ainda está em processamento no Mercado Pago (comum em
          PIX). Quando for aprovado, liberamos a biblioteca automaticamente.
        </p>
        <div className="checkout-return-actions">
          <Link href="/biblioteca" className="btn btn-primary">
            Ver biblioteca
          </Link>
          <Link href="/carrinho" className="btn btn-secondary">
            Voltar ao carrinho
          </Link>
        </div>
      </div>
    </div>
  );
}
