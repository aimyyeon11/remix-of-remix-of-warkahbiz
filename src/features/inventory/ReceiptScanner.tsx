import { useRef, useState } from "react";
import { toast } from "sonner";
import { X, Check, Camera, Upload, Loader2 } from "lucide-react";
import type { Unit, ReceiptItem } from "@/types";
import { scanReceipt } from "@/server/scanReceipt.functions";

type Phase = "pick" | "preview" | "scanning" | "result" | "error";

const KNOWN_UNITS: Unit[] = ["kg", "g", "liter", "ml", "biji", "pek", "kotak", "batang", "helai", "tong", "papan", "kampit", "ekor", "unit", "pcs", "box", "pack", "dozen"];
const normalizeUnit = (u: string): Unit => {
  const v = (u || "").toLowerCase().trim() as Unit;
  return KNOWN_UNITS.includes(v) ? v : "unit";
};

const fileToDataUrl = (f: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === "string" ? r.result : "");
    r.onerror = () => reject(new Error("read_failed"));
    r.readAsDataURL(f);
  });

export const ReceiptScanner = ({ onClose, onConfirm }: {
  onClose: () => void;
  onConfirm: (items: ReceiptItem[]) => void;
}) => {
  const [phase, setPhase] = useState<Phase>("pick");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [vendor, setVendor] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [errMsg, setErrMsg] = useState<string>("");

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // allow re-pick same file
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Sila pilih fail gambar");
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      toast.error("Saiz gambar terlalu besar (maks 8MB)");
      return;
    }
    try {
      const url = await fileToDataUrl(f);
      setImageUrl(url);
      setPhase("preview");
    } catch {
      toast.error("Gagal baca gambar");
    }
  };

  const doScan = async () => {
    if (!imageUrl) return;
    setPhase("scanning");
    try {
      const result = await scanReceipt({ data: { imageBase64: imageUrl, mimeType: "image/jpeg" } });
      if (!result.ok) {
        setErrMsg(result.message || "Gagal scan resit");
        setPhase("error");
        return;
      }
      const parsed: ReceiptItem[] = (result.items || []).map((i) => ({
        emoji: i.emoji || "🛒",
        name: i.name || "Item",
        qty: Number(i.qty) || 1,
        unit: normalizeUnit(i.unit),
        price: Number(i.price) || 0,
      }));
      if (parsed.length === 0) {
        setErrMsg("Tiada item dijumpai. Cuba gambar yang lebih jelas.");
        setPhase("error");
        return;
      }
      setVendor(result.vendor);
      setDate(result.date);
      setItems(parsed);
      setPhase("result");
    } catch (e) {
      console.error(e);
      setErrMsg("Masalah sambungan. Cuba lagi.");
      setPhase("error");
    }
  };

  const total = items.reduce((s, i) => s + i.price, 0);

  return (
    <div className="absolute inset-0 z-50 bg-background flex flex-col animate-fade-in">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-extrabold">Scan Resit 📷</h3>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-elevated grid place-items-center tap">
          <X className="w-5 h-5" />
        </button>
      </div>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      {phase === "pick" && (
        <div className="flex-1 grid place-items-center p-6">
          <div className="w-full max-w-xs space-y-3">
            <div className="text-center text-sm text-muted-foreground mb-4">
              Ambil atau muat naik gambar resit
            </div>
            <button
              onClick={() => cameraRef.current?.click()}
              className="w-full h-14 rounded-2xl bg-gradient-profit text-profit-foreground font-bold flex items-center justify-center gap-2 tap shadow-card"
            >
              <Camera className="w-5 h-5" /> Ambil Gambar
            </button>
            <button
              onClick={() => galleryRef.current?.click()}
              className="w-full h-14 rounded-2xl bg-surface-elevated border border-border font-bold flex items-center justify-center gap-2 tap"
            >
              <Upload className="w-5 h-5" /> Pilih dari Galeri
            </button>
          </div>
        </div>
      )}

      {phase === "preview" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="rounded-2xl overflow-hidden bg-surface border border-border">
            <img src={imageUrl} alt="Receipt preview" className="w-full max-h-[60vh] object-contain" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setImageUrl(""); setPhase("pick"); }} className="h-12 rounded-2xl bg-surface-elevated border border-border font-bold tap">
              ↩️ Tukar Gambar
            </button>
            <button onClick={doScan} className="h-12 rounded-2xl bg-gradient-profit text-profit-foreground font-bold tap shadow-card">
              Scan Resit 🔍
            </button>
          </div>
        </div>
      )}

      {phase === "scanning" && (
        <div className="flex-1 grid place-items-center p-6">
          <div className="relative w-full aspect-[3/4] max-w-xs rounded-3xl bg-black/60 border-2 border-dashed border-warn/50 grid place-items-center overflow-hidden">
            {imageUrl && <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />}
            <span className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-warn rounded-tl-lg" />
            <span className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-warn rounded-tr-lg" />
            <span className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-warn rounded-bl-lg" />
            <span className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-warn rounded-br-lg" />
            <div className="absolute inset-x-0 h-0.5 bg-warn animate-pulse" style={{ top: "50%" }} />
            <div className="relative flex flex-col items-center gap-2 text-warn font-bold text-sm">
              <Loader2 className="w-6 h-6 animate-spin" />
              Scanning...
            </div>
          </div>
        </div>
      )}

      {phase === "result" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          <div className="rounded-2xl bg-surface border border-profit/30 p-4 animate-pop-in">
            <div className="text-profit font-bold text-sm flex items-center gap-2">
              <Check className="w-4 h-4" /> Resit Dijumpai
            </div>
            {(vendor || date) && (
              <div className="mt-2 text-sm">
                {vendor && <div><span className="text-muted-foreground">Vendor:</span> <span className="font-semibold">{vendor}</span></div>}
                {date && <div><span className="text-muted-foreground">Tarikh:</span> <span className="font-semibold">{date}</span></div>}
              </div>
            )}
            <div className="mt-3 border-t border-border pt-3 space-y-2">
              {items.map((i, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <span className="text-xl">{i.emoji}</span>
                  <span className="flex-1 font-semibold">{i.name}</span>
                  <span className="text-muted-foreground text-xs">{i.qty} {i.unit}</span>
                  <span className="font-bold w-16 text-right">RM {i.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-border pt-3 flex items-center justify-between">
              <span className="font-bold uppercase text-xs tracking-wider">Jumlah</span>
              <span className="font-extrabold text-cost text-lg">RM {total.toFixed(2)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setPhase("pick"); setImageUrl(""); setItems([]); }} className="h-12 rounded-2xl bg-surface-elevated border border-border font-bold tap">
              🔄 Scan Lain
            </button>
            <button
              onClick={() => onConfirm(items)}
              className="h-12 rounded-2xl bg-gradient-profit text-profit-foreground font-bold tap shadow-card"
            >
              ✅ Confirm & Simpan
            </button>
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="flex-1 grid place-items-center p-6">
          <div className="text-center space-y-4 max-w-xs">
            <div className="text-4xl">⚠️</div>
            <div className="font-bold">{errMsg}</div>
            <button onClick={() => setPhase(imageUrl ? "preview" : "pick")} className="h-12 px-6 rounded-2xl bg-gradient-profit text-profit-foreground font-bold tap shadow-card">
              Cuba Lagi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
