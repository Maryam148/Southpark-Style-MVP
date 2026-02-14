import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { createAdminClient } from "@/lib/supabaseAdmin";

/**
 * POST /api/auth/ensure-profile
 * Creates a public.users row for the authenticated user if one doesn't exist.
 * Uses the admin client to bypass RLS.
 */
export async function POST(req: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { email } = await req.json().catch(() => ({ email: "" }));

        const admin = createAdminClient();

        // Use upsert to handle "create if not exists" atomically.
        // onConflict: 'id' ensures we don't get duplicate key errors.
        const { data: profile, error: upsertError } = await admin
            .from("users")
            .upsert(
                {
                    id: user.id,
                    email: email || user.email || "",
                    full_name: user.user_metadata?.full_name || "",
                },
                { onConflict: "id" }
            )
            .select("*")
            .single();

        if (upsertError) {
            console.error("ensure-profile upsert error:", upsertError);
            return NextResponse.json(
                { error: upsertError.message },
                { status: 500 }
            );
        }

        return NextResponse.json(profile);
    } catch (err) {
        console.error("ensure-profile error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
