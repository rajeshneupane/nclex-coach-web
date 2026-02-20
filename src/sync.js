import { supabase } from "./supabaseClient";

export async function pullCloudState(userId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("app_state")
    .select("state")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.state ?? null;
}

export async function pushCloudState(userId, state) {
  if (!supabase) return;
  const { error } = await supabase
    .from("app_state")
    .upsert({ user_id: userId, state, updated_at: new Date().toISOString() });
  if (error) throw error;
}