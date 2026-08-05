"use client";

const WHATSAPP_URL =
  "https://wa.me/5522998455928?text=" +
  encodeURIComponent("Olá! Gostaria de um serviço personalizado");

export function PersonalizedSupportButton() {
  return (
    <a
      href={WHATSAPP_URL}
      className="btn btn-cart"
      target="_blank"
      rel="noopener noreferrer"
    >
      Falar com Suporte
    </a>
  );
}
