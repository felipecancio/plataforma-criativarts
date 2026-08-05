import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Quem Somos Nós | Criativarts",
  description:
    "Conheça a Criativarts: coleções exclusivas de artes digitais para criadores, designers e profissionais da impressão.",
};

const paragraphs = [
  "Na Criativarts, acreditamos que uma boa arte é capaz de transformar ideias em produtos, negócios e experiências. Foi com esse propósito que criamos uma plataforma dedicada a reunir coleções exclusivas de artes digitais, organizadas de forma prática e pensadas para quem busca qualidade, variedade e agilidade no dia a dia.",
  "Nosso catálogo é desenvolvido para atender diferentes segmentos do mercado criativo, oferecendo milhares de artes em alta resolução para aplicações como quadros, camisetas, sublimação, DTF, papelaria, decoração, comunicação visual e muito mais.",
  "Cada coleção é cuidadosamente selecionada para entregar um material com excelente qualidade visual, organização intuitiva e uma grande diversidade de estilos. Atualmente, nossa plataforma reúne temas como animes, videogames, streetwear, rock, religião, futebol, filmes e muitos outros, com novos conteúdos sendo adicionados constantemente.",
  "Mais do que disponibilizar arquivos digitais, nosso objetivo é construir uma plataforma completa para criadores, designers, empreendedores e profissionais da impressão. Queremos que você encontre inspiração, economize tempo na criação e tenha acesso a um acervo que acompanhe as tendências do mercado.",
  "A Criativarts está em constante evolução. Novas coleções, categorias e recursos são desenvolvidos regularmente para tornar a experiência cada vez mais completa e oferecer um catálogo que cresce junto com a criatividade dos nossos clientes.",
  "Seja para produzir peças únicas, abastecer sua loja ou desenvolver novos projetos, estamos aqui para ajudar você a transformar criatividade em resultados.",
  "Bem-vindo à Criativarts. Onde a criatividade ganha vida.",
];

export default function QuemSomosPage() {
  return (
    <div className="content-page">
      <div className="container content-page-inner">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Início</Link>
          <span>/</span>
          <span>Quem Somos Nós</span>
        </nav>

        <h1>Sobre a Criativarts</h1>

        <div className="content-prose">
          {paragraphs.map((text) => (
            <p key={text.slice(0, 40)}>{text}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
