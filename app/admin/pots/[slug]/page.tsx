import { AdminPotDetail } from "@/components/admin/AdminPotDetail";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AdminPotPage({ params }: PageProps) {
  const { slug } = await params;
  // Keyed so moving between pots starts from fresh loading state.
  return <AdminPotDetail key={slug} slug={slug} />;
}
