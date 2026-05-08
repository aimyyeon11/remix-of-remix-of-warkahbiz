import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.105.1/cors";

const SYSTEM_PROMPT = `You are a recipe reader for a Malaysian food stall owner app.
Extract all ingredients from the recipe image and return them via the provided tool.

Rules:
- "name" must be in Bahasa Malaysia, the GENERIC INGREDIENT KEY NAME (short, no brand, no size, no packaging descriptors).
  * "Tepung Gandum Cap Kapal 1kg" → "tepung gandum"
  * "MAGGI Sos Cili 500g" → "sos cili"
  * "Bawang besar India" → "bawang besar"
- "unit" must be EXACTLY one of: "kg", "g", "liter", "ml", "biji", "pek", "kotak", "batang", "helai", "tong", "papan", "kampit", "ekor", "unit", "pcs", "box", "pack", "dozen".
  * Convert: gram → g, gm → g, L → liter, ulas/sk/sb/sudu → unit, btg → batang.
- "qty" must be a positive number. If unclear, default to 1.
- Skip steps, instructions, garnishes that are not measured ingredients.
- If image is not a recipe or no ingredients found, return an empty items array.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "return_recipe",
    description: "Return parsed recipe ingredients",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              qty: { type: "number" },
              unit: { type: "string" },
            },
            required: ["name", "qty", "unit"],
            additionalProperties: false,
          },
        },
      },
      required: ["items"],
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
    if (!apiKey) return json({ ok: false, error: "missing_key", message: "AI belum tersedia.", items: [] });

    const body = await req.json() as { imageBase64: string; mimeType?: string };
    if (!body?.imageBase64 || body.imageBase64.length < 50) {
      return json({ ok: false, error: "invalid_input", message: "Imej tak sah.", items: [] }, 400);
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
            { type: "text", text: "Extract all ingredients from this recipe image and return them via the tool." },
            { type: "image_url", image_url: { url: dataUrl } },
          ] },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "return_recipe" } },
      }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("scan-recipe gateway error", res.status, t);
      if (res.status === 429) return json({ ok: false, error: "rate_limit", message: "Terlalu banyak permintaan.", items: [] });
      if (res.status === 402) return json({ ok: false, error: "no_credits", message: "Kredit AI habis.", items: [] });
      return json({ ok: false, error: `http_${res.status}`, message: "Gagal imbas resepi.", items: [] });
    }

    const data = await res.json();
    const argsStr = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!argsStr) return json({ ok: false, error: "no_tool_call", message: "AI tak dapat baca resepi.", items: [] });
    let parsed: { items: Array<{ name: string; qty: number; unit: string }> };
    try { parsed = JSON.parse(argsStr); } catch { return json({ ok: false, error: "bad_json", message: "Format salah.", items: [] }); }
    return json({ ok: true, items: Array.isArray(parsed.items) ? parsed.items : [] });
  } catch (e) {
    console.error("scan-recipe exception", e);
    return json({ ok: false, error: "exception", message: "Masalah sambungan.", items: [] });
  }
});
