export const AUTH_ROUTES = [
  "/entrar",
  "/cadastro",
  "/recuperar-senha",
] as const;

/** Rotas que exigem sessão autenticada */
export const PROTECTED_ROUTES = [
  "/biblioteca",
  "/redefinir-senha",
] as const;

/** Destino padrão após login / quando usuário autenticado acessa telas de auth */
export const DEFAULT_AUTHENTICATED_REDIRECT = "/biblioteca";

export function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function isProtectedRoute(pathname: string) {
  return PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function safeRedirectPath(path: string | null | undefined, fallback = "/") {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }
  return path;
}
