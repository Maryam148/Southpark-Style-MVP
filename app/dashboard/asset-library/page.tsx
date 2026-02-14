import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import type { Asset } from "@/types";
import AssetLibraryClient from "./AssetLibraryClient";

export default async function AssetLibraryPage() {
    const supabase = await createServerSupabaseClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data } = await supabase
        .from("assets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    return (
        <AssetLibraryClient
            initialAssets={(data as Asset[]) || []}
            userId={user.id}
        />
    );
}
