import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { userOwnsProduct } from "@/lib/library/queries";
import { getProductById } from "@/lib/products/queries";
import { productHasStorageFile } from "@/lib/products/mappers";
import {
  createPresignedDownloadUrl,
  hasR2Env,
} from "@/lib/r2";

/**
 * GET /api/downloads/[productId]
 *
 * Fluxo definitivo:
 * auth → ownership (user_library / pedido paid) → storage_key no produto → R2 Presigned URL
 */

const EXPIRES_IN_SECONDS = 60 * 5;

type RouteContext = {
  params: Promise<{ productId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { productId: rawId } = await context.params;
    const productId = rawId?.trim();

    if (!productId) {
      return NextResponse.json(
        { ok: false, message: "Produto inválido." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, message: "Faça login para baixar." },
        { status: 401 }
      );
    }

    const owns = await userOwnsProduct(productId);
    if (!owns) {
      return NextResponse.json(
        { ok: false, message: "Você não possui este produto na biblioteca." },
        { status: 403 }
      );
    }

    if (!hasR2Env()) {
      return NextResponse.json(
        { ok: false, message: "Storage R2 não configurado no servidor." },
        { status: 503 }
      );
    }

    const product = await getProductById(productId);
    if (!product) {
      return NextResponse.json(
        { ok: false, message: "Produto não encontrado." },
        { status: 404 }
      );
    }

    if (!productHasStorageFile(product) || product.storageProvider !== "r2") {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Arquivo deste produto ainda não está disponível para download.",
        },
        { status: 422 }
      );
    }

    const storageKey = product.storageKey!.trim();
    const fileName = storageKey.split("/").pop() || `${product.slug}.rar`;

    const url = await createPresignedDownloadUrl({
      key: storageKey,
      expiresIn: EXPIRES_IN_SECONDS,
      downloadFileName: fileName,
    });

    return NextResponse.json(
      {
        ok: true,
        url,
        expiresIn: EXPIRES_IN_SECONDS,
        productId: product.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[api/downloads]", error);
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível gerar o download.",
      },
      { status: 500 }
    );
  }
}
