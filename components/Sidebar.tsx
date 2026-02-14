"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Image,
  Wand2,
  Play,
  Settings,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Upload Script", href: "/dashboard/upload-script", icon: FileText },
  { label: "Asset Library", href: "/dashboard/asset-library", icon: Image },
  { label: "Generate", href: "/dashboard/generate", icon: Wand2 },
  { label: "Episodes", href: "/dashboard/episodes", icon: Play },
];

function isActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="mt-2 flex flex-col gap-0.5 px-3">
      {navItems.map((item) => {
        const active = isActive(item.href, pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
              active
                ? "bg-surface-2 text-white"
                : "text-muted-text-1 hover:bg-surface-2 hover:text-white"
            }`}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-violet-primary" />
            )}
            <Icon className="h-[18px] w-[18px] flex-shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Desktop sidebar — render as a flex sibling of <main>. Hidden on mobile. */
export default function Sidebar() {
  return (
    <aside className="hidden w-60 flex-shrink-0 border-r border-sk-border bg-surface-1 md:flex md:flex-col">
      <div className="flex h-14 items-center px-6">
        <Link href="/dashboard" className="text-lg font-bold tracking-tight text-white">
          Skunk<span className="text-violet-primary">Studio</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <NavLinks />
      </div>
      <div className="border-t border-sk-border px-3 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-text-2 transition-colors duration-150 hover:bg-surface-2 hover:text-white"
        >
          <Settings className="h-[18px] w-[18px]" />
          Settings
        </Link>
      </div>
    </aside>
  );
}

/** Mobile nav — hamburger button + slide-over drawer. Render inside the header. */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mr-3 rounded-md p-2 text-muted-text-2 transition-colors duration-150 hover:bg-surface-2 hover:text-white md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-64 flex-col border-r border-sk-border bg-surface-1">
            <div className="flex h-14 items-center justify-between px-6">
              <span className="text-lg font-bold tracking-tight text-white">
                Skunk<span className="text-violet-primary">Studio</span>
              </span>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-muted-text-2 transition-colors duration-150 hover:bg-surface-2 hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <div className="border-t border-sk-border px-3 py-3">
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-text-2 transition-colors duration-150 hover:bg-surface-2 hover:text-white"
              >
                <Settings className="h-[18px] w-[18px]" />
                Settings
              </Link>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
