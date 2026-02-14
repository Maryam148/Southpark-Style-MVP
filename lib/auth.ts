import { createServerSupabaseClient } from "@/lib/supabaseServer";
import type { User } from "@/types";

/**
 * Server-side utility — get the authenticated user + their profile row.
 * Use in Server Components, Route Handlers, and Server Actions.
 *
 * Returns `null` if the user is not authenticated.
 */
export async function getUser(): Promise<User | null> {
    const supabase = await createServerSupabaseClient();

    const {
        data: { user: authUser },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) return null;

    const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

    if (!profile) {
        // Auth exists but no profile row yet — return a minimal User
        return {
            id: authUser.id,
            email: authUser.email ?? "",
            full_name: authUser.user_metadata?.full_name ?? null,
            avatar_url: null,
            credits: 0,
            plan: "free",
            is_paid: false,
            stripe_customer_id: null,
            created_at: authUser.created_at,
            updated_at: authUser.created_at,
        };
    }

    return profile as User;
}
