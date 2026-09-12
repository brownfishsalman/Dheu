import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

// Browser-side Supabase client. Safe to use in Client Components.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
