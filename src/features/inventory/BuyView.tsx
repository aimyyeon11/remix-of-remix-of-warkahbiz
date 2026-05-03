import { useState } from "react";
import { Plus, RefreshCw, Share2, Check } from "lucide-react";
import type { BuyItem, StockItem, Unit } from "@/types";

export const BuyView = ({
  buy,
  onToggleDone,
  onResync,
  onSyncNotepad,
  onGoToStock,
}: {
  buy: BuyItem[];
  stock: StockItem[];
  onToggleDone: (id: string) => void;
  onResync: () => void;
  onSyncNotepad: (items: BuyItem[]) => void;
  onBulkDone?: (ids: string[]) => void;
  onBulkDelete?: (ids: string[]) => void;
  onClearCompleted?: () => void;
  onGoToStock: () => void;
}) => {
  const [tab, setTab] = useState<"all" | "todo" | "done">("all");
  const [noteText, setNoteText] = useState<string>(() =>
    buy.filter((b) => b.source === "manual").map((b) => b.name).join("\n"),
  );

  const todoCount = buy.filter((b) => !b.done).length;
  const doneCount = buy.length - todoCount;
  const doneItems = buy.filter((b) => b.done);

  const share = () => {
    const date = new Date().toLocaleDateString("ms-MY", { day: "numeric", month: "long", year: "numeric" });
    const lines = buy.filter((b) => !b.done).map((b) => `☐ ${b.name}${b.recQty ? ` - ${b.recQty}${b.unit}` : ""}`);
    const text = `🛒 *Senarai Nak Beli - WarkahBiz*\n📅 ${date}\n\n${lines.join("\n")}\n\n_Dijana oleh WarkahBiz App_`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => navigator.clipboard?.writeText(text));
    } else {
      navigator.clipboard?.writeText(text);
    }
  };

  const handleNoteChange = (val: string) => {
    setNoteText(val);
    const lines = val.split("\n").map((l) => l.trim()).filter(Boolean);
    const autoItems = buy.filter((b) => b.source === "auto");
    const newManualItems: BuyItem[] = lines.map((line, i) => {
      const existing = buy.find(
        (b) => b.source === "manual" && b.name.toLowerCase() === line.toLowerCase(),
      );
      return (
        existing ?? {
          id: `m-${Date.now()}-${i}`,
          emoji: "🛒",
          name: line,
          cost: 0,
          currentQty: 0,
          recQty: 1,
          unit: "biji" as Unit,
          daysCover: 0,
          reason: "",
          done: false,
          source: "manual" as const,
        }
      );
    });
    onSyncNotepad([...autoItems, ...newManualItems]);
  };

  const autoSugg = buy.filter((b) => b.source === "auto" && !b.done);

  return (
    <div className="px-5 pt-6 space-y-5 pb-32">
      <header className="animate-fade-in">
        <h1 className="text-2xl font-extrabold tracking-tight">Nak Beli 🛒</h1>
        <p className="text-sm text-muted-foreground mt-1">Nota pembelian harian</p>
        <div className="mt-3">
          <div className="text-xs font-semibold text-muted-foreground">
            {doneCount} / {buy.length} selesai
          </div>
          <div className="mt-1 h-2 rounded-full bg-surface overflow-hidden">
            <div
              className="h-full bg-profit transition-all"
              style={{ width: buy.length ? `${(doneCount / buy.length) * 100}%` : "0%" }}
            />
          </div>
        </div>
      </header>

      {autoSugg.length > 0 && (
        <div className="space-y-2 animate-fade-in">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            🔴 Perlu Dibeli Semula
            <button
              onClick={onResync}
              className="ml-auto w-7 h-7 rounded-lg bg-surface-elevated grid place-items-center tap"
              aria-label="Segerak semula"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {autoSugg.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  if (!noteText.toLowerCase().includes(b.name.toLowerCase())) {
                    const next = noteText ? noteText + "\n" + b.name : b.name;
                    handleNoteChange(next);
                  }
                  onToggleDone(b.id);
                }}
                className="px-3 py-1.5 rounded-full bg-cost/10 border border-cost/30 text-cost text-xs font-bold tap flex items-center gap-1"
              >
                {b.emoji} {b.name} <span className="opacity-60">({b.recQty}{b.unit})</span>
                <Plus className="w-3 h-3 ml-1" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex p-1 rounded-2xl bg-surface border border-border gap-1">
        {([
          ["all", "Semua", buy.length],
          ["todo", "Belum Beli", todoCount],
          ["done", "Sudah Beli", doneCount],
        ] as const).map(([key, label, n]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 h-11 rounded-xl text-xs font-bold tap transition-all duration-150 ${
              tab === key
                ? "bg-gradient-profit text-profit-foreground shadow-card border-transparent"
                : "text-muted-foreground"
            }`}
          >
            {label} ({n})
          </button>
        ))}
      </div>

      {(tab === "all" || tab === "todo") && (
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-surface-elevated flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">📝 Nota Pembelian</span>
            <span className="ml-auto text-[10px] text-muted-foreground">ketik bebas, satu item satu baris</span>
          </div>
          <textarea
            value={noteText}
            onChange={(e) => handleNoteChange(e.target.value)}
            placeholder={"telur\nminyak masak\nbawang merah\ntepung\n..."}
            className="w-full min-h-[180px] p-4 bg-transparent text-sm font-medium resize-none focus:outline-none placeholder:text-muted-foreground/40 font-mono"
            style={{ lineHeight: "2rem" }}
          />
          <div className="px-4 pb-3 pt-2 flex items-center gap-2 border-t border-border">
            <span className="text-[10px] text-muted-foreground">
              {noteText.split("\n").filter(Boolean).length} item dalam senarai
            </span>
            <button
              onClick={share}
              className="ml-auto h-8 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold tap flex items-center gap-1"
            >
              <Share2 className="w-3 h-3" /> Kongsi
            </button>
          </div>
        </div>
      )}

      {tab === "done" && (
        doneItems.length === 0 ? (
          <div className="rounded-2xl p-6 bg-surface border border-border text-center text-muted-foreground text-sm">
            Belum ada item yang dibeli
          </div>
        ) : (
          <div className="space-y-2">
            {doneItems.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl p-3 border flex items-center gap-3 animate-fade-in bg-profit/5 border-profit/20"
              >
                <button
                  onClick={() => onToggleDone(b.id)}
                  className="w-7 h-7 rounded-full border-2 grid place-items-center tap shrink-0 bg-profit border-profit text-profit-foreground"
                  aria-label="Nyahtanda"
                >
                  <Check className="w-4 h-4" strokeWidth={3} />
                </button>
                <div className="text-2xl shrink-0">{b.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm line-through text-muted-foreground">{b.name}</div>
                  {b.recQty ? (
                    <div className="text-[11px] text-muted-foreground font-semibold">
                      {b.recQty} {b.unit}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {buy.length === 0 && tab !== "done" && noteText.trim() === "" && (
        <div className="rounded-2xl p-6 bg-surface border border-border text-center space-y-2">
          <div className="text-4xl">🧺</div>
          <p className="text-xs text-muted-foreground">Mula menaip di nota di atas, atau semak stok anda</p>
          <button onClick={onGoToStock} className="h-10 px-4 rounded-2xl bg-primary text-primary-foreground text-xs font-bold tap">
            Pergi ke Stok →
          </button>
        </div>
      )}
    </div>
  );
};
