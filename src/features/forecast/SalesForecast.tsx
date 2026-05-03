import { useMemo, useState } from "react";
import { ArrowLeft, TrendingUp, Sparkles, ShoppingCart, CheckCircle2, Clock, Trophy, ChartBar, CloudRain, AlertTriangle, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fmt } from "@/lib/format";
import type { Unit } from "@/types";
import { useWeather, type DayWeather } from "@/features/weather/useWeather";
import { forecastDay, clampMultiplier } from "@/lib/forecastModel";

type Level = "tutup" | "normal" | "tinggi" | "sangat-tinggi";

interface DayForecast {
  day: string;
  date: string;
  level: Level;
  revenue: number;
  normal: number;
  pctAbove: number;
  reasons: string[];
  stock: { name: string; emoji: string; need: number; usual: number; unit: Unit }[];
}

const FORECAST: DayForecast[] = [
  {
    day: "Isnin", date: "28 Apr", level: "normal", revenue: 520, normal: 520, pctAbove: 0,
    reasons: ["Hari biasa minggu", "Trafik pejabat sederhana"],
    stock: [
      { name: "Ayam", emoji: "🍗", need: 12, usual: 15, unit: "kg" },
      { name: "Beras", emoji: "🍚", need: 7, usual: 8, unit: "kg" },
      { name: "Pembungkusan", emoji: "📦", need: 90, usual: 100, unit: "biji" },
    ],
  },
  {
    day: "Selasa", date: "29 Apr", level: "normal", revenue: 540, normal: 520, pctAbove: 4,
    reasons: ["Trend serupa Isnin", "Cuaca panas — minuman naik"],
    stock: [
      { name: "Ayam", emoji: "🍗", need: 13, usual: 15, unit: "kg" },
      { name: "Beras", emoji: "🍚", need: 7, usual: 8, unit: "kg" },
      { name: "Minyak Masak", emoji: "🛢️", need: 4, usual: 5, unit: "liter" },
    ],
  },
  {
    day: "Rabu", date: "30 Apr", level: "tinggi", revenue: 650, normal: 520, pctAbove: 25,
    reasons: ["Hari pasar berdekatan", "Cuti sekolah dijangka"],
    stock: [
      { name: "Ayam", emoji: "🍗", need: 18, usual: 15, unit: "kg" },
      { name: "Beras", emoji: "🍚", need: 10, usual: 8, unit: "kg" },
      { name: "Pembungkusan", emoji: "📦", need: 120, usual: 100, unit: "biji" },
    ],
  },
  {
    day: "Khamis", date: "1 Mei", level: "tinggi", revenue: 680, normal: 520, pctAbove: 30,
    reasons: ["Hari Pekerja — ramai cuti", "Pesanan katering meningkat"],
    stock: [
      { name: "Ayam", emoji: "🍗", need: 20, usual: 15, unit: "kg" },
      { name: "Minyak Masak", emoji: "🛢️", need: 6, usual: 5, unit: "liter" },
      { name: "Pembungkusan", emoji: "📦", need: 130, usual: 100, unit: "biji" },
    ],
  },
  {
    day: "Jumaat", date: "2 Mei", level: "sangat-tinggi", revenue: 806, normal: 520, pctAbove: 55,
    reasons: ["Jumaat — pattern jualan Boss naik mendadak", "Awal bulan, ramai baru gaji", "Solat Jumaat — trafik berdekatan masjid"],
    stock: [
      { name: "Ayam", emoji: "🍗", need: 22, usual: 15, unit: "kg" },
      { name: "Beras", emoji: "🍚", need: 11, usual: 8, unit: "kg" },
      { name: "Minyak Masak", emoji: "🛢️", need: 7, usual: 5, unit: "liter" },
      { name: "Pembungkusan", emoji: "📦", need: 140, usual: 100, unit: "biji" },
    ],
  },
  {
    day: "Sabtu", date: "3 Mei", level: "sangat-tinggi", revenue: 884, normal: 520, pctAbove: 70,
    reasons: ["Hujung minggu (pattern jualan Boss)", "Awal bulan — ramai yang baru gaji", "Cuaca cerah dijangka (weekend trend)"],
    stock: [
      { name: "Ayam", emoji: "🍗", need: 25, usual: 15, unit: "kg" },
      { name: "Minyak Masak", emoji: "🛢️", need: 8, usual: 5, unit: "liter" },
      { name: "Beras", emoji: "🍚", need: 12, usual: 8, unit: "kg" },
      { name: "Pembungkusan", emoji: "📦", need: 150, usual: 100, unit: "biji" },
    ],
  },
  {
    day: "Ahad", date: "4 Mei", level: "tutup", revenue: 0, normal: 0, pctAbove: 0,
    reasons: ["Gerai tutup hari Ahad"], stock: [],
  },
];

const LEVEL_META: Record<Level, { label: string; emoji: string; chipClass: string; cardClass: string }> = {
  "tutup": { label: "TUTUP", emoji: "⚪", chipClass: "bg-muted text-muted-foreground", cardClass: "bg-muted/40 border-border" },
  "normal": { label: "NORMAL", emoji: "🟢", chipClass: "bg-primary/15 text-primary", cardClass: "bg-primary/5 border-primary/20" },
  "tinggi": { label: "TINGGI", emoji: "🟡", chipClass: "bg-warn-soft text-warn", cardClass: "bg-warn-soft border-warn/30" },
  "sangat-tinggi": { label: "SANGAT TINGGI", emoji: "🔴", chipClass: "bg-cost-soft text-cost", cardClass: "bg-cost-soft border-cost/30" },
};

const addressBoss = (businessName: string) => businessName?.trim() ? businessName.trim() : "Boss";

export function SalesForecast({
  onClose,
  businessName,
  onSendToBuy,
}: {
  onClose: () => void;
  businessName: string;
  onSendToBuy: (items: { emoji: string; name: string; recQty: number; unit: Unit; note?: string }[]) => void;
}) {
  const boss = addressBoss(businessName);
  const [selected, setSelected] = useState<string>("Sabtu");
  const detail = FORECAST.find((f) => f.day === selected) ?? FORECAST[5];

  // Live weather (Open-Meteo, KL coords by default).
  const { data: weather, loading: weatherLoading, error: weatherError } = useWeather();

  // Compute probabilistic forecast per day, applying the weather multiplier.
  const probabilistic = useMemo(() => {
    return FORECAST.map((f, i) => {
      const w = weather?.[i];
      const weatherMult = clampMultiplier(1 + (w?.trafficAdjust ?? 0));
      // baseline = the mock "normal" we already had, fall back to revenue/1.0
      const baseline = f.normal > 0 ? f.normal : 0;
      if (f.level === "tutup" || baseline === 0) {
        return { day: f.day, point: null, weather: w, weatherMult };
      }
      const point = forecastDay(i, baseline, 0.55, weatherMult, 0.12, 0.85);
      return { day: f.day, point, weather: w, weatherMult };
    });
  }, [weather]);

  const detailIdx = FORECAST.findIndex((f) => f.day === selected);
  const detailProb = probabilistic[detailIdx];
  const detailWeather = detailProb?.weather;

  // Severe weather alert across the week
  const stormDay = probabilistic.find((p) => p.weather?.severity === "alert");

  const totalRevenue = useMemo(() => FORECAST.reduce((s, f) => s + f.revenue, 0), []);
  const matCost = totalRevenue * 0.45;
  const profit = totalRevenue - matCost;

  // aggregate weekly checklist
  const weeklyChecklist = useMemo(() => {
    const map = new Map<string, { emoji: string; name: string; total: number; unit: Unit }>();
    FORECAST.forEach((f) => {
      f.stock.forEach((s) => {
        const cur = map.get(s.name);
        if (cur) cur.total += s.need;
        else map.set(s.name, { emoji: s.emoji, name: s.name, total: s.need, unit: s.unit });
      });
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, []);

  const [checked, setChecked] = useState<Set<string>>(new Set());

  const handleSendDayToBuy = () => {
    const items = detail.stock.map((s) => ({
      emoji: s.emoji, name: s.name, recQty: s.need, unit: s.unit,
      note: `Persiapan ${detail.day} ${detail.date}`,
    }));
    onSendToBuy(items);
    toast.success(`${items.length} item ditambah ke Nak Beli ✅`);
  };

  const handleSendWeekToBuy = () => {
    const items = weeklyChecklist
      .filter((w) => !checked.has(w.name))
      .map((w) => ({ emoji: w.emoji, name: w.name, recQty: w.total, unit: w.unit, note: "Persiapan minggu" }));
    if (items.length === 0) {
      toast.error("Tiada item untuk dihantar");
      return;
    }
    onSendToBuy(items);
    toast.success(`${items.length} item dihantar ke Nak Beli ✅`);
  };

  const extraRevenue = detail.revenue - detail.normal;

  return (
    <div className="fixed inset-0 z-40 bg-background overflow-y-auto animate-fade-in">
      <div className="mx-auto w-full max-w-full sm:max-w-[600px] md:max-w-[760px] lg:max-w-[960px] xl:max-w-[1140px] 2xl:max-w-[1280px] min-h-screen bg-background pb-32">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={onClose} className="w-10 h-10 grid place-items-center rounded-full hover:bg-muted tap" aria-label="Tutup">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-extrabold leading-tight">Ramalan Jualan 7 Hari</h1>
            <p className="text-xs text-muted-foreground">AI belajar dari rekod {boss} untuk ramal minggu depan</p>
          </div>
        </header>

        <div className="px-4 py-4 space-y-5">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary">
              <Sparkles className="w-3 h-3" /> Berdasarkan 30 hari rekod jualan {boss}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-profit/10 text-profit">
              <CheckCircle2 className="w-3 h-3" /> Ketepatan ramalan AI {boss}: 87% ✅
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-accent/15 text-accent-foreground">
              <Activity className="w-3 h-3" /> Model bermusim (sin) + selang keyakinan 85%
            </span>
            {weather && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-muted text-foreground">
                ☁️ Cuaca langsung — Open-Meteo
              </span>
            )}
          </div>

          {/* Storm alert banner */}
          {stormDay?.weather && (
            <div className="rounded-2xl bg-cost-soft border border-cost/30 p-4 flex gap-3 animate-fade-in">
              <div className="w-10 h-10 rounded-xl bg-cost/15 grid place-items-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-cost" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-cost">
                  Amaran cuaca: {stormDay.weather.label} {stormDay.weather.emoji} pada {stormDay.day}
                </p>
                <p className="text-xs text-foreground/80 mt-1 leading-relaxed">
                  AI menurunkan jangkaan trafik {boss} sebanyak {Math.round(Math.abs(stormDay.weather.trafficAdjust) * 100)}%.
                  Cadangan: tolak item panas (sup, teh) seawal pagi dan sediakan promo last-call sebelum hujan turun.
                </p>
              </div>
            </div>
          )}
          {weatherError && (
            <p className="text-xs text-muted-foreground italic">Cuaca tidak dapat diambil — ramalan jalan tanpa pelarasan cuaca.</p>
          )}

          {/* 7-day strip */}
          <section className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Ramalan 7 Hari</h2>
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
              {FORECAST.map((f, i) => {
                const meta = LEVEL_META[f.level];
                const active = selected === f.day;
                const barPct = f.normal > 0 ? Math.min((f.revenue / Math.max(...FORECAST.map((x) => x.revenue))) * 100, 100) : 5;
                const normalPct = f.normal > 0 ? (f.normal / Math.max(...FORECAST.map((x) => x.revenue))) * 100 : 0;
                const p = probabilistic[i];
                const w = p?.weather;
                return (
                  <button
                    key={f.day}
                    onClick={() => setSelected(f.day)}
                    className={`shrink-0 w-[120px] rounded-2xl p-3 border-2 text-left tap transition-all duration-150 ${active ? "border-transparent bg-gradient-profit text-profit-foreground shadow-card scale-[1.02]" : meta.cardClass}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold">{f.day}</p>
                        <p className="text-[10px] text-muted-foreground">{f.date}</p>
                      </div>
                      {w && <span className="text-base leading-none" title={`${w.label} · ${Math.round(w.tMax)}°`}>{w.emoji}</span>}
                    </div>
                    <span className={`mt-2 inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${meta.chipClass}`}>
                      {meta.emoji} {meta.label}
                    </span>
                    {f.level !== "tutup" && f.pctAbove > 0 && (
                      <p className="text-[10px] font-bold text-cost mt-1">+{f.pctAbove}%</p>
                    )}
                    <p className="text-base font-extrabold mt-1">
                      {f.level === "tutup" ? "—" : fmt(p?.point?.expected ?? f.revenue)}
                    </p>
                    {p?.point && (
                      <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">
                        {fmt(p.point.low)}–{fmt(p.point.high)}
                      </p>
                    )}
                    {f.level !== "tutup" && (
                      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden relative">
                        <div className="absolute top-0 left-0 h-full bg-muted-foreground/40" style={{ width: `${normalPct}%` }} />
                        <div className="absolute top-0 left-0 h-full bg-primary" style={{ width: `${barPct}%`, mixBlendMode: "multiply" }} />
                      </div>
                    )}
                    {w && w.severity !== "ok" && (
                      <p className={`text-[9px] font-bold mt-1 ${w.severity === "alert" ? "text-cost" : "text-warn"}`}>
                        {w.trafficAdjust < 0 ? `${Math.round(w.trafficAdjust * 100)}% trafik` : "+trafik"}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
            {weatherLoading && (
              <p className="text-[11px] text-muted-foreground italic">Mengambil cuaca terkini untuk {boss}…</p>
            )}
          </section>

          {/* Expanded detail */}
          <section className="rounded-2xl bg-card border-l-4 border-primary border-y border-r border-border p-4 shadow-card space-y-3">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">📅 {detail.day}, {detail.date} 2025</p>
              <p className="text-base font-extrabold mt-1">
                {LEVEL_META[detail.level].emoji} {LEVEL_META[detail.level].label}
                {detail.level !== "tutup" && <> — Dijangka <span className="text-primary">{fmt(detail.revenue)}</span></>}
              </p>
              {detailProb?.point && detail.level !== "tutup" && (
                <div className="mt-2 rounded-xl bg-accent/10 border border-accent/30 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-accent-foreground/80 flex items-center gap-1">
                    <Activity className="w-3 h-3" /> Model AI berkemungkinan
                  </p>
                  <p className="text-sm mt-1 leading-relaxed">
                    Boss, ada <span className="font-extrabold">{detailProb.point.probHitExpected}% kemungkinan</span> capai{" "}
                    <span className="font-extrabold text-primary">{fmt(detailProb.point.expected)}</span>
                    {" "}— sediakan untuk julat <span className="font-semibold">{fmt(detailProb.point.low)}–{fmt(detailProb.point.high)}</span>.
                  </p>
                  {detailWeather && detailWeather.severity !== "ok" && (
                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                      <CloudRain className="w-3 h-3" /> Pelarasan cuaca: {detailWeather.label} {detailWeather.emoji}
                      {" "}({detailWeather.trafficAdjust >= 0 ? "+" : ""}{Math.round(detailWeather.trafficAdjust * 100)}% trafik)
                    </p>
                  )}
                </div>
              )}
            </div>

            {detail.level !== "tutup" && (
              <>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Sebab AI buat ramalan ini:</p>
                  <ul className="space-y-1">
                    {detail.reasons.map((r, i) => (
                      <li key={i} className="text-sm flex gap-2"><span className="text-primary">•</span>{r}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Stok yang {boss} perlu sediakan:</p>
                  <div className="space-y-1.5">
                    {detail.stock.map((s) => (
                      <div key={s.name} className="flex items-center justify-between text-sm rounded-xl bg-muted/40 px-3 py-2">
                        <span className="flex items-center gap-2"><span>{s.emoji}</span>{s.name}</span>
                        <span className="font-semibold">
                          {s.need} {s.unit} <span className="text-xs text-muted-foreground font-normal">(biasa: {s.usual})</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {extraRevenue > 0 && (
                  <div className="rounded-xl bg-primary/10 border border-primary/30 p-3">
                    <p className="text-sm">
                      Pendapatan tambahan dijangka: <span className="font-extrabold text-primary">+{fmt(extraRevenue)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">jika {boss} sediakan stok yang cukup</p>
                  </div>
                )}

                <Button onClick={handleSendDayToBuy} className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold">
                  <ShoppingCart className="w-4 h-4 mr-2" /> Tambah ke Senarai Nak Beli
                </Button>
              </>
            )}
          </section>

          {/* Pattern insights */}
          <section className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Corak Pintar AI</h2>
            <InsightCard icon={<Trophy className="w-5 h-5 text-warn" />} title={`Hari Terbaik ${boss}`} desc={`Sabtu adalah hari jualan tertinggi ${boss} — purata RM 847/Sabtu (30 hari lepas)`} bg="bg-warn-soft border-warn/30" />
            <InsightCard icon={<Clock className="w-5 h-5 text-primary" />} title="Masa Puncak" desc={`Jualan ${boss} paling laju antara 8AM-11AM. Pastikan stok penuh sebelum pukul 7:30AM.`} bg="bg-primary/10 border-primary/30" />
            <InsightCard icon={<TrendingUp className="w-5 h-5 text-profit" />} title="Trend Bulan Ini" desc={`Jualan ${boss} naik 12% berbanding bulan lepas. ${boss} sedang berkembang — tahniah! 🎉`} bg="bg-profit/10 border-profit/30" />
          </section>

          {/* Weekly revenue prediction */}
          <section className="rounded-2xl p-5 bg-gradient-profit text-profit-foreground shadow-glow space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-90">
              <ChartBar className="w-4 h-4" /> Jangkaan Hasil Minggu Ini
            </div>
            <div className="space-y-1.5 text-sm">
              <Row label="Jualan dijangka" value={fmt(totalRevenue)} />
              <Row label="Kos bahan (est. 45%)" value={fmt(matCost)} />
              <Row label="Keuntungan dijangka" value={fmt(profit)} />
            </div>
            <p className="text-xs italic opacity-95 pt-2 border-t border-white/20">
              {boss} perlu sediakan modal beli bahan: <span className="font-bold">{fmt(matCost)}</span> sebelum Isnin.
            </p>
          </section>

          {/* Stock prep checklist */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Senarai Persiapan Minggu Ini</h2>
            <div className="rounded-2xl bg-card border border-border p-2 shadow-sm">
              {weeklyChecklist.map((w, i) => {
                const isChecked = checked.has(w.name);
                return (
                  <button
                    key={w.name}
                    onClick={() => {
                      setChecked((prev) => {
                        const next = new Set(prev);
                        if (next.has(w.name)) next.delete(w.name); else next.add(w.name);
                        return next;
                      });
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 tap text-left"
                  >
                    <div className={`w-6 h-6 rounded-md border-2 grid place-items-center transition-all ${isChecked ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                      {isChecked && <CheckCircle2 className="w-4 h-4 text-primary-foreground" />}
                    </div>
                    <span className="text-lg">{w.emoji}</span>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${isChecked ? "line-through text-muted-foreground" : ""}`}>
                        Beli {w.name} — {w.total} {w.unit} {i === 0 && <span className="text-cost">(paling penting!)</span>}
                      </p>
                    </div>
                  </button>
                );
              })}
              <div className="flex items-center gap-3 p-3">
                <div className="w-6 h-6 rounded-md border-2 border-muted-foreground/40" />
                <span className="text-lg">🔥</span>
                <p className="text-sm font-semibold flex-1">Semak gas memasak sebelum Jumaat</p>
              </div>
            </div>
            <Button onClick={handleSendWeekToBuy} className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold">
              <ShoppingCart className="w-4 h-4 mr-2" /> Hantar ke Nak Beli
            </Button>
          </section>

          {/* AI summary */}
          <section className="rounded-2xl p-5 bg-gradient-income text-white shadow-card space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-90">
              <Sparkles className="w-4 h-4" /> Mesej AI
            </div>
            <p className="text-sm leading-relaxed">
              {boss}, minggu depan nampak sangat menjanjikan! Jumaat dan Sabtu akan jadi hari paling sibuk —
              pastikan {boss} rehat cukup sebelum tu dan stok dah siap seawal Khamis malam.
            </p>
            <p className="text-sm leading-relaxed pt-2 border-t border-white/20">
              {boss} sedang dalam momentum yang bagus — teruskan! 💪
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="opacity-90">{label}</span>
    <span className="font-bold">{value}</span>
  </div>
);

const InsightCard = ({ icon, title, desc, bg }: { icon: React.ReactNode; title: string; desc: string; bg: string }) => (
  <div className={`rounded-2xl p-4 border ${bg} flex gap-3`}>
    <div className="w-10 h-10 rounded-xl bg-background/60 grid place-items-center shrink-0">{icon}</div>
    <div>
      <p className="font-bold text-sm">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
    </div>
  </div>
);