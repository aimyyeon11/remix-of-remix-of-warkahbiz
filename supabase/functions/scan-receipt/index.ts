import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.105.1/cors";

const SYSTEM_PROMPT = `You are a receipt OCR assistant for a Malaysian small business app.
Parse the receipt image and extract structured data. Return ONLY a JSON object via the provided tool.

Rules:
- Detect vendor name and date (format date as readable string e.g. "24 April 2026", or empty if unknown).
- Each item: name (short, in Malay if possible), qty (number), unit (one of: kg, g, liter, ml, biji, pek, kotak, batang, helai, tong, papan, kampit, ekor, unit, pcs, box, pack, dozen), price (RM, total for that line, number).
- Pick a relevant emoji per item (🍗 ayam, 🥚 telur, 🍚 beras, 🛢️ minyak, 🌾 tepung, 🥤 gula, 🧂 garam, 🧅 bawang, 🌶️ cili, 🥛 santan, 📦 bungkus, 🛒 generic).
- If qty/unit unclear, default qty=1 unit="unit".
- Skip taxes, totals, subtotals — items only.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "return_receipt",
    description: "Return parsed receipt data",
    parameters: {
      type: "object",
      properties: {
        vendor: { type: "string" },
        date: { type: "string" },
        tax: { type: "number", description: "Total tax amount in RM, or 0 if none" },
        total: { type: "number", description: "Grand total printed on the receipt in RM" },
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
      required: ["vendor", "date", "tax", "total", "items"],
      additionalProperties: false,
    },
  },
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }, status,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ ok: false, error: "missing_key", message: "AI belum tersedia." });

    const body = await req.json() as { imageBase64: string; mimeType?: string };
    if (!body?.imageBase64 || body.imageBase64.length < 50) {
      return json({ ok: false, error: "invalid_input", message: "Imej tak sah." }, 400);
    }
    const mimeType = body.mimeType || "image/jpeg";
    const dataUrl = body.imageBase64.startsWith("data:") ? body.imageBase64 : `data:${mimeType};base64,${body.imageBase64}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: [
            { type: "text", text: "Parse this receipt and return the items via the tool." },
            { type: "image_url", image_url: { url: dataUrl } },
          ] },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "return_receipt" } },
      }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("scan-receipt gateway error", res.status, t);
      if (res.status === 429) return json({ ok: false, error: "rate_limit", message: "Terlalu banyak permintaan." });
      if (res.status === 402) return json({ ok: false, error: "no_credits", message: "Kredit AI habis." });
      return json({ ok: false, error: `http_${res.status}`, message: "Gagal scan resit." });
    }

    const data = await res.json();
    const argsStr = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!argsStr) return json({ ok: false, error: "no_tool_call", message: "AI tak dapat baca resit." });
    let parsed: { vendor: string; date: string; items: Array<{ emoji: string; name: string; qty: number; unit: string; price: number }> };
    try { parsed = JSON.parse(argsStr); } catch { return json({ ok: false, error: "bad_json", message: "Format salah." }); }
    return json({ ok: true, vendor: parsed.vendor || "", date: parsed.date || "", items: parsed.items || [] });
  } catch (e) {
    console.error("scan-receipt exception", e);
    return json({ ok: false, error: "exception", message: "Masalah sambungan." });
  }
});
