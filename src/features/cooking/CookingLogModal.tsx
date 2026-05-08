import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChefHat, Minus, Plus, X, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fmtQty } from "@/lib/format";
import type { Product, StockItem } from "@/types";

export const CookingLogModal = ({
  open,
  products,
  stock,
  onClose,
  onConfirm,
}: {
  open: boolean;
  products: Product[];
  stock: StockItem[];
  onClose: () => void;
  onConfirm: (productId: string, batches: number) => void;
}) => {
  const [productId, setProductId] = useState<string>("");
  const [batches, setBatches] = useState<number>(1);

  const product = products.find((p) => p.id === productId);

  const deductions = useMemo(() => {
    if (!product) return [];
    return (product.ingredients ?? []).map((ing) => {
      const s = stock.find((x) => x.name.trim().toLowerCase() === ing.name.trim().toLowerCase());
      const totalNeeded = +(ing.quantity * batches).toFixed(2);
      const available = s?.qty ?? 0;
      return {
        name: ing.name,
        unit: ing.unit,
        needed: totalNeeded,
        available,
        shortfall: Math.max(0, +(totalNeeded - available).toFixed(2)),
        hasStock: !!s,
      };
    });
  }, [product, batches, stock]);

  const hasShortfall = deductions.some((d) => d.shortfall > 0);
  const missingStock = deductions.some((d) => !d.hasStock);

  const handleConfirm = () => {
    if (!product) {
      toast.error("Sila pilih produk");
      return;
    }
    if (batches < 1) {
      toast.error("Bilangan batch mesti sekurang-kurangnya 1");
      return;
    }
    onConfirm(product.id, batches);
    toast.success(`✅ ${batches} ${product.batchUnit ?? "batch"} ${product.name} direkodkan — stok dikemaskini`);
    setProductId("");
    setBatches(1);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[480px] p-0 gap-0 max-h-[92vh] flex flex-col rounded-3xl overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="text-base font-extrabold flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-primary" />
            Log Masakan Hari Ini
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground mt-1">
            Pilih produk yang dimasak — stok akan ditolak secara automatik.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {products.length === 0 ? (
            <div className="rounded-2xl bg-muted/40 border border-border p-6 text-center">
              <div className="text-3xl mb-2">🍽️</div>
              <p className="text-xs text-muted-foreground">
                Tiada produk lagi. Sila tambah produk dalam Profil → Produk Saya.
              </p>
            </div>
          ) : (
            <>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Produk yang dimasak
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setProductId(p.id)}
                      className={`rounded-2xl border-2 p-3 tap text-left transition-all ${
                        productId === p.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-surface hover:border-primary/40"
                      }`}
                    >
                      <div className="text-2xl">{p.emoji}</div>
                      <div className="font-bold text-xs mt-1 truncate">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        per {p.batchUnit ?? "batch"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {product && (
                <>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Berapa {product.batchUnit ?? "batch"}?
                    </div>
                    <div className="flex items-center gap-3 justify-center bg-muted/40 rounded-2xl p-3">
                      <button
                        onClick={() => setBatches((b) => Math.max(1, b - 1))}
                        className="w-12 h-12 rounded-2xl bg-background border border-border grid place-items-center tap"
                        aria-label="Kurang"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <div className="text-4xl font-extrabold tabular-nums min-w-[80px] text-center">
                        {batches}
                      </div>
                      <button
                        onClick={() => setBatches((b) => b + 1)}
                        className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground grid place-items-center tap"
                        aria-label="Tambah"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-center text-muted-foreground mt-1.5">
                      = {batches} {product.batchUnit ?? "batch"} {product.name}
                    </p>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Bahan yang akan ditolak
                    </div>
                    {deductions.length === 0 ? (
                      <div className="rounded-xl bg-muted/40 border border-border p-3 text-[11px] text-muted-foreground text-center">
                        Produk ini tiada bahan didaftarkan.
                      </div>
                    ) : (
                      <div className="space-y-1.5 rounded-2xl border border-border bg-surface p-3">
                        {deductions.map((d, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 text-xs">
                            <div className="flex-1 min-w-0 truncate font-semibold">
                              {d.name || <span className="italic text-muted-foreground">(tanpa nama)</span>}
                            </div>
                            <div className="text-muted-foreground shrink-0">
                              {fmtQty(d.needed, d.unit)}
                            </div>
                            {!d.hasStock ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-warn/15 text-warn shrink-0">
                                tiada stok
                              </span>
                            ) : d.shortfall > 0 ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cost/15 text-cost shrink-0">
                                kurang {d.shortfall}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-profit/15 text-profit shrink-0">
                                cukup
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {(hasShortfall || missingStock) && (
                      <div className="mt-2 rounded-xl bg-warn-soft border border-warn/30 p-2.5 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-warn shrink-0 mt-0.5" />
                        <p className="text-[11px] text-warn-foreground/90 leading-snug">
                          Sebahagian bahan tidak mencukupi atau tiada dalam stok. Stok akan turun ke 0 untuk item yang kurang. Sila beli stok jika perlu.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="border-t border-border px-5 py-3 flex items-center justify-between gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-2xl">
            <X className="w-4 h-4" /> Batal
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!product}
            className="rounded-2xl bg-gradient-profit text-profit-foreground"
          >
            Simpan & Tolak Stok
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
