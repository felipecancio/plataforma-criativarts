import type { Metadata } from "next";
import Link from "next/link";
import { RecoverPurchaseForm } from "@/components/access/RecoverPurchaseForm";

export const metadata: Metadata = {
  title: "Já fiz uma compra | Criativarts",
  description:
    "Recupere o acesso à sua compra usando o e-mail do pagamento no Mercado Pago.",
};

export default function JaCompreiPage() {
  return (
    <div className="auth-page">
      <section className="auth-card">
        <header className="auth-card-header">
          <h1>Já fiz uma compra</h1>
          <p>
            Informe o e-mail usado no pagamento. Se a compra estiver confirmada,
            enviamos o link para criar seu acesso ou orientamos o login.
          </p>
        </header>
        <RecoverPurchaseForm />
        <p className="auth-switch">
          Já tem conta? <Link href="/entrar?next=/biblioteca">Entrar</Link>
        </p>
      </section>
    </div>
  );
}
