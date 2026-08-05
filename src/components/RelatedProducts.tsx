"use client";

import { useRef } from "react";
import type { Product } from "@/types/product";
import { ProductCard } from "@/components/ProductCard";

export function RelatedProducts({ products }: { products: Product[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (products.length === 0) return null;

  function getStep() {
    const el = scrollerRef.current;
    if (!el) return 0;
    const slide = el.querySelector(".related-slide") as HTMLElement | null;
    if (!slide) return 0;
    const styles = window.getComputedStyle(el);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
    return slide.offsetWidth + gap;
  }

  function scrollByOne(direction: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;

    const step = getStep();
    if (!step) return;

    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const current = el.scrollLeft;
    const epsilon = 8;

    if (direction > 0 && current >= maxScroll - epsilon) {
      el.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }

    if (direction < 0 && current <= epsilon) {
      el.scrollTo({ left: maxScroll, behavior: "smooth" });
      return;
    }

    el.scrollBy({ left: step * direction, behavior: "smooth" });
  }

  return (
    <section className="related-section" aria-label="Você pode gostar também">
      <div className="related-head">
        <h2>Você pode gostar também:</h2>
      </div>

      <div className="related-carousel-wrap">
        <button
          type="button"
          className="related-side-btn related-side-prev"
          onClick={() => scrollByOne(-1)}
          aria-label="Coleção anterior"
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

        <div className="related-carousel" ref={scrollerRef}>
          {products.map((item) => (
            <div className="related-slide" key={item.id}>
              <ProductCard product={item} />
            </div>
          ))}
        </div>

        <button
          type="button"
          className="related-side-btn related-side-next"
          onClick={() => scrollByOne(1)}
          aria-label="Próxima coleção"
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
      </div>
    </section>
  );
}
