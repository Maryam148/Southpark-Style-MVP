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
  Film,
  Zap,
} from "lucide-react";

const navItems = [
  { label: "Overview",       href: "/dashboard",               icon: LayoutDashboard },
  { label: "Upload Script",  href: "/dashboard/upload-script", icon: FileText },
  { label: "Asset Library",  href: "/dashboard/asset-library", icon: Image },
  { label: "Generate",       href: "/dashboard/generate",      icon: Wand2 },
  { label: "Episodes",       href: "/dashboard/episodes",      icon: Play },
];

function isActive(href: string, pathname: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="mt-4 flex flex-col gap-0.5 px-3">
      {navItems.map((item) => {
        const active = isActive(item.href, pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
              active
                ? "bg-violet-primary/10 text-white"
                : "text-muted-text-2 hover:bg-surface-2 hover:text-white"
            }`}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-violet-primary" />
            )}
            <Icon
              className={`h-4 w-4 flex-shrink-0 transition-colors duration-150 ${
                active ? "text-violet-primary" : "text-muted-text-3 group-hover:text-muted-text-1"
              }`}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Logo() {
  return (
    <div className="flex h-14 items-center gap-2.5 px-5">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-primary/15">
        <Film className="h-3.5 w-3.5 flex-shrink-0 text-violet-primary" />
      </div>
      <Link href="/dashboard" className="text-[14px] font-bold tracking-tight text-white">
        Skunk<span className="text-violet-primary">Studio</span>
      </Link>
    </div>
  );
}

function UpgradeBanner() {
  return (
    <div className="mx-3 mb-3 overflow-hidden rounded-lg border border-sk-border bg-surface-1 p-3.5">
      {/* Usage bar */}
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-text-3">Free Plan</span>
        <span className="text-[10px] font-medium text-muted-text-3">0 / 3 episodes</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-surface-0">
        <div className="h-full w-0 rounded-full bg-violet-primary" />
      </div>

      <p className="mt-2.5 text-[11px] leading-relaxed text-muted-text-2">
        Upgrade for unlimited generation and 4K exports.
      </p>
      <button className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md bg-violet-primary py-2 text-[11px] font-semibold tracking-wide text-white transition-colors hover:bg-violet-hover">
        <Zap className="h-3 w-3" />
        Upgrade
      </button>
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside className="hidden w-52 flex-shrink-0 flex-col border-r border-sk-border bg-surface-0 md:flex">
      <Logo />
      <div className="flex-1 overflow-y-auto">
        <NavLinks />
      </div>
      <div className="border-t border-sk-border px-3 py-2">
        <Link
          href="/dashboard"
          className="group flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-muted-text-2 transition-all duration-150 hover:bg-surface-2 hover:text-white"
        >
          <Settings className="h-4 w-4 text-muted-text-3 transition-colors group-hover:text-muted-text-1" />
          Settings
        </Link>
      </div>
      <UpgradeBanner />
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mr-2 rounded-md p-1.5 text-muted-text-2 transition-colors hover:bg-surface-2 hover:text-white md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="relative z-10 flex h-full w-52 flex-col border-r border-sk-border bg-surface-0">
            <div className="flex h-14 items-center justify-between px-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-primary/15">
                  <Film className="h-3.5 w-3.5 text-violet-primary" />
                </div>
                <span className="text-[14px] font-bold tracking-tight text-white">
                  Skunk<span className="text-violet-primary">Studio</span>
                </span>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 text-muted-text-2 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <div className="border-t border-sk-border px-3 py-2">
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="group flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-muted-text-2 hover:bg-surface-2 hover:text-white"
              >
                <Settings className="h-4 w-4 text-muted-text-3" />
                Settings
              </Link>
            </div>
            <UpgradeBanner />
          </aside>
        </div>
      )}
    </>
  );
}
