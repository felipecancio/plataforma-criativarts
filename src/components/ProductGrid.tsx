import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/types/product";

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <section id="colecoes" className="products-section">
      <div className="container">
        <div className="section-head">
          <h2>Coleções em destaque</h2>
          <p>Coleções digitais prontas para download imediato.</p>
        </div>

        <div className="product-grid">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              badge={product.slug === "animes" ? "Mais vendido" : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
