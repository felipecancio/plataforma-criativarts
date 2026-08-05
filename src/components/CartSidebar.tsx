"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";

export function CartSidebar() {
  const { isOpen, closeCart, cartProducts, removeItem, subtotal } = useCart();
  const router = useRouter();

  function goToCartPage() {
    closeCart();
    router.push("/carrinho");
  }

  return (
    <>
      <div
        className={`cart-overlay ${isOpen ? "open" : ""}`}
        onClick={closeCart}
        aria-hidden={!isOpen}
      />

      <aside
        className={`cart-drawer ${isOpen ? "open" : ""}`}
        aria-hidden={!isOpen}
        aria-label="Carrinho de compras"
      >
        <div className="cart-header">
          <h2>Seu carrinho</h2>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={closeCart}
            aria-label="Fechar carrinho"
          >
            Fechar
          </button>
        </div>

        <div className="cart-items">
          {cartProducts.length === 0 ? (
            <p className="cart-empty">Seu carrinho está vazio.</p>
          ) : (
            cartProducts.map((product) => (
              <div className="cart-item" key={product.id}>
                <Image
                  src={product.image}
                  alt={product.name}
                  width={72}
                  height={90}
                />
                <div>
                  <h3>{product.name}</h3>
                  <p>{formatPrice(product.price)}</p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => removeItem(product.id)}
                >
                  Remover
                </button>
              </div>
            ))
          )}
        </div>

        <div className="cart-footer">
          <div className="cart-total">
            <span>Total</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <button
            type="button"
            className="btn btn-accent btn-block"
            disabled={cartProducts.length === 0}
            onClick={goToCartPage}
          >
            Finalizar compra
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={closeCart}
          >
            Continuar comprando
          </button>
        </div>
      </aside>
    </>
  );
}
