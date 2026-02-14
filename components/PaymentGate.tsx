"use client";

import { useUser } from "@/hooks/useUser";
import { useState } from "react";
import { Lock, Check } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";

interface PaymentGateProps {
  children: React.ReactNode;
  featureName?: string;
}

export default function PaymentGate({
  children,
  featureName = "this feature",
}: PaymentGateProps) {
  const { toast } = useToast();
  const { user, loading } = useUser();
  const [redirecting, setRedirecting] = useState(false);

  const handleCheckout = async () => {
    setRedirecting(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned");
        setRedirecting(false);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      setRedirecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (user?.is_paid) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mx-4 max-w-sm rounded-lg border border-sk-border bg-surface-1 p-6 sm:mx-auto sm:p-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet-primary/10">
          <Lock className="h-5 w-5 text-violet-primary" />
        </div>

        <h2 className="text-lg font-bold text-white">Unlock {featureName}</h2>

        <p className="mt-2 text-sm text-muted-text-1">
          Upgrade to{" "}
          <span className="font-semibold text-violet-primary">
            SkunkStudio Pro
          </span>{" "}
          to access episode generation and all premium features.
        </p>

        <div className="mt-6 rounded-md border border-sk-border bg-surface-2 p-4">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-3xl font-bold text-white">$9.99</span>
            <span className="text-sm text-muted-text-2">one-time</span>
          </div>
          <ul className="mt-3 space-y-2 text-left text-sm text-muted-text-1">
            {[
              "AI episode generation",
              "Unlimited script uploads",
              "Full asset library access",
              "HD video exports",
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-violet-primary" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={handleCheckout}
          disabled={redirecting}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-violet-primary py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-violet-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {redirecting && <LoadingSpinner size="sm" className="text-white" />}
          {redirecting ? "Redirecting to Stripe..." : "Upgrade Now"}
        </button>

        <p className="mt-3 text-xs text-muted-text-3">
          Secure payment via Stripe. No recurring charges.
        </p>

        {process.env.NODE_ENV === "development" && (
          <button
            onClick={async () => {
              if (
                !confirm(
                  "Bypass payment check? This sets is_paid=true for your user."
                )
              )
                return;
              const res = await fetch("/api/dev/bypass-payment", {
                method: "POST",
              });
              if (res.ok) window.location.reload();
              else {
                toast({
                  variant: "destructive",
                  title: "Bypass failed",
                  description: "Something went wrong while bypassing payment.",
                });
              }
            }}
            className="mt-4 w-full rounded-md border border-amber-900/30 bg-amber-950/20 py-2 text-xs font-medium text-amber-500 transition-colors duration-150 hover:bg-amber-900/30"
          >
            Dev Bypass (Set is_paid=true)
          </button>
        )}
      </div>
    </div>
  );
}
