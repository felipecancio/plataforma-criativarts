import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pagamento não concluído | Criativarts",
  description: "O pagamento no Mercado Pago não foi concluído.",
};

/**
 * Retorno Checkout Pro (falha/cancelamento). Não altera pedido — só UX.
 */
export default function CheckoutErroPage() {
  return (
    <div className="checkout-page">
      <div className="container checkout-return">
        <h1>Pagamento não concluído</h1>
        <p>
          O pagamento foi cancelado ou não foi aprovado no Mercado Pago. Nenhum
          acesso foi liberado. Você pode tentar novamente quando quiser.
        </p>
        <div className="checkout-return-actions">
          <Link href="/checkout" className="btn btn-primary">
            Tentar novamente
          </Link>
          <Link href="/carrinho" className="btn btn-secondary">
            Voltar ao carrinho
          </Link>
        </div>
      </div>
    </div>
  );
}
