import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/* ──────────────────────────────────────────────────────────
   Server (Server Component / Route Handler) Supabase client
   ────────────────────────────────────────────────────────── */
export async function createServerSupabaseClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch {
                        // Server Component — cookie can only be set in middleware / route handler
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: "", ...options });
                    } catch {
                        // Server Component
                    }
                },
            },
        }
    );
}
