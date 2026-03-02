import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

async function main() {
    const { data, error } = await supabase
        .from("episodes")
        .select("metadata, script")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1);

    if (error) {
        console.error("Error fetching episode:", error);
        return;
    }

    if (data && data.length > 0) {
        const ep = data[0];
        const playable = ep.metadata?.playable;
        fs.writeFileSync("/tmp/latest_episode_playable.json", JSON.stringify(playable, null, 2));
        fs.writeFileSync("/tmp/latest_episode_script.json", JSON.stringify(JSON.parse(ep.script || "{}"), null, 2));
        console.log("Wrote latest episode to /tmp/. Check /tmp/latest_episode_playable.json");
    } else {
        console.log("No completed episodes found.");
    }
}

main();
