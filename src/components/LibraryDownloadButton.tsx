"use client";

import { useState } from "react";

type DownloadResponse =
  | { ok: true; url: string }
  | { ok: false; message: string };

/**
 * Botão Download da biblioteca — chama GET /api/downloads/[productId].
 * Mantém o mesmo estilo do CTA principal do ProductCard.
 */
export function LibraryDownloadButton({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    if (loading) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/downloads/${encodeURIComponent(productId)}`);
      const payload = (await response.json()) as DownloadResponse;

      if (!payload.ok) {
        window.alert(payload.message || "Não foi possível iniciar o download.");
        return;
      }

      window.location.href = payload.url;
    } catch {
      window.alert("Falha de rede ao solicitar o download.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="btn btn-primary btn-block"
      onClick={() => void handleDownload()}
      disabled={loading}
      aria-busy={loading}
    >
      {loading ? "Preparando download…" : "Download"}
    </button>
  );
}
