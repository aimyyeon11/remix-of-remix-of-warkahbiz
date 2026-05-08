import { supabase } from "@/integrations/supabase/client";

const DEVICE_KEY = "warkahbiz_device_id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = (crypto?.randomUUID?.() ?? `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export type GoalType = "machine" | "sales" | "branch";

export interface SelectedPlan {
  monthly: number;
  months: number;
  label: string;
}

export interface Impian {
  id: string;
  device_id: string;
  goal_type: GoalType;
  goal_name: string;
  target_amount: number;
  current_saved: number;
  selected_plan: SelectedPlan | null;
  created_at: string;
  updated_at: string;
}

export async function listImpian(): Promise<Impian[]> {
  const deviceId = getDeviceId();
  const { data, error } = await supabase
    .from("user_impian")
    .select("*")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Impian[];
}

export async function createImpian(input: {
  goal_type: GoalType;
  goal_name: string;
  target_amount: number;
  current_saved: number;
  selected_plan: SelectedPlan | null;
}): Promise<Impian> {
  const deviceId = getDeviceId();
  const payload = { ...input, device_id: deviceId, selected_plan: input.selected_plan as never };
  const { data, error } = await supabase
    .from("user_impian")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Impian;
}

export async function addSavings(id: string, delta: number): Promise<Impian> {
  // Read current then update (no auth, single user per device)
  const { data: current, error: readErr } = await supabase
    .from("user_impian")
    .select("current_saved")
    .eq("id", id)
    .single();
  if (readErr) throw readErr;
  const next = Math.max(0, Number(current.current_saved) + delta);
  const { data, error } = await supabase
    .from("user_impian")
    .update({ current_saved: next })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Impian;
}

export async function deleteImpian(id: string): Promise<void> {
  const { error } = await supabase.from("user_impian").delete().eq("id", id);
  if (error) throw error;
}
