"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.refresh();
    router.push("/dashboard");
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
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
          disabled={loading}
        />
        {error && error.toLowerCase().includes("email") && (
          <p className="mt-1 text-xs text-red-400">{error}</p>
        )}
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-sk-border bg-surface-2 px-3 py-2 text-sm text-white placeholder-muted-text-3 outline-none transition-colors duration-150 focus:border-violet-primary focus:ring-1 focus:ring-violet-primary/50"
          placeholder="••••••••"
          disabled={loading}
        />
      </div>

      {error && !error.toLowerCase().includes("email") && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-violet-primary py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-violet-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading && <LoadingSpinner size="sm" className="text-white" />}
        {loading ? "Signing in..." : "Sign In"}
      </button>

      <p className="text-center text-sm text-muted-text-2">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-violet-primary hover:text-violet-hover"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
