/**
 * Verifica o catálogo no Supabase e faz upsert dos produtos.
 * Pré-requisito: migrations 001 + 009 + 010 (storage R2).
 * Inclui storage_provider / storage_key (caminho relativo no bucket).
 *
 * Uso: node --env-file=.env.local scripts/sync-products.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env.local optional if vars already set
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / anon key in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

const products = [
  {
    id: "1",
    name: "Coleção Animes - HALFTONE",
    slug: "animes",
    quantity: 132,
    style: "Halftone",
    price: 29.9,
    compare_at_price: 59.9,
    sold_count: 112,
    image: "/products/animes.webp",
    gallery: [
      "/products/animes.webp",
      "/products/animes-2.webp",
      "/products/animes-3.webp",
      "/products/animes-4.webp",
    ],
    sort_order: 1,
    is_active: true,
    storage_provider: "r2",
    storage_key: "Animes/ANIMES 132.rar",
  },
  {
    id: "8",
    name: "Coleção Animes Vol. 2 - HALFTONE",
    slug: "animesvol2",
    quantity: 162,
    style: "Halftone",
    price: 24.9,
    compare_at_price: 49.9,
    sold_count: 91,
    image: "/products/animesvol2.webp",
    gallery: [
      "/products/animesvol2.webp",
      "/products/animesvol2-2.webp",
      "/products/animesvol2-3.webp",
      "/products/animesvol2-4.webp",
    ],
    sort_order: 2,
    is_active: true,
    storage_provider: "r2",
    storage_key: "Animes vol 2/HALFTONE-006.rar",
  },
  {
    id: "2",
    name: "Coleção Filmes - HALFTONE",
    slug: "filmes",
    quantity: 119,
    style: "Halftone",
    price: 22.9,
    compare_at_price: 39.9,
    sold_count: 67,
    image: "/products/filmes.webp",
    gallery: [
      "/products/filmes.webp",
      "/products/filmes-2.webp",
      "/products/filmes-3.webp",
    ],
    sort_order: 3,
    is_active: true,
    storage_provider: "r2",
    storage_key: "Filmes/filmes 119.rar",
  },
  {
    id: "3",
    name: "Coleção Futebol - HALFTONE",
    slug: "futebol",
    quantity: 128,
    style: "Halftone",
    price: 22.9,
    compare_at_price: 39.9,
    sold_count: 94,
    image: "/products/futebol.webp",
    gallery: [
      "/products/futebol.webp",
      "/products/futebol-2.webp",
      "/products/futebol-3.webp",
    ],
    sort_order: 4,
    is_active: true,
    storage_provider: "r2",
    storage_key: "Futebol/FUTEBOL 128.rar",
  },
  {
    id: "4",
    name: "Coleção Jogos - HALFTONE",
    slug: "jogos",
    quantity: 112,
    style: "Halftone",
    price: 29.9,
    compare_at_price: 59.9,
    sold_count: 51,
    image: "/products/jogos.webp",
    gallery: [
      "/products/jogos.webp",
      "/products/jogos-2.webp",
      "/products/jogos-3.webp",
    ],
    sort_order: 5,
    is_active: true,
    storage_provider: "r2",
    storage_key: "Games/PERSONAGENS JOGOS 112.rar",
  },
  {
    id: "5",
    name: "Coleção Religião - HALFTONE",
    slug: "religiao",
    quantity: 112,
    style: "Halftone",
    price: 29.9,
    compare_at_price: 59.9,
    sold_count: 78,
    image: "/products/religiao.webp",
    gallery: [
      "/products/religiao.webp",
      "/products/religiao-2.webp",
      "/products/religiao-3.webp",
    ],
    sort_order: 6,
    is_active: true,
    storage_provider: "r2",
    storage_key: "Religião/RELIGIÃO 112.rar",
  },
  {
    id: "6",
    name: "Coleção Rock - HALFTONE",
    slug: "rock",
    quantity: 183,
    style: "Halftone",
    price: 22.9,
    compare_at_price: 39.9,
    sold_count: 103,
    image: "/products/rock.webp",
    gallery: [
      "/products/rock.webp",
      "/products/rock-2.webp",
      "/products/rock-3.webp",
    ],
    sort_order: 7,
    is_active: true,
    storage_provider: "r2",
    storage_key: "Rock/rock 183.rar",
  },
  {
    id: "7",
    name: "Coleção Streetwear - HALFTONE",
    slug: "streetwear",
    quantity: 123,
    style: "Halftone",
    price: 29.9,
    compare_at_price: 59.9,
    sold_count: 59,
    image: "/products/streetwear.webp",
    gallery: [
      "/products/streetwear.webp",
      "/products/streetwear-2.webp",
      "/products/streetwear-3.webp",
    ],
    sort_order: 8,
    is_active: true,
    storage_provider: "r2",
    storage_key: "Streetwear/STREETWEAR 123.rar",
  },
];

const { error: readError } = await supabase
  .from("products")
  .select("id")
  .limit(1);

if (readError) {
  console.error("Tabela `products` inacessível:", readError.message);
  console.error(
    "Abra o Supabase → SQL Editor e execute o arquivo supabase/migrations/001_products.sql"
  );
  process.exit(1);
}

const { error: upsertError } = await supabase.from("products").upsert(products, {
  onConflict: "id",
});

if (upsertError) {
  console.error("Falha ao sincronizar produtos:", upsertError.message);
  console.error(
    "Se o erro for de permissão (RLS), execute o SQL completo da migration (já inclui o seed),"
  );
  console.error("ou adicione SUPABASE_SERVICE_ROLE_KEY no .env.local e rode de novo.");
  process.exit(1);
}

const { count } = await supabase
  .from("products")
  .select("*", { count: "exact", head: true })
  .eq("is_active", true);

console.log(`Catálogo sincronizado. Produtos ativos: ${count ?? products.length}`);
