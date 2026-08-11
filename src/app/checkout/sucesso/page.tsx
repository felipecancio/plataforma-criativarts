import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pagamento em processamento | Criativarts",
  description: "Estamos confirmando seu pagamento com o Mercado Pago.",
};

/**
 * Retorno Checkout Pro (sucesso). Não libera acesso — só UX.
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
          Se o pagamento for aprovado e você ainda não tiver conta, enviaremos
          um e-mail para <strong>criar seu acesso</strong> (apenas uma senha).
          Se já tiver conta com o mesmo e-mail, o material entra na biblioteca
          automaticamente.
        </p>
        <div className="checkout-return-actions">
          <Link href="/biblioteca" className="btn btn-primary">
            Ir para a biblioteca
          </Link>
          <Link href="/ja-comprei" className="btn btn-secondary">
            Já fiz uma compra
          </Link>
          <Link href="/criar-acesso" className="btn btn-secondary">
            Criar meu acesso
          </Link>
        </div>
      </div>
    </div>
  );
}
