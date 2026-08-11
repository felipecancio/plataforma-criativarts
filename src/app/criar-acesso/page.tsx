import type { Metadata } from "next";
import Link from "next/link";
import {
  createAdminClient,
  hasSupabaseServiceRole,
} from "@/lib/supabase/admin";
import { hashClaimToken } from "@/lib/orders/claim";
import { CreateAccessForm } from "@/components/access/CreateAccessForm";

export const metadata: Metadata = {
  title: "Criar acesso | Criativarts",
  description: "Crie sua senha para acessar a biblioteca após a compra.",
};

type PageProps = {
  searchParams: Promise<{ orderId?: string; token?: string }>;
};

export default async function CriarAcessoPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const orderId = params.orderId?.trim() ?? "";
  const token = params.token?.trim() ?? "";

  if (!orderId || !token || !hasSupabaseServiceRole()) {
    return (
      <div className="checkout-page">
        <div className="container checkout-return">
          <h1>Link inválido</h1>
          <p>
            Este link de acesso está incompleto. Use o e-mail da compra ou a
            página “Já fiz uma compra”.
          </p>
          <div className="checkout-return-actions">
            <Link href="/ja-comprei" className="btn btn-primary">
              Já fiz uma compra
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, status, user_id, customer_email, metadata")
    .eq("id", orderId)
    .maybeSingle();

  const meta = (order?.metadata ?? {}) as Record<string, unknown>;
  const tokenOk =
    order &&
    order.status === "paid" &&
    typeof meta.claim_token_hash === "string" &&
    meta.claim_token_hash === hashClaimToken(token) &&
    !meta.claim_consumed_at;

  if (!order || !tokenOk || !order.customer_email) {
    return (
      <div className="checkout-page">
        <div className="container checkout-return">
          <h1>Link inválido ou expirado</h1>
          <p>
            Não foi possível validar este acesso. Se você já pagou, recupere o
            link com o e-mail da compra.
          </p>
          <div className="checkout-return-actions">
            <Link href="/ja-comprei" className="btn btn-primary">
              Já fiz uma compra
            </Link>
            <Link href="/entrar" className="btn btn-secondary">
              Entrar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (order.user_id) {
    return (
      <div className="checkout-page">
        <div className="container checkout-return">
          <h1>Acesso já criado</h1>
          <p>
            Este pedido já está vinculado a uma conta. Faça login com o e-mail
            da compra para abrir sua biblioteca.
          </p>
          <div className="checkout-return-actions">
            <Link
              href="/entrar?next=/biblioteca"
              className="btn btn-primary"
            >
              Entrar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <header className="auth-card-header">
          <h1>Pagamento confirmado</h1>
          <p>
            Seu pagamento foi aprovado. Crie uma senha para acessar a biblioteca
            e baixar seu material.
          </p>
        </header>
        <CreateAccessForm
          orderId={orderId}
          token={token}
          email={order.customer_email}
        />
      </section>
    </div>
  );
}
