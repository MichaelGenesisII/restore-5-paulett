import { AdminInboxDetail } from "@/components/admin/AdminInboxDetail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminInboxDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <AdminInboxDetail id={id} />;
}
