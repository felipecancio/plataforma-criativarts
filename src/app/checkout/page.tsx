import type { Metadata } from "next";
import { CheckoutPageContent } from "@/components/checkout/CheckoutPageContent";

export const metadata: Metadata = {
  title: "Pagamento | Criativarts",
  description: "Finalize sua compra com o checkout Mercado Pago.",
};

export default function CheckoutPage() {
  return <CheckoutPageContent />;
}
