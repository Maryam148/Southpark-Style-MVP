"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut, ChevronDown } from "lucide-react";

interface UserNavProps {
  userName?: string | null;
  userEmail?: string | null;
  userPlan?: string | null;
}

export default function UserNav({ userName, userEmail, userPlan }: UserNavProps) {
  const [signingOut, setSigningOut] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const displayName = userName || userEmail || "User";
  const initials = (userName || userEmail || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const plan = userPlan || "free";

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch {
      // Best effort
    }
    window.location.href = "/login";
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors duration-150 hover:bg-surface-2"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-primary/20 text-xs font-semibold text-violet-primary">
          {initials}
        </div>
        <span className="hidden text-sm font-medium text-muted-text-1 sm:inline-block">
          {displayName}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-text-2" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 animate-scale-in rounded-lg border border-sk-border bg-surface-2 p-1 shadow-xl">
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-white">{displayName}</p>
            {userEmail && (
              <p className="text-xs text-muted-text-2">{userEmail}</p>
            )}
            <span
              className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                plan === "pro"
                  ? "bg-violet-primary/20 text-violet-primary"
                  : "bg-surface-3 text-muted-text-2"
              }`}
            >
              {plan}
            </span>
          </div>
          <div className="my-1 h-px bg-sk-border" />
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-text-1 transition-colors duration-150 hover:bg-surface-3 hover:text-white disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
