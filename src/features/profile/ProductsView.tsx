import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Sparkles, Loader2, ChevronRight, ArrowLeft, Package } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useTranslation } from "@/context/LanguageContext";
import { estimateIngredientCost } from "@/server/estimateCost.functions";
import { multiplierFor, tierFor, tierLabelKey } from "./profitScale";
import type { Product, ProductIngredient, ProductPackaging, StockItem, Unit } from "@/types";

const UNITS: Unit[] = ["ekor", "kotak", "kg", "gram", "paket", "liter", "botol", "biji", "ikat", "tin", "bungkus", "sudu", "cawan"];
const BATCH_UNITS = ["biji", "pcs", "servings", "kotak", "pek", "botol", "balang", "helai", "ketul"];

const PRODUCT_CATEGORIES = ["Makanan", "Minuman", "Pek & Set", "Lain-lain"] as const;

const EMOJI_SUGGESTIONS = [
  "🍛","🍜","🍝","🍲","🥘","🍱","🥗","🫕","🍔","🌮","🥙","🧆",
  "🍗","🥚","🐟","🦐","🥩","🧇","🥞","🫔",
  "☕","🧋","🥤","🍵","🧃","🍹","🍺","🥛",
  "🎂","🍰","🧁","🍩","🍪","🍡","🍫",
  "📦","🛍️","🎁","🏷️",
];

const fmt = (n: number) =>
  "RM " + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

function niceRound(price: number) {
  const whole = Math.floor(price);
  const cents = Math.round((price - whole) * 100);
  if (cents === 0) return whole;
  if (cents <= 4) return whole;
  if (cents <= 54) return whole + 0.5;
  return whole + 1;
}



export const ProductsView = ({
  products,
  stock = [],
  onSave,
  onDelete,
  onBack,
}: {
  products: Product[];
  stock?: StockItem[];
  onSave: (p: Product) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const openNew = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setSheetOpen(true); };

  const handleDelete = (id: string) => {
    onDelete(id);
    setDeleteConfirm(null);
    toast.success("Produk dipadam");
  };

  return (
    <div className="pb-32">
      <div className="px-5 pt-6 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button onClick={onBack} className="text-xs font-bold text-primary tap mb-1 inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Kembali ke Profil
          </button>
          <h2 className="text-xl font-extrabold tracking-tight">Produk Saya 🍽️</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {products.length === 0 ? "Belum ada produk" : `${products.length} produk`}
          </p>
        </div>
        <button
          onClick={openNew}
          className="shrink-0 h-10 px-4 rounded-2xl bg-gradient-profit text-profit-foreground text-xs font-bold tap shadow-card flex items-center gap-1"
        >
          <Plus className="w-4 h-4" strokeWidth={3} /> Tambah
        </button>
      </div>

      {products.length === 0 && (
        <div className="mx-5 mt-6 rounded-3xl bg-surface border border-border p-8 flex flex-col items-center text-center">
          <div className="text-5xl mb-3">🍽️</div>
          <h3 className="font-extrabold text-base">Tambah produk jualan anda</h3>
          <p className="text-xs text-muted-foreground mt-2 max-w-[280px]">
            Senaraikan menu atau produk yang anda jual. AI akan anggar kos bahan & cadang harga jualan.
          </p>
          <button
            onClick={openNew}
            className="mt-5 h-11 px-5 rounded-2xl bg-gradient-profit text-profit-foreground text-sm font-bold tap shadow-card"
          >
            + Tambah Produk Pertama
          </button>
        </div>
      )}

      {products.length > 0 && (
        <div className="px-5 space-y-3">
          {products.map((p) => {
            const unitCost = p.costPerUnit ?? p.costPrice ?? 0;
            const price = p.suggestedPrice ?? p.sellingPrice ?? 0;
            const margin = price > 0 && unitCost > 0 ? Math.round(((price - unitCost) / price) * 100) : null;
            const batchSize = p.batchSize ?? 1;
            const batchUnit = p.batchUnit ?? "unit";
            const ings = p.ingredients ?? [];
            return (
              <div key={p.id} className="rounded-2xl bg-surface border border-border p-3">
                <div className="flex items-start gap-3">
                  <div className="text-3xl shrink-0">{p.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm leading-tight truncate">{p.name}</div>
                    {p.category && (
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{p.category}</div>
                    )}
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      {price > 0 && (
                        <span className="font-extrabold text-profit text-sm">
                          {fmt(price)}<span className="text-[10px] font-semibold opacity-70"> /{batchUnit}</span>
                        </span>
                      )}
                      {unitCost > 0 && <span className="text-[11px] text-muted-foreground">Kos: {fmt(unitCost)}</span>}
                      {margin !== null && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          margin >= 50 ? "bg-profit/15 text-profit"
                            : margin >= 30 ? "bg-warn/15 text-warn-foreground"
                            : "bg-cost/15 text-cost"
                        }`}>{margin}% margin</span>
                      )}
                    </div>
                    {batchSize > 1 && (
                      <div className="text-[11px] text-muted-foreground mt-1">📦 1 batch = {batchSize} {batchUnit}</div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => openEdit(p)} className="w-9 h-9 rounded-xl bg-background border border-border grid place-items-center tap" aria-label="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteConfirm(p.id)} className="w-9 h-9 rounded-xl bg-background border border-border grid place-items-center tap" aria-label="Padam">
                      <Trash2 className="w-4 h-4 text-cost" />
                    </button>
                  </div>
                </div>

                {ings.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      🥘 Bahan ({ings.length})
                    </div>
                    {ings.map((ing) => {
                      const s = stock.find((x) => x.name.toLowerCase() === ing.name.trim().toLowerCase());
                      const peak = s?.maxQty ?? 0;
                      const minStock = +(peak * 0.2).toFixed(2);
                      return (
                        <div key={ing.id} className="flex items-center justify-between gap-2 text-[11px]">
                          <div className="flex-1 min-w-0 truncate font-semibold">
                            {ing.name || <span className="text-muted-foreground italic">(tanpa nama)</span>}
                          </div>
                          <div className="text-muted-foreground font-medium shrink-0">
                            {ing.quantity} {ing.unit}
                          </div>
                          <div className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                            Stok minimum: {minStock} {ing.unit}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ProductDialog
        key={editing?.id ?? "new"}
        open={sheetOpen}
        initial={editing}
        onClose={() => setSheetOpen(false)}
        onSave={(p) => {
          onSave(p);
          setSheetOpen(false);
          toast.success(editing ? "Produk dikemaskini ✅" : "Produk ditambah ✅");
        }}
      />

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5" onClick={() => setDeleteConfirm(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative w-full max-w-sm bg-surface rounded-3xl p-5 animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-extrabold text-base">Padam produk ini?</h3>
            <p className="text-xs text-muted-foreground mt-2">Tindakan ini tidak boleh dibatalkan.</p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button onClick={() => setDeleteConfirm(null)} className="tap h-11 rounded-xl border border-border font-semibold">Batal</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="tap h-11 rounded-xl bg-cost text-cost-foreground font-bold">Padam</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Multi-step product dialog
// ============================================================
type Step = 1 | 2 | 3;

const ProductDialog = ({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: Product | null;
  onClose: () => void;
  onSave: (p: Product) => void;
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>(1);

  // Step 1 — Basic info + Batch definition
  const [emoji, setEmoji] = useState(initial?.emoji || "🍛");
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl || "");
  const [category, setCategory] = useState(initial?.category || "Makanan");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [batchSize, setBatchSize] = useState<number>(initial?.batchSize ?? 1);
  const [batchUnit, setBatchUnit] = useState<string>(initial?.batchUnit || "biji");

  // Step 2 — Ingredients + Packaging
  const [ingredients, setIngredients] = useState<ProductIngredient[]>(
    initial?.ingredients && initial.ingredients.length > 0 ? initial.ingredients : []
  );
  const [packagingEnabled, setPackagingEnabled] = useState<boolean>(
    !!initial?.packaging && (initial.packaging.costPerUnit > 0 || !!initial.packaging.type)
  );
  const [packagingType, setPackagingType] = useState<string>(initial?.packaging?.type || "");
  const [packagingCost, setPackagingCost] = useState<number>(initial?.packaging?.costPerUnit ?? 0);

  // Step 3 — Profit scale
  const [profitScale, setProfitScale] = useState<number>(initial?.targetProfitScale ?? 5);

  useEffect(() => {
    if (!open) setStep(1);
  }, [open]);

  const totalBatchCost = useMemo(
    () => ingredients.reduce((s, i) => s + (i.predictedCost || 0), 0),
    [ingredients]
  );

  const safeBatchSize = Math.max(1, Number(batchSize) || 1);
  const ingredientPerUnit = totalBatchCost / safeBatchSize;
  const packagingPerUnit = packagingEnabled ? Math.max(0, Number(packagingCost) || 0) : 0;
  const baseCostPerUnit = ingredientPerUnit + packagingPerUnit;

  const pricing = useMemo(() => {
    if (baseCostPerUnit <= 0) return null;
    const multiplier = multiplierFor(profitScale);
    const suggestedRaw = baseCostPerUnit * multiplier;
    const suggestedPrice = niceRound(suggestedRaw);
    const realMargin = suggestedPrice > 0
      ? ((suggestedPrice - baseCostPerUnit) / suggestedPrice) * 100
      : 0;
    return { suggestedPrice, realMargin, multiplier };
  }, [baseCostPerUnit, profitScale]);

  const handleSave = () => {
    if (!name.trim()) { toast.error("Sila isi nama produk"); setStep(1); return; }
    if (ingredients.length === 0) {
      toast.error("Sila tambah sekurang-kurangnya satu bahan");
      setStep(2);
      return;
    }
    const packaging: ProductPackaging | undefined = packagingEnabled
      ? { type: packagingType.trim(), costPerUnit: packagingPerUnit }
      : undefined;

    onSave({
      id: initial?.id || `prod-${Date.now()}`,
      emoji,
      name: name.trim(),
      description: description.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      ingredients,
      batchSize: safeBatchSize,
      batchUnit,
      packaging,
      targetProfitScale: profitScale,
      totalCost: totalBatchCost,
      costPerUnit: baseCostPerUnit,
      suggestedPrice: pricing?.suggestedPrice,
      margin: pricing?.realMargin,
      category,
      // Legacy
      sellingPrice: pricing?.suggestedPrice,
      costPrice: baseCostPerUnit,
    });
  };

  const stepTitles: Record<Step, string> = {
    1: t("step1Short"),
    2: t("step2Short"),
    3: t("step3Short"),
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[560px] p-0 gap-0 max-h-[92vh] flex flex-col rounded-3xl overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="text-base font-extrabold flex items-center gap-2">
            <span className="text-xl">{emoji}</span>
            {initial ? "Edit Produk" : "Tambah Produk"}
          </DialogTitle>
          {/* 3-step Stepper */}
          <div className="mt-3 flex items-center gap-1.5">
            {([1, 2, 3] as Step[]).map((n, idx) => (
              <div key={n} className="flex items-center gap-1.5 flex-1">
                <div
                  className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-extrabold shrink-0 ${
                    step === n
                      ? "bg-primary text-primary-foreground"
                      : step > n
                        ? "bg-profit text-profit-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {n}
                </div>
                <span className={`text-[11px] font-semibold truncate ${step === n ? "text-primary" : "text-muted-foreground"}`}>
                  {stepTitles[n]}
                </span>
                {idx < 2 && <div className="h-px flex-1 bg-border" />}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 1 && (
            <>
              <BasicInfoStep
                emoji={emoji} setEmoji={setEmoji}
                emojiPickerOpen={emojiPickerOpen} setEmojiPickerOpen={setEmojiPickerOpen}
                name={name} setName={setName}
                description={description} setDescription={setDescription}
                imageUrl={imageUrl} setImageUrl={setImageUrl}
                category={category} setCategory={setCategory}
              />
              <div className="mt-5 pt-5 border-t border-border">
                <BatchDefinitionBlock
                  batchSize={batchSize} setBatchSize={setBatchSize}
                  batchUnit={batchUnit} setBatchUnit={setBatchUnit}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="mb-3 rounded-xl bg-primary/5 border border-primary/20 px-3 py-2 text-[11px] font-semibold text-primary flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                {t("perBatchNote")} — 1 batch = {safeBatchSize} {batchUnit}
              </div>
              <IngredientsStep
                ingredients={ingredients}
                setIngredients={setIngredients}
              />
              <div className="mt-5 pt-5 border-t border-border">
                <PackagingBlock
                  enabled={packagingEnabled} setEnabled={setPackagingEnabled}
                  type={packagingType} setType={setPackagingType}
                  cost={packagingCost} setCost={setPackagingCost}
                />
              </div>
              {totalBatchCost > 0 && (
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-muted px-4 py-3">
                  <span className="text-xs font-semibold">{t("totalBatchCost")}</span>
                  <span className="text-sm font-extrabold">{fmt(totalBatchCost)}</span>
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <ProfitScaleStep
              scale={profitScale}
              setScale={setProfitScale}
              ingredientPerUnit={ingredientPerUnit}
              packagingPerUnit={packagingPerUnit}
              batchSize={safeBatchSize}
              batchUnit={batchUnit}
              totalBatchCost={totalBatchCost}
              suggestedPrice={pricing?.suggestedPrice ?? 0}
              realMargin={pricing?.realMargin ?? 0}
            />
          )}
        </div>

        {/* Compact live footer (steps 2 & 3 once we have a cost) */}
        {pricing && step !== 3 && (
          <div className="border-t border-border bg-gradient-profit text-profit-foreground px-5 py-3 animate-pop-in">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider opacity-90">
              <Sparkles className="w-3 h-3" /> Live Pricing
            </div>
            <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="opacity-80 text-[10px]">{t("costPerUnit")}</div>
                <div className="font-extrabold text-sm">{fmt(baseCostPerUnit)}</div>
              </div>
              <div>
                <div className="opacity-80 text-[10px]">{t("suggestedPricePerUnit")}</div>
                <div className="font-extrabold text-sm">{fmt(pricing.suggestedPrice)}</div>
              </div>
              <div>
                <div className="opacity-80 text-[10px]">{t("profitMargin")}</div>
                <div className="font-extrabold text-sm">{pricing.realMargin.toFixed(0)}%</div>
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-border px-5 py-3 flex items-center justify-between gap-2">
          {step === 1 && (
            <>
              <Button variant="outline" onClick={onClose} className="rounded-2xl">Batal</Button>
              <Button
                onClick={() => {
                  if (!name.trim()) { toast.error("Sila isi nama produk"); return; }
                  setStep(2);
                }}
                className="rounded-2xl bg-gradient-profit text-profit-foreground"
              >
                {t("smartNext")} <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)} className="rounded-2xl">{t("smartBack")}</Button>
              <Button
                onClick={() => {
                  if (ingredients.length === 0) { toast.error("Sila tambah sekurang-kurangnya satu bahan"); return; }
                  setStep(3);
                }}
                className="rounded-2xl bg-gradient-profit text-profit-foreground"
              >
                {t("smartNext")} <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}
          {step === 3 && (
            <>
              <Button variant="outline" onClick={() => setStep(2)} className="rounded-2xl">{t("smartBack")}</Button>
              <Button onClick={handleSave} className="rounded-2xl bg-gradient-profit text-profit-foreground">
                {t("saveProduct")}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================
// Batch Definition block (used inside Step 1)
// ============================================================
const BatchDefinitionBlock = ({
  batchSize, setBatchSize, batchUnit, setBatchUnit,
}: {
  batchSize: number; setBatchSize: (n: number) => void;
  batchUnit: string; setBatchUnit: (s: string) => void;
}) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("batchDefinition")}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">{t("batchDefinitionHint")}</p>
      </div>
      <div className="rounded-2xl bg-primary/5 border border-primary/20 p-3 text-[11px] text-primary font-semibold">
        💡 {t("batchExample")}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t("batchSizeLabel")}>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={batchSize === 0 ? "" : batchSize}
            onChange={(e) => setBatchSize(e.target.value === "" ? 1 : Math.max(1, Number(e.target.value)))}
            placeholder="1"
            className="h-12 rounded-2xl text-base font-bold"
          />
        </Field>
        <Field label={t("batchUnitLabel")}>
          <Input
            list="batch-unit-suggestions"
            value={batchUnit}
            onChange={(e) => setBatchUnit(e.target.value)}
            placeholder="periuk, tray, loyang…"
            className="h-12 rounded-2xl text-base font-semibold"
          />
          <datalist id="batch-unit-suggestions">
            {BATCH_UNITS.map((u) => <option key={u} value={u} />)}
            <option value="periuk" />
            <option value="tray" />
            <option value="loyang" />
            <option value="bungkus" />
          </datalist>
        </Field>
      </div>
    </div>
  );
};

// ============================================================
// Packaging block (used inside Step 2)
// ============================================================
const PackagingBlock = ({
  enabled, setEnabled, type, setType, cost, setCost,
}: {
  enabled: boolean; setEnabled: (b: boolean) => void;
  type: string; setType: (s: string) => void;
  cost: number; setCost: (n: number) => void;
}) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Package className="w-3 h-3" /> {t("packagingExtras")}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{t("packagingHint")}</p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>
      {enabled && (
        <div className="space-y-2 animate-pop-in">
          <Field label={t("packagingType")}>
            <Input
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder={t("packagingTypePh")}
              className="h-11 rounded-xl"
            />
          </Field>
          <Field label={t("packagingCostPerUnit")}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">RM</span>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                value={cost === 0 ? "" : cost}
                onChange={(e) => setCost(e.target.value === "" ? 0 : Number(e.target.value))}
                placeholder="0.00"
                className="h-11 rounded-xl pl-10"
              />
            </div>
          </Field>
        </div>
      )}
      {!enabled && (
        <p className="text-[11px] text-muted-foreground italic px-1">
          🎁 Jangan lupa kos kotak/pelekat — selalu terlepas pandang!
        </p>
      )}
    </div>
  );
};

// ============================================================
// Step 3 — Profit Scale + Live Suggested Price
// ============================================================
const ProfitScaleStep = ({
  scale, setScale,
  ingredientPerUnit, packagingPerUnit,
  batchSize, batchUnit, totalBatchCost,
  suggestedPrice, realMargin,
}: {
  scale: number; setScale: (n: number) => void;
  ingredientPerUnit: number; packagingPerUnit: number;
  batchSize: number; batchUnit: string; totalBatchCost: number;
  suggestedPrice: number; realMargin: number;
}) => {
  const { t } = useTranslation();
  const tier = tierFor(scale);
  const tierKey = tierLabelKey(scale);
  const baseCostPerUnit = ingredientPerUnit + packagingPerUnit;

  // Emphasize price as scale grows (premium = bolder)
  const priceSizeClass = scale >= 8 ? "text-5xl" : scale >= 4 ? "text-4xl" : "text-3xl";
  const tierColor =
    tier === "premium" ? "text-profit"
    : tier === "standard" ? "text-primary"
    : "text-warn-foreground";

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("targetProfit")}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">{t("targetProfitHint")}</p>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{t("targetProfit")}</div>
              <div className={`text-2xl font-extrabold ${tierColor}`}>{scale} / 10</div>
            </div>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
              tier === "premium" ? "bg-profit/15 text-profit"
              : tier === "standard" ? "bg-primary/15 text-primary"
              : "bg-warn/15 text-warn-foreground"
            }`}>
              {t(tierKey)}
            </span>
          </div>

          {/* Slider with gradient track */}
          <div className="relative pt-1">
            <div
              className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full pointer-events-none opacity-40"
              style={{
                background: "linear-gradient(90deg, hsl(var(--warn,38 92% 50%)) 0%, hsl(var(--primary,221 83% 53%)) 50%, hsl(var(--profit,142 71% 45%)) 100%)",
              }}
            />
            <Slider
              value={[scale]}
              min={1}
              max={10}
              step={1}
              onValueChange={(v) => setScale(v[0])}
              className="relative"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-semibold mt-2 px-0.5">
              <span>1 · {t("scaleLow")}</span>
              <span>5 · {t("scaleStandard")}</span>
              <span>10 · {t("scalePremium")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Big animated suggested price */}
      <Card key={`${suggestedPrice}-${scale}`} className="rounded-3xl border-0 bg-gradient-profit text-profit-foreground shadow-glow animate-pop-in">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider opacity-90">
            <Sparkles className="w-3 h-3" /> {t("suggestedPricePerUnit")}
          </div>
          <div className={`font-extrabold leading-none transition-all ${priceSizeClass}`}>
            {fmt(suggestedPrice)}
          </div>
          <div className="text-[11px] opacity-90">
            per {batchUnit} · {t("profitMargin")}{" "}
            <span className="font-bold">{realMargin.toFixed(0)}%</span>
          </div>

          <div className="border-t border-white/20 pt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="opacity-80 text-[10px]">{t("totalBatchCost")}</div>
              <div className="font-bold text-sm">{fmt(totalBatchCost)}</div>
            </div>
            <div>
              <div className="opacity-80 text-[10px]">1 batch → {batchSize} {batchUnit}</div>
              <div className="font-bold text-sm">{fmt(ingredientPerUnit)} / unit</div>
            </div>
            {packagingPerUnit > 0 && (
              <>
                <div>
                  <div className="opacity-80 text-[10px]">{t("packagingPerUnit")}</div>
                  <div className="font-bold text-sm">{fmt(packagingPerUnit)}</div>
                </div>
                <div>
                  <div className="opacity-80 text-[10px]">{t("costPerUnit")}</div>
                  <div className="font-bold text-sm">{fmt(baseCostPerUnit)}</div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================
// Step 1
// ============================================================
const BasicInfoStep = ({
  emoji, setEmoji, emojiPickerOpen, setEmojiPickerOpen,
  name, setName, description, setDescription,
  imageUrl, setImageUrl, category, setCategory,
}: {
  emoji: string; setEmoji: (s: string) => void;
  emojiPickerOpen: boolean; setEmojiPickerOpen: (b: boolean) => void;
  name: string; setName: (s: string) => void;
  description: string; setDescription: (s: string) => void;
  imageUrl: string; setImageUrl: (s: string) => void;
  category: string; setCategory: (s: string) => void;
}) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {t("productBasicInfo")}
      </div>

      <div className="flex flex-col items-center gap-2">
        <button
          onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
          className="w-20 h-20 rounded-3xl bg-background border-2 border-border text-4xl grid place-items-center tap"
        >
          {emoji}
        </button>
        <button className="text-xs font-bold text-primary tap" onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}>
          Tukar ikon
        </button>
      </div>

      {emojiPickerOpen && (
        <div className="grid grid-cols-8 gap-1 p-2 rounded-2xl bg-background border border-border">
          {EMOJI_SUGGESTIONS.map((e) => (
            <button
              key={e}
              onClick={() => { setEmoji(e); setEmojiPickerOpen(false); }}
              className={`text-xl h-9 rounded-xl tap grid place-items-center ${emoji === e ? "bg-primary/15" : "hover:bg-muted"}`}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <Field label="Nama Produk">
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Cth: Nasi Lemak Ayam" className="h-12 rounded-2xl" />
      </Field>

      <Field label={t("productDescription")}>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} placeholder={t("productDescriptionPh")} className="rounded-2xl min-h-[72px]" />
      </Field>

      <Field label={t("productImage")}>
        <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" className="h-12 rounded-2xl" />
      </Field>

      <Field label="Kategori">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full h-12 px-4 rounded-2xl bg-background border border-input text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
    </div>
  );
};

// ============================================================
// Step 2 — Ingredient Builder with AI estimation
// ============================================================
const IngredientsStep = ({
  ingredients,
  setIngredients,
}: {
  ingredients: ProductIngredient[];
  setIngredients: React.Dispatch<React.SetStateAction<ProductIngredient[]>>;
}) => {
  const { t } = useTranslation();

  const add = () => {
    setIngredients((prev) => [
      ...prev,
      { id: `ing-${Date.now()}`, name: "", quantity: 1, unit: "unit" as Unit, predictedCost: undefined },
    ]);
  };

  const update = (id: string, patch: Partial<ProductIngredient>) => {
    setIngredients((prev) => prev.map((i) => i.id === id ? { ...i, ...patch } : i));
  };

  const remove = (id: string) => {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("productIngredients")}
        </div>
        <Button onClick={add} size="sm" variant="outline" className="rounded-xl h-8 text-xs">
          <Plus className="w-3 h-3" /> Bahan
        </Button>
      </div>

      {ingredients.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center">
            <div className="text-2xl mb-2">🥕</div>
            <p className="text-xs text-muted-foreground">{t("noIngredientsYet")}</p>
            <Button onClick={add} className="mt-3 rounded-2xl bg-gradient-profit text-profit-foreground" size="sm">
              <Plus className="w-4 h-4" /> Tambah Bahan
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {ingredients.map((ing) => (
          <IngredientCard
            key={ing.id}
            ingredient={ing}
            onChange={(patch) => update(ing.id, patch)}
            onRemove={() => remove(ing.id)}
          />
        ))}
      </div>

      {ingredients.length > 0 && (
        <p className="text-[11px] text-muted-foreground text-center pt-1">
          💡 {t("manualOverride")}
        </p>
      )}
    </div>
  );
};

const IngredientCard = ({
  ingredient,
  onChange,
  onRemove,
}: {
  ingredient: ProductIngredient;
  onChange: (patch: Partial<ProductIngredient>) => void;
  onRemove: () => void;
}) => {
  const { t } = useTranslation();
  const estimate = estimateIngredientCost;
  const [estimating, setEstimating] = useState(false);
  const [editingCost, setEditingCost] = useState(false);
  const [costDraft, setCostDraft] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-estimate when name + qty change (debounced)
  useEffect(() => {
    if (ingredient.manualCost) return; // user has overridden — don't auto-fetch
    if (!ingredient.name.trim() || ingredient.quantity <= 0) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setEstimating(true);
      try {
        const res = await estimate({
          data: { name: ingredient.name.trim(), quantity: ingredient.quantity, unit: ingredient.unit },
        });
        if (res.ok && res.cost > 0) {
          onChange({ predictedCost: res.cost, manualCost: false });
        }
      } catch (e) {
        console.error("estimate error", e);
      } finally {
        setEstimating(false);
      }
    }, 700);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingredient.name, ingredient.quantity, ingredient.unit]);

  const commitCostEdit = () => {
    const v = parseFloat(costDraft);
    if (!isNaN(v) && v >= 0) {
      onChange({ predictedCost: v, manualCost: true });
    }
    setEditingCost(false);
  };

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Input
            value={ingredient.name}
            onChange={(e) => onChange({ name: e.target.value, manualCost: false })}
            placeholder={t("ingredientName")}
            className="h-11 flex-1 rounded-xl"
          />
          <button
            onClick={onRemove}
            className="w-11 h-11 grid place-items-center rounded-xl bg-cost-soft text-cost tap"
            aria-label="Padam"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={ingredient.quantity === 0 ? "" : ingredient.quantity}
            onChange={(e) => onChange({
              quantity: e.target.value === "" ? 0 : Number(e.target.value),
              manualCost: false,
            })}
            placeholder={t("ingredientQty")}
            className="h-11 rounded-xl"
          />
          <select
            value={ingredient.unit}
            onChange={(e) => onChange({ unit: e.target.value as Unit, manualCost: false })}
            className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
          >
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        {/* Cost / AI estimate row */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="text-[11px] font-semibold text-muted-foreground">
            {t("predictedCost")}
          </div>
          {editingCost ? (
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-muted-foreground">RM</span>
              <Input
                autoFocus
                type="number"
                inputMode="decimal"
                step="0.01"
                value={costDraft}
                onChange={(e) => setCostDraft(e.target.value)}
                onBlur={commitCostEdit}
                onKeyDown={(e) => { if (e.key === "Enter") commitCostEdit(); }}
                className="h-8 w-24 rounded-lg text-right"
              />
            </div>
          ) : estimating ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warn/15 text-warn-foreground text-[11px] font-bold">
              <Loader2 className="w-3 h-3 animate-spin" />
              {t("estimating")}
            </div>
          ) : ingredient.predictedCost !== undefined && ingredient.predictedCost > 0 ? (
            <button
              onClick={() => {
                setCostDraft(String(ingredient.predictedCost ?? ""));
                setEditingCost(true);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tap transition-colors ${
                ingredient.manualCost
                  ? "bg-profit/15 text-profit hover:bg-profit/25"
                  : "bg-warn/15 text-warn-foreground hover:bg-warn/25"
              }`}
              title={t("manualOverride")}
            >
              {ingredient.manualCost ? null : <Sparkles className="w-3 h-3" />}
              {fmt(ingredient.predictedCost)}
              <span className="opacity-70 ml-0.5">
                {ingredient.manualCost ? `· ${t("manualBadge")}` : `· ${t("aiEstimateBadge")}`}
              </span>
            </button>
          ) : (
            <button
              onClick={() => { setCostDraft(""); setEditingCost(true); }}
              className="text-[11px] font-bold text-primary tap underline"
            >
              + Set kos
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <div className="text-[11px] font-bold text-muted-foreground mb-1.5 ml-1">{label}</div>
    {children}
  </div>
);
