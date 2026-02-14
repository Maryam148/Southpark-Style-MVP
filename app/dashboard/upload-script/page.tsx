import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import UploadScriptClient from "./UploadScriptClient";

export default async function UploadScriptPage() {
    const supabase = await createServerSupabaseClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    return <UploadScriptClient userId={user.id} />;
}
