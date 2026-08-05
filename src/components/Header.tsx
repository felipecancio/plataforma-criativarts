"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { navItems } from "@/data/nav";

export function Header() {
  const { itemCount, openCart } = useCart();
  const { user, loading, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    setMenuOpen(false);
    setSigningOut(false);
    router.replace("/");
    router.refresh();
  }

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="logo" aria-label="Criativarts">
          Criativ<span>arts</span>
        </Link>

        <nav className={`nav ${menuOpen ? "open" : ""}`} aria-label="Principal">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          {!loading && user && (
            <Link href="/biblioteca" onClick={() => setMenuOpen(false)}>
              Biblioteca
            </Link>
          )}
          {menuOpen && !loading && !user && (
            <>
              <Link href="/entrar" onClick={() => setMenuOpen(false)}>
                Entrar
              </Link>
              <Link href="/cadastro" onClick={() => setMenuOpen(false)}>
                Criar conta
              </Link>
            </>
          )}
          {menuOpen && !loading && user && (
            <button
              type="button"
              className="nav-logout"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? "Saindo…" : "Sair"}
            </button>
          )}
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className="menu-toggle"
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>

          {!loading &&
            (user ? (
              <button
                type="button"
                className="auth-header-btn"
                onClick={handleSignOut}
                disabled={signingOut}
                aria-label="Sair da conta"
              >
                {signingOut ? "Saindo…" : "Sair"}
              </button>
            ) : (
              <Link href="/entrar" className="auth-header-btn">
                Entrar
              </Link>
            ))}

          <button
            type="button"
            className="cart-btn"
            aria-label={`Carrinho com ${itemCount} itens`}
            onClick={openCart}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 7h15l-1.4 8.2a2 2 0 0 1-2 1.7H9.2a2 2 0 0 1-2-1.6L5.3 4.5A1 1 0 0 0 4.3 3.7H3"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="10" cy="20" r="1.3" fill="currentColor" />
              <circle cx="17" cy="20" r="1.3" fill="currentColor" />
            </svg>
            {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}
