import Link from "next/link";
import { getUser } from "@/lib/auth";
import { FileText, Image, Wand2, Play } from "lucide-react";

const quickActions = [
  {
    title: "Upload Script",
    description: "Paste or upload your screenplay and let AI bring it to life.",
    href: "/dashboard/upload-script",
    icon: FileText,
  },
  {
    title: "Asset Library",
    description: "Browse and manage your characters, backgrounds & props.",
    href: "/dashboard/asset-library",
    icon: Image,
  },
  {
    title: "Generate Episode",
    description: "Turn your script into a fully animated episode.",
    href: "/dashboard/generate",
    icon: Wand2,
  },
  {
    title: "My Episodes",
    description: "View and watch your generated episodes.",
    href: "/dashboard/episodes",
    icon: Play,
  },
];

export default async function DashboardPage() {
  const user = await getUser();
  const greeting = user?.full_name
    ? `Welcome back, ${user.full_name}`
    : "Welcome back";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">{greeting}</h1>
        <p className="mt-1 text-sm text-muted-text-1">
          Pick up where you left off or start something new.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-lg border border-sk-border bg-surface-1 p-5 transition-all duration-150 hover:border-sk-border-hover hover:bg-surface-2"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-violet-primary/10 text-violet-primary transition-colors duration-150 group-hover:bg-violet-primary/20">
                <Icon className="h-[18px] w-[18px]" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-white">
                {action.title}
              </h3>
              <p className="mt-1 text-xs text-muted-text-2">
                {action.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
