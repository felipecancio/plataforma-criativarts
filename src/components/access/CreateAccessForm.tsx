"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type CreateAccessFormProps = {
  orderId: string;
  token: string;
  email: string;
};

export function CreateAccessForm({
  orderId,
  token,
  email,
}: CreateAccessFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/access/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, token, password }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        message?: string;
        code?: string;
        email?: string;
      };

      if (!payload.ok) {
        setError(payload.message ?? "Não foi possível criar o acesso.");
        setLoading(false);
        if (payload.code === "email_exists" || payload.code === "already_claimed") {
          setTimeout(() => router.push("/entrar?next=/biblioteca"), 2000);
        }
        return;
      }

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: payload.email || email,
        password,
      });

      if (signInError) {
        setError(
          "Acesso criado. Faça login com seu e-mail e a senha definida."
        );
        setLoading(false);
        router.push("/entrar?next=/biblioteca");
        return;
      }

      router.replace("/biblioteca");
    } catch {
      setError("Falha de rede. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={(e) => void handleSubmit(e)}>
      {error && (
        <p className="auth-alert" role="alert">
          {error}
        </p>
      )}

      <label className="auth-field">
        <span>E-mail da compra</span>
        <input type="email" value={email} readOnly disabled />
      </label>

      <label className="auth-field">
        <span>Criar senha</span>
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      <label className="auth-field">
        <span>Confirmar senha</span>
        <input
          type="password"
          name="confirm"
          autoComplete="new-password"
          minLength={8}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </label>

      <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
        {loading ? "Criando acesso…" : "Criar meu acesso"}
      </button>
    </form>
  );
}
