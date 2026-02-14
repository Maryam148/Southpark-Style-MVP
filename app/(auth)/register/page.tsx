"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import { CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: signUpData, error: signUpError } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (signUpData.user) {
      await supabase.from("users").upsert(
        {
          id: signUpData.user.id,
          email,
          full_name: fullName,
          is_paid: false,
          plan: "free",
        },
        { onConflict: "id" }
      );
    }

    setSuccess(true);
    setLoading(false);

    setTimeout(() => {
      router.refresh();
      router.push("/dashboard");
    }, 1200);
  };

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      {success && (
        <div className="flex items-center gap-2 rounded-md border border-green-800/50 bg-green-950/30 px-3 py-2.5 text-sm text-green-400">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          Account created! Redirecting...
        </div>
      )}

      <div>
        <label
          htmlFor="fullName"
          className="mb-1.5 block text-sm font-medium text-muted-text-1"
        >
          Full Name
        </label>
        <input
          id="fullName"
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-md border border-sk-border bg-surface-2 px-3 py-2 text-sm text-white placeholder-muted-text-3 outline-none transition-colors duration-150 focus:border-violet-primary focus:ring-1 focus:ring-violet-primary/50"
          placeholder="Eric Cartman"
          disabled={loading || success}
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-sm font-medium text-muted-text-1"
        >
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-sk-border bg-surface-2 px-3 py-2 text-sm text-white placeholder-muted-text-3 outline-none transition-colors duration-150 focus:border-violet-primary focus:ring-1 focus:ring-violet-primary/50"
          placeholder="you@example.com"
          disabled={loading || success}
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-sm font-medium text-muted-text-1"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-sk-border bg-surface-2 px-3 py-2 text-sm text-white placeholder-muted-text-3 outline-none transition-colors duration-150 focus:border-violet-primary focus:ring-1 focus:ring-violet-primary/50"
          placeholder="••••••••"
          disabled={loading || success}
        />
        <p className="mt-1 text-xs text-muted-text-3">Minimum 6 characters</p>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading || success}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-violet-primary py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-violet-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading && <LoadingSpinner size="sm" className="text-white" />}
        {loading ? "Creating account..." : success ? "Success" : "Create Account"}
      </button>

      <p className="text-center text-sm text-muted-text-2">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-violet-primary hover:text-violet-hover"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
