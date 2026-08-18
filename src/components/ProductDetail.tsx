"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type TouchEvent } from "react";
import {
  getDiscountPercent,
  getSavings,
  getProductDescription,
} from "@/data/products";
import type { Product } from "@/types/product";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import { trackViewContent } from "@/lib/analytics";
import { toProductPayload } from "@/lib/analytics/mappers";
import { CartIcon } from "@/components/CartIcon";
import { RelatedProducts } from "@/components/RelatedProducts";

export function ProductDetail({
  product,
  relatedProducts,
}: {
  product: Product;
  relatedProducts: Product[];
}) {
  const { addItem, hasItem, openCart } = useCart();
  const gallery = product.gallery.length > 0 ? product.gallery : [product.image];
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const inCart = hasItem(product.id);
  const discount = getDiscountPercent(product);
  const savings = getSavings(product);
  const copy = getProductDescription(product.slug);
  const activeImage = gallery[activeIndex] ?? product.image;
  const canNavigate = gallery.length > 1;

  useEffect(() => {
    setActiveIndex(0);
  }, [product.id]);

  useEffect(() => {
    trackViewContent(toProductPayload(product, 1));
  }, [product.id, product]);

  function showPrev() {
    setActiveIndex((index) => (index - 1 + gallery.length) % gallery.length);
  }

  function showNext() {
    setActiveIndex((index) => (index + 1) % gallery.length);
  }

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  }

  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (touchStartX.current === null || !canNavigate) return;
    const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) showPrev();
    else showNext();
  }

  return (
    <div className="product-page">
      <div className="container">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Início</Link>
          <span>/</span>
          <Link href="/#colecoes">Coleções</Link>
          <span>/</span>
          <span>{product.name}</span>
        </nav>

        <div className="product-layout">
          <div className="product-gallery">
            <div
              className="product-main-image"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              <Image
                src={activeImage}
                alt={product.name}
                width={1000}
                height={1000}
                priority
              />

              {canNavigate && (
                <>
                  <button
                    type="button"
                    className="gallery-nav gallery-nav-prev"
                    onClick={showPrev}
                    aria-label="Imagem anterior"
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M15 6L9 12l6 6"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="gallery-nav gallery-nav-next"
                    onClick={showNext}
                    aria-label="Próxima imagem"
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M9 6l6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </>
              )}
            </div>

            <div className="product-thumbs">
              {gallery.map((src, index) => (
                <button
                  key={src}
                  type="button"
                  className={`thumb ${activeIndex === index ? "active" : ""}`}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Ver imagem ${index + 1}`}
                >
                  <Image src={src} alt="" width={220} height={220} />
                </button>
              ))}
            </div>
          </div>

          <div className="product-info">
            <p className="product-sold">+{product.soldCount} vendidos</p>
            <h1>{product.name}</h1>

            <div className="product-pricing">
              <p className="price-compare">{formatPrice(product.compareAtPrice)}</p>
              <div className="price-row">
                <p className="price-current">{formatPrice(product.price)}</p>
                {discount > 0 && (
                  <span className="price-discount">{discount}% OFF</span>
                )}
              </div>
              {savings > 0 && (
                <p className="price-save">Economize: {formatPrice(savings)}</p>
              )}
            </div>

            <div className="product-facts">
              <div className="fact">
                <span>Artes na Coleção</span>
                <strong>{product.quantity} artes</strong>
              </div>
              <div className="fact">
                <span>Estilo</span>
                <strong>{product.style}</strong>
              </div>
            </div>

            <div className="product-buy">
              {inCart ? (
                <button
                  type="button"
                  className="btn btn-in-cart btn-block"
                  onClick={openCart}
                >
                  <CartIcon />
                  Já está no carrinho
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-cart btn-block"
                  onClick={() => addItem(product.id)}
                >
                  Adicionar ao Carrinho
                </button>
              )}
              <Link href="/#colecoes" className="btn btn-secondary btn-block">
                Ver outras Coleções
              </Link>
            </div>
          </div>
        </div>

        <section className="product-description" aria-label="Descrição do produto">
          <div className="desc-intro">
            <h2>{copy.headline}</h2>
            <p>{copy.intro}</p>
          </div>

          <div className="desc-box">
            <h3>{copy.receiveTitle}</h3>
            <ul className="desc-checklist">
              {copy.receiveItems.map((item) => {
                const text = item.text.replace(
                  "{{quantity}}",
                  String(product.quantity)
                );
                return (
                  <li
                    key={item.text}
                    className={item.highlight ? "is-highlight" : undefined}
                  >
                    <span aria-hidden>✅</span> {text}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="desc-box">
            <h3>{copy.whyTitle}</h3>
            <ul className="desc-benefits">
              {copy.whyItems.map((item) => (
                <li key={item}>
                  <span aria-hidden>✨</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <RelatedProducts products={relatedProducts} />
      </div>
    </div>
  );
}
