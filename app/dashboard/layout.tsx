import Sidebar from "@/components/Sidebar";
import { MobileNav } from "@/components/Sidebar";
import UserNav from "@/components/UserNav";
import { getUser } from "@/lib/auth";
import { Bell, Sparkles } from "lucide-react";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  return (
    <div className="flex bg-surface-0 text-white font-space-grotesk" style={{ height: "100dvh" }}>
      <Sidebar />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-12 flex-shrink-0 items-center gap-3 border-b border-sk-border bg-surface-0/80 px-4 backdrop-blur-sm">
          <MobileNav />

          {/* Mobile logo */}
          <span className="text-sm font-bold tracking-tight text-white md:hidden">
            Skunk<span className="text-violet-primary">Studio</span>
          </span>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-sm">
            <div className="relative w-full">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search episodes…"
                className="w-full rounded-md border border-sk-border bg-surface-1 py-1.5 pl-8 pr-3 text-[13px] text-white placeholder-muted-text-3 outline-none transition-colors focus:border-sk-border-hover focus:bg-surface-2"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1">
            {/* Generate CTA */}
            <a
              href="/dashboard/generate"
              className="hidden sm:flex items-center gap-1.5 rounded-md bg-violet-primary/10 border border-violet-primary/20 px-3 py-1.5 text-[12px] font-semibold text-violet-primary transition-colors hover:bg-violet-primary/20 mr-2"
            >
              <Sparkles className="h-3 w-3" />
              Generate
            </a>
            <button className="flex h-7 w-7 items-center justify-center rounded-md text-muted-text-3 transition-colors hover:bg-surface-2 hover:text-white">
              <Bell className="h-[14px] w-[14px]" />
            </button>
            <div className="mx-1.5 h-4 w-px bg-sk-border" />
            <UserNav userName={user?.full_name} userEmail={user?.email} userPlan={user?.plan} />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5 sm:p-7" style={{ WebkitOverflowScrolling: "touch" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
