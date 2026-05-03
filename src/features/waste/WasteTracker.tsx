import { useMemo, useState } from "react";
import { ArrowLeft, Trash2, Sparkles, TrendingDown, Plus, Minus, Save, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fmt } from "@/lib/format";
import type { Unit } from "@/types";

interface WasteRow {
  id: string;
  emoji: string;
  name: string;
  prepared: number;        // qty cooked / prepped today
  sold: number;            // qty sold today
  unitCost: number;        // RM per unit
  unit: Unit;
  forecastDemand: number;  // AI demand for tomorrow (units)
}

const SEED: WasteRow[] = [
  { id: "w1", emoji: "🍔", name: "Burger Patty", prepared: 100, sold: 78, unitCost: 1.80, unit: "biji", forecastDemand: 92 },
  { id: "w2", emoji: "🍗", name: "Ayam Goreng", prepared: 60, sold: 55, unitCost: 2.50, unit: "biji", forecastDemand: 70 },
  { id: "w3", emoji: "🍚", name: "Nasi Lemak Pek", prepared: 80, sold: 65, unitCost: 1.20, unit: "pek", forecastDemand: 75 },
  { id: "w4", emoji: "🥤", name: "Air Sirap Botol", prepared: 50, sold: 32, unitCost: 0.90, unit: "biji", forecastDemand: 40 },
];

const addressBoss = (b: string) => (b?.trim() ? b.trim() : "Boss");

export function WasteTracker({
  onClose,
  businessName,
  onSendToBuy,
}: {
  onClose: () => void;
  businessName: string;
  onSendToBuy: (items: { emoji: string; name: string; recQty: number; unit: Unit; note?: string }[]) => void;
}) {
  const boss = addressBoss(businessName);
  const [rows, setRows] = useState<WasteRow[]>(SEED);

  const totals = useMemo(() => {
    let unsold = 0;
    let wasteRM = 0;
    let savedRM = 0; // money the AI plan would save vs prepping = forecast OR vs prepping = today's prepared
    rows.forEach((r) => {
      const left = Math.max(0, r.prepared - r.sold);
      unsold += left;
      wasteRM += left * r.unitCost;
      // Smart prep recommendation: forecast minus carried-over (assume half is still usable next day for non-perishables = 0 here)
      const recommendedPrep = Math.max(0, Math.round(r.forecastDemand * 1.05)); // 5% safety margin
      const naivePrep = r.prepared;
      const saved = Math.max(0, naivePrep - recommendedPrep) * r.unitCost;
      savedRM += saved;
    });
    return { unsold, wasteRM, savedRM };
  }, [rows]);

  const adj = (id: string, key: "prepared" | "sold" | "unitCost" | "forecastDemand", delta: number, min = 0) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: Math.max(min, +(Number(r[key]) + delta).toFixed(2)) } : r)));
  };

  const setVal = (id: string, key: "prepared" | "sold" | "unitCost" | "forecastDemand", v: number) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: Math.max(0, v) } : r)));
  };

  const sendPlanToBuy = () => {
    const items = rows
      .map((r) => {
        const rec = Math.max(0, Math.round(r.forecastDemand * 1.05));
        return { emoji: r.emoji, name: r.name + " (bahan)", recQty: rec, unit: r.unit, note: `Rancangan AI hari esok untuk ${boss}` };
      })
      .filter((i) => i.recQty > 0);
    onSendToBuy(items);
    toast.success(`${items.length} item rancangan esok dihantar ke Nak Beli ✅`);
  };

  const save = () => toast.success("Catatan sisa hari ini disimpan ✅");

  return (
    <div className="fixed inset-0 z-40 bg-background overflow-y-auto animate-fade-in">
      <div className="mx-auto w-full max-w-full sm:max-w-[600px] md:max-w-[760px] lg:max-w-[960px] xl:max-w-[1140px] 2xl:max-w-[1280px] min-h-screen bg-background pb-32">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={onClose} className="w-10 h-10 grid place-items-center rounded-full hover:bg-muted tap" aria-label="Tutup">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-extrabold leading-tight">Pengurus Sisa Bijak</h1>
            <p className="text-xs text-muted-foreground">AI bandingkan sisa semalam dengan ramalan esok untuk {boss}</p>
          </div>
        </header>

        <div className="px-4 py-4 space-y-5">
          {/* Hero summary */}
          <section className="rounded-2xl p-5 bg-gradient-cost text-white shadow-cost-card relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
            <div className="relative space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider opacity-90 flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Sisa Hari Ini
              </p>
              <p className="text-4xl font-extrabold">{totals.unsold} unit</p>
              <p className="text-sm opacity-90">Bersamaan kerugian {fmt(totals.wasteRM)}</p>
            </div>
          </section>

          <section className="rounded-2xl p-5 bg-gradient-profit text-profit-foreground shadow-glow">
            <p className="text-xs font-bold uppercase tracking-wider opacity-90 flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> Penjimatan Cadangan AI
            </p>
            <p className="text-3xl font-extrabold mt-1">{fmt(totals.savedRM)}</p>
            <p className="text-sm opacity-95 mt-1">
              {boss}, ikut rancangan esok ini boleh selamatkan untung sebanyak {fmt(totals.savedRM)} sehari.
            </p>
          </section>

          {/* Rows */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Catatan Hari Ini</h2>
            {rows.map((r) => {
              const left = Math.max(0, r.prepared - r.sold);
              const wasteRM = left * r.unitCost;
              const rec = Math.max(0, Math.round(r.forecastDemand * 1.05));
              const diff = r.prepared - rec;
              return (
                <div key={r.id} className="rounded-2xl bg-card border border-border p-4 shadow-card space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-muted grid place-items-center text-xl">{r.emoji}</div>
                    <div className="flex-1">
                      <p className="font-extrabold">{r.name}</p>
                      <p className="text-[11px] text-muted-foreground">Kos {fmt(r.unitCost)} / {r.unit}</p>
                    </div>
                    {left > 0 ? (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-cost-soft text-cost">{left} sisa</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-primary/15 text-primary">Habis ✅</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <NumStepper label="Disediakan" value={r.prepared} onMinus={() => adj(r.id, "prepared", -1)} onPlus={() => adj(r.id, "prepared", 1)} onChange={(v) => setVal(r.id, "prepared", v)} />
                    <NumStepper label="Terjual" value={r.sold} onMinus={() => adj(r.id, "sold", -1)} onPlus={() => adj(r.id, "sold", 1)} onChange={(v) => setVal(r.id, "sold", v)} />
                  </div>

                  <div className="rounded-xl bg-primary/8 border border-primary/20 p-3 text-sm">
                    <p className="flex items-center gap-1 text-xs font-bold text-primary">
                      <Sparkles className="w-3 h-3" /> Cadangan AI untuk esok
                    </p>
                    <p className="mt-1 leading-relaxed">
                      Sediakan <span className="font-extrabold">{rec} {r.unit}</span> sahaja
                      {diff > 0 && <> — kurangkan {diff} {r.unit} (jimat <span className="font-bold">{fmt(diff * r.unitCost)}</span>)</>}
                      {diff < 0 && <> — tambah {Math.abs(diff)} {r.unit} sebab permintaan dijangka naik</>}
                      {diff === 0 && <> — kuantiti hari ini dah tepat 👍</>}
                    </p>
                    {wasteRM > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-1">Sisa hari ini bernilai {fmt(wasteRM)}.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </section>

          <section className="rounded-2xl p-5 bg-gradient-income text-white shadow-card space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider opacity-90 flex items-center gap-1">
              <Sparkles className="w-4 h-4" /> Mesej AI
            </p>
            <p className="text-sm leading-relaxed">
              {boss}, sisa setiap hari tu macam bocor sikit-sikit dalam baldi untung. Ikut rancangan ini esok — selamatkan {fmt(totals.savedRM)} tanpa korbankan jualan.
            </p>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <Button onClick={save} variant="outline" className="h-12 rounded-2xl font-bold">
              <Save className="w-4 h-4 mr-2" /> Simpan
            </Button>
            <Button onClick={sendPlanToBuy} className="h-12 rounded-2xl bg-primary text-primary-foreground font-bold">
              <ShoppingCart className="w-4 h-4 mr-2" /> Hantar ke Nak Beli
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

const NumStepper = ({ label, value, onMinus, onPlus, onChange }: {
  label: string; value: number; onMinus: () => void; onPlus: () => void; onChange: (v: number) => void;
}) => (
  <div className="rounded-xl border border-border p-2">
    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider px-1">{label}</p>
    <div className="flex items-center gap-1 mt-1">
      <button onClick={onMinus} className="w-9 h-9 rounded-lg bg-muted grid place-items-center tap" aria-label={`${label} kurang`}>
        <Minus className="w-4 h-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="flex-1 h-9 text-center font-extrabold bg-transparent outline-none rounded-lg focus:bg-muted/40"
      />
      <button onClick={onPlus} className="w-9 h-9 rounded-lg bg-muted grid place-items-center tap" aria-label={`${label} tambah`}>
        <Plus className="w-4 h-4" />
      </button>
    </div>
  </div>
);