import type { Metadata } from "next";
import { buildPageMetadata, SITE_NAME } from "@/lib/seo";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return buildPageMetadata({
    title: `Fournisseur laboratoire`,
    description: `Profil fournisseur sur ${SITE_NAME} — catalogue produits, machines et services pour laboratoires d'analyses.`,
    path: `/supplier/${id}`,
  });
}

export default function PublicSupplierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
