import Sidebar from "@/components/Sidebar";
import { MobileNav } from "@/components/Sidebar";
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
      {/* Desktop sidebar — hidden on mobile */}
      <Sidebar />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 flex-shrink-0 items-center border-b border-sk-border px-4 sm:px-6">
          {/* Mobile: hamburger + drawer */}
          <MobileNav />

          {/* Mobile: logo */}
          <span className="text-base font-bold tracking-tight text-white md:hidden">
            Skunk<span className="text-violet-primary">Studio</span>
          </span>

          <div className="ml-auto">
            <UserNav
              userName={user?.full_name}
              userEmail={user?.email}
              userPlan={user?.plan}
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
