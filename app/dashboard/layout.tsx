import Sidebar from "@/components/Sidebar";
import UserNav from "@/components/UserNav";
import { getUser } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <div className="flex h-screen bg-surface-0 text-white">
      <Sidebar />

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-sk-border px-6">
          <div className="md:hidden">
            <Sidebar />
          </div>
          <div className="hidden md:block" />
          <UserNav
            userName={user?.full_name}
            userEmail={user?.email}
            userPlan={user?.plan}
          />
        </header>

        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </main>
    </div>
  );
}
