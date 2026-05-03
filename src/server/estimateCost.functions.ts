// Client-side stub for AI cost estimation. Backend not yet connected.
export async function estimateIngredientCost(_args: { data: { name: string; quantity: number; unit: string } }) {
  return { cost: null as number | null, error: "not_connected" as const };
}
