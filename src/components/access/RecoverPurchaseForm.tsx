"use client";

import { useState } from "react";
import Link from "next/link";

export function RecoverPurchaseForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginHint, setLoginHint] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoginHint(false);
    setLoading(true);

    try {
      const response = await fetch("/api/access/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        message?: string;
        code?: string;
      };

      if (!payload.ok) {
        setError(payload.message ?? "Não foi possível continuar.");
        setLoading(false);
        return;
      }

      setMessage(
        payload.message ??
          "Se houver uma compra com este e-mail, enviamos as instruções."
      );
      setLoginHint(payload.code === "login_required");
      setLoading(false);
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
      {message && (
        <p className="auth-success" role="status">
          {message}
        </p>
      )}

      <label className="auth-field">
        <span>E-mail usado no pagamento</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
        {loading ? "Verificando…" : "Recuperar acesso"}
      </button>

      {loginHint && (
        <p className="auth-switch">
          <Link href="/entrar?next=/biblioteca">Ir para o login</Link>
        </p>
      )}
    </form>
  );
}
