import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/data/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminTabs } from "@/components/admin/AdminTabs";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const me = await requireProfile();
  if (!me.is_admin) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Admin" subtitle="Only you can see this" back="/settings" />
      <AdminTabs />
      <div className="px-4 py-5">{children}</div>
    </div>
  );
}
