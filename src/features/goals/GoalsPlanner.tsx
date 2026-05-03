import { useMemo, useState } from "react";
import { ArrowLeft, Save, Target, TrendingUp, Lightbulb, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { fmt } from "@/lib/format";

type GoalType = "machine" | "production" | "premise" | "cert";

const GOAL_TYPES: { id: GoalType; emoji: string; title: string; desc: string }[] = [
  { id: "machine", emoji: "🏭", title: "Beli Mesin / Peralatan", desc: "Mesin baru untuk naikkan produksi" },
  { id: "production", emoji: "📦", title: "Tambah Kuantiti Pengeluaran", desc: "Tingkatkan output harian" },
  { id: "premise", emoji: "🏠", title: "Premis / Gerai Baru", desc: "Buka cawangan atau gerai" },
  { id: "cert", emoji: "📜", title: "Sijil & Lesen", desc: "HALAL, MESTI, dan lain-lain" },
];

const GOAL_TIPS: Record<GoalType, string[]> = {
  machine: [
    "Boss boleh cuba jimat lebih RM 50/bulan dengan kurangkan pembaziran bahan mentah.",
    "Pertimbangkan memohon pembiayaan TEKUN atau MARA — mereka ada skim khas untuk peralatan perniagaan F&B.",
    "Mesin baru bermakna Boss boleh ambil pesanan katering — sumber pendapatan baru!",
  ],
  production: [
    "Boss boleh tambah shift petang untuk maksimumkan penggunaan mesin sedia ada.",
    "Beli bahan mentah secara pukal — biasanya jimat 10-15% kos.",
    "Cuba jual ke kedai runcit berdekatan — pesanan tetap setiap minggu.",
  ],
  premise: [
    "Pilih lokasi dekat sekolah atau pejabat — trafik pelanggan lebih konsisten.",
    "Mohon geran SME Corp untuk bantuan sewa premis tahun pertama.",
    "Mula dengan kios kecil dulu sebelum buka kedai penuh — kurangkan risiko.",
  ],
  cert: [
    "Sijil HALAL JAKIM buka peluang masuk pasaraya besar dan eksport.",
    "MESTI percuma untuk SME — daftar di portal MOH dalam 2 minggu.",
    "Pelanggan korporat selalu minta sijil — naikkan harga 15-20% selepas dapat.",
  ],
};

const addressBoss = (businessName: string) => businessName?.trim() ? businessName.trim() : "Boss";

export function GoalsPlanner({
  onClose,
  businessName,
}: {
  onClose: () => void;
  businessName: string;
}) {
  const boss = addressBoss(businessName);
  const [goalType, setGoalType] = useState<GoalType | null>("machine");
  const [goalName, setGoalName] = useState("Beli mesin penguli roti");
  const [targetCost, setTargetCost] = useState(4800);
  const [targetDate, setTargetDate] = useState("");
  const [benefit, setBenefit] = useState("Boleh hasilkan 2x lebih banyak roti sehari");
  const [saved, setSaved] = useState(1200);
  const [monthlySave, setMonthlySave] = useState(400);
  const [chosenScenario, setChosenScenario] = useState<number>(400);

  // ROI inputs
  const [prodBefore, setProdBefore] = useState(80);
  const [prodAfter, setProdAfter] = useState(160);
  const [unitPrice, setUnitPrice] = useState(5);
  const [marginPct, setMarginPct] = useState(35);

  const remaining = Math.max(targetCost - saved, 0);
  const progressPct = targetCost > 0 ? Math.min((saved / targetCost) * 100, 100) : 0;

  const scenarios = useMemo(() => {
    const base = monthlySave > 0 ? monthlySave : 400;
    return [
      { amt: base, months: Math.ceil(remaining / base) },
      { amt: Math.round(base * 1.5), months: Math.ceil(remaining / (base * 1.5)) },
      { amt: base * 2, months: Math.ceil(remaining / (base * 2)) },
    ];
  }, [monthlySave, remaining]);

  const chosenMonths = useMemo(() => {
    const amt = chosenScenario > 0 ? chosenScenario : monthlySave;
    return amt > 0 ? Math.ceil(remaining / amt) : 0;
  }, [chosenScenario, monthlySave, remaining]);

  const milestones = useMemo(() => {
    const amt = chosenScenario > 0 ? chosenScenario : monthlySave;
    if (amt <= 0) return [];
    const months = Math.min(chosenMonths, 24);
    const arr = [];
    let total = saved;
    for (let m = 1; m <= months; m++) {
      total = Math.min(total + amt, targetCost);
      arr.push({ month: m, save: amt, total });
    }
    return arr;
  }, [chosenScenario, monthlySave, chosenMonths, saved, targetCost]);

  // ROI
  const extraUnits = Math.max(prodAfter - prodBefore, 0);
  const extraRevenuePerDay = extraUnits * unitPrice * (marginPct / 100);
  const extraRevenuePerMonth = extraRevenuePerDay * 30;
  const paybackDays = extraRevenuePerDay > 0 ? Math.ceil(targetCost / extraRevenuePerDay) : 0;

  const tips = goalType ? GOAL_TIPS[goalType] : [];

  const handleSave = () => {
    if (!goalType) {
      toast.error("Boss, pilih jenis matlamat dulu 😊");
      return;
    }
    if (!goalName.trim()) {
      toast.error("Boss, isi nama matlamat dulu ya");
      return;
    }
    toast.success(`${boss}, matlamat "${goalName}" dah disimpan! 💪`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 bg-background overflow-y-auto animate-fade-in">
      <div className="mx-auto w-full max-w-full sm:max-w-[600px] md:max-w-[760px] lg:max-w-[960px] xl:max-w-[1140px] 2xl:max-w-[1280px] min-h-screen bg-background pb-32">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={onClose} className="w-10 h-10 grid place-items-center rounded-full hover:bg-muted tap" aria-label="Tutup">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-extrabold leading-tight">Impian Bisnes {boss}</h1>
            <p className="text-xs text-muted-foreground">Tetapkan matlamat — AI bina pelan untuk {boss}</p>
          </div>
        </header>

        <div className="px-4 py-5 space-y-6">
          {/* Step 1 */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">1. Pilih Jenis Matlamat</h2>
            <div className="grid grid-cols-1 gap-2">
              {GOAL_TYPES.map((g) => {
                const active = goalType === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => setGoalType(g.id)}
                    className={`w-full text-left rounded-2xl p-4 border-2 tap flex items-center gap-3 transition-all duration-150 ${
                      active ? "border-transparent bg-gradient-profit text-profit-foreground shadow-card" : "border-border bg-surface hover:border-primary/40"
                    }`}
                  >
                    <div className="text-3xl">{g.emoji}</div>
                    <div className="flex-1">
                      <p className="font-extrabold">{g.title}</p>
                      <p className={`text-xs mt-0.5 ${active ? "text-profit-foreground/80" : "text-muted-foreground"}`}>{g.desc}</p>
                    </div>
                    {active && <CheckCircle2 className="w-5 h-5 text-profit-foreground" />}
                  </button>
                );
              })}
            </div>
          </section>

          {goalType && (
            <>
              {/* Step 2 */}
              <section className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">2. Butiran Matlamat</h2>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Nama matlamat</Label>
                    <Input
                      value={goalName}
                      onChange={(e) => setGoalName(e.target.value)}
                      placeholder="Contoh: Beli mesin penguli roti"
                      className="h-12 rounded-xl mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Kos yang diperlukan (RM)</Label>
                    <Input
                      type="number" inputMode="decimal"
                      value={targetCost}
                      onChange={(e) => setTargetCost(Number(e.target.value))}
                      className="h-12 rounded-xl mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Tarikh sasaran (pilihan)</Label>
                    <Input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="h-12 rounded-xl mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Faedah dijangka</Label>
                    <Input
                      value={benefit}
                      onChange={(e) => setBenefit(e.target.value)}
                      placeholder="Contoh: Boleh hasilkan 2x lebih banyak roti sehari"
                      className="h-12 rounded-xl mt-1"
                    />
                  </div>
                </div>
              </section>

              {/* Step 3 */}
              <section className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">3. Simpanan {boss}</h2>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Dah tersimpan (RM)</Label>
                    <Input
                      type="number" inputMode="decimal"
                      value={saved}
                      onChange={(e) => setSaved(Number(e.target.value))}
                      className="h-12 rounded-xl mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Boleh jimat/bulan (RM)</Label>
                    <Input
                      type="number" inputMode="decimal"
                      value={monthlySave}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setMonthlySave(v);
                        setChosenScenario(v);
                      }}
                      className="h-12 rounded-xl mt-1"
                    />
                  </div>
                </div>
              </section>

              {/* AI Plan */}
              <section className="rounded-2xl p-5 bg-gradient-profit text-profit-foreground shadow-glow space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-90">
                  <Target className="w-4 h-4" /> Pelan AI — {goalName || "Matlamat Boss"}
                </div>
                <div className="space-y-1.5 text-sm">
                  <Row label="Sasaran" value={fmt(targetCost)} />
                  <Row label="Dah Tersimpan" value={fmt(saved)} />
                  <Row label="Baki Diperlukan" value={fmt(remaining)} />
                </div>
                <div className="border-t border-white/20 pt-3 space-y-2">
                  <p className="text-xs opacity-90 font-semibold">Pilih kadar simpanan {boss}:</p>
                  {scenarios.map((s) => {
                    const active = chosenScenario === s.amt;
                    return (
                      <button
                        key={s.amt}
                        onClick={() => setChosenScenario(s.amt)}
                        className={`w-full text-left rounded-xl px-4 py-3 tap transition-all border-2 ${
                          active ? "bg-white/25 border-white/60" : "bg-white/10 border-transparent"
                        }`}
                      >
                        <p className="text-sm font-bold">Simpan {fmt(s.amt)}/bulan</p>
                        <p className="text-xs opacity-90 mt-0.5">
                          {boss} boleh capai dalam <span className="font-bold">{s.months} bulan</span>
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* ROI */}
              <section className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Adakah Ia Berbaloi?</h2>
                <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Pengeluaran sekarang/hari</Label>
                      <Input type="number" inputMode="numeric" value={prodBefore} onChange={(e) => setProdBefore(Number(e.target.value))} className="h-11 rounded-xl mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Selepas beli (unit/hari)</Label>
                      <Input type="number" inputMode="numeric" value={prodAfter} onChange={(e) => setProdAfter(Number(e.target.value))} className="h-11 rounded-xl mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Harga jual/unit (RM)</Label>
                      <Input type="number" inputMode="decimal" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} className="h-11 rounded-xl mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Margin keuntungan (%)</Label>
                      <Input type="number" inputMode="numeric" value={marginPct} onChange={(e) => setMarginPct(Number(e.target.value))} className="h-11 rounded-xl mt-1" />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl p-5 bg-primary/10 border border-primary/30 space-y-2">
                  <div className="flex items-center gap-2 text-primary font-bold">
                    <TrendingUp className="w-5 h-5" /> Pulangan Pelaburan (ROI)
                  </div>
                  <Row label="Pendapatan tambahan sehari" value={fmt(extraRevenuePerDay)} dark />
                  <Row label="Pendapatan tambahan sebulan" value={fmt(extraRevenuePerMonth)} dark />
                  {paybackDays > 0 ? (
                    <p className="text-sm leading-relaxed pt-2">
                      Mesin {fmt(targetCost)} akan bayar balik dirinya dalam{" "}
                      <span className="font-extrabold text-primary">{paybackDays} hari</span> operasi sahaja! 🎉
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground pt-2">Isi pengeluaran selepas beli mesin untuk lihat ROI.</p>
                  )}
                  {extraRevenuePerMonth > 0 && (
                    <p className="text-xs text-muted-foreground italic">
                      Selepas break-even, {boss} akan untung tambahan {fmt(extraRevenuePerMonth)}/bulan.
                    </p>
                  )}
                </div>
              </section>

              {/* Progress */}
              <section className="rounded-2xl p-5 bg-card border border-border shadow-sm space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Mula</span>
                  <span className="text-muted-foreground">Matlamat</span>
                </div>
                <div className="h-4 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-profit transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-sm font-bold">
                  {fmt(saved)} / {fmt(targetCost)} <span className="text-muted-foreground font-normal">({progressPct.toFixed(0)}%)</span>
                </p>
                {chosenMonths > 0 && remaining > 0 && (
                  <p className="text-sm text-foreground">
                    {boss} tinggal <span className="font-extrabold text-primary">{chosenMonths} bulan</span> lagi! Teruskan semangat 💪
                  </p>
                )}
                {remaining === 0 && (
                  <p className="text-sm font-bold text-primary">🎉 {boss} dah capai matlamat!</p>
                )}
              </section>

              {/* Milestones */}
              {milestones.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Pencapaian Bulanan</h2>
                  <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
                    {milestones.map((m, idx) => {
                      const isLast = m.total >= targetCost;
                      const isCurrent = idx === 0;
                      return (
                        <div key={m.month} className="flex items-center gap-3">
                          <div className="relative">
                            {isLast ? (
                              <div className="w-7 h-7 rounded-full bg-primary grid place-items-center">
                                <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                              </div>
                            ) : isCurrent ? (
                              <div className="w-7 h-7 rounded-full bg-primary grid place-items-center animate-pulse-ring">
                                <Circle className="w-3 h-3 text-primary-foreground fill-current" />
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-full border-2 border-muted bg-background" />
                            )}
                            {idx < milestones.length - 1 && (
                              <div className="absolute left-1/2 -translate-x-1/2 top-7 w-0.5 h-6 bg-muted" />
                            )}
                          </div>
                          <div className="flex-1 pb-3">
                            <p className="text-sm font-semibold">
                              {isLast ? `🎉 Bulan ${m.month}: Matlamat Dicapai!` : `Bulan ${m.month}: Jimat ${fmt(m.save)}`}
                            </p>
                            <p className="text-xs text-muted-foreground">Jumlah: {fmt(m.total)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Tips */}
              <section className="space-y-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" /> Tips Pintar AI
                </h2>
                {tips.map((t, i) => (
                  <div key={i} className="rounded-2xl p-4 bg-warn-soft border border-warn/30">
                    <p className="text-sm leading-relaxed">{t}</p>
                  </div>
                ))}
              </section>

              <Button onClick={handleSave} className="w-full h-14 rounded-2xl text-base font-bold bg-gradient-profit text-profit-foreground shadow-fab">
                <Save className="w-5 h-5 mr-2" /> Simpan Matlamat Ini
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const Row = ({ label, value, dark }: { label: string; value: string; dark?: boolean }) => (
  <div className="flex items-center justify-between text-sm">
    <span className={dark ? "text-muted-foreground" : "opacity-90"}>{label}</span>
    <span className="font-bold">{value}</span>
  </div>
);