import type { Metadata } from "next";
import { LibraryGrid } from "@/components/LibraryGrid";
import { requireUser } from "@/lib/auth/require-user";
import { getProfileByUserId } from "@/lib/profiles/queries";
import { getCurrentUserLibrary } from "@/lib/library/queries";

export const metadata: Metadata = {
  title: "Minha biblioteca | Criativarts",
  description: "Área logada com suas coleções digitais adquiridas.",
};

/** Sempre fresca após compras — evita cache com biblioteca desatualizada. */
export const dynamic = "force-dynamic";

export default async function BibliotecaPage() {
  const user = await requireUser("/biblioteca");
  const [profile, library] = await Promise.all([
    getProfileByUserId(user.id),
    getCurrentUserLibrary(),
  ]);
  const displayName = profile?.name?.trim() || user.email;

  return (
    <section className="container member-page">
      <header className="member-page-header">
        <p className="member-eyebrow">Área do cliente</p>
        <h1>Minha biblioteca</h1>
        <p>
          Coleções digitais vinculadas à sua conta
          {displayName ? ` · ${displayName}` : ""}.
        </p>
      </header>

      <LibraryGrid items={library} />
    </section>
  );
}
