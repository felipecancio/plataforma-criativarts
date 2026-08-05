import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Recuperar senha | Criativarts",
  description: "Recupere o acesso à sua conta Criativarts.",
};

export default function ForgotPasswordPage() {
  return (
    <section className="auth-card">
      <header className="auth-card-header">
        <h1>Recuperar senha</h1>
        <p>Enviaremos um link de redefinição para o seu e-mail.</p>
      </header>
      <ForgotPasswordForm />
    </section>
  );
}
