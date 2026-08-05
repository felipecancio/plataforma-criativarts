import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container" style={{ padding: "4rem 0", textAlign: "center" }}>
      <h1 style={{ fontFamily: "var(--font-display)" }}>Produto não encontrado</h1>
      <p style={{ color: "var(--muted)" }}>
        Essa Coleção não existe ou foi removida do catálogo.
      </p>
      <Link href="/" className="btn btn-primary" style={{ marginTop: "1rem" }}>
        Voltar à loja
      </Link>
    </div>
  );
}
