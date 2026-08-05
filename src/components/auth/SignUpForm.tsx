"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_AUTHENTICATED_REDIRECT } from "@/lib/auth/config";
import {
  AUTH_MESSAGES,
  isDuplicateSignUpUser,
  isValidEmailFormat,
  mapSignUpErrorMessage,
} from "@/lib/auth/messages";

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError(AUTH_MESSAGES.signupNameRequired);
      return;
    }

    if (!isValidEmailFormat(trimmedEmail)) {
      setError(AUTH_MESSAGES.signupEmailInvalid);
      return;
    }

    if (password !== confirmPassword) {
      setError(AUTH_MESSAGES.signupPasswordMismatch);
      return;
    }

    if (password.length < 6) {
      setError(AUTH_MESSAGES.signupPasswordTooShort);
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const origin = window.location.origin;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(DEFAULT_AUTHENTICATED_REDIRECT)}`,
          data: {
            name: trimmedName,
          },
        },
      });

      if (signUpError) {
        setError(mapSignUpErrorMessage(signUpError.message));
        return;
      }

      // E-mail já cadastrado: Supabase pode retornar 200 sem erro e identities=[].
      if (isDuplicateSignUpUser(data.user)) {
        setError(AUTH_MESSAGES.signupEmailTaken);
        return;
      }

      if (!data.user) {
        setError(AUTH_MESSAGES.signupFailed);
        return;
      }

      // Conta criada e sessão imediata (confirmação de e-mail desligada).
      if (data.session) {
        router.replace(DEFAULT_AUTHENTICATED_REDIRECT);
        router.refresh();
        return;
      }

      // Conta criada de fato — aguardando confirmação de e-mail.
      setSuccess(AUTH_MESSAGES.signupSuccessConfirmEmail);
    } catch {
      setError(AUTH_MESSAGES.signupConnection);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {error && <p className="auth-alert" role="alert">{error}</p>}
      {success && (
        <p className="auth-success" role="status">
          {success}
        </p>
      )}

      <label className="auth-field">
        <span>Nome</span>
        <input
          type="text"
          name="name"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>

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
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      <label className="auth-field">
        <span>Confirmar senha</span>
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
        {loading ? "Criando conta…" : "Criar conta"}
      </button>

      <p className="auth-switch">
        Já tem conta? <Link href="/entrar">Entrar</Link>
      </p>
    </form>
  );
}
