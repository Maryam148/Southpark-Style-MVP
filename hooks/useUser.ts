"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabaseClient";
import type { User } from "@/types";
import type { User as AuthUser, AuthChangeEvent, Session } from "@supabase/supabase-js";

interface UseUserReturn {
    user: User | null;
    authUser: AuthUser | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

/**
 * Build a minimal User from the Supabase Auth session.
 * Used as a fallback when public.users row doesn't exist yet.
 */
function fallbackUser(auth: AuthUser): User {
    return {
        id: auth.id,
        email: auth.email || "",
        full_name: auth.user_metadata?.full_name || "",
        avatar_url: auth.user_metadata?.avatar_url || null,
        credits: 0,
        plan: "free",
        is_paid: false,
        stripe_customer_id: null,
        created_at: auth.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
    } as User;
}

/* Simple in-memory cache so navigating between pages doesn't re-fetch */
let cachedUser: User | null = null;
let cachedUserId: string | null = null;

/**
 * Client-side hook — subscribes to Supabase auth state and fetches the
 * user profile from `public.users`. Falls back to auth metadata if the
 * profile row doesn't exist.
 *
 * Optimized: checks session immediately on mount (no waiting for callback),
 * and caches profile in-memory across navigations.
 */
export function useUser(): UseUserReturn {
    const [user, setUser] = useState<User | null>(cachedUser);
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(cachedUser ? false : true);
    const [error, setError] = useState<string | null>(null);

    const supabase = createClient();
    const fetchingRef = useRef<string | null>(null);
    const initializedRef = useRef(false);

    const fetchProfile = async (auth: AuthUser) => {
        // Prevent concurrent identical fetches
        if (fetchingRef.current === auth.id) return;
        fetchingRef.current = auth.id;

        // Return cached profile if we already have it for this user
        if (cachedUser && cachedUserId === auth.id) {
            setUser(cachedUser);
            setAuthUser(auth);
            setLoading(false);
            fetchingRef.current = null;
            return;
        }

        try {
            const { data, error: fetchError } = await supabase
                .from("users")
                .select("*")
                .eq("id", auth.id);

            if (!fetchError && data && data.length > 0) {
                const profile = data[0] as User;
                cachedUser = profile;
                cachedUserId = auth.id;
                setUser(profile);
                setError(null);
                fetchingRef.current = null;
                setLoading(false);
                return;
            }

            // Try creating the profile via API (admin client, bypasses RLS)
            try {
                const res = await fetch("/api/auth/ensure-profile", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: auth.email || "" }),
                });
                if (res.ok) {
                    const profile = (await res.json()) as User;
                    cachedUser = profile;
                    cachedUserId = auth.id;
                    setUser(profile);
                    setError(null);
                    fetchingRef.current = null;
                    setLoading(false);
                    return;
                }
            } catch {
                // ensure-profile API failed — fall through
            }

            // Last resort: use auth session data
            const fb = fallbackUser(auth);
            cachedUser = fb;
            cachedUserId = auth.id;
            setUser(fb);
            setError(null);
        } catch {
            const fb = fallbackUser(auth);
            cachedUser = fb;
            cachedUserId = auth.id;
            setUser(fb);
            setError(null);
        } finally {
            fetchingRef.current = null;
            setLoading(false);
        }
    };

    const refresh = async () => {
        cachedUser = null;
        cachedUserId = null;
        const {
            data: { user: currentAuth },
        } = await supabase.auth.getUser();
        if (currentAuth) await fetchProfile(currentAuth);
    };

    useEffect(() => {
        let mounted = true;

        // 1. Immediately check current session (don't wait for onAuthStateChange)
        const initSession = async () => {
            if (initializedRef.current) return;
            initializedRef.current = true;

            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!mounted) return;

            if (session?.user) {
                setAuthUser(session.user);
                await fetchProfile(session.user);
            } else {
                setUser(null);
                setLoading(false);
            }
        };

        initSession();

        // 2. Listen for auth state changes (sign-in, sign-out, token refresh)
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(
            async (event: AuthChangeEvent, session: Session | null) => {
                if (!mounted) return;

                const auth = session?.user ?? null;
                setAuthUser(auth);

                if (auth) {
                    await fetchProfile(auth);
                } else {
                    cachedUser = null;
                    cachedUserId = null;
                    setUser(null);
                    setLoading(false);
                }
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { user, authUser, loading, error, refresh };
}
