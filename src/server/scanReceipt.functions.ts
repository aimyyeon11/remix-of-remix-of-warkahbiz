import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  // data URL or base64 string of the receipt image
  imageBase64: z.string().min(50).max(15_000_000),
  mimeType: z.string().min(3).max(64).default("image/jpeg"),
});

const SYSTEM_PROMPT = `You are a receipt OCR assistant for a Malaysian small business app.
Parse the receipt image and extract structured data. Return ONLY a JSON object via the provided tool.

Rules:
- Detect vendor name and date (format date as readable string e.g. "24 April 2026", or empty if unknown).
- Each item: name (short, in Malay if possible), qty (number), unit (one of: kg, g, liter, ml, biji, pek, kotak, batang, helai, tong, papan, kampit, ekor, unit, pcs, box, pack, dozen), price (RM, total for that line, number).
- Pick a relevant emoji per item (🍗 ayam, 🥚 telur, 🍚 beras, 🛢️ minyak, 🌾 tepung, 🥤 gula, 🧂 garam, 🧅 bawang, 🌶️ cili, 🥛 santan, 📦 bungkus, 🛒 generic).
- If qty/unit unclear, default qty=1 unit="unit".
- Skip taxes, totals, subtotals — items only.`;

const TOOL_SCHEMA = {
  type: "function" as const,
  function: {
    name: "return_receipt",
    description: "Return parsed receipt data",
    parameters: {
      type: "object",
      properties: {
        vendor: { type: "string" },
        date: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              emoji: { type: "string" },
              name: { type: "string" },
              qty: { type: "number" },
              unit: { type: "string" },
              price: { type: "number" },
            },
            required: ["emoji", "name", "qty", "unit", "price"],
            additionalProperties: false,
          },
        },
      },
      required: ["vendor", "date", "items"],
      additionalProperties: false,
    },
  },
};

export const scanReceipt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "missing_key", message: "AI belum disambungkan. Sila aktifkan Lovable AI." };
    }

    const dataUrl = data.imageBase64.startsWith("data:")
      ? data.imageBase64
      : `data:${data.mimeType};base64,${data.imageBase64}`;

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
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: "Parse this receipt and return the items via the tool." },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          tools: [TOOL_SCHEMA],
          tool_choice: { type: "function", function: { name: "return_receipt" } },
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error("scan-receipt gateway error", res.status, errText);
        if (res.status === 429) return { ok: false as const, error: "rate_limit", message: "Terlalu banyak permintaan. Cuba lagi sebentar." };
        if (res.status === 402) return { ok: false as const, error: "no_credits", message: "Kredit AI dah habis. Sila tambah kredit." };
        return { ok: false as const, error: `http_${res.status}`, message: "Gagal scan resit. Cuba lagi." };
      }

      const json = await res.json();
      const toolCall = json?.choices?.[0]?.message?.tool_calls?.[0];
      const argsStr = toolCall?.function?.arguments;
      if (!argsStr) {
        return { ok: false as const, error: "no_tool_call", message: "AI tak dapat baca resit. Cuba gambar yang lebih jelas." };
      }
      let parsed: { vendor: string; date: string; items: Array<{ emoji: string; name: string; qty: number; unit: string; price: number }> };
      try {
        parsed = JSON.parse(argsStr);
      } catch {
        return { ok: false as const, error: "bad_json", message: "AI bagi format yang salah. Cuba lagi." };
      }

      return { ok: true as const, vendor: parsed.vendor || "", date: parsed.date || "", items: parsed.items || [] };
    } catch (e) {
      console.error("scan-receipt exception", e);
      return { ok: false as const, error: "exception", message: "Masalah sambungan. Cuba lagi." };
    }
  });
