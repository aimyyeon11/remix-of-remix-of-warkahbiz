import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Search, X, LayoutGrid, List as ListIcon, AlertTriangle, Pencil } from "lucide-react";
import type { StockItem, Unit, StockCategory } from "@/types";
import { UNIT_STEP, STOCK_CATEGORIES } from "@/types";
import { fmtQty } from "@/lib/format";
import { levelOf, STOCK_META } from "./stockLevel";

type EditDraft = {
  id?: string;
  emoji: string;
  name: string;
  category: StockCategory;
  qty: number;
  unit: Unit;
  minQty: number;
  maxQty: number;
};

const VIEW_KEY = "warkahbiz_stock_view";
const UNITS: Unit[] = ["kg", "g", "liter", "ml", "biji", "pek", "kotak", "batang", "helai"];

export const StockView = ({
  stock,
  onAdjust,
  onSave,
  onDelete,
  onGoToBuy,
}: {
  stock: StockItem[];
  onAdjust: (id: string, delta: number) => void;
  onSave: (item: StockItem) => void;
  onDelete: (id: string) => void;
  onGoToBuy: () => void;
}) => {
  const [view, setView] = useState<"grid" | "list">(() =>
    (localStorage.getItem(VIEW_KEY) as "grid" | "list") || "grid",
  );
  useEffect(() => { localStorage.setItem(VIEW_KEY, view); }, [view]);

  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<StockCategory | "Semua">("Semua");
  const [draft, setDraft] = useState<EditDraft | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stock.filter((s) => {
      if (cat !== "Semua" && (s.category ?? "Lain-lain") !== cat) return false;
      if (q && !s.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [stock, query, cat]);

  const lowCount = stock.filter((s) => s.qty > s.minQty && s.qty <= s.restockQty).length;
  const emptyCount = stock.filter((s) => s.qty <= s.minQty).length;
  const lowOrEmpty = lowCount + emptyCount;

  const openAdd = () =>
    setDraft({ emoji: "📦", name: "", category: "Bahan Mentah", qty: 0, unit: "kg", minQty: 1, maxQty: 5 });
  const openEdit = (s: StockItem) =>
    setDraft({
      id: s.id, emoji: s.emoji, name: s.name,
      category: (s.category ?? "Lain-lain") as StockCategory,
      qty: s.qty, unit: s.unit, minQty: s.minQty,
      maxQty: s.maxQty ?? Math.max(s.restockQty * 2, s.qty),
    });

  const saveDraft = () => {
    if (!draft || !draft.name.trim()) return;
    const item: StockItem = {
      id: draft.id ?? `s-${Date.now()}`,
      emoji: draft.emoji || "📦",
      name: draft.name.trim(),
      category: draft.category,
      qty: draft.qty,
      unit: draft.unit,
      minQty: draft.minQty,
      restockQty: Math.max(draft.minQty + 0.1, draft.maxQty / 2),
      maxQty: draft.maxQty,
    };
    onSave(item);
    setDraft(null);
  };

  return (
    <div className="px-5 pt-6 space-y-5 pb-6">
      {/* Header */}
      <header className="animate-fade-in flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Stok 📦</h1>
          <p className="text-sm text-muted-foreground mt-1">Pengurusan Inventori</p>
        </div>
        <button
          onClick={openAdd}
          className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground grid place-items-center tap shadow-card"
          aria-label="Tambah item"
        >
          <Plus className="w-5 h-5" strokeWidth={3} />
        </button>
      </header>

      {/* Summary chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <Chip label="Jumlah" value={stock.length} tone="muted" />
        <Chip label="Stok Rendah" value={lowCount} tone="warn" />
        <Chip label="Stok Habis" value={emptyCount} tone="cost" />
      </div>

      {/* Low stock banner */}
      {lowOrEmpty > 0 && (
        <button
          onClick={onGoToBuy}
          className="w-full text-left rounded-2xl p-4 bg-warn-soft border border-warn/30 flex items-center gap-3 tap animate-fade-in"
        >
          <AlertTriangle className="w-5 h-5 text-warn shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">{lowOrEmpty} item stok hampir habis!</p>
            <p className="text-xs text-muted-foreground mt-0.5">Semak Nak Beli →</p>
          </div>
        </button>
      )}

      {/* Search + view toggle */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari item stok..."
            className="w-full h-11 pl-9 pr-9 rounded-2xl bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Padam">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="flex rounded-2xl bg-surface border border-border p-1">
          <button
            onClick={() => setView("grid")}
            className={`w-9 h-9 rounded-xl grid place-items-center tap ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            aria-label="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`w-9 h-9 rounded-xl grid place-items-center tap ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            aria-label="List view"
          >
            <ListIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {(["Semua", ...STOCK_CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCat(c as StockCategory | "Semua")}
            className={`shrink-0 px-3 h-9 rounded-full text-xs font-bold border tap ${
              cat === c
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-surface border-border text-muted-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* List/Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl p-8 bg-surface border border-border text-center space-y-3">
          <div className="text-4xl">📭</div>
          <p className="font-bold">Tiada item stok</p>
          <button onClick={openAdd} className="h-11 px-5 rounded-2xl bg-primary text-primary-foreground font-bold tap">
            Tambah item pertama anda
          </button>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((s) => (
            <GridCard key={s.id} item={s} onAdjust={onAdjust} onEdit={() => openEdit(s)} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <ListRow key={s.id} item={s} onAdjust={onAdjust} onEdit={() => openEdit(s)} />
          ))}
        </div>
      )}

      {/* Add/Edit bottom sheet */}
      {draft && (
        <ItemSheet
          draft={draft}
          onChange={setDraft}
          onSave={saveDraft}
          onClose={() => setDraft(null)}
          onDelete={
            draft.id
              ? () => {
                  onDelete(draft.id!);
                  setDraft(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
};

const Chip = ({ label, value, tone }: { label: string; value: number; tone: "muted" | "warn" | "cost" }) => {
  const styles =
    tone === "warn"
      ? "bg-warn-soft text-warn border-warn/30"
      : tone === "cost"
        ? "bg-cost/15 text-cost border-cost/30"
        : "bg-surface text-foreground border-border";
  return (
    <div className={`px-3 h-9 rounded-full border flex items-center gap-2 text-xs font-bold ${styles}`}>
      <span>{label}</span>
      <span className="px-1.5 h-5 rounded-full bg-background/60 grid place-items-center min-w-5">{value}</span>
    </div>
  );
};

const GridCard = ({
  item,
  onAdjust,
  onEdit,
}: {
  item: StockItem;
  onAdjust: (id: string, delta: number) => void;
  onEdit: () => void;
}) => {
  const level = levelOf(item);
  const meta = STOCK_META[level];
  return (
    <div className="rounded-3xl p-3 bg-surface border border-border flex flex-col items-center text-center relative">
      <button onClick={onEdit} className="absolute top-2 right-2 w-7 h-7 rounded-full grid place-items-center text-muted-foreground tap" aria-label="Edit">
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <div className="text-4xl mt-1">{item.emoji}</div>
      <div className="font-bold text-sm mt-1">{item.name}</div>
      <div className={`text-2xl font-extrabold mt-1 ${meta.text}`}>{fmtQty(item.qty, item.unit)}</div>
      <div className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.bar}`}>{meta.label}</div>
      <div className="mt-2 flex items-center gap-2 w-full">
        <button
          onClick={() => onAdjust(item.id, -UNIT_STEP[item.unit])}
          className="flex-1 h-9 rounded-xl bg-cost/15 text-cost grid place-items-center tap font-bold"
          aria-label="Kurangkan"
        >
          <Minus className="w-4 h-4" strokeWidth={3} />
        </button>
        <button
          onClick={() => onAdjust(item.id, UNIT_STEP[item.unit])}
          className="flex-1 h-9 rounded-xl bg-profit/15 text-profit grid place-items-center tap font-bold"
          aria-label="Tambah"
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

const ListRow = ({
  item,
  onAdjust,
  onEdit,
}: {
  item: StockItem;
  onAdjust: (id: string, delta: number) => void;
  onEdit: () => void;
}) => {
  const level = levelOf(item);
  const meta = STOCK_META[level];
  const max = item.maxQty ?? Math.max(item.restockQty * 2, item.qty || 1);
  const pct = Math.max(4, Math.min(100, (item.qty / max) * 100));
  const fillTone = level === "habis" || level === "sedikit" ? "bg-cost" : "bg-profit";
  return (
    <div className="rounded-2xl p-3 bg-surface border border-border flex items-center gap-3">
      <div className="text-3xl shrink-0">{item.emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-bold text-sm truncate">{item.name}</div>
          <button onClick={onEdit} className="text-muted-foreground" aria-label="Edit">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="text-[10px] text-muted-foreground font-semibold">{item.category ?? "Lain-lain"}</div>
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-surface-elevated overflow-hidden">
          <div className={`h-full ${fillTone}`} style={{ width: `${pct}%` }} />
        </div>
        <div className={`text-[11px] font-bold mt-1 ${meta.text}`}>
          {fmtQty(item.qty, item.unit)} / {fmtQty(max, item.unit)}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onAdjust(item.id, -UNIT_STEP[item.unit])}
          className="w-9 h-9 rounded-xl bg-cost/15 text-cost grid place-items-center tap"
          aria-label="Kurangkan"
        >
          <Minus className="w-4 h-4" strokeWidth={3} />
        </button>
        <button
          onClick={() => onAdjust(item.id, UNIT_STEP[item.unit])}
          className="w-9 h-9 rounded-xl bg-profit/15 text-profit grid place-items-center tap"
          aria-label="Tambah"
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

const ItemSheet = ({
  draft,
  onChange,
  onSave,
  onClose,
  onDelete,
}: {
  draft: EditDraft;
  onChange: (d: EditDraft) => void;
  onSave: () => void;
  onClose: () => void;
  onDelete?: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
    <div
      onClick={(e) => e.stopPropagation()}
      className="relative w-full max-w-[440px] mx-auto bg-surface rounded-t-3xl p-5 pb-8 animate-slide-up max-h-[88vh] overflow-y-auto"
    >
      <div className="w-12 h-1.5 rounded-full bg-border mx-auto mb-4" />
      <h3 className="font-extrabold text-lg">{draft.id ? "Edit Item" : "Tambah Item Stok"}</h3>

      <div className="mt-4 space-y-3">
        <div className="flex gap-2">
          <input
            value={draft.emoji}
            onChange={(e) => onChange({ ...draft, emoji: e.target.value })}
            maxLength={2}
            className="w-16 h-12 rounded-2xl bg-background border border-border text-center text-2xl"
            aria-label="Emoji"
          />
          <input
            value={draft.name}
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
            placeholder="Nama Item"
            className="flex-1 h-12 px-4 rounded-2xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <Field label="Kategori">
          <select
            value={draft.category}
            onChange={(e) => onChange({ ...draft, category: e.target.value as StockCategory })}
            className="w-full h-12 px-4 rounded-2xl bg-background border border-border text-sm"
          >
            {STOCK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Kuantiti Semasa">
            <input
              type="number" inputMode="decimal" step="0.1"
              value={draft.qty}
              onChange={(e) => onChange({ ...draft, qty: +e.target.value })}
              className="w-full h-12 px-4 rounded-2xl bg-background border border-border text-sm"
            />
          </Field>
          <Field label="Unit">
            <select
              value={draft.unit}
              onChange={(e) => onChange({ ...draft, unit: e.target.value as Unit })}
              className="w-full h-12 px-4 rounded-2xl bg-background border border-border text-sm"
            >
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="Paras Rendah">
            <input
              type="number" inputMode="decimal" step="0.1"
              value={draft.minQty}
              onChange={(e) => onChange({ ...draft, minQty: +e.target.value })}
              className="w-full h-12 px-4 rounded-2xl bg-background border border-border text-sm"
            />
          </Field>
          <Field label="Kuantiti Maksimum">
            <input
              type="number" inputMode="decimal" step="0.1"
              value={draft.maxQty}
              onChange={(e) => onChange({ ...draft, maxQty: +e.target.value })}
              className="w-full h-12 px-4 rounded-2xl bg-background border border-border text-sm"
            />
          </Field>
        </div>

        <button onClick={onSave} className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold tap mt-2">
          Simpan
        </button>
        {onDelete && (
          <button onClick={onDelete} className="w-full h-11 rounded-2xl bg-cost/15 text-cost font-bold tap">
            Padam item
          </button>
        )}
      </div>
    </div>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
    {children}
  </label>
);