import type { Metadata } from "next";
import { CartPageContent } from "@/components/CartPageContent";

export const metadata: Metadata = {
  title: "Carrinho | Criativarts",
  description: "Revise seu pedido antes de concluir a compra.",
};

export default function CartPage() {
  return <CartPageContent />;
}
