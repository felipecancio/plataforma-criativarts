import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/env";

/**
 * Client anônimo sem cookies — ideal para leituras públicas (catálogo).
 * Não depende de request/cookies, então funciona em SSG e Server Components.
 */
export function createPublicClient() {
  if (!hasSupabaseEnv()) {
    throw new Error("Supabase env missing");
  }

  const { url, key } = getSupabaseEnv();
  return createSupabaseClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export type PublicSupabaseClient = ReturnType<typeof createPublicClient>;
