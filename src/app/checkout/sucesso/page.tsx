import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pagamento confirmado | Criativarts",
  description: "Seu pagamento foi confirmado. Acesse seu material na biblioteca.",
};

/**
 * Retorno do checkout hospedado (Asaas / Pro).
 * Não libera acesso aqui — confirmação vem do webhook; CTA leva à biblioteca.
 */
export default function CheckoutSucessoPage() {
  return (
    <div className="checkout-page">
      <div className="container checkout-return">
        <h1>Pagamento confirmado</h1>
        <p>
          Seu pagamento foi confirmado e seu produto já está disponível!
        </p>
        <p>
          Basta clicar no botão abaixo e fazer login (ou criar sua conta) pra
          acessar:
        </p>
        <div className="checkout-return-actions">
          <Link href="/biblioteca" className="btn btn-primary">
            Acessar Material
          </Link>
        </div>
      </div>
    </div>
  );
}
