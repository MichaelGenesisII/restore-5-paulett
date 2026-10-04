import { AdminInboxDetail } from "@/components/admin/AdminInboxDetail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminInboxDetailPage({ params }: PageProps) {
  const { id } = await params;
  // Keyed so moving between messages starts from fresh loading state.
  return <AdminInboxDetail key={id} id={id} />;
}
