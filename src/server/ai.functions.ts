// Client-side stub. Backend (Lovable Cloud edge function) not yet connected.
// When Cloud is enabled, replace this with a supabase.functions.invoke call.
export async function askWarkahAI(_args: { data: { systemPrompt: string; messages: Array<{ role: "user" | "assistant"; content: string }> } }) {
  return {
    reply: "Maaf, AI belum disambungkan. Sila aktifkan Lovable Cloud untuk gunakan ciri AI. ☁️",
    error: "not_connected" as const,
  };
}
