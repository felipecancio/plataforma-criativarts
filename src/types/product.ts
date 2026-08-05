import type { ProductRow } from "@/types/database";

/** Provedores de arquivo digital suportados (extensível). */
export type ProductStorageProvider = "r2";

export type Product = {
  id: string;
  name: string;
  slug: string;
  quantity: number;
  style: string;
  price: number;
  compareAtPrice: number;
  soldCount: number;
  image: string;
  gallery: string[];
  /** Provedor do arquivo (ex.: r2). Null = ainda não associado. */
  storageProvider: ProductStorageProvider | null;
  /** Chave do objeto no bucket privado. Null = sem arquivo. */
  storageKey: string | null;
};

export type ProductDescriptionContent = {
  headline: string;
  intro: string;
  receiveTitle: string;
  receiveItems: Array<{ text: string; highlight?: boolean }>;
  whyTitle: string;
  whyItems: string[];
};

/** Row do Supabase — preferir import de @/types/database */
export type { ProductRow };
