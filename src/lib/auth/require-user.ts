import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/auth/config";

/**
 * Garante usuário autenticado em Server Components / páginas.
 * Complementa o middleware (defesa em profundidade).
 *
 * @param authPath Destino se não autenticado (`/cadastro` ou `/entrar`).
 */
export async function requireUser(
  nextPath = "/biblioteca",
  authPath: "/cadastro" | "/entrar" = "/entrar"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = safeRedirectPath(nextPath, "/biblioteca");
    redirect(`${authPath}?next=${encodeURIComponent(next)}`);
  }

  return user;
}
