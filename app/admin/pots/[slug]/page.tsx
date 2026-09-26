import { AdminPotDetail } from "@/components/admin/AdminPotDetail";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AdminPotPage({ params }: PageProps) {
  const { slug } = await params;
  return <AdminPotDetail slug={slug} />;
}
