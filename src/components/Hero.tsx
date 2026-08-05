export function Hero() {
  return (
    <section className="hero">
      <div className="hero-backdrop" aria-hidden>
        <img
          src="/hero-banner.webp"
          alt=""
          width={1024}
          height={512}
          decoding="async"
          fetchPriority="high"
        />
      </div>
      <div className="container hero-content">
        <h1>
          Coleções de artes e estampas profissionais prontas para elevar o nível
          do seu projeto
        </h1>
        <a href="#colecoes" className="btn btn-primary">
          Explorar Coleções
        </a>
      </div>
    </section>
  );
}
