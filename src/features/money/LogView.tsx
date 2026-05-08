import { useState } from "react";
import { Share2, Coins } from "lucide-react";
import type { PettyEntry, Txn, OpExEntry, OpExCategory } from "@/types";
import { OPEX_CATEGORIES, OPEX_EMOJI } from "@/types";
import { fmt } from "@/lib/format";
import { PettyInputSheet } from "./PettyInputSheet";
import { OpExInputSheet } from "./OpExInputSheet";

const MiniStat = ({ label, value, tone }: { label: string; value: number; tone: "income" | "cost" | "profit" }) => {
  const styles = {
    income: "bg-gradient-income text-white",
    cost:   "bg-gradient-cost text-white",
    profit: "bg-gradient-profit text-profit-foreground",
  }[tone];
  return (
    <div className={`rounded-2xl p-3 ${styles}`}>
      <div className="text-[10px] font-bold uppercase opacity-90">{label}</div>
      <div className="text-base font-extrabold mt-1">{fmt(value)}</div>
    </div>
  );
};

export const LogView = ({ txns, today, week, month, petty, opex, todayCogs, todayOtherOpex, todayNetProfit, onExport, onAddPetty, onAddOpEx }: {
  txns: Txn[];
  today: { in: number; out: number; profit: number };
  week: { in: number; out: number; profit: number };
  month: { in: number; out: number; profit: number };
  petty: PettyEntry[];
  opex: OpExEntry[];
  todayCogs: number;
  todayOtherOpex: number;
  todayNetProfit: number;
  onExport: () => void;
  onAddPetty: (type: "in" | "out", amount: number, desc: string, emoji: string) => void;
  onAddOpEx: (category: OpExCategory, amount: number, desc: string, paidFromPetty: boolean) => void;
}) => {
  const [range, setRange] = useState<"today" | "week" | "month">("today");
  const [filter, setFilter] = useState<"all" | "in" | "out" | "petty" | "opex">("all");
  const [pettySheet, setPettySheet] = useState<null | "in" | "out">(null);
  const [opexSheet, setOpexSheet] = useState(false);
  const sum = range === "today" ? today : range === "week" ? week : month;
  const filtered = (filter === "all" ? txns : filter === "in" ? txns.filter(t => t.type === "in") : txns.filter(t => t.type === "out")).slice().reverse();
  const balance = petty[petty.length - 1]?.balance ?? 0;

  // Group sales by date when filter === "in"
  const salesByDate = (() => {
    if (filter !== "in") return [];
    const map = new Map<string, { dateKey: string; label: string; total: number; items: Txn[] }>();
    txns.filter(t => t.type === "in").forEach(t => {
      const d = t.createdAt ? new Date(t.createdAt) : new Date(t.ts);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("ms-MY", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      const cur = map.get(key) ?? { dateKey: key, label, total: 0, items: [] };
      cur.total += t.amount;
      cur.items.push(t);
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  })();

  const opexByCategory = OPEX_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = opex.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0);
    return acc;
  }, {} as Record<OpExCategory, number>);
  const opexTotal = opex.reduce((s, e) => s + e.amount, 0);
  const grossProfit = today.in - todayCogs;

  return (
    <div className="px-5 pt-6 pb-28 space-y-5">
      <header className="flex items-start justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Rekod Kewangan 📊</h1>
          <p className="text-sm text-muted-foreground mt-1">Semua transaksi</p>
        </div>
        <button onClick={onExport} className="h-10 px-3 rounded-full bg-surface border border-border text-sm font-semibold tap flex items-center gap-1.5">
          <Share2 className="w-4 h-4" /> Export
        </button>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {([
          { k: "all", label: "Semua" },
          { k: "in", label: "💰 Jualan" },
          { k: "out", label: "💸 Belanja" },
          { k: "petty", label: "🪙 Petty Cash" },
          { k: "opex", label: "💼 Kos Operasi" },
        ] as const).map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)}
            className={`h-11 px-3 rounded-xl text-xs font-bold tap transition-all duration-150 ${filter === f.k ? "bg-gradient-profit text-profit-foreground shadow-card border-transparent" : "bg-surface border border-border text-muted-foreground"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {filter !== "petty" && filter !== "opex" ? (
        <>
          <div className="flex p-1 rounded-2xl bg-surface border border-border gap-1">
            {(["today", "week", "month"] as const).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`flex-1 h-11 rounded-xl text-xs font-bold tap transition-all duration-150 ${range === r ? "bg-gradient-profit text-profit-foreground shadow-card border-transparent" : "text-muted-foreground"}`}
              >
                {r === "today" ? "Hari Ini" : r === "week" ? "Minggu Ini" : "Bulan Ini"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Masuk"  value={sum.in}     tone="income" />
            <MiniStat label="Keluar" value={sum.out}    tone="cost" />
            <MiniStat label="Untung" value={sum.profit} tone="profit" />
          </div>

          {filter === "in" ? (
            <section className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Jualan Mengikut Tarikh</h2>
              {salesByDate.length === 0 ? (
                <div className="rounded-2xl p-6 bg-surface border border-dashed border-border text-center text-sm text-muted-foreground">
                  Tiada jualan direkod.
                </div>
              ) : (
                salesByDate.map(group => (
                  <div key={group.dateKey} className="rounded-2xl bg-surface border border-border overflow-hidden">
                    <div className="px-4 py-2.5 bg-surface-elevated flex items-center justify-between">
                      <span className="text-xs font-bold">{group.label}</span>
                      <span className="font-extrabold text-profit">+{fmt(group.total)}</span>
                    </div>
                    <div className="divide-y divide-border">
                      {group.items.slice().reverse().map(t => (
                        <div key={t.id} className="px-4 py-2.5 flex items-center gap-3">
                          <span className="text-xl">{t.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate">{t.label}</div>
                            <div className="text-[11px] text-muted-foreground">{t.time}</div>
                          </div>
                          <div className="font-bold text-sm text-profit">+{fmt(t.amount)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </section>
          ) : (
            <section className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Transaksi</h2>
              <div className="space-y-2">
                {filtered.map(t => (
                  <div key={t.id} className="rounded-2xl p-3.5 bg-surface border border-border flex items-center gap-3 animate-fade-in">
                    <div className={`w-11 h-11 rounded-2xl grid place-items-center text-2xl ${t.type === "in" ? "bg-profit/15" : "bg-cost/15"}`}>
                      {t.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold leading-tight truncate">{t.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{t.time}</div>
                    </div>
                    <div className={`font-extrabold text-lg ${t.type === "in" ? "text-profit" : "text-cost"}`}>
                      {t.type === "in" ? "+" : "−"}{fmt(t.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      ) : filter === "petty" ? (
        <>
          <div className="rounded-3xl p-5 bg-gradient-to-br from-warn/30 to-warn/10 border border-warn/30 text-center animate-pop-in">
            <Coins className="w-6 h-6 mx-auto text-warn" />
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-2">Wang Runcit / Petty Cash</div>
            <div className="text-4xl font-extrabold mt-1">RM {balance.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1">Baki semasa dalam tangan</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setPettySheet("in")} className="h-14 rounded-2xl bg-gradient-profit text-profit-foreground font-bold tap shadow-card">+ Masuk Wang 💵</button>
            <button onClick={() => setPettySheet("out")} className="h-14 rounded-2xl bg-gradient-cost text-white font-bold tap shadow-card">− Keluar Wang 💸</button>
          </div>
          <section className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Log Petty Cash</h2>
            <div className="space-y-2">
              {[...petty].reverse().map(p => (
                <div key={p.id} className="rounded-2xl p-3 bg-surface border border-border flex items-center gap-3 animate-fade-in">
                  <div className={`w-10 h-10 rounded-xl grid place-items-center text-xl ${p.type === "in" ? "bg-profit/15" : "bg-cost/15"}`}>{p.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{p.desc}</div>
                    <div className="text-[11px] text-muted-foreground">{p.time} • Baki: RM {p.balance.toFixed(2)}</div>
                  </div>
                  <div className={`font-extrabold text-sm ${p.type === "in" ? "text-profit" : "text-cost"}`}>
                    {p.type === "in" ? "+" : "−"}RM {p.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </section>
          {pettySheet && (
            <PettyInputSheet
              kind={pettySheet}
              onClose={() => setPettySheet(null)}
              onSave={(amt, desc, emoji) => { onAddPetty(pettySheet, amt, desc, emoji); setPettySheet(null); }}
            />
          )}
        </>
      ) : (
        <>
          <div className="rounded-3xl p-5 bg-surface border border-border space-y-4 animate-pop-in">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Jumlah Kos Operasi</div>
                <div className="text-3xl font-extrabold mt-1 text-cost">RM {opexTotal.toFixed(2)}</div>
              </div>
              <button
                onClick={() => setOpexSheet(true)}
                className="h-12 px-4 rounded-2xl bg-gradient-cost text-white font-bold shadow-card text-sm tap"
              >
                + Tambah Kos
              </button>
            </div>
            <div className="space-y-1.5 pt-3 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Jualan Kasar</span>
                <span className="font-bold text-profit">+RM {today.in.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Kos Bahan (COGS)</span>
                <div className="text-right">
                  <span className="font-bold text-cost">−RM {todayCogs.toFixed(2)}</span>
                  <div className="text-[10px] text-muted-foreground">Termasuk: Beli X + OpEx Kos Bahan</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm border-t border-border pt-1.5">
                <span className="font-semibold">Untung Kasar</span>
                <span className={`font-extrabold ${grossProfit >= 0 ? "text-profit" : "text-cost"}`}>RM {grossProfit.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Kos Operasi Lain</span>
                <span className="font-bold text-cost">−RM {todayOtherOpex.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-base border-t border-border pt-2">
                <span className="font-extrabold">Untung Bersih</span>
                <span className={`font-extrabold ${todayNetProfit >= 0 ? "text-profit" : "text-cost"}`}>RM {todayNetProfit.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <section className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Pecahan Kategori</h2>
            <div className="space-y-2">
              {OPEX_CATEGORIES.map((cat) => {
                const total = opexByCategory[cat];
                const pct = opexTotal > 0 ? (total / opexTotal) * 100 : 0;
                return (
                  <div key={cat} className="rounded-2xl p-3 bg-surface border border-border flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl grid place-items-center text-xl bg-cost/15">
                      {OPEX_EMOJI[cat]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{cat}</span>
                        <span className="font-extrabold text-sm">RM {total.toFixed(2)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                        <div className="h-full bg-cost rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">{pct.toFixed(0)}% daripada jumlah kos</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Log Kos Operasi</h2>
            {opex.length === 0 ? (
              <div className="rounded-2xl p-6 bg-surface border border-dashed border-border text-center text-sm text-muted-foreground">
                Tiada rekod lagi. Tap "+ Tambah Kos" untuk mula.
              </div>
            ) : (
              <div className="space-y-2">
                {[...opex].reverse().map((e) => (
                  <div key={e.id} className="rounded-2xl p-3 bg-surface border border-border flex items-center gap-3 animate-fade-in">
                    <div className="w-10 h-10 rounded-xl grid place-items-center text-xl bg-cost/15">
                      {OPEX_EMOJI[e.category]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{e.desc}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                        <span>{e.category} • {e.time}</span>
                        {e.paidFromPetty && <span className="px-1.5 py-0.5 rounded-full bg-warn/20 text-warn font-bold">🪙 Petty Cash</span>}
                      </div>
                    </div>
                    <div className="font-extrabold text-sm text-cost">−RM {e.amount.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {opexSheet && (
            <OpExInputSheet
              onClose={() => setOpexSheet(false)}
              onSave={(cat, amt, desc, fromPetty) => {
                onAddOpEx(cat, amt, desc, fromPetty);
                setOpexSheet(false);
              }}
            />
          )}
        </>
      )}
    </div>
  );
};
