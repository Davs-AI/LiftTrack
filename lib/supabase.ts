import { createClient } from "@supabase/supabase-js";
export const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "anon");
