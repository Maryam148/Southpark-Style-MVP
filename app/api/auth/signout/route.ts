import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

/**
 * POST /api/auth/signout
 * Server-side sign-out — properly clears HTTP-only auth cookies.
 */
export async function POST() {
    try {
        const supabase = await createServerSupabaseClient();
        await supabase.auth.signOut();
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("signout error:", err);
        return NextResponse.json({ error: "Sign out failed" }, { status: 500 });
    }
}
