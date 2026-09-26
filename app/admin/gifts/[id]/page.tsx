import { AdminGiftDetail } from "@/components/admin/AdminGiftDetail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminGiftDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <AdminGiftDetail id={id} />;
}
