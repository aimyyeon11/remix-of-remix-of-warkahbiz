import { useState, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  Home, Package, BarChart3, Plus, Sparkles, TrendingUp, MessageCircle,
  Calculator, Target, LineChart, Trash2, FileText, User,
} from "lucide-react";
import AppHeader from "@/components/AppHeader.jsx";
import SettingsPanel from "@/components/SettingsPanel.jsx";
import { BuyView } from "@/features/inventory/BuyView";
import { StockView } from "@/features/inventory/StockView";
import { LogView } from "@/features/money/LogView";
import { QuickInputModal } from "@/features/money/QuickInputModal";
import { ExportSheet } from "@/features/money/ExportSheet";
import { ChatView } from "@/features/ai/ChatView";
import type { BusinessSnapshot } from "@/features/ai/buildSystemPrompt";
import { PricingCalculator } from "@/features/pricing/PricingCalculator";
import { GoalsPlanner } from "@/features/goals/GoalsPlanner";
import { SalesForecast } from "@/features/forecast/SalesForecast";
import { WasteTracker } from "@/features/waste/WasteTracker";
import { AutopsyReport } from "@/features/autopsy/AutopsyReport";
import { NotificationCenter, getActiveOpportunityCount } from "@/features/notifications/NotificationCenter";
import { ProfileView } from "@/features/profile/ProfileView";
import { fmt } from "@/lib/format";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type {
  Tab, Txn, BuyItem, StockItem, ChatMsg, PettyEntry, ReceiptItem, Unit, OpExEntry, OpExCategory, Product, SavedCard, BusinessHoursSettings, OutletSettings,
} from "@/types";
import { DEFAULT_OUTLET } from "@/types";
import { DEFAULT_BUSINESS_HOURS } from "@/features/profile/BusinessHoursView";
import { OPEX_CATEGORIES, OPEX_EMOJI } from "@/types";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Selamat Pagi";
  if (h < 15) return "Selamat Tengah Hari";
  if (h < 19) return "Selamat Petang";
  return "Selamat Malam";
};

const Index = () => {
  const language = "ms";
  const [tab, setTab] = useState<Tab>("today");
  const [modalOpen, setModalOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [forecastOpen, setForecastOpen] = useState(false);
  const [wasteOpen, setWasteOpen] = useState(false);
  const [autopsyOpen, setAutopsyOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const [profileName, setProfileName] = useState(() => localStorage.getItem("warkahbiz_profile_name") || "");
  const [businessName, setBusinessName] = useState(() => localStorage.getItem("warkahbiz_business_name") || "");

  const [txns, setTxns] = useLocalStorage<Txn[]>("warkahbiz_txns", []);
  const [stock, setStock] = useLocalStorage<StockItem[]>("warkahbiz_stock", []);
  const [buy, setBuy] = useLocalStorage<BuyItem[]>("warkahbiz_buy", []);
  const [petty, setPetty] = useLocalStorage<PettyEntry[]>("warkahbiz_petty", [
    { id: 1, type: "in", desc: "Top-up dari jualan", emoji: "💵", amount: 200, time: "Isnin 9:00am", balance: 200 },
    { id: 2, type: "out", desc: "Beli plastik beg", emoji: "🛍️", amount: 15, time: "Isnin 11:30am", balance: 185 },
  ]);
  const [opex, setOpex] = useLocalStorage<OpExEntry[]>("warkahbiz_opex", []);
  const [products, setProducts] = useLocalStorage<Product[]>("warkahbiz_products", []);
  const [cards, setCards] = useLocalStorage<SavedCard[]>("warkahbiz_cards", []);
  const [businessHours, setBusinessHours] = useLocalStorage<BusinessHoursSettings>("warkahbiz_business_hours", DEFAULT_BUSINESS_HOURS);
  const [outlet, setOutlet] = useLocalStorage<OutletSettings>("warkahbiz_outlet", DEFAULT_OUTLET);
  const [dismissedAuto, setDismissedAuto] = useState<Set<string>>(new Set());
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    setChat((prev) => {
      const welcome = { id: 1, from: "bot" as const, text: "Hai Boss! Tanya saya apa-apa pasal untung, stok, atau harga. 😊" };
      if (prev.length === 0) return [welcome];
      return prev;
    });
  }, [language]);

  const today = useMemo(() => {
    const incoming = txns.filter((x) => x.type === "in").reduce((s, x) => s + x.amount, 0);
    const outgoing = txns.filter((x) => x.type === "out").reduce((s, x) => s + x.amount, 0);
    return { in: incoming, out: outgoing, profit: incoming - outgoing };
  }, [txns]);

  const week = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = txns.filter((x) => x.ts >= cutoff);
    const i = recent.filter((x) => x.type === "in").reduce((s, x) => s + x.amount, 0);
    const o = recent.filter((x) => x.type === "out").reduce((s, x) => s + x.amount, 0);
    return { in: i, out: o, profit: i - o };
  }, [txns]);

  const lastWeek = useMemo(() => {
    const now = Date.now();
    const start = now - 14 * 24 * 60 * 60 * 1000;
    const end = now - 7 * 24 * 60 * 60 * 1000;
    const recent = txns.filter((x) => x.ts >= start && x.ts < end);
    const i = recent.filter((x) => x.type === "in").reduce((s, x) => s + x.amount, 0);
    const o = recent.filter((x) => x.type === "out").reduce((s, x) => s + x.amount, 0);
    return { in: i, out: o, profit: i - o };
  }, [txns]);

  const month = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = txns.filter((x) => x.ts >= cutoff);
    const i = recent.filter((x) => x.type === "in").reduce((s, x) => s + x.amount, 0);
    const o = recent.filter((x) => x.type === "out").reduce((s, x) => s + x.amount, 0);
    return { in: i, out: o, profit: i - o };
  }, [txns]);

  const todayCogs = useMemo(() => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const cutoff = todayStart.getTime();
    const fromTxns = txns.filter((x) => x.type === "out" && x.label.startsWith("Beli ") && x.ts >= cutoff).reduce((s, x) => s + x.amount, 0);
    const fromOpex = opex.filter((e) => e.category === "Kos Bahan" && e.ts >= cutoff).reduce((s, e) => s + e.amount, 0);
    return fromTxns + fromOpex;
  }, [txns, opex]);

  const todayOtherOpex = useMemo(() => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const cutoff = todayStart.getTime();
    return opex.filter((e) => e.category !== "Kos Bahan" && e.ts >= cutoff).reduce((s, e) => s + e.amount, 0);
  }, [opex]);

  const todayNetProfit = useMemo(() => today.in - todayCogs - todayOtherOpex, [today.in, todayCogs, todayOtherOpex]);

  const nowTime = () =>
    new Date().toLocaleTimeString("en-MY", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase().replace(" ", "");

  const handleSaveTxn = (t: Omit<Txn, "id" | "ts" | "time">) => {
    setTxns((prev) => [...prev, { ...t, id: Date.now(), ts: Date.now(), time: nowTime(), createdAt: new Date().toISOString() }]);
  };

  // Track the highest qty ever recorded for each stock item (used to auto-derive minQty)
  const bumpPeak = (item: StockItem): StockItem => {
    const peak = Math.max(item.maxQty ?? 0, item.qty);
    const minQty = +(peak * 0.2).toFixed(2);
    return { ...item, maxQty: peak, minQty };
  };

  const handleReceiptConfirm = (items: ReceiptItem[]) => {
    const time = nowTime();
    const newTxns: Txn[] = items.map((r, i) => ({ id: Date.now() + i, ts: Date.now() + i, time, createdAt: new Date().toISOString(), type: "out", emoji: r.emoji, label: `Beli ${r.name}`, amount: r.price }));
    setTxns((prev) => [...prev, ...newTxns]);
    toast.success(`${items.length} item berjaya disimpan! 🎉`);
  };

  const handleBought = (id: string) => setBuy((prev) => prev.map((b) => b.id === id ? { ...b, done: !b.done } : b));

  const handleAdjustStock = (id: string, delta: number) => {
    setStock((prev) => prev.map((s) => {
      if (s.id !== id) return s;
      const qty = Math.max(0, +(s.qty + delta).toFixed(2));
      return bumpPeak({ ...s, qty });
    }));
  };

  const handleSaveStock = (item: StockItem) => {
    setStock((prev) => {
      const next = bumpPeak(item);
      const exists = prev.find((s) => s.id === item.id);
      return exists ? prev.map((s) => s.id === item.id ? next : s) : [...prev, next];
    });
    toast.success("Stok disimpan ✅");
  };

  const handleDeleteStock = (id: string) => { setStock((prev) => prev.filter((s) => s.id !== id)); toast.success("Item dipadam"); };

  useEffect(() => {
    setBuy((prevBuy) => {
      let nextBuy = [...prevBuy];
      stock.forEach((s) => {
        if (s.qty > s.restockQty) return;
        const autoId = `auto-${s.id}`;
        if (dismissedAuto.has(autoId)) return;
        if (nextBuy.some((b) => b.id === autoId)) return;
        if (nextBuy.some((b) => b.name.toLowerCase() === s.name.toLowerCase() && b.source !== "auto")) return;
        const need = Math.max(s.restockQty - s.qty, s.restockQty);
        nextBuy.push({ id: autoId, emoji: s.emoji, name: s.name, cost: 0, currentQty: s.qty, recQty: +need.toFixed(1), unit: s.unit, daysCover: 0, reason: s.qty <= s.minQty ? "Habis!" : "Hampir habis", done: false, source: "auto" });
      });
      nextBuy = nextBuy.filter((b) => {
        if (b.source !== "auto") return true;
        const s = stock.find((x) => x.id === b.id.replace(/^auto-/, ""));
        return !s || s.qty <= s.restockQty || b.done;
      });
      return nextBuy;
    });
  }, [stock, dismissedAuto]);

  const handleResync = () => { setDismissedAuto(new Set()); toast.success("Senarai dikemaskini dari Stok"); };

  const handleAddBuy = (d: { emoji: string; name: string; recQty: number; unit: Unit; note?: string }) => {
    setBuy((prev) => [...prev, { id: `m-${Date.now()}`, emoji: d.emoji || "🛒", name: d.name, cost: 0, currentQty: 0, recQty: d.recQty, unit: d.unit, daysCover: 0, reason: "", done: false, source: "manual", note: d.note }]);
  };

  const handleDeleteBuy = (id: string) => {
    setBuy((prev) => prev.filter((b) => b.id !== id));
    if (id.startsWith("auto-")) setDismissedAuto((prev) => new Set(prev).add(id));
  };

  const handleBulkDone = (ids: string[]) => setBuy((prev) => prev.map((b) => ids.includes(b.id) ? { ...b, done: true } : b));

  const handleBulkDelete = (ids: string[]) => {
    setBuy((prev) => prev.filter((b) => !ids.includes(b.id)));
    setDismissedAuto((prev) => { const next = new Set(prev); ids.filter((id) => id.startsWith("auto-")).forEach((id) => next.add(id)); return next; });
  };

  const handleClearCompleted = () => {
    setBuy((prev) => {
      const autoIds = prev.filter((b) => b.done && b.id.startsWith("auto-")).map((b) => b.id);
      if (autoIds.length) setDismissedAuto((d) => { const next = new Set(d); autoIds.forEach((id) => next.add(id)); return next; });
      return prev.filter((b) => !b.done);
    });
  };

  const handleAddPetty = (type: "in" | "out", amount: number, desc: string, emoji: string) => {
    setPetty((prev) => {
      const last = prev[prev.length - 1]?.balance ?? 0;
      const balance = +(type === "in" ? last + amount : last - amount).toFixed(2);
      return [...prev, { id: Date.now(), type, desc, emoji, amount, time: nowTime(), balance }];
    });
  };

  const handleAddOpEx = (category: OpExCategory, amount: number, desc: string, paidFromPetty: boolean) => {
    const now = new Date();
    const entry: OpExEntry = { id: Date.now(), category, desc, amount, paidFromPetty, ts: Date.now(), createdAt: now.toISOString(), time: now.toLocaleTimeString("en-MY", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase().replace(" ", "") };
    setOpex((prev) => [...prev, entry]);
    if (paidFromPetty) {
      setPetty((prev) => { const last = prev[prev.length - 1]?.balance ?? 0; return [...prev, { id: Date.now() + 1, type: "out" as const, desc: `[OpEx] ${category}: ${desc}`, emoji: "💸", amount, time: entry.time, balance: +(last - amount).toFixed(2) }]; });
    }
  };

  const handleSendChat = async (text: string, snapshot: BusinessSnapshot) => {
    const userMsg: ChatMsg = { id: Date.now(), from: "user", text };
    setChat((prev) => [...prev, userMsg]);
    setChatLoading(true);
    try {
      const { sendToClaudeAPI } = await import("@/features/ai/claudeChat");
      const reply = await sendToClaudeAPI(text, [...chat, userMsg], snapshot);
      setChat((prev) => [...prev, { id: Date.now(), from: "bot", text: reply }]);
    } catch {
      setChat((prev) => [...prev, { id: Date.now(), from: "bot", text: "Maaf Boss, ada masalah sambungan. Cuba lagi sebentar. 🙏" }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSaveProduct = (p: Product) => {
    const isFirstEver = products.length === 0;
    setProducts((prev) => {
      const exists = prev.find((x) => x.id === p.id);
      return exists ? prev.map((x) => x.id === p.id ? p : x) : [...prev, p];
    });
    if (isFirstEver) {
      // Wipe stock, buy list, and purchase history
      setStock([]);
      setBuy([]);
      setDismissedAuto(new Set());
      setTxns((prev) => prev.filter((t) => !(t.type === "out" && t.label.startsWith("Beli "))));
      toast.success("Profil produk disimpan. Data lama telah dipadamkan.");
    }
    // Seed stock entries from product ingredients (only those not yet tracked)
    setStock((prev) => {
      const next = [...prev];
      (p.ingredients ?? []).forEach((ing) => {
        const name = ing.name.trim();
        if (!name) return;
        const exists = next.find((s) => s.name.toLowerCase() === name.toLowerCase());
        if (exists) return;
        next.push({
          id: `s-${ing.id}`,
          emoji: "📦",
          name,
          qty: 0,
          unit: ing.unit,
          minQty: 0,
          restockQty: Math.max(ing.quantity, 1),
          maxQty: 0,
          category: "Bahan Mentah",
        });
      });
      return next;
    });
  };

  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSaveCard = (c: SavedCard) => {
    setCards((prev) => {
      const exists = prev.find((x) => x.id === c.id);
      return exists ? prev.map((x) => x.id === c.id ? c : x) : [...prev, c];
    });
  };

  const handleDeleteCard = (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSetPrimaryCard = (id: string) => {
    setCards((prev) => prev.map((c) => ({ ...c, isPrimary: c.id === id })));
  };

  const handleBoughtItems = (items: Array<{ name: string; qty: number; unit: string; isOpEx?: boolean }>) => {
    const isMatch = (a: string, b: string) => { const x = a.toLowerCase().trim(); const y = b.toLowerCase().trim(); return x === y || x.includes(y) || y.includes(x); };
    items.forEach((item) => {
      setStock(prev => { const idx = prev.findIndex(s => isMatch(s.name, item.name)); if (idx === -1) return prev; const updated = [...prev]; const merged = { ...updated[idx], qty: +(updated[idx].qty + item.qty).toFixed(2) }; updated[idx] = bumpPeak(merged); return updated; });
      setBuy(prev => prev.map(b => isMatch(b.name, item.name) && !b.done ? { ...b, done: true } : b));
    });
    toast.success(`${items.length} item dikemaskini dalam Stok & Senarai ✅`);
  };

  const handleSyncNotepad = (items: BuyItem[]) => setBuy(items);

  const saveProfile = (name: string, biz: string) => {
    setProfileName(name); setBusinessName(biz);
    localStorage.setItem("warkahbiz_profile_name", name);
    localStorage.setItem("warkahbiz_business_name", biz);
    setSettingsOpen(false);
    toast.success("Profil disimpan ✅");
  };

  const urgentCount = buy.filter((b) => !b.done).length;
  const notifCount = getActiveOpportunityCount();

  return (
    <div className="bg-gradient-shell min-h-screen text-foreground">
      <div className="mx-auto w-full max-w-[440px] min-h-screen relative bg-background shadow-card overflow-hidden flex flex-col">
        <AppHeader
          businessName={businessName || profileName}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenNotifications={() => setNotifOpen(true)}
          notificationCount={notifCount}
          showNotificationDot={urgentCount > 0 || notifCount > 0}
        />

        <div className="flex-1 overflow-y-auto pb-32 pt-0">
          {tab === "today" && (
            <TodayView
              today={today} week={week} lastWeek={lastWeek}
              profileName={profileName} businessName={businessName}
              todayCogs={todayCogs} todayOtherOpex={todayOtherOpex} todayNetProfit={todayNetProfit}
              onOpenCalc={() => setCalcOpen(true)}
              onOpenGoals={() => setGoalsOpen(true)}
              onOpenForecast={() => setForecastOpen(true)}
              onOpenWaste={() => setWasteOpen(true)}
              onOpenAutopsy={() => setAutopsyOpen(true)}
            />
          )}
          {tab === "bekalan" && (
            <div className="pb-32">
              <div className="px-5 pt-6 pb-2">
                <h2 className="text-xl font-extrabold tracking-tight">Nak Beli 🛒</h2>
                <p className="text-xs text-muted-foreground mt-0.5">AI cadangkan stok rendah secara automatik</p>
              </div>
              <BuyView buy={buy} stock={stock} onToggleDone={handleBought} onResync={handleResync} onBulkDone={handleBulkDone} onBulkDelete={handleBulkDelete} onClearCompleted={handleClearCompleted} onSyncNotepad={handleSyncNotepad} onGoToStock={() => {}} />
              <div className="mx-5 my-4 border-t border-border" />
              <div className="px-5 pb-2">
                <h2 className="text-xl font-extrabold tracking-tight">Stok 📦</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Dikemaskini automatik bila dah belanja</p>
              </div>
              <StockView stock={stock} onAdjust={handleAdjustStock} onSave={handleSaveStock} onDelete={handleDeleteStock} onGoToBuy={() => {}} />
            </div>
          )}
          {tab === "log" && (
            <LogView txns={txns} today={today} week={week} month={month} petty={petty} opex={opex} todayCogs={todayCogs} todayOtherOpex={todayOtherOpex} todayNetProfit={todayNetProfit} onExport={() => setExportOpen(true)} onAddPetty={handleAddPetty} onAddOpEx={handleAddOpEx} />
          )}
          {tab === "ai" && (
            <ChatView messages={chat} onSend={handleSendChat} isLoading={chatLoading} txns={txns} stock={stock} opex={opex} petty={petty} businessName={businessName || profileName || "WarkahBiz"} />
          )}
          {tab === "profile" && (
            <ProfileView
              stock={stock}
              profileName={profileName}
              businessName={businessName}
              onSaveProfile={saveProfile}
              onAdjustStock={handleAdjustStock}
              onSaveStock={handleSaveStock}
              onDeleteStock={handleDeleteStock}
              onGoToBuy={() => setTab("bekalan")}
              products={products}
              onSaveProduct={handleSaveProduct}
              onDeleteProduct={handleDeleteProduct}
              cards={cards}
              onSaveCard={handleSaveCard}
              onDeleteCard={handleDeleteCard}
              onSetPrimaryCard={handleSetPrimaryCard}
              businessHours={businessHours}
              onSaveBusinessHours={setBusinessHours}
              outlet={outlet}
              onSaveOutlet={setOutlet}
            />
          )}
        </div>

        <button onClick={() => setModalOpen(true)} className={`fixed left-1/2 -translate-x-1/2 bottom-24 z-30 w-16 h-16 rounded-full bg-gradient-profit text-profit-foreground grid place-items-center shadow-fab tap ${urgentCount > 0 ? "animate-pulse-ring" : ""}`}>
          <Plus className="w-8 h-8" strokeWidth={3} />
        </button>

        <nav className="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-[440px] z-20 bg-surface/90 backdrop-blur-xl border-t border-border">
          <div className="grid grid-cols-5 pt-2 pb-6 px-1">
            <TabBtn icon={<Home />} label="Hari Ini" active={tab === "today"} onClick={() => setTab("today")} />
            <TabBtn icon={<Package />} label="Bekalan" active={tab === "bekalan"} onClick={() => setTab("bekalan")} badge={urgentCount || undefined} />
            <TabBtn icon={<BarChart3 />} label="Rekod" active={tab === "log"} onClick={() => setTab("log")} />
            <TabBtn icon={<MessageCircle />} label="Tanya AI" active={tab === "ai"} onClick={() => setTab("ai")} />
            <TabBtn icon={<User />} label="Profil" active={tab === "profile"} onClick={() => setTab("profile")} />
          </div>
        </nav>

        {modalOpen && <QuickInputModal onClose={() => setModalOpen(false)} onSave={(t) => { handleSaveTxn(t); setModalOpen(false); }} onReceiptConfirm={(items) => { handleReceiptConfirm(items); setModalOpen(false); }} onBoughtItems={handleBoughtItems} />}
        {exportOpen && <ExportSheet onClose={() => setExportOpen(false)} />}
        {settingsOpen && <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} profileName={profileName || "Boss"} businessName={businessName || "WarkahBiz"} onSaveProfile={saveProfile} onLogout={() => {}} />}
        {calcOpen && <PricingCalculator onClose={() => setCalcOpen(false)} businessName={businessName || profileName} onSave={() => setCalcOpen(false)} />}
        {goalsOpen && <GoalsPlanner onClose={() => setGoalsOpen(false)} businessName={businessName || profileName} />}
        {forecastOpen && <SalesForecast onClose={() => setForecastOpen(false)} businessName={businessName || profileName} onSendToBuy={(items) => items.forEach(handleAddBuy)} />}
        {wasteOpen && <WasteTracker onClose={() => setWasteOpen(false)} businessName={businessName || profileName} onSendToBuy={(items) => items.forEach(handleAddBuy)} />}
        {autopsyOpen && <AutopsyReport onClose={() => setAutopsyOpen(false)} businessName={businessName || profileName} />}
        {notifOpen && <NotificationCenter onClose={() => setNotifOpen(false)} />}
      </div>
    </div>
  );
};

const TabBtn = ({ icon, label, active, onClick, badge }: { icon: ReactNode; label: string; active: boolean; onClick: () => void; badge?: number }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1 py-1 tap relative">
    <div className={`w-12 h-9 grid place-items-center rounded-2xl transition-all ${active ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>
      <div className="w-5 h-5">{icon}</div>
    </div>
    <span className={`text-[11px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
    {badge ? <span className="absolute top-0 right-3 min-w-5 h-5 px-1 grid place-items-center text-[10px] font-bold bg-cost text-cost-foreground rounded-full animate-pop-in">{badge}</span> : null}
  </button>
);

const TodayView = ({
  today, week, lastWeek, profileName, businessName,
  todayCogs, todayOtherOpex, todayNetProfit,
  onOpenCalc, onOpenGoals, onOpenForecast, onOpenWaste, onOpenAutopsy,
}: {
  today: { in: number; out: number; profit: number };
  week: { in: number; out: number; profit: number };
  lastWeek: { profit: number };
  profileName: string; businessName: string;
  todayCogs: number; todayOtherOpex: number; todayNetProfit: number;
  onOpenCalc: () => void; onOpenGoals: () => void; onOpenForecast: () => void;
  onOpenWaste: () => void; onOpenAutopsy: () => void;
}) => {
  const [insight, setInsight] = useState<string | null>(null);
  return (
    <div className="px-5 pt-6 space-y-5">
      <header className="animate-fade-in">
        <p className="text-muted-foreground text-sm font-medium">{greeting()}, {profileName || "Boss"}! 👋</p>
        <h1 className="text-2xl font-extrabold tracking-tight mt-1">{businessName || "WarkahBiz"}</h1>
      </header>

      <div className="rounded-[2rem] p-6 bg-gradient-profit text-profit-foreground shadow-glow relative overflow-hidden animate-pop-in">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-black/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider opacity-90">
            <Sparkles className="w-4 h-4" /> Untung Bersih Hari Ini 💚
          </div>
          <div className="text-5xl font-extrabold mt-3 tracking-tight">{fmt(todayNetProfit)}</div>
          <div className="mt-4 space-y-1 text-sm opacity-95">
            <div className="flex items-center justify-between"><span>Jualan Kasar</span><span className="font-bold">+{fmt(today.in)}</span></div>
            <div className="flex items-center justify-between"><span>Kos Bahan (COGS)</span><span className="font-bold">−{fmt(todayCogs)}</span></div>
            <div className="flex items-center justify-between"><span>Kos Operasi Lain</span><span className="font-bold">−{fmt(todayOtherOpex)}</span></div>
          </div>
          {(() => {
            const diff = week.profit - lastWeek.profit;
            const pct = lastWeek.profit !== 0 ? Math.round((diff / Math.abs(lastWeek.profit)) * 100) : null;
            const isUp = diff >= 0;
            return (
              <div className="mt-4 space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold opacity-90">
                  <TrendingUp className="w-4 h-4" />
                  <span>Minggu Ini: <span className="font-bold">{fmt(week.profit)}</span></span>
                  {pct !== null && <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-extrabold bg-white/20 text-white">{isUp ? "↑" : "↓"} {Math.abs(pct)}%</span>}
                </div>
                <div className="text-xs opacity-75">vs Minggu Lepas: <span className="font-semibold">{fmt(lastWeek.profit)}</span> <span className="font-bold">{isUp ? `(+${fmt(diff)})` : `(${fmt(diff)})`}</span></div>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl p-5 bg-gradient-income text-white shadow-card animate-fade-in">
          <div className="text-xs font-semibold uppercase tracking-wider opacity-90">Duit Masuk 💰</div>
          <div className="text-3xl font-extrabold mt-2">{fmt(today.in)}</div>
          <div className="text-[11px] opacity-80 mt-1">Hari ini</div>
        </div>
        <div className="rounded-3xl p-5 bg-gradient-cost text-white shadow-card animate-fade-in">
          <div className="text-xs font-semibold uppercase tracking-wider opacity-90">Duit Keluar 💸</div>
          <div className="text-3xl font-extrabold mt-2">{fmt(today.out)}</div>
          <div className="text-[11px] opacity-80 mt-1">Hari ini</div>
        </div>
      </div>

      <section className="space-y-3 animate-fade-in">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">Alat AI Boss 🤖</h2>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onOpenCalc} className="rounded-2xl p-4 bg-surface border border-border tap text-left space-y-1 hover:border-primary/40 transition-colors">
            <Calculator className="w-6 h-6 text-primary" />
            <div className="font-bold text-sm">Kira Harga</div>
            <div className="text-xs text-muted-foreground">Kos bahan → margin untung</div>
          </button>
          <button onClick={onOpenGoals} className="rounded-2xl p-4 bg-surface border border-border tap text-left space-y-1 hover:border-primary/40 transition-colors">
            <Target className="w-6 h-6 text-primary" />
            <div className="font-bold text-sm">Sasaran</div>
            <div className="text-xs text-muted-foreground">Set & jejak matlamat</div>
          </button>
          <button onClick={onOpenForecast} className="rounded-2xl p-4 bg-surface border border-border tap text-left space-y-1 hover:border-primary/40 transition-colors">
            <LineChart className="w-6 h-6 text-primary" />
            <div className="font-bold text-sm">Ramalan Jualan</div>
            <div className="text-xs text-muted-foreground">Jangkaan minggu ini</div>
          </button>
          <button onClick={onOpenWaste} className="rounded-2xl p-4 bg-surface border border-border tap text-left space-y-1 hover:border-primary/40 transition-colors">
            <Trash2 className="w-6 h-6 text-primary" />
            <div className="font-bold text-sm">Jejak Pembaziran</div>
            <div className="text-xs text-muted-foreground">Kurangkan kerugian</div>
          </button>
        </div>
        <button onClick={onOpenAutopsy} className="w-full rounded-2xl p-4 bg-surface border border-border tap text-left flex items-center gap-3 hover:border-primary/40 transition-colors">
          <FileText className="w-6 h-6 text-primary shrink-0" />
          <div>
            <div className="font-bold text-sm">Laporan Autopsy</div>
            <div className="text-xs text-muted-foreground">Analisis ramalan vs sebenar</div>
          </div>
        </button>
      </section>

      <section className="space-y-3 animate-fade-in pb-4">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">Boss Kena Tahu</h2>
        <button onClick={() => setInsight("Minyak masak naik 18% berbanding minggu lepas. Cuba beli saiz besar (5L) — boleh jimat lebih kurang RM 14 seminggu.")} className="w-full text-left rounded-2xl p-4 bg-warn-soft border border-warn/30 tap">
          <p className="font-semibold text-warn-foreground/90">⚠️ Minyak masak naik 18% minggu ini berbanding minggu lepas.</p>
          <p className="text-xs text-muted-foreground mt-1">Tap untuk tips →</p>
        </button>
        <button onClick={() => setInsight("Jumaat & Sabtu adalah hari paling laris (purata RM 1,580/hari). Tambah stok ayam & tepung 30% malam Khamis untuk maksimumkan jualan.")} className="w-full text-left rounded-2xl p-4 bg-profit/10 border border-profit/30 tap">
          <p className="font-semibold">🎉 Jumaat & Sabtu hari terbaik — tambah stok malam ni!</p>
          <p className="text-xs text-muted-foreground mt-1">Tap untuk tips →</p>
        </button>
      </section>

      {insight && (
        <div className="fixed inset-0 z-40 grid place-items-center p-5" onClick={() => setInsight(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm bg-surface rounded-3xl p-6 animate-pop-in">
            <div className="text-3xl">💡</div>
            <h3 className="font-extrabold text-lg mt-2">Tips dari WarkahBiz</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{insight}</p>
            <button onClick={() => setInsight(null)} className="mt-5 w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold tap">Faham, terima kasih!</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
