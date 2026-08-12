import {
  getAsaasApiBaseUrl,
  getAsaasApiKey,
  hasAsaasApiKey,
} from "@/lib/asaas/env";

export type AsaasApiError = {
  status: number;
  message: string;
  errors?: Array<{ code?: string; description?: string }>;
};

export async function asaasFetch<T>(
  path: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; error: AsaasApiError }> {
  if (!hasAsaasApiKey()) {
    return {
      ok: false,
      error: { status: 503, message: "ASAAS_API_KEY não configurada." },
    };
  }

  const url = `${getAsaasApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      access_token: getAsaasApiKey(),
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    const record =
      json && typeof json === "object" ? (json as Record<string, unknown>) : null;
    const errors = Array.isArray(record?.errors)
      ? (record.errors as Array<{ code?: string; description?: string }>)
      : undefined;
    const description = errors?.[0]?.description;
    return {
      ok: false,
      error: {
        status: response.status,
        message:
          (typeof description === "string" && description) ||
          (typeof record?.message === "string" && record.message) ||
          `Asaas HTTP ${response.status}`,
        errors,
      },
    };
  }

  return { ok: true, data: json as T };
}
