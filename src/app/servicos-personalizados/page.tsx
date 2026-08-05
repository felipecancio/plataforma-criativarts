import type { Metadata } from "next";
import Link from "next/link";
import { PersonalizedSupportButton } from "@/components/PersonalizedSupportButton";

export const metadata: Metadata = {
  title: "Serviços Personalizados | Criativarts",
  description:
    "Criação de artes, upscale e edições personalizadas com suporte técnico da Criativarts.",
};

export default function ServicosPersonalizadosPage() {
  return (
    <div className="content-page">
      <div className="container content-page-inner content-page-narrow">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Início</Link>
          <span>/</span>
          <span>Serviços Personalizados</span>
        </nav>

        <h1>Serviços Personalizados</h1>

        <div className="content-prose">
          <p>
            Nós também oferecemos serviços personalizados como criação de artes,
            melhoria de qualidade (upscale) e qualquer tipo de edição artística.
            Faça uma consulta agora com nosso suporte técnico que ficaremos
            felizes em ajudar.
          </p>
        </div>

        <PersonalizedSupportButton />
      </div>
    </div>
  );
}
