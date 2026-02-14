import { getUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import type { Episode } from "@/types";
import GenerateClient from "./GenerateClient";

export default async function GeneratePage() {
    const user = await getUser();

    if (!user) redirect("/login");

    const supabase = await createServerSupabaseClient();

    // Now safe to fetch drafts, knowing user profile exists (or was just created)
    const { data: drafts } = await supabase
        .from("episodes")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "draft")
        .order("created_at", { ascending: false });

    return (
        <GenerateClient
            drafts={(drafts as Episode[]) || []}
            isPaid={true} // TODO: revert to user.is_paid after client demo
        />
    );
}
