"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_AUTHENTICATED_REDIRECT } from "@/lib/auth/config";
import {
  AUTH_MESSAGES,
  mapUpdatePasswordErrorMessage,
} from "@/lib/auth/messages";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(AUTH_MESSAGES.updatePasswordMismatch);
      return;
    }

    if (password.length < 6) {
      setError(AUTH_MESSAGES.updatePasswordTooShort);
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(mapUpdatePasswordErrorMessage(updateError.message));
        return;
      }

      router.replace(DEFAULT_AUTHENTICATED_REDIRECT);
      router.refresh();
    } catch {
      setError(AUTH_MESSAGES.updatePasswordConnection);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {error && <p className="auth-alert" role="alert">{error}</p>}

      <label className="auth-field">
        <span>Nova senha</span>
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      <label className="auth-field">
        <span>Confirmar nova senha</span>
        <input
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          minLength={6}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </label>

      <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
        {loading ? "Salvando…" : "Salvar nova senha"}
      </button>
    </form>
  );
}
