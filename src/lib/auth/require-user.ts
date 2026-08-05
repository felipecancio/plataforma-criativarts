import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/auth/config";

/**
 * Garante usuário autenticado em Server Components / páginas.
 * Complementa o middleware (defesa em profundidade).
 */
export async function requireUser(nextPath = "/biblioteca") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = safeRedirectPath(nextPath, "/biblioteca");
    redirect(`/entrar?next=${encodeURIComponent(next)}`);
  }

  return user;
}
