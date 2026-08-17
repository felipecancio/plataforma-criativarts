"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_AUTHENTICATED_REDIRECT,
  safeRedirectPath,
} from "@/lib/auth/config";
import {
  AUTH_MESSAGES,
  isValidEmailFormat,
  mapSignInErrorMessage,
} from "@/lib/auth/messages";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeRedirectPath(
    searchParams.get("next"),
    DEFAULT_AUTHENTICATED_REDIRECT
  );
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    authError === "auth" ? AUTH_MESSAGES.loginAuthCallbackFailed : null
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!isValidEmailFormat(trimmedEmail)) {
      setError(AUTH_MESSAGES.loginEmailInvalid);
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInError) {
        setError(mapSignInErrorMessage(signInError.message));
        return;
      }

      router.replace(next);
      router.refresh();
    } catch {
      setError(AUTH_MESSAGES.loginConnection);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {error && <p className="auth-alert" role="alert">{error}</p>}

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

      <label className="auth-field">
        <span>Senha</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      <div className="auth-links-row">
        <Link href="/recuperar-senha">Esqueci minha senha</Link>
      </div>

      <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
        {loading ? "Entrando…" : "Entrar"}
      </button>

      <p className="auth-switch">
        Ainda não tem conta?{" "}
        <Link href={`/cadastro?next=${encodeURIComponent(next)}`}>
          Criar conta
        </Link>
        <br />
        Já comprou sem conta? <Link href="/ja-comprei">Recuperar acesso</Link>
      </p>
    </form>
  );
}
