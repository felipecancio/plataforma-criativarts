import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { Header } from "@/components/Header";
import { CartSidebar } from "@/components/CartSidebar";
import { Footer } from "@/components/Footer";
import { MetaPixelScript } from "@/components/analytics/MetaPixelScript";
import { AnalyticsRouteTracker } from "@/components/analytics/AnalyticsRouteTracker";
import { WhatsAppSupport } from "@/components/WhatsAppSupport";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getProducts } from "@/lib/products/queries";
import type { User } from "@supabase/supabase-js";
import "./globals.css";

export const metadata: Metadata = {
  title: "Criativarts | Coleções digitais premium",
  description:
    "Loja premium de Coleções digitais de artes. Coleções Halftone prontas para transformar seus projetos.",
};

async function getInitialUser(): Promise<User | null> {
  if (!hasSupabaseEnv()) return null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [initialUser, catalog] = await Promise.all([
    getInitialUser(),
    getProducts(),
  ]);

  return (
    <html lang="pt-BR">
      <body>
        <MetaPixelScript />
        <AuthProvider initialUser={initialUser}>
          <CartProvider catalog={catalog}>
            <div className="page-shell">
              <Header />
              <main className="main">{children}</main>
              <Footer />
            </div>
            <CartSidebar />
            <WhatsAppSupport />
            <Suspense fallback={null}>
              <AnalyticsRouteTracker />
            </Suspense>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
