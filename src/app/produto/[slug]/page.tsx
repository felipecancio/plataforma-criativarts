import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductDescriptionSummary } from "@/data/products";
import {
  getAllProductSlugs,
  getProductBySlug,
  getRelatedProducts,
} from "@/lib/products/queries";
import { ProductDetail } from "@/components/ProductDetail";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: "Produto não encontrado | Criativarts" };
  }

  return {
    title: `${product.name} | Criativarts`,
    description: getProductDescriptionSummary(slug),
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = await getRelatedProducts(product.id);

  return (
    <ProductDetail product={product} relatedProducts={relatedProducts} />
  );
}
