import { FileText, FileSpreadsheet, MessageCircle } from "lucide-react";

export const ExportSheet = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-40 flex items-end justify-center" onClick={onClose}>
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
    <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-[440px] bg-surface rounded-t-[2rem] p-5 pb-8 animate-slide-up">
      <div className="grid place-items-center mb-3">
        <div className="w-12 h-1.5 rounded-full bg-muted-foreground/40" />
      </div>
      <h3 className="font-extrabold text-lg mb-3">Export Rekod 📤</h3>
      {[
        { icon: <FileText className="w-5 h-5" />,        label: "PDF Ringkasan",  emoji: "📄" },
        { icon: <FileSpreadsheet className="w-5 h-5" />, label: "Excel",          emoji: "📊" },
        { icon: <MessageCircle className="w-5 h-5" />,   label: "Kongsi WhatsApp", emoji: "📱" },
      ].map(o => (
        <button key={o.label} onClick={onClose} className="w-full h-14 mb-2 rounded-2xl bg-surface-elevated px-4 flex items-center gap-3 tap">
          <span className="text-2xl">{o.emoji}</span>
          <span className="font-semibold flex-1 text-left">{o.label}</span>
        </button>
      ))}
    </div>
  </div>
);
