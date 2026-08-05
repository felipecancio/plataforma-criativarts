import type { Metadata } from "next";
import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";

export const metadata: Metadata = {
  title: "Redefinir senha | Criativarts",
  description: "Defina uma nova senha para sua conta Criativarts.",
};

export default function UpdatePasswordPage() {
  return (
    <section className="auth-card">
      <header className="auth-card-header">
        <h1>Redefinir senha</h1>
        <p>Escolha uma nova senha para a sua conta.</p>
      </header>
      <UpdatePasswordForm />
    </section>
  );
}
