import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Entrar | Criativarts",
  description: "Acesse sua conta Criativarts.",
};

export default function LoginPage() {
  return (
    <section className="auth-card">
      <header className="auth-card-header">
        <h1>Entrar</h1>
        <p>Acesse sua conta para continuar.</p>
      </header>
      <Suspense fallback={<p className="auth-loading">Carregando…</p>}>
        <LoginForm />
      </Suspense>
    </section>
  );
}
