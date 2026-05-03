import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  name: z.string().min(1).max(80),
  quantity: z.number().min(0).max(10000),
  unit: z.string().min(1).max(20),
});

const SYSTEM_PROMPT = `You are a Malaysian market price estimator for small F&B businesses.
Given an ingredient name, quantity, and unit, estimate the typical CURRENT retail price in Malaysian Ringgit (RM) for that exact quantity, based on common prices at local markets / 99 Speedmart / Mydin / pasar borong (2024-2026 levels).

Rules:
- Return a single number (RM, the cost for the given quantity, NOT per kg).
- Be realistic; no taxes. Round to 2 decimals.
- If the ingredient is unclear or non-food, return 0 and confidence "low".
- confidence: "high" for staples (rice, sugar, flour, oil, chicken, eggs), "medium" for common veg/spices, "low" for unusual items.
- Always return via the tool.`;

const TOOL_SCHEMA = {
  type: "function" as const,
  function: {
    name: "return_estimate",
    description: "Return estimated cost",
    parameters: {
      type: "object",
      properties: {
        cost: { type: "number", description: "Estimated price in RM for the given quantity" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        note: { type: "string", description: "Short reasoning, max 60 chars" },
      },
      required: ["cost", "confidence", "note"],
      additionalProperties: false,
    },
  },
};

export const estimateIngredientCost = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "missing_key", message: "AI tidak tersedia" };
    }

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Estimate market cost for: ${data.quantity} ${data.unit} of ${data.name}`,
            },
          ],
          tools: [TOOL_SCHEMA],
          tool_choice: { type: "function", function: { name: "return_estimate" } },
        }),
      });

      if (!res.ok) {
        if (res.status === 429) return { ok: false as const, error: "rate_limit", message: "Terlalu banyak permintaan" };
        if (res.status === 402) return { ok: false as const, error: "no_credits", message: "Kredit AI habis" };
        const t = await res.text().catch(() => "");
        console.error("estimate-cost error", res.status, t);
        return { ok: false as const, error: `http_${res.status}`, message: "Gagal anggar" };
      }

      const json = await res.json();
      const argsStr = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!argsStr) return { ok: false as const, error: "no_tool_call", message: "Tiada anggaran" };

      let parsed: { cost: number; confidence: string; note: string };
      try {
        parsed = JSON.parse(argsStr);
      } catch {
        return { ok: false as const, error: "bad_json", message: "Format salah" };
      }

      return {
        ok: true as const,
        cost: Math.max(0, Number(parsed.cost) || 0),
        confidence: (parsed.confidence as "high" | "medium" | "low") || "low",
        note: parsed.note || "",
      };
    } catch (e) {
      console.error("estimate-cost exception", e);
      return { ok: false as const, error: "exception", message: "Masalah sambungan" };
    }
  });
