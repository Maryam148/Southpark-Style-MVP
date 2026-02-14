import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import cloudinary from "@/lib/cloudinary";

export async function DELETE(req: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { assetId, cloudinaryId } = await req.json();

        if (!assetId) {
            return NextResponse.json(
                { error: "assetId is required" },
                { status: 400 }
            );
        }

        // Delete from Cloudinary if we have the public ID
        if (cloudinaryId) {
            try {
                await cloudinary.uploader.destroy(cloudinaryId);
            } catch (err) {
                console.error("Cloudinary delete error:", err);
                // Continue — still remove from DB
            }
        }

        // Delete from Supabase (RLS ensures ownership)
        const { error: deleteError } = await supabase
            .from("assets")
            .delete()
            .eq("id", assetId)
            .eq("user_id", user.id);

        if (deleteError) {
            return NextResponse.json(
                { error: deleteError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete asset error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
