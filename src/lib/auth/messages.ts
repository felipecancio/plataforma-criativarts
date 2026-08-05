/**
 * Mensagens de autenticação padronizadas (apenas UI — não altera Supabase Auth).
 */

export const AUTH_MESSAGES = {
  // Cadastro
  signupNameRequired: "Informe seu nome.",
  signupEmailInvalid: "Informe um e-mail válido.",
  signupPasswordMismatch: "As senhas não coincidem.",
  signupPasswordTooShort: "A senha deve ter pelo menos 6 caracteres.",
  signupEmailTaken: "Este e-mail já está cadastrado. Tente entrar.",
  signupPasswordWeak: "A senha não atende aos requisitos mínimos.",
  signupFailed: "Não foi possível criar a conta. Tente novamente.",
  signupConnection:
    "Falha de conexão ao criar a conta. Verifique sua internet e tente novamente.",
  signupSuccessConfirmEmail:
    "Conta criada. Verifique seu e-mail para confirmar o cadastro e depois faça login.",

  // Login
  loginEmailInvalid: "Informe um e-mail válido.",
  loginInvalidCredentials: "E-mail ou senha incorretos.",
  loginEmailNotConfirmed: "Confirme seu e-mail antes de entrar.",
  loginFailed: "Não foi possível entrar. Tente novamente.",
  loginConnection:
    "Falha de conexão ao entrar. Verifique sua internet e tente novamente.",
  loginAuthCallbackFailed:
    "Não foi possível confirmar o acesso. Tente entrar novamente.",

  // Recuperação / redefinição
  resetFailed: "Não foi possível enviar o e-mail. Tente novamente.",
  resetConnection:
    "Falha de conexão ao enviar o e-mail. Verifique sua internet e tente novamente.",
  resetSuccess:
    "Se existir uma conta com este e-mail, você receberá um link para redefinir a senha.",
  updatePasswordMismatch: "As senhas não coincidem.",
  updatePasswordTooShort: "A senha deve ter pelo menos 6 caracteres.",
  updatePasswordFailed: "Não foi possível atualizar a senha. Tente novamente.",
  updatePasswordConnection:
    "Falha de conexão ao atualizar a senha. Verifique sua internet e tente novamente.",
} as const;

export function isValidEmailFormat(email: string): boolean {
  const value = email.trim();
  // Validação básica de formato — suficiente para UX; o Supabase valida de fato.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Detecta cadastro "fantasma" do Supabase: e-mail já existe,
 * mas a API retorna 200 sem erro e com identities vazio.
 */
export function isDuplicateSignUpUser(user: {
  identities?: Array<unknown> | null;
} | null): boolean {
  if (!user) return false;
  return Array.isArray(user.identities) && user.identities.length === 0;
}

export function mapSignUpErrorMessage(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("already registered") ||
    lower.includes("already been registered") ||
    lower.includes("user already exists") ||
    lower.includes("email address is already")
  ) {
    return AUTH_MESSAGES.signupEmailTaken;
  }

  if (
    lower.includes("invalid email") ||
    lower.includes("email address") && lower.includes("invalid") ||
    lower.includes("unable to validate email")
  ) {
    return AUTH_MESSAGES.signupEmailInvalid;
  }

  if (
    lower.includes("password") &&
    (lower.includes("weak") ||
      lower.includes("short") ||
      lower.includes("least") ||
      lower.includes("characters") ||
      lower.includes("should be"))
  ) {
    return AUTH_MESSAGES.signupPasswordWeak;
  }

  if (lower.includes("password")) {
    return AUTH_MESSAGES.signupPasswordWeak;
  }

  if (
    lower.includes("fetch") ||
    lower.includes("network") ||
    lower.includes("failed to fetch")
  ) {
    return AUTH_MESSAGES.signupConnection;
  }

  return AUTH_MESSAGES.signupFailed;
}

export function mapSignInErrorMessage(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid credentials") ||
    lower.includes("user not found")
  ) {
    return AUTH_MESSAGES.loginInvalidCredentials;
  }

  if (
    lower.includes("email not confirmed") ||
    lower.includes("email_not_confirmed")
  ) {
    return AUTH_MESSAGES.loginEmailNotConfirmed;
  }

  if (
    lower.includes("fetch") ||
    lower.includes("network") ||
    lower.includes("failed to fetch")
  ) {
    return AUTH_MESSAGES.loginConnection;
  }

  return AUTH_MESSAGES.loginFailed;
}

export function mapResetPasswordErrorMessage(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("invalid email") ||
    lower.includes("unable to validate email")
  ) {
    return AUTH_MESSAGES.loginEmailInvalid;
  }

  if (
    lower.includes("fetch") ||
    lower.includes("network") ||
    lower.includes("failed to fetch")
  ) {
    return AUTH_MESSAGES.resetConnection;
  }

  return AUTH_MESSAGES.resetFailed;
}

export function mapUpdatePasswordErrorMessage(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("password")) {
    return AUTH_MESSAGES.signupPasswordWeak;
  }

  if (
    lower.includes("fetch") ||
    lower.includes("network") ||
    lower.includes("failed to fetch")
  ) {
    return AUTH_MESSAGES.updatePasswordConnection;
  }

  return AUTH_MESSAGES.updatePasswordFailed;
}
