import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import type { UserLibraryProduct } from "@/types/order";

export function LibraryEmptyState() {
  return (
    <div className="library-empty" role="status">
      <p className="library-empty-title">Sua biblioteca ainda está vazia</p>
      <p className="library-empty-text">
        Quando você adquirir uma coleção, ela aparece aqui automaticamente —
        pronta para acessar quando quiser.
      </p>
      <Link href="/#colecoes" className="btn btn-primary">
        Explorar coleções
      </Link>
    </div>
  );
}

export function LibraryGrid({ items }: { items: UserLibraryProduct[] }) {
  if (items.length === 0) {
    return <LibraryEmptyState />;
  }

  return (
    <div className="library-catalog">
      <div className="library-block-head">
        <h2>Suas coleções</h2>
        <p>
          {items.length} {items.length === 1 ? "coleção adquirida" : "coleções adquiridas"}
        </p>
      </div>

      <div className="product-grid">
        {items.map((entry) => (
          <ProductCard
            key={entry.id}
            product={entry.product}
            owned
          />
        ))}
      </div>
    </div>
  );
}
