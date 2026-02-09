import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (import.meta.env.VITE_AUTH_DISABLED === "true" ? "https://dummy.supabase.co" : "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (import.meta.env.VITE_AUTH_DISABLED === "true" ? "dummy" : "");

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase env vars are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
