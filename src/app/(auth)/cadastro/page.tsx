import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata: Metadata = {
  title: "Criar conta | Criativarts",
  description: "Crie sua conta Criativarts.",
};

export default function SignUpPage() {
  return (
    <section className="auth-card">
      <header className="auth-card-header">
        <h1>Criar conta</h1>
        <p>Cadastre-se para acessar a plataforma.</p>
      </header>
      <SignUpForm />
    </section>
  );
}
