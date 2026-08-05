"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types/product";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import { CartIcon } from "@/components/CartIcon";
import { LibraryDownloadButton } from "@/components/LibraryDownloadButton";

export function ProductCard({
  product,
  badge,
  owned = false,
}: {
  product: Product;
  badge?: string;
  /** Quando true, usa o mesmo card da loja com CTA de download */
  owned?: boolean;
}) {
  const { addItem, hasItem, openCart } = useCart();
  const inCart = hasItem(product.id);
  const displayBadge = owned ? badge ?? "Na biblioteca" : badge;

  return (
    <article className={`product-card${owned ? " product-card--owned" : ""}`}>
      <Link href={`/produto/${product.slug}`} className="product-media">
        {displayBadge && <span className="product-badge">{displayBadge}</span>}
        <Image
          src={product.image}
          alt={product.name}
          width={1000}
          height={1000}
          priority={false}
        />
      </Link>

      <div className="product-body">
        <div className="product-top">
          <h3>
            <Link href={`/produto/${product.slug}`}>{product.name}</Link>
          </h3>
          <div className="product-price-block">
            <span className="product-price-compare">
              {formatPrice(product.compareAtPrice)}
            </span>
            <span className="product-price">{formatPrice(product.price)}</span>
          </div>
        </div>

        <ul className="product-meta">
          <li>{product.quantity} artes</li>
          <li>{product.style}</li>
        </ul>

        <div className="product-actions">
          {owned ? (
            <LibraryDownloadButton productId={product.id} />
          ) : inCart ? (
            <button type="button" className="btn btn-in-cart" onClick={openCart}>
              <CartIcon />
              No carrinho
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-cart"
              onClick={() => addItem(product.id)}
            >
              Adicionar ao carrinho
            </button>
          )}
          {!owned && (
            <Link href={`/produto/${product.slug}`} className="btn btn-secondary">
              Ver mais
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
