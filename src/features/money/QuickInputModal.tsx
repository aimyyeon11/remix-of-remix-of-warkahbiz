import { useState } from "react";
import { X, Check, Delete, Camera, Plus } from "lucide-react";
import type { Txn, TxnType, ReceiptItem } from "@/types";
import { ReceiptScanner } from "@/features/inventory/ReceiptScanner";

const expenseCats = [
  { emoji: "🍗", name: "Ayam" },     { emoji: "🛢️", name: "Minyak" },
  { emoji: "🌾", name: "Tepung" },   { emoji: "🍚", name: "Beras" },
  { emoji: "🥚", name: "Telur" },    { emoji: "📦", name: "Bungkus" },
  { emoji: "⛽", name: "Gas" },      { emoji: "🏷️", name: "Lain" },
];

const incomeSuggestions = ["Jualan Pagi", "Jualan Petang", "Penghantaran"];

export const QuickInputModal = ({ onClose, onSave, onReceiptConfirm, onBoughtItems }: {
  onClose: () => void;
  onSave: (t: Omit<Txn, "id" | "ts" | "time">) => void;
  onReceiptConfirm: (items: ReceiptItem[]) => void;
  onBoughtItems?: (items: Array<{ name: string; qty: number; unit: string; isOpEx: boolean }>) => void;
}) => {
  const [mode, setMode] = useState<TxnType>("in");
  const [amount, setAmount] = useState("0");
  const [note, setNote] = useState("");
  const [cat, setCat] = useState<{ emoji: string; name: string } | null>(null);
  const [success, setSuccess] = useState(false);
  const [scanner, setScanner] = useState(false);
  const [purchaseItems, setPurchaseItems] = useState<Array<{ emoji: string; name: string; qty: number; unit: string; isOpEx: boolean }>>([]);
  const [customItem, setCustomItem] = useState("");
  const [lainNote, setLainNote] = useState("");

  const press = (k: string) => {
    setAmount(prev => {
      if (k === "del") return prev.length <= 1 ? "0" : prev.slice(0, -1);
      if (k === ".") return prev.includes(".") ? prev : prev + ".";
      if (prev === "0") return k;
      return prev + k;
    });
  };

  const handleSave = () => {
    if (mode === "in") {
      if (parseFloat(amount) <= 0) return;
      setSuccess(true);
      setTimeout(() => {
        onSave({ type: "in", emoji: "💰", label: note || "Jualan", amount: parseFloat(amount) });
        onClose();
      }, 900);
    } else {
      if (!cat) return;
      setSuccess(true);
      setTimeout(() => {
        const value = parseFloat(amount) || 0;
        const itemLabel = cat.name === "Lain" && lainNote.trim()
          ? `Beli ${lainNote.trim()}`
          : `Beli ${cat.name}`;
        onSave({ type: "out", emoji: cat.emoji, label: itemLabel, amount: value });
        let finalItems = [...purchaseItems];
        if (cat.name === "Lain" && lainNote.trim()) {
          const alreadyInList = finalItems.some(p => p.name.toLowerCase() === lainNote.trim().toLowerCase());
          if (!alreadyInList) {
            finalItems = [...finalItems, {
              emoji: "🏷️",
              name: lainNote.trim(),
              qty: 1,
              unit: "biji",
              isOpEx: false,
            }];
          }
        }
        if (finalItems.length > 0 && onBoughtItems) {
          onBoughtItems(finalItems);
        }
        setLainNote("");
        onClose();
      }, 900);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[440px] h-[88vh] bg-surface rounded-t-[2.5rem] animate-slide-up flex flex-col"
      >
        {/* handle */}
        <div className="pt-3 pb-1 grid place-items-center">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/40" />
        </div>

        {/* close */}
        <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-surface-elevated grid place-items-center tap">
          <X className="w-5 h-5" />
        </button>

        {/* tabs */}
        <div className="px-5 mt-2">
          <div className="rounded-2xl p-1 bg-surface-elevated grid grid-cols-2 gap-1">
            <button
              onClick={() => setMode("in")}
              className={`py-3 rounded-xl font-bold text-sm tap ${mode === "in" ? "bg-gradient-profit text-profit-foreground shadow-card" : "text-muted-foreground"}`}
            >
              💰 Dapat Duit
            </button>
            <button
              onClick={() => setMode("out")}
              className={`py-3 rounded-xl font-bold text-sm tap ${mode === "out" ? "bg-gradient-cost text-white shadow-card" : "text-muted-foreground"}`}
            >
              💸 Dah Belanja
            </button>
          </div>
        </div>

        {mode === "out" ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 mt-4 space-y-4 pb-4">
              <button
                onClick={() => setScanner(true)}
                className="w-full h-12 rounded-2xl border-2 border-dashed border-warn/50 text-warn font-bold tap flex items-center justify-center gap-2 bg-warn/5"
              >
                <Camera className="w-5 h-5" /> Scan Resit / Invoice
              </button>

              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Pilih Kategori Belanja
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {expenseCats.map(c => (
                    <button
                      key={c.name}
                      onClick={() => { setCat(c); if (c.name !== "Lain") setLainNote(""); }}
                      className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 tap border ${
                        cat?.name === c.name ? "bg-cost/20 border-cost" : "bg-surface-elevated border-border"
                      }`}
                    >
                      <span className="text-2xl">{c.emoji}</span>
                      <span className="text-[10px] font-semibold">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {cat?.name === "Lain" && (
                <div className="space-y-1.5 animate-fade-in">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Nama Item yang Dibeli
                  </div>
                  <input
                    value={lainNote}
                    onChange={(e) => setLainNote(e.target.value)}
                    placeholder="cth: sayur bayam, sos tiram, kicap..."
                    className="w-full h-12 px-4 rounded-2xl bg-surface-elevated border border-border text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary text-sm"
                    autoFocus
                  />
                  <p className="text-[11px] text-muted-foreground">
                    💡 Item ini akan direkodkan dan dikemaskini dalam stok secara automatik
                  </p>
                </div>
              )}

              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Jumlah Belanja (RM)
                </div>
                <div className="rounded-2xl p-4 text-center bg-cost/10">
                  <div className="text-4xl font-extrabold text-cost">RM {amount}</div>
                </div>
                <div className="mt-2 grid grid-cols-5 gap-1.5">
                  {["1","2","3","4","5","6","7","8","9","0",".",".00","del","C",""].map((k, idx) => {
                    if (k === "") return <div key={idx} />;
                    return (
                      <button
                        key={k + idx}
                        onClick={() => {
                          if (k === "C") { setAmount("0"); return; }
                          if (k === ".00") { setAmount(prev => prev.includes(".") ? prev : prev + ".00"); return; }
                          press(k);
                        }}
                        className="h-10 rounded-xl bg-surface-elevated text-base font-bold tap grid place-items-center"
                      >
                        {k === "del" ? <Delete className="w-4 h-4" /> : k}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl bg-surface border-2 border-primary/20 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">📦</span>
                  <div>
                    <div className="text-sm font-extrabold">Apa yang dah beli?</div>
                    <div className="text-[11px] text-muted-foreground">Stok & senarai Nak Beli akan dikemaskini automatik</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    {emoji:"🍗", name:"Ayam"}, {emoji:"🥚", name:"Telur"}, {emoji:"🍚", name:"Beras"},
                    {emoji:"🛢️", name:"Minyak"}, {emoji:"🌾", name:"Tepung"}, {emoji:"⛽", name:"Gas"},
                    {emoji:"🧅", name:"Bawang"}, {emoji:"🌶️", name:"Cili"}, {emoji:"🥛", name:"Santan"},
                    {emoji:"📦", name:"Bungkus"}, {emoji:"🥤", name:"Gula"}, {emoji:"🧂", name:"Garam"},
                  ].map(item => {
                    const alreadyAdded = purchaseItems.some(p => p.name.toLowerCase() === item.name.toLowerCase());
                    return (
                      <button
                        key={item.name}
                        onClick={() => {
                          if (alreadyAdded) return;
                          setPurchaseItems(prev => [...prev, { emoji: item.emoji, name: item.name, qty: 1, unit: "biji", isOpEx: false }]);
                        }}
                        className={`px-2.5 py-1 rounded-full text-xs font-bold tap border transition-all ${
                          alreadyAdded
                            ? "bg-profit/20 border-profit text-profit"
                            : "bg-surface-elevated border-border text-muted-foreground"
                        }`}
                      >
                        {item.emoji} {item.name} {alreadyAdded ? "✓" : "+"}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <input
                    value={customItem}
                    onChange={(e) => setCustomItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customItem.trim()) {
                        setPurchaseItems(prev => [...prev, { emoji: "🛒", name: customItem.trim(), qty: 1, unit: "biji", isOpEx: false }]);
                        setCustomItem("");
                      }
                    }}
                    placeholder="Tambah item lain... (tekan Enter)"
                    className="flex-1 h-10 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={() => {
                      if (!customItem.trim()) return;
                      setPurchaseItems(prev => [...prev, { emoji: "🛒", name: customItem.trim(), qty: 1, unit: "biji", isOpEx: false }]);
                      setCustomItem("");
                    }}
                    className="w-10 h-10 rounded-xl bg-primary text-primary-foreground grid place-items-center tap"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {purchaseItems.length > 0 && (
                  <div className="space-y-2 mt-1">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Item dipilih:</div>
                    {purchaseItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 rounded-xl bg-background border border-border p-2">
                        <span className="text-lg">{item.emoji}</span>
                        <span className="flex-1 text-sm font-semibold">{item.name}</span>
                        <button
                          onClick={() => setPurchaseItems(prev => prev.map((p, i) => i === idx ? { ...p, qty: Math.max(0.5, +(p.qty - 0.5).toFixed(1)) } : p))}
                          className="w-7 h-7 rounded-lg bg-surface-elevated grid place-items-center tap text-sm font-bold"
                        >−</button>
                        <span className="w-8 text-center text-sm font-bold">{item.qty}</span>
                        <button
                          onClick={() => setPurchaseItems(prev => prev.map((p, i) => i === idx ? { ...p, qty: +(p.qty + 0.5).toFixed(1) } : p))}
                          className="w-7 h-7 rounded-lg bg-surface-elevated grid place-items-center tap text-sm font-bold"
                        >+</button>
                        <select
                          value={item.unit}
                          onChange={(e) => setPurchaseItems(prev => prev.map((p, i) => i === idx ? { ...p, unit: e.target.value } : p))}
                          className="h-7 px-1 rounded-lg bg-surface-elevated border border-border text-xs"
                        >
                          {["biji","kg","g","liter","ml","pek","kotak","kampit","papan","ekor"].map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => setPurchaseItems(prev => prev.filter((_, i) => i !== idx))}
                          className="w-7 h-7 rounded-lg bg-cost/10 text-cost grid place-items-center tap"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 pt-3 pb-6 shrink-0">
              <button
                disabled={!cat}
                onClick={handleSave}
                className={`w-full h-14 rounded-2xl font-extrabold text-lg tap shadow-card transition-opacity bg-gradient-cost text-white ${!cat ? "opacity-50" : ""}`}
              >
                Simpan & Kemaskini Stok 💾
              </button>
              {!cat && <p className="text-center text-xs text-muted-foreground mt-2">Pilih kategori dahulu</p>}
            </div>
          </div>
        ) : (
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
                <button key={k} onClick={() => press(k)} className="h-12 rounded-2xl bg-surface-elevated text-xl font-bold tap grid place-items-center">
                  {k === "del" ? <Delete className="w-5 h-5" /> : k}
                </button>
              ))}
            </div>
            <div className="px-5 pt-3 pb-6">
              <button
                disabled={parseFloat(amount) <= 0}
                onClick={handleSave}
                className={`w-full h-14 rounded-2xl font-extrabold text-lg tap shadow-card transition-opacity bg-gradient-profit text-profit-foreground ${parseFloat(amount) <= 0 ? "opacity-50" : ""}`}
              >
                Simpan 💾
              </button>
            </div>
          </>
        )}

        {success && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur grid place-items-center">
            <div className="w-24 h-24 rounded-full bg-gradient-profit grid place-items-center animate-check-pop shadow-glow">
              <Check className="w-14 h-14 text-profit-foreground" strokeWidth={3} />
            </div>
          </div>
        )}

        {scanner && (
          <ReceiptScanner
            onClose={() => setScanner(false)}
            onConfirm={(items) => {
              onReceiptConfirm(items);
              setScanner(false);
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
};
