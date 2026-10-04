import { AdminHostDetail } from "@/components/admin/AdminHostDetail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminHostDetailPage({ params }: PageProps) {
  const { id } = await params;
  // Keyed so moving between hosts starts from fresh loading state.
  return <AdminHostDetail key={id} id={id} />;
}
