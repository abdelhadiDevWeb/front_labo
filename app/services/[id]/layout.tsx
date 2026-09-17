import type { Metadata } from "next";
import { buildPageMetadata, SITE_NAME } from "@/lib/seo";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return buildPageMetadata({
    title: `Service laboratoire`,
    description: `Fiche service laboratoire sur ${SITE_NAME} — prestations et partenaires fournisseurs en Algérie.`,
    path: `/services/${id}`,
  });
}

export default function ServiceDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
