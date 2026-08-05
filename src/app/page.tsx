import { Hero } from "@/components/Hero";
import { ProductGrid } from "@/components/ProductGrid";
import { getProducts } from "@/lib/products/queries";

export default async function HomePage() {
  const products = await getProducts();

  return (
    <>
      <Hero />
      <ProductGrid products={products} />
    </>
  );
}
