import { AdminGiftDetail } from "@/components/admin/AdminGiftDetail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminGiftDetailPage({ params }: PageProps) {
  const { id } = await params;
  // Keyed so moving between gifts starts from fresh loading state.
  return <AdminGiftDetail key={id} id={id} />;
}
