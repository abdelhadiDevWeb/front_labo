import type { Metadata } from "next";
import { buildPageMetadata, SITE_NAME } from "@/lib/seo";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return buildPageMetadata({
    title: `Catégorie catalogue`,
    description: `Produits et équipements de catégorie sur ${SITE_NAME} pour laboratoires d'analyses en Algérie.`,
    path: `/categories/${id}`,
  });
}

export default function CategoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
