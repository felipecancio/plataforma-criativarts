"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import { trackInitiateCheckout } from "@/lib/analytics";
import { toCartPayload } from "@/lib/analytics/mappers";

export function CartPageContent() {
  const { cartProducts, removeItem, subtotal, itemCount } = useCart();
  const checkoutTracked = useRef(false);

  const savings = useMemo(
    () =>
      cartProducts.reduce(
        (sum, product) =>
          sum + Math.max(0, product.compareAtPrice - product.price),
        0
      ),
    [cartProducts]
  );

  const compareTotal = useMemo(
    () =>
      cartProducts.reduce((sum, product) => sum + product.compareAtPrice, 0),
    [cartProducts]
  );

  useEffect(() => {
    if (itemCount === 0 || checkoutTracked.current) return;
    trackInitiateCheckout(toCartPayload(cartProducts, 1));
    checkoutTracked.current = true;
  }, [cartProducts, itemCount]);

  if (itemCount === 0) {
    return (
      <div className="cart-page">
        <div className="container cart-page-empty">
          <h1>Seu carrinho</h1>
          <p>Você ainda não adicionou nenhuma Coleção.</p>
          <Link href="/#colecoes" className="btn btn-primary">
            Ver Coleções
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="container">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Início</Link>
          <span>/</span>
          <span>Carrinho</span>
        </nav>

        <div className="cart-page-head">
          <h1>Revisar pedido</h1>
          <p>Confira as Coleções antes de concluir a compra.</p>
        </div>

        <div className="cart-page-layout">
          <div className="cart-page-list">
            {cartProducts.map((product) => (
              <article className="cart-page-item" key={product.id}>
                <Link href={`/produto/${product.slug}`} className="cart-page-media">
                  <Image
                    src={product.image}
                    alt={product.name}
                    width={160}
                    height={160}
                  />
                </Link>

                <div className="cart-page-info">
                  <h2>
                    <Link href={`/produto/${product.slug}`}>{product.name}</Link>
                  </h2>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => removeItem(product.id)}
                  >
                    Remover
                  </button>
                </div>

                <div className="cart-page-price-col">
                  {product.compareAtPrice > product.price && (
                    <span className="cart-page-price-compare">
                      {formatPrice(product.compareAtPrice)}
                    </span>
                  )}
                  <div className="cart-page-price">
                    {formatPrice(product.price)}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="cart-page-summary">
            <h2>Resumo</h2>

            <div className="cart-summary-items">
              {cartProducts.map((product) => (
                <div className="cart-summary-row" key={product.id}>
                  <span>{product.name}</span>
                  <span>{formatPrice(product.price)}</span>
                </div>
              ))}
            </div>

            {savings > 0 && (
              <>
                <div className="cart-summary-row cart-summary-compare">
                  <span>De</span>
                  <span>{formatPrice(compareTotal)}</span>
                </div>
                <div className="cart-summary-row cart-summary-save">
                  <span>Você economiza</span>
                  <strong>{formatPrice(savings)}</strong>
                </div>
              </>
            )}

            <div className="cart-summary-row cart-summary-total">
              <span>Total</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            <p className="cart-summary-note">
              Ao confirmar, você poderá concluir sua compra em um checkout
              seguro.
            </p>
            <Link href="/checkout" className="btn btn-cart btn-block">
              Ir para o pagamento
            </Link>
            <Link href="/" className="btn btn-secondary btn-block">
              Continuar comprando
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
