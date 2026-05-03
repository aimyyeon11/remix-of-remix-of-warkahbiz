import { supabase } from "@/integrations/supabase/client";

export async function scanReceipt(args: { data: { imageBase64: string; mimeType?: string } }) {
  const { data, error } = await supabase.functions.invoke("scan-receipt", { body: args.data });
  if (error) {
    console.error("scanReceipt error", error);
    return { ok: false as const, error: "exception", message: "Masalah sambungan. Cuba lagi.", vendor: "", date: "", items: [] };
  }
  return data as { ok: boolean; vendor: string; date: string; items: Array<{ emoji: string; name: string; qty: number; unit: string; price: number }>; error?: string; message?: string };
}
