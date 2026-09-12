import { requireProfile } from "@/lib/data/session";
import { Sidebar, TabBar, MobileHeader } from "@/components/nav/AppNav";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const profile = await requireProfile();

  return (
    <div className="min-h-dvh">
      <Sidebar profile={profile} />
      <MobileHeader />

      {/* Content column: offset by the sidebar on desktop, by the tab bar on phones */}
      <main className="pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:ml-[76px] md:pb-8 xl:ml-60">
        {children}
      </main>

      <TabBar profile={profile} />
    </div>
  );
}
