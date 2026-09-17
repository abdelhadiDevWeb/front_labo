import type { Metadata } from "next";
import { buildPageMetadata, SITE_NAME } from "@/lib/seo";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return buildPageMetadata({
    title: `Machine laboratoire`,
    description: `Fiche machine / automate sur ${SITE_NAME} — caractéristiques et réservation auprès de fournisseurs en Algérie.`,
    path: `/machines/${id}`,
  });
}

export default function MachineDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
