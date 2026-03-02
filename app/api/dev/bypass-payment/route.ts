import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { createAdminClient } from "@/lib/supabaseAdmin";

async function activate() {
    const supabase = await createServerSupabaseClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Not logged in", status: 401 };

    const admin = createAdminClient();
    const { error } = await admin
        .from("users")
        .update({ is_paid: true, plan: "pro" })
        .eq("id", user.id);

    if (error) return { error: error.message, status: 500 };

    return { success: true, status: 200 };
}

export async function POST(_req: NextRequest) {
    const result = await activate();
    return NextResponse.json(result, { status: result.status });
}

// GET so you can visit the URL directly in a browser tab
export async function GET(_req: NextRequest) {
    const result = await activate();
    if ("error" in result) {
        return NextResponse.json(result, { status: result.status });
    }
    // Redirect to episodes with a cache-bust param so useUser re-fetches the profile
    return NextResponse.redirect(new URL("/dashboard/episodes?activated=1", _req.url));
}
