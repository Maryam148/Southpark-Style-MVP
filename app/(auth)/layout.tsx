export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-0 px-4">
      <div className="w-full max-w-sm rounded-lg border border-sk-border bg-surface-1 p-6 sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Skunk<span className="text-violet-primary">Studio</span>
          </h1>
          <p className="mt-1 text-sm text-muted-text-2">
            AI-powered animation platform
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
