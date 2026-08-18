/**
 * Conteúdo editorial de produto + reexports de tipos/helpers.
 * O catálogo vem de `lib/products/queries` (Supabase).
 * Fallback local em `lib/products/fallback` durante a transição.
 */

export type { Product, ProductDescriptionContent } from "@/types/product";

export { getDiscountPercent, getSavings } from "@/lib/products/mappers";

import type { ProductDescriptionContent } from "@/types/product";

/**
 * Descrição padrão mesclada — linguagem direta, técnica e objetiva.
 * Usada em todas as páginas de produto.
 */
export const productDescription: ProductDescriptionContent = {
  headline: "Coleção de Estampas Halftone",
  intro:
    "Artes com textura em retícula, alto contraste e acabamento premium. Prontas para marcas e estamparias que precisam de impacto visual sem perder tempo criando do zero.",
  receiveTitle: "O que você vai receber",
  receiveItems: [
    { text: "Designs em PNG de alta qualidade (tamanhos A4, A3 e A2)" },
    { text: "Artes prontas para impressão e personalização" },
    { text: "{{quantity}} artes na coleção, com estilo Halftone consistente" },
    { text: "Entrega imediata no e-mail após a compra", highlight: true },
    { text: "Acesso vitalício à Coleção" },
  ],
  whyTitle: "Por que escolher esta Coleção?",
  whyItems: [
    "Visual em alta: artes no estilo Halftone, com um design moderno, marcante e atemporal.",
    "Economize tempo: tenha artes prontas para usar e acelere sua produção sem começar do zero.",
    "Mais valor para seus produtos: crie estampas e materiais com aparência profissional que chamam a atenção dos clientes.",
    "Versatilidade: ideal para camisetas, quadros, pôsteres, canecas, DTF, sublimação e diversos outros projetos.",
    "Qualidade para impressão: arquivos em alta resolução, preparados para garantir excelente definição e acabamento profissional.",
  ],
};

export const productDescriptionSummary =
  "Coleção digital Halftone com artes em PNG de alta resolução, prontas para impressão e entrega imediata após a compra.";
