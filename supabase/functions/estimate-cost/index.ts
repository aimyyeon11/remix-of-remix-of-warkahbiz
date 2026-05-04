import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.105.1/cors";

const SYSTEM_PROMPT = `You are a Malaysian market price estimator for small F&B businesses.
Given an ingredient name, quantity, and unit, estimate the typical CURRENT retail price in Malaysian Ringgit (RM) for that exact quantity, based on common prices at local markets / 99 Speedmart / Mydin / pasar borong (2024-2026 levels).

Rules:
- Return a single number (RM, the cost for the given quantity, NOT per kg).
- Be realistic; no taxes. Round to 2 decimals.
- If the ingredient is unclear or non-food, return 0 and confidence "low".
- confidence: "high" for staples, "medium" for common veg/spices, "low" for unusual items.
- Always return via the tool.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "return_estimate",
    parameters: {
      type: "object",
      properties: {
        cost: { type: "number" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        note: { type: "string" },
      },
      required: ["cost", "confidence", "note"],
      additionalProperties: false,
    },
  },
};

function json(p: unknown, status = 200) {
  return new Response(JSON.stringify(p), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ ok: false, error: "missing_key", cost: 0 });

    const body = await req.json() as { name: string; quantity: number; unit: string };
    if (!body?.name || typeof body.quantity !== "number" || !body?.unit) {
      return json({ ok: false, error: "invalid_input", cost: 0 }, 400);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Estimate market cost for: ${body.quantity} ${body.unit} of ${body.name}` },
          ],
          tools: [TOOL_SCHEMA],
          tool_choice: { type: "function", function: { name: "return_estimate" } },
        }),
      });
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("estimate-cost fetch aborted/failed", err);
      return json({ ok: false, error: "timeout", cost: 0 });
    }
    clearTimeout(timeoutId);

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("estimate-cost error", res.status, t);
      if (res.status === 429) return json({ ok: false, error: "rate_limit", cost: 0 });
      if (res.status === 402) return json({ ok: false, error: "no_credits", cost: 0 });
      return json({ ok: false, error: `http_${res.status}`, cost: 0 });
    }

    const data = await res.json();
    const argsStr = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!argsStr) return json({ ok: false, error: "no_tool_call", cost: 0 });
    let parsed: { cost: number; confidence: string; note: string };
    try { parsed = JSON.parse(argsStr); } catch { return json({ ok: false, error: "bad_json", cost: 0 }); }
    return json({ ok: true, cost: Math.max(0, Number(parsed.cost) || 0), confidence: parsed.confidence || "low", note: parsed.note || "" });
  } catch (e) {
    console.error("estimate-cost exception", e);
    return json({ ok: false, error: "exception", cost: 0 });
  }
});
