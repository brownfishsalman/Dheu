import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/session";

// Resolves (or creates) the 1-to-1 conversation with a user, then opens it.
export default async function MessageWithPage(props: PageProps<"/messages/with/[userId]">) {
  const { userId } = await props.params;
  const me = await requireProfile();
  if (userId === me.id) redirect("/messages");

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("get_or_create_conversation", { p_other_id: userId });
  if (error || !id) redirect("/messages");
  redirect(`/messages/${id}`);
}
