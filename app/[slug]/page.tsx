import { notFound } from "next/navigation";
import { getClientBySlug } from "@/lib/data";
import { ClientStyle, DEFAULT_STYLE } from "@/lib/types";
import { BentoPage } from "./bento-page";

export default async function PublicPage({
  params,
}: {
  params: { slug: string };
}) {
  const client = await getClientBySlug(params.slug);
  if (!client) notFound();

  const style: ClientStyle = { ...DEFAULT_STYLE, ...client.style };
  const sortedWidgets = [...client.widgets].sort((a, b) => a.order - b.order);

  return (
    <BentoPage
      client={{ ...client, style }}
      widgets={sortedWidgets}
    />
  );
}
