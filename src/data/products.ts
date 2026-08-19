/**
 * Conteúdo editorial de produto + reexports de tipos/helpers.
 * O catálogo vem de `lib/products/queries` (Supabase).
 * Fallback local em `lib/products/fallback` durante a transição.
 */

export type { Product, ProductDescriptionContent } from "@/types/product";

export { getDiscountPercent, getSavings } from "@/lib/products/mappers";

import type { ProductDescriptionContent } from "@/types/product";

/**
 * Descrição padrão (coleções Halftone).
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

/**
 * Copy específica — Coleção Animes Lendas (editáveis).
 */
export const animesLendasDescription: ProductDescriptionContent = {
  headline: "Coleção Animes Lendas — EDITÁVEIS",
  intro:
    "Designs Graphic Tee e Streetwear com arquivos editáveis e PNGs prontos para aplicação. Feita para quem precisa de artes comerciais com liberdade total de personalização.",
  receiveTitle: "O que você vai receber",
  receiveItems: [
    { text: "120 artes exclusivas no estilo Graphic Tee e Streetwear" },
    {
      text: "Arquivos editáveis em EPS e AI, permitindo personalizar cores, tamanhos e outros elementos",
    },
    {
      text: "Versões em PNG de alta qualidade, prontas para impressão e aplicação",
    },
    {
      text: "Designs profissionais com visual moderno, urbano e marcante",
    },
    {
      text: "Entrega imediata por e-mail após a confirmação da compra",
      highlight: true,
    },
    { text: "Acesso vitalício à coleção" },
  ],
  whyTitle: "Por que escolher esta coleção?",
  whyItems: [
    "Estilo em alta: designs Graphic Tee com identidade forte, moderna e comercial.",
    "Total liberdade para personalizar: edite cores, dimensões e elementos.",
    "Economize tempo: tenha artes profissionais prontas para usar ou adaptar, sem precisar começar do zero.",
    "Mais valor em seus produtos: produza estampas impactantes, capazes de chamar a atenção dos clientes.",
    "Compatível com diferentes métodos: utilize as artes em projetos de DTF, DTG, serigrafia, sublimação e outras técnicas.",
    "Qualidade profissional: arquivos preparados para oferecer excelente definição e ótimo acabamento na impressão.",
  ],
};

/**
 * Copy específica — Coleção Teddy Bear (PNG alta resolução).
 */
export const teddyBearDescription: ProductDescriptionContent = {
  headline: "Coleção Teddy Bear",
  intro:
    "Designs Graphic Tee Streetwear com arquivos PNGs em alta resolução prontos para aplicação. Feita para quem precisa de artes profissionais e que se destaquem.",
  receiveTitle: "O que você vai receber",
  receiveItems: [
    { text: "100 artes exclusivas no estilo Graphic Tee Streetwear" },
    {
      text: "Versão em PNG de alta qualidade, prontas para impressão e aplicação",
    },
    {
      text: "Designs profissionais com visual moderno, urbano e marcante",
    },
    {
      text: "Entrega imediata por e-mail após a confirmação da compra",
      highlight: true,
    },
    { text: "Acesso vitalício à coleção" },
  ],
  whyTitle: "Por que escolher esta coleção?",
  whyItems: [
    "Estilo em alta: designs Graphic Tee com identidade forte, moderna e comercial.",
    "Economize tempo: tenha artes profissionais prontas para usar ou adaptar, sem precisar começar do zero.",
    "Mais valor em seus produtos: produza estampas impactantes, capazes de chamar a atenção dos clientes.",
    "Compatível com diferentes métodos: utilize as artes em projetos de DTF, DTG, serigrafia, sublimação e outras técnicas.",
    "Qualidade profissional: arquivos preparados para oferecer excelente definição e ótimo acabamento na impressão.",
  ],
};

/**
 * Copy específica — Coleção Japanese Samurai (PNG alta resolução).
 */
export const japaneseSamuraiDescription: ProductDescriptionContent = {
  headline: "Coleção Japanese Samurai",
  intro:
    "Designs Graphic Tee Streetwear com arquivos PNGs em alta resolução prontos para aplicação. Feita para quem precisa de artes profissionais e que se destaquem.",
  receiveTitle: "O que você vai receber",
  receiveItems: [
    { text: "104 artes exclusivas no estilo Graphic Tee Streetwear" },
    {
      text: "Versão em PNG de alta qualidade, prontas para impressão e aplicação",
    },
    {
      text: "Designs profissionais com visual moderno, urbano e marcante",
    },
    {
      text: "Entrega imediata por e-mail após a confirmação da compra",
      highlight: true,
    },
    { text: "Acesso vitalício à coleção" },
  ],
  whyTitle: "Por que escolher esta coleção?",
  whyItems: [
    "Estilo em alta: designs Graphic Tee com identidade forte, moderna e comercial.",
    "Economize tempo: tenha artes profissionais prontas para usar ou adaptar, sem precisar começar do zero.",
    "Mais valor em seus produtos: produza estampas impactantes, capazes de chamar a atenção dos clientes.",
    "Compatível com diferentes métodos: utilize as artes em projetos de DTF, DTG, serigrafia, sublimação e outras técnicas.",
    "Qualidade profissional: arquivos preparados para oferecer excelente definição e ótimo acabamento na impressão.",
  ],
};

const descriptionsBySlug: Record<string, ProductDescriptionContent> = {
  animeslendas: animesLendasDescription,
  teddybear: teddyBearDescription,
  samurai: japaneseSamuraiDescription,
};

/** Retorna a copy da página do produto (override por slug quando existir). */
export function getProductDescription(
  slug: string
): ProductDescriptionContent {
  return descriptionsBySlug[slug] ?? productDescription;
}

export const productDescriptionSummary =
  "Coleção digital Halftone com artes em PNG de alta resolução, prontas para impressão e entrega imediata após a compra.";

export const animesLendasDescriptionSummary =
  "Coleção Animes Lendas com 120 artes Graphic Tee editáveis (EPS/AI) e PNG prontos para impressão, com entrega imediata após a compra.";

export const teddyBearDescriptionSummary =
  "Coleção Teddy Bear com designs Graphic Tee Streetwear em PNG de alta resolução, prontos para aplicação, com entrega imediata após a compra.";

export const japaneseSamuraiDescriptionSummary =
  "Coleção Japanese Samurai com designs Graphic Tee Streetwear em PNG de alta resolução, prontos para aplicação, com entrega imediata após a compra.";

export function getProductDescriptionSummary(slug: string): string {
  if (slug === "animeslendas") return animesLendasDescriptionSummary;
  if (slug === "teddybear") return teddyBearDescriptionSummary;
  if (slug === "samurai") return japaneseSamuraiDescriptionSummary;
  return productDescriptionSummary;
}
