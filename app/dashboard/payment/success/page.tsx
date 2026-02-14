import Link from "next/link";
import { CheckCircle2, Wand2 } from "lucide-react";

export default function PaymentSuccessPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mx-auto max-w-sm px-4 sm:px-0">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle2 className="h-7 w-7 text-green-400" />
        </div>

        <h1 className="text-2xl font-bold text-white">Payment Successful</h1>

        <p className="mt-3 text-sm text-muted-text-1">
          Welcome to{" "}
          <span className="font-semibold text-violet-primary">
            SkunkStudio Pro
          </span>
          . You now have full access to AI-powered episode generation.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard/generate"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-violet-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-violet-hover"
          >
            <Wand2 className="h-4 w-4" />
            Generate Your First Episode
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md border border-sk-border px-6 py-2.5 text-sm font-medium text-muted-text-1 transition-colors duration-150 hover:bg-surface-2 hover:text-white"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
