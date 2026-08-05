import Link from "next/link";
import { navItems } from "@/data/nav";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <nav className="footer-nav" aria-label="Rodapé">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="footer-brand">
          <p>
            <strong>Criativarts</strong> — Coleções digitais premium.
          </p>
          <p>Entrega digital imediata após a compra.</p>
        </div>
      </div>

      <div className="footer-legal">
        <div className="container">
          <p>
            © 2026 Criativarts. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
