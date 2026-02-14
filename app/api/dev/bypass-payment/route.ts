import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { createAdminClient } from "@/lib/supabaseAdmin";

export async function POST(_req: NextRequest) {
    // TEMPORARY: Allow in production for client review
    /*
    if (process.env.NODE_ENV !== "development") {
        return NextResponse.json({ error: "Dev only" }, { status: 403 });
    }
    */

    const supabase = await createServerSupabaseClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { error } = await admin
        .from("users")
        .update({ is_paid: true, plan: "pro" })
        .eq("id", user.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
