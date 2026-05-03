// Client-side stub for receipt scanning. Backend not yet connected.
export async function scanReceipt(_args: { data: { imageBase64: string; mimeType?: string } }) {
  return {
    vendor: "",
    date: "",
    items: [] as Array<{ emoji: string; name: string; qty: number; unit: string; price: number }>,
    error: "not_connected" as const,
    message: "Imbas resit memerlukan Lovable Cloud (AI). Sila aktifkan untuk teruskan. ☁️",
  };
}
