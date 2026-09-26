import { AdminHostDetail } from "@/components/admin/AdminHostDetail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminHostDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <AdminHostDetail id={id} />;
}
