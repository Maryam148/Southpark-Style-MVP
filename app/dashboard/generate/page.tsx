import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import type { Episode } from "@/types";
import GenerateClient from "./GenerateClient";

export default async function GeneratePage() {
    const supabase = await createServerSupabaseClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // Fetch drafts and user profile in parallel
    const [{ data: drafts }, { data: profile }] = await Promise.all([
        supabase
            .from("episodes")
            .select("*")
            .eq("user_id", user.id)
            .eq("status", "draft")
            .order("created_at", { ascending: false }),
        supabase
            .from("users")
            .select("is_paid")
            .eq("id", user.id)
            .single(),
    ]);

    return (
        <GenerateClient
            drafts={(drafts as Episode[]) || []}
            isPaid={profile?.is_paid ?? false}
        />
    );
}
