import { useState } from "react";
import { Delete } from "lucide-react";

const PETTY_SUGGESTIONS_OUT = [
  { emoji: "🛍️", label: "Beli barang kecil" },
  { emoji: "🚕", label: "Teksi/Minyak kereta" },
  { emoji: "🏷️", label: "Lain-lain" },
];
const PETTY_SUGGESTIONS_IN = [
  { emoji: "💵", label: "Top-up dari jualan" },
  { emoji: "🏦", label: "Tarik dari bank" },
  { emoji: "🏷️", label: "Lain-lain" },
];

export const PettyInputSheet = ({ kind, onClose, onSave }: {
  kind: "in" | "out";
  onClose: () => void;
  onSave: (amount: number, desc: string, emoji: string) => void;
}) => {
  const [amount, setAmount] = useState("0");
  const [desc, setDesc] = useState("");
  const [emoji, setEmoji] = useState(kind === "in" ? "💵" : "🛍️");
  const press = (k: string) => {
    setAmount(prev => {
      if (k === "del") return prev.length <= 1 ? "0" : prev.slice(0, -1);
      if (k === ".") return prev.includes(".") ? prev : prev + ".";
      if (prev === "0") return k;
      return prev + k;
    });
  };
  const suggestions = kind === "in" ? PETTY_SUGGESTIONS_IN : PETTY_SUGGESTIONS_OUT;
  const canSave = parseFloat(amount) > 0 && desc.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-[440px] bg-surface rounded-t-[2rem] p-5 pb-6 animate-slide-up space-y-3">
        <div className="grid place-items-center"><div className="w-12 h-1.5 rounded-full bg-muted-foreground/40" /></div>
        <h3 className="font-extrabold text-lg">{kind === "in" ? "Masuk Wang 💵" : "Keluar Wang 💸"}</h3>
        <div className={`rounded-2xl p-4 text-center ${kind === "in" ? "bg-profit/10" : "bg-cost/10"}`}>
          <div className={`text-4xl font-extrabold ${kind === "in" ? "text-profit" : "text-cost"}`}>RM {amount}</div>
        </div>
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Catatan (cth: Beli plastik beg)"
          className="w-full h-12 px-4 rounded-2xl bg-surface-elevated border border-border focus:outline-none focus:border-primary text-sm"
        />
        <div className="flex flex-wrap gap-2">
          {suggestions.map(s => (
            <button key={s.label} onClick={() => { setDesc(s.label); setEmoji(s.emoji); }}
              className={`px-3 h-9 rounded-full text-xs font-semibold border tap ${desc === s.label ? "bg-primary text-primary-foreground border-primary" : "bg-surface-elevated border-border text-muted-foreground"}`}>
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["1","2","3","4","5","6","7","8","9",".","0","del"].map(k => (
            <button key={k} onClick={() => press(k)} className="h-11 rounded-2xl bg-surface-elevated text-lg font-bold tap grid place-items-center">
              {k === "del" ? <Delete className="w-5 h-5" /> : k}
            </button>
          ))}
        </div>
        <button
          disabled={!canSave}
          onClick={() => onSave(parseFloat(amount), desc, emoji)}
          className={`w-full h-13 py-3 rounded-2xl font-extrabold tap shadow-card ${!canSave ? "opacity-50 " : ""}${kind === "in" ? "bg-gradient-profit text-profit-foreground" : "bg-gradient-cost text-white"}`}
        >
          Simpan 💾
        </button>
      </div>
    </div>
  );
};
