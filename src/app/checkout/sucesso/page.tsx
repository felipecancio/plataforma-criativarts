import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pagamento em processamento | Criativarts",
  description: "Estamos confirmando seu pagamento com o Mercado Pago.",
};

/**
 * Retorno Checkout Pro (sucesso). Não libera acesso — só UX.
 * A liberação ocorre via webhook após confirmação real do pagamento.
 */
export default function CheckoutSucessoPage() {
  return (
    <div className="checkout-page">
      <div className="container checkout-return">
        <h1>Pagamento recebido</h1>
        <p>
          Recebemos o retorno do Mercado Pago. Estamos confirmando o pagamento
          no servidor — isso pode levar alguns instantes.
        </p>
        <p>
          Assim que o pagamento for aprovado, os packs entram na sua biblioteca
          automaticamente e você recebe um e-mail de acesso.
        </p>
        <div className="checkout-return-actions">
          <Link href="/biblioteca" className="btn btn-primary">
            Ir para a biblioteca
          </Link>
          <Link href="/" className="btn btn-secondary">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}
