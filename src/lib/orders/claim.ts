import { createHash, randomBytes } from "crypto";
import {
  createAdminClient,
  hasSupabaseServiceRole,
} from "@/lib/supabase/admin";
import { getAppBaseUrl } from "@/lib/mercadopago/env";

const CLAIM_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias

export function hashClaimToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateClaimToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Gera e persiste claim token (hash) em orders.metadata.
 * Retorna o token em claro uma única vez (para e-mail/link).
 */
export async function issueOrderClaimToken(
  orderId: string
): Promise<{ token: string; claimUrl: string } | null> {
  if (!hasSupabaseServiceRole()) return null;

  const baseUrl = getAppBaseUrl();
  if (!baseUrl) return null;

  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("orders")
    .select("id, status, user_id, metadata")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) return null;
  if (order.status !== "paid") return null;
  if (order.user_id) return null;

  const meta = (order.metadata ?? {}) as Record<string, unknown>;
  // Reutilizar token válido existente? Não — não temos o plaintext. Sempre novo.
  const token = generateClaimToken();
  const tokenHash = hashClaimToken(token);
  const expiresAt = new Date(Date.now() + CLAIM_TTL_MS).toISOString();

  const { error: updateError } = await admin
    .from("orders")
    .update({
      metadata: {
        ...meta,
        claim_token_hash: tokenHash,
        claim_expires_at: expiresAt,
        claim_consumed_at: null,
      } as import("@/types/database").Json,
    })
    .eq("id", orderId)
    .is("user_id", null);

  if (updateError) {
    console.error("[claim] failed to store token hash:", updateError.message);
    return null;
  }

  const claimUrl = `${baseUrl}/criar-acesso?orderId=${encodeURIComponent(orderId)}&token=${encodeURIComponent(token)}`;
  return { token, claimUrl };
}

export async function findUserIdByEmail(
  email: string
): Promise<string | null> {
  if (!hasSupabaseServiceRole()) return null;
  const trimmed = email.trim();
  if (!trimmed) return null;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("find_user_id_by_email", {
    p_email: trimmed,
  });

  if (error) {
    console.error("[claim] find_user_id_by_email failed:", error.message);
    return null;
  }

  return typeof data === "string" && data.length > 0 ? data : null;
}
