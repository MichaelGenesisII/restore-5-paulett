import { redirect } from "next/navigation";

export default async function CreatorPotRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/host/pots/${slug}`);
}
