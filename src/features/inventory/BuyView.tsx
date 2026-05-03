import { useMemo } from "react";
import { Check, Share2 } from "lucide-react";
import type { BuyItem, StockItem, Product, Unit } from "@/types";

export const BuyView = ({
  buy,
  stock,
  products,
  onToggleDone,
  onSyncNotepad,
}: {
  buy: BuyItem[];
  stock: StockItem[];
  products: Product[];
  onToggleDone: (id: string) => void;
  onResync?: () => void;
  onSyncNotepad: (items: BuyItem[]) => void;
  onBulkDone?: (ids: string[]) => void;
  onBulkDelete?: (ids: string[]) => void;
  onClearCompleted?: () => void;
  onGoToStock?: () => void;
}) => {
  // Build text from current manual items, preserving order: undone first, done last
  const undone = buy.filter((b) => !b.done);
  const done = buy.filter((b) => b.done);
  const noteText = undone.map((b) => b.name).join("\n");

  const lowStockSuggestions = useMemo(() => {
    if (!products.length) return [];
    const ingredientNames = new Set<string>();
    products.forEach((p) =>
      (p.ingredients ?? []).forEach((ing) => {
        const n = ing.name.trim();
        if (n) ingredientNames.add(n.toLowerCase());
      }),
    );
    return stock.filter((s) => {
      if (!ingredientNames.has(s.name.toLowerCase())) return false;
      const peak = s.maxQty ?? 0;
      return peak > 0 && s.qty < peak * 0.2;
    });
  }, [products, stock]);

  const handleNoteChange = (val: string) => {
    const lines = val.split("\n").map((l) => l.trim()).filter(Boolean);
    const newUndone: BuyItem[] = lines.map((line, i) => {
      const existing = buy.find(
        (b) => !b.done && b.name.toLowerCase() === line.toLowerCase(),
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
    onSyncNotepad([...newUndone, ...done]);
  };

  const share = () => {
    const date = new Date().toLocaleDateString("ms-MY", {
      day: "numeric", month: "long", year: "numeric",
    });
    const lines = undone.map((b) => `☐ ${b.name}`);
    const text = `🛒 *Senarai Nak Beli - WarkahBiz*\n📅 ${date}\n\n${lines.join("\n")}\n\n_Dijana oleh WarkahBiz App_`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => navigator.clipboard?.writeText(text));
    } else {
      navigator.clipboard?.writeText(text);
    }
  };

  if (products.length === 0) {
    return (
      <div className="px-5 pt-6 pb-32">
        <div className="rounded-2xl p-6 bg-surface border border-border text-center space-y-2">
          <div className="text-4xl">📋</div>
          <p className="text-sm text-muted-foreground">
            Tiada produk disimpan. Sila tambah produk dalam Profil untuk menggunakan ciri ini.
          </p>
        </div>
      </div>
    );
  }

  const total = buy.length;
  const doneCount = done.length;

  return (
    <div className="px-5 pt-6 space-y-4 pb-32">
      <header className="animate-fade-in">
        <div className="text-xs font-semibold text-muted-foreground">
          {doneCount} / {total} selesai
        </div>
        <div className="mt-1 h-2 rounded-full bg-surface overflow-hidden">
          <div
            className="h-full bg-profit transition-all"
            style={{ width: total ? `${(doneCount / total) * 100}%` : "0%" }}
          />
        </div>
      </header>

      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-surface-elevated flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">📝 Senarai Nak Beli</span>
          <span className="ml-auto text-[10px] text-muted-foreground">
            satu item satu baris
          </span>
        </div>

        <textarea
          value={noteText}
          onChange={(e) => handleNoteChange(e.target.value)}
          placeholder={"ayam dua ekor\nikan 1 kg\nbawang merah\n..."}
          className="w-full min-h-[140px] p-4 bg-transparent text-sm font-medium resize-none focus:outline-none placeholder:text-muted-foreground/40 font-mono"
          style={{ lineHeight: "1.75rem" }}
        />

        {undone.length > 0 && (
          <div className="px-2 pb-2 space-y-1 border-t border-border pt-2">
            {undone.map((b) => (
              <button
                key={b.id}
                onClick={() => onToggleDone(b.id)}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-elevated tap text-left"
              >
                <span className="w-5 h-5 rounded border-2 border-border grid place-items-center shrink-0" />
                <span className="text-sm font-medium flex-1 truncate">{b.name}</span>
              </button>
            ))}
          </div>
        )}

        {done.length > 0 && (
          <div className="px-2 pb-2 space-y-1 border-t border-border pt-2">
            <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Sudah Beli
            </div>
            {done.map((b) => (
              <button
                key={b.id}
                onClick={() => onToggleDone(b.id)}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-elevated tap text-left"
              >
                <span className="w-5 h-5 rounded bg-profit border-2 border-profit grid place-items-center shrink-0 text-profit-foreground">
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </span>
                <span className="text-sm font-medium line-through text-muted-foreground flex-1 truncate">
                  {b.name}
                </span>
              </button>
            ))}
          </div>
        )}

        {lowStockSuggestions.length > 0 && (
          <div className="px-4 py-3 border-t border-border bg-surface-elevated/50">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Cadangan stok rendah:
            </div>
            <ul className="space-y-0.5">
              {lowStockSuggestions.map((s) => (
                <li key={s.id} className="text-xs text-muted-foreground">
                  • {s.name} — <span className="text-warn font-semibold">stok rendah</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="px-4 pb-3 pt-2 flex items-center gap-2 border-t border-border">
          <span className="text-[10px] text-muted-foreground">
            {undone.length} item belum dibeli
          </span>
          <button
            onClick={share}
            className="ml-auto h-8 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold tap flex items-center gap-1"
          >
            <Share2 className="w-3 h-3" /> Kongsi
          </button>
        </div>
      </div>
    </div>
  );
};
