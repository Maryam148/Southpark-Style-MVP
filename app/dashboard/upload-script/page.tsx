import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import UploadScriptClient from "./UploadScriptClient";

export default async function UploadScriptPage() {
    const user = await getUser();

    if (!user) redirect("/login");

    return <UploadScriptClient userId={user.id} />;
}
