import Link from "next/link";
import { XCircle } from "lucide-react";

export default function PaymentCancelPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mx-auto max-w-sm">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-muted-text-3/10">
          <XCircle className="h-7 w-7 text-muted-text-2" />
        </div>

        <h1 className="text-2xl font-bold text-white">Payment Cancelled</h1>

        <p className="mt-3 text-sm text-muted-text-1">
          No worries — you weren&apos;t charged. You can upgrade to Pro anytime
          to unlock episode generation.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="rounded-md bg-violet-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-violet-hover"
          >
            Back to Dashboard
          </Link>
          <Link
            href="/dashboard/generate"
            className="rounded-md border border-sk-border px-6 py-2.5 text-sm font-medium text-muted-text-1 transition-colors duration-150 hover:bg-surface-2 hover:text-white"
          >
            Try Again
          </Link>
        </div>
      </div>
    </div>
  );
}
