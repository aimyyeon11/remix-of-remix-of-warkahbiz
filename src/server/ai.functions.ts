import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  systemPrompt: z.string().min(1).max(20000),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(8000),
    })
  ).min(1).max(20),
});

export const askWarkahAI = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { reply: "Maaf, AI belum disambungkan. Sila aktifkan Lovable AI.", error: "missing_key" };
    }

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: data.systemPrompt },
            ...data.messages,
          ],
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error("AI gateway error", res.status, errText);
        if (res.status === 429) {
          return { reply: "Terlalu banyak permintaan sekejap. Cuba lagi sebentar. ⏳", error: "rate_limit" };
        }
        if (res.status === 402) {
          return { reply: "Kredit AI dah habis. Sila tambah kredit di Lovable Cloud.", error: "no_credits" };
        }
        return { reply: "Maaf, ada masalah teknikal. Cuba lagi.", error: `http_${res.status}` };
      }

      const json = await res.json();
      const reply = json?.choices?.[0]?.message?.content ?? "Maaf, tiada jawapan.";
      return { reply, error: null };
    } catch (e) {
      console.error("AI handler exception", e);
      return { reply: "Maaf, ada masalah sambungan. Cuba lagi.", error: "exception" };
    }
  });
