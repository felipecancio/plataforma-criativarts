"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  AUTH_MESSAGES,
  isValidEmailFormat,
  mapResetPasswordErrorMessage,
} from "@/lib/auth/messages";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const trimmedEmail = email.trim();
    if (!isValidEmailFormat(trimmedEmail)) {
      setError(AUTH_MESSAGES.loginEmailInvalid);
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const origin = window.location.origin;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        trimmedEmail,
        {
          redirectTo: `${origin}/auth/callback?next=/redefinir-senha`,
        }
      );

      if (resetError) {
        setError(mapResetPasswordErrorMessage(resetError.message));
        return;
      }

      setSuccess(true);
    } catch {
      setError(AUTH_MESSAGES.resetConnection);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {error && <p className="auth-alert" role="alert">{error}</p>}
      {success && (
        <p className="auth-success" role="status">
          {AUTH_MESSAGES.resetSuccess}
        </p>
      )}

      <label className="auth-field">
        <span>E-mail</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
        {loading ? "Enviando…" : "Enviar link de recuperação"}
      </button>

      <p className="auth-switch">
        Lembrou a senha? <Link href="/entrar">Voltar ao login</Link>
      </p>
    </form>
  );
}
