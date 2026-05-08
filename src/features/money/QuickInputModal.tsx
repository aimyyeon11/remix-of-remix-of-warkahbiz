import { useMemo, useState } from "react";
import { X, Check, Delete, Camera, Plus, Trash2, ArrowLeft } from "lucide-react";
import type { Txn, TxnType, ReceiptItem, Product, Unit } from "@/types";
import { ReceiptScanner } from "@/features/inventory/ReceiptScanner";

const incomeSuggestions = ["Jualan Pagi", "Jualan Petang", "Penghantaran"];

const ALLOWED_UNITS: Unit[] = [
  "ekor", "kotak", "kg", "gram", "paket", "liter", "botol",
  "biji", "ikat", "tin", "bungkus", "sudu", "cawan",
];

type PurchaseLine = { name: string; qty: number; unit: Unit; amount: number };
type Step = "amount" | "name" | "qty";

export const QuickInputModal = ({ onClose, onSave, onReceiptConfirm, onBoughtItems, products }: {
  onClose: () => void;
  onSave: (t: Omit<Txn, "id" | "ts" | "time">) => void;
  onReceiptConfirm?: (items: ReceiptItem[]) => void;
  onBoughtItems?: (items: Array<{ name: string; qty: number; unit: string; isOpEx: boolean }>) => void;
  products: Product[];
}) => {
  const [mode, setMode] = useState<TxnType>("in");
  const [amount, setAmount] = useState("0"); // for income mode
  const [note, setNote] = useState("");
  const [success, setSuccess] = useState(false);
  const [scanner, setScanner] = useState(false);

  // Multi-item purchase session
  const [items, setItems] = useState<PurchaseLine[]>([]);
  const [step, setStep] = useState<Step>("amount");
  const [draftAmount, setDraftAmount] = useState("0");
  const [draftName, setDraftName] = useState("");
  const [draftQty, setDraftQty] = useState("1");
  const [draftUnit, setDraftUnit] = useState<Unit>("kg");
  const [confirming, setConfirming] = useState(false);

  // Unique ingredient list across all products
  const ingredientOptions = useMemo(() => {
    const seen = new Map<string, Unit>();
    products.forEach(p => (p.ingredients ?? []).forEach(ing => {
      const key = ing.name.trim();
      if (!key) return;
      if (!seen.has(key.toLowerCase())) seen.set(key.toLowerCase(), ing.unit);
    }));
    return Array.from(seen.entries()).map(([k, u]) => ({
      name: products.flatMap(p => p.ingredients ?? []).find(i => i.name.trim().toLowerCase() === k)?.name.trim() ?? k,
      unit: u,
    }));
  }, [products]);

  const hasProducts = products.length > 0 && ingredientOptions.length > 0;

  const press = (k: string, target: "income" | "draft") => {
    const setter = target === "income" ? setAmount : setDraftAmount;
    setter(prev => {
      if (k === "del") return prev.length <= 1 ? "0" : prev.slice(0, -1);
      if (k === ".") return prev.includes(".") ? prev : prev + ".";
      if (prev === "0") return k;
      return prev + k;
    });
  };

  const handleSaveIncome = () => {
    if (parseFloat(amount) <= 0) return;
    setSuccess(true);
    setTimeout(() => {
      onSave({ type: "in", emoji: "💰", label: note || "Jualan", amount: parseFloat(amount) });
      onClose();
    }, 800);
  };

  // === Purchase flow handlers ===
  const resetDraft = () => {
    setStep("amount");
    setDraftAmount("0");
    setDraftName("");
    setDraftQty("1");
    setDraftUnit(ingredientOptions[0]?.unit ?? "kg");
  };

  const commitDraft = () => {
    const amt = parseFloat(draftAmount) || 0;
    const qty = parseFloat(draftQty) || 0;
    if (!draftName || amt <= 0 || qty <= 0) return;
    setItems(prev => [...prev, { name: draftName, qty, unit: draftUnit, amount: amt }]);
    resetDraft();
  };

  const handleAddMore = () => {
    commitDraft();
  };

  const handleFinishToConfirm = () => {
    // If user is mid-draft with valid values, commit it first
    const amt = parseFloat(draftAmount) || 0;
    const qty = parseFloat(draftQty) || 0;
    if (draftName && amt > 0 && qty > 0) {
      setItems(prev => [...prev, { name: draftName, qty, unit: draftUnit, amount: amt }]);
      resetDraft();
    }
    setConfirming(true);
  };

  const handleConfirmFinal = () => {
    if (items.length === 0) return;
    setSuccess(true);
    setTimeout(() => {
      const t = new Date();
      items.forEach(it => {
        onSave({ type: "out", emoji: "🛒", label: `Beli ${it.name}`, amount: it.amount });
      });
      if (onBoughtItems) {
        onBoughtItems(items.map(it => ({ name: it.name, qty: it.qty, unit: it.unit, isOpEx: false })));
      }
      void t;
      onClose();
    }, 800);
  };

  // Receipt scan -> classify, then feed into confirmation screen
  const handleScannerConfirm = (scanned: ReceiptItem[], personal: ReceiptItem[] = []) => {
    // Record personal items immediately as separate "Peribadi" expenses (excluded from stock)
    if (personal.length > 0) {
      personal.forEach((p) => {
        onSave({ type: "out", emoji: "🧑", label: `Peribadi: ${p.name}`, amount: p.price || 0 });
      });
    }
    const mapped: PurchaseLine[] = scanned.map(s => ({
      name: s.name,
      qty: s.qty || 1,
      unit: (ALLOWED_UNITS.includes(s.unit as Unit) ? (s.unit as Unit) : "biji"),
      amount: s.price || 0,
    }));
    setItems(prev => [...prev, ...mapped]);
    setScanner(false);
    if (mapped.length > 0) setConfirming(true);
    else if (personal.length > 0) {
      // Only personal — close modal with success
      onClose();
    }
  };

  const totalSpent = items.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[440px] h-[88vh] bg-surface rounded-t-[2.5rem] animate-slide-up flex flex-col"
      >
        <div className="pt-3 pb-1 grid place-items-center">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/40" />
        </div>

        <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-surface-elevated grid place-items-center tap z-10">
          <X className="w-5 h-5" />
        </button>

        {!confirming && (
          <div className="px-5 mt-2">
            <div className="rounded-2xl p-1 bg-surface-elevated grid grid-cols-2 gap-1">
              <button
                onClick={() => setMode("in")}
                className={`py-3 rounded-xl font-bold text-sm tap ${mode === "in" ? "bg-gradient-profit text-profit-foreground shadow-card" : "text-muted-foreground"}`}
              >
                💰 Dapat Duit
              </button>
              <button
                onClick={() => { setMode("out"); if (!draftUnit && ingredientOptions[0]) setDraftUnit(ingredientOptions[0].unit); }}
                className={`py-3 rounded-xl font-bold text-sm tap ${mode === "out" ? "bg-gradient-cost text-white shadow-card" : "text-muted-foreground"}`}
              >
                💸 Pembelian
              </button>
            </div>
          </div>
        )}

        {/* PURCHASE / OUT MODE */}
        {mode === "out" && !confirming && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {!hasProducts ? (
              <div className="flex-1 grid place-items-center px-6">
                <div className="text-center space-y-4 max-w-xs">
                  <div className="text-5xl">📋</div>
                  <p className="text-sm font-semibold">
                    Sila tambah produk dalam Profil sebelum merekod pembelian.
                  </p>
                  <button onClick={onClose} className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-bold tap">
                    Tutup
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-5 mt-4 space-y-4 pb-4">
                  <button
                    onClick={() => setScanner(true)}
                    className="w-full h-12 rounded-2xl border-2 border-dashed border-warn/50 text-warn font-bold tap flex items-center justify-center gap-2 bg-warn/5"
                  >
                    <Camera className="w-5 h-5" /> Scan Resit / Invoice
                  </button>

                  {/* Running summary */}
                  {items.length > 0 && (
                    <div className="rounded-2xl bg-background border border-border p-3 space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Item dalam sesi ini ({items.length})
                      </div>
                      {items.map((it, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <span className="flex-1 font-semibold">{it.name}</span>
                          <span className="text-xs text-muted-foreground">{it.qty} {it.unit}</span>
                          <span className="font-bold w-16 text-right">RM {it.amount.toFixed(2)}</span>
                          <button
                            onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                            className="w-6 h-6 rounded-md bg-cost/10 text-cost grid place-items-center tap"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <div className="border-t border-border pt-2 flex justify-between text-sm">
                        <span className="font-bold text-muted-foreground">Jumlah</span>
                        <span className="font-extrabold text-cost">RM {totalSpent.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Stepper */}
                  <div className="rounded-2xl bg-background border-2 border-primary/20 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Item baharu
                      <span className="ml-auto text-[10px] normal-case font-semibold text-primary">
                        Langkah {step === "amount" ? "1" : step === "name" ? "2" : "3"} / 3
                      </span>
                    </div>

                    {step === "amount" && (
                      <div className="space-y-3 animate-fade-in">
                        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Berapa dibayar untuk item ini? (RM)
                        </div>
                        <div className="rounded-2xl p-4 text-center bg-cost/10">
                          <div className="text-4xl font-extrabold text-cost">RM {draftAmount}</div>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {["1","2","3","4","5","6","7","8","9","0",".",".00","del","C",""].map((k, idx) => {
                            if (k === "") return <div key={idx} />;
                            return (
                              <button
                                key={k + idx}
                                onClick={() => {
                                  if (k === "C") { setDraftAmount("0"); return; }
                                  if (k === ".00") { setDraftAmount(p => p.includes(".") ? p : p + ".00"); return; }
                                  press(k, "draft");
                                }}
                                className="h-10 rounded-xl bg-surface-elevated text-base font-bold tap grid place-items-center"
                              >
                                {k === "del" ? <Delete className="w-4 h-4" /> : k}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          disabled={parseFloat(draftAmount) <= 0}
                          onClick={() => setStep("name")}
                          className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold tap disabled:opacity-50"
                        >
                          Seterusnya →
                        </button>
                      </div>
                    )}

                    {step === "name" && (
                      <div className="space-y-3 animate-fade-in">
                        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Pilih nama item
                        </div>
                        <select
                          value={draftName}
                          onChange={(e) => {
                            const name = e.target.value;
                            setDraftName(name);
                            const found = ingredientOptions.find(i => i.name === name);
                            if (found) setDraftUnit(found.unit);
                          }}
                          className="w-full h-12 px-3 rounded-2xl bg-surface-elevated border border-border text-sm font-semibold focus:outline-none focus:border-primary"
                        >
                          <option value="">— Pilih bahan —</option>
                          {ingredientOptions.map(opt => (
                            <option key={opt.name} value={opt.name}>{opt.name}</option>
                          ))}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => setStep("amount")} className="h-12 rounded-2xl bg-surface-elevated border border-border font-bold tap flex items-center justify-center gap-1">
                            <ArrowLeft className="w-4 h-4" /> Kembali
                          </button>
                          <button
                            disabled={!draftName}
                            onClick={() => setStep("qty")}
                            className="h-12 rounded-2xl bg-primary text-primary-foreground font-bold tap disabled:opacity-50"
                          >
                            Seterusnya →
                          </button>
                        </div>
                      </div>
                    )}

                    {step === "qty" && (
                      <div className="space-y-3 animate-fade-in">
                        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Kuantiti & unit
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            inputMode="decimal"
                            value={draftQty}
                            onChange={(e) => setDraftQty(e.target.value)}
                            className="h-12 px-3 rounded-2xl bg-surface-elevated border border-border text-base font-semibold focus:outline-none focus:border-primary"
                            placeholder="Kuantiti"
                          />
                          <select
                            value={draftUnit}
                            onChange={(e) => setDraftUnit(e.target.value as Unit)}
                            className="h-12 px-3 rounded-2xl bg-surface-elevated border border-border text-sm font-semibold focus:outline-none focus:border-primary"
                          >
                            {ALLOWED_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                        <div className="rounded-xl bg-surface-elevated p-3 text-xs">
                          <div className="font-bold">{draftName}</div>
                          <div className="text-muted-foreground mt-0.5">
                            {draftQty} {draftUnit} · RM {parseFloat(draftAmount).toFixed(2)}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={handleAddMore}
                            disabled={!draftName || parseFloat(draftQty) <= 0 || parseFloat(draftAmount) <= 0}
                            className="h-12 rounded-2xl bg-surface-elevated border border-primary text-primary font-bold tap flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            <Plus className="w-4 h-4" /> Tambah item lagi
                          </button>
                          <button
                            onClick={() => setStep("name")}
                            className="h-12 rounded-2xl bg-surface-elevated border border-border font-bold tap flex items-center justify-center gap-1"
                          >
                            <ArrowLeft className="w-4 h-4" /> Kembali
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 pt-3 pb-6 shrink-0">
                  <button
                    onClick={handleFinishToConfirm}
                    disabled={items.length === 0 && (step !== "qty" || !draftName || parseFloat(draftQty) <= 0 || parseFloat(draftAmount) <= 0)}
                    className="w-full h-14 rounded-2xl font-extrabold text-lg tap shadow-card bg-gradient-cost text-white disabled:opacity-50"
                  >
                    Simpan & Selesai ✅
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* CONFIRMATION SCREEN */}
        {confirming && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <h2 className="text-xl font-extrabold">Sahkan Pembelian 🧾</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Semak senarai sebelum simpan</p>
            </div>
            <div className="flex-1 overflow-y-auto px-5 space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="rounded-2xl bg-background border border-border p-3 flex items-center gap-2">
                  <div className="flex-1">
                    <div className="font-bold text-sm">{it.name}</div>
                    <div className="text-xs text-muted-foreground">{it.qty} {it.unit}</div>
                  </div>
                  <div className="font-extrabold text-cost">RM {it.amount.toFixed(2)}</div>
                </div>
              ))}
              <div className="rounded-2xl bg-cost/10 border border-cost/30 p-4 flex items-center justify-between mt-3">
                <span className="font-bold uppercase tracking-wider text-xs">Jumlah Belanja</span>
                <span className="font-extrabold text-cost text-xl">RM {totalSpent.toFixed(2)}</span>
              </div>
            </div>
            <div className="px-5 pt-3 pb-6 grid grid-cols-2 gap-2 shrink-0">
              <button
                onClick={() => setConfirming(false)}
                className="h-14 rounded-2xl bg-surface-elevated border border-border font-bold tap"
              >
                ← Edit
              </button>
              <button
                onClick={handleConfirmFinal}
                className="h-14 rounded-2xl font-extrabold text-base tap shadow-card bg-gradient-profit text-profit-foreground"
              >
                Confirm ✅
              </button>
            </div>
          </div>
        )}

        {/* INCOME MODE */}
        {mode === "in" && !confirming && (
          <>
            <div className="px-5 mt-5">
              <div className="rounded-3xl p-5 text-center bg-profit/10">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Berapa dapat?</div>
                <div className="text-5xl font-extrabold mt-2 text-profit">RM {amount}</div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 mt-4 no-scrollbar">
              <div className="space-y-3">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Apa yang dijual? (optional)"
                  className="w-full h-12 px-4 rounded-2xl bg-surface-elevated border border-border text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary"
                />
                <div className="flex flex-wrap gap-2">
                  {incomeSuggestions.map(s => (
                    <button key={s} onClick={() => setNote(s)} className={`px-3 h-10 rounded-full text-sm font-semibold border tap ${note === s ? "bg-primary text-primary-foreground border-primary" : "bg-surface-elevated border-border text-muted-foreground"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-5 mt-3 grid grid-cols-3 gap-2">
              {["1","2","3","4","5","6","7","8","9",".","0","del"].map(k => (
                <button key={k} onClick={() => press(k, "income")} className="h-12 rounded-2xl bg-surface-elevated text-xl font-bold tap grid place-items-center">
                  {k === "del" ? <Delete className="w-5 h-5" /> : k}
                </button>
              ))}
            </div>
            <div className="px-5 pt-3 pb-6">
              <button
                disabled={parseFloat(amount) <= 0}
                onClick={handleSaveIncome}
                className={`w-full h-14 rounded-2xl font-extrabold text-lg tap shadow-card transition-opacity bg-gradient-profit text-profit-foreground ${parseFloat(amount) <= 0 ? "opacity-50" : ""}`}
              >
                Simpan 💾
              </button>
            </div>
          </>
        )}

        {success && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur grid place-items-center z-20">
            <div className="w-24 h-24 rounded-full bg-gradient-profit grid place-items-center animate-check-pop shadow-glow">
              <Check className="w-14 h-14 text-profit-foreground" strokeWidth={3} />
            </div>
          </div>
        )}

        {scanner && (
          <ReceiptScanner
            onClose={() => setScanner(false)}
            onConfirm={handleScannerConfirm}
            knownIngredients={ingredientOptions.map((i) => i.name)}
          />
        )}
      </div>
    </div>
  );
};
