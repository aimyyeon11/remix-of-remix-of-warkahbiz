import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import ms from "@/translations/ms.js";
import en from "@/translations/en.js";
import zh from "@/translations/zh.js";
import ta from "@/translations/ta.js";

type Lang = "ms" | "en" | "zh" | "ta";
const translations: Record<Lang, Record<string, string>> = { ms, en, zh, ta };

interface Ctx {
  language: Lang;
  setLanguage: (l: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "ms";
    return (localStorage.getItem("warkahbiz_language") as Lang) || "ms";
  });

  const setLanguage = useCallback((lang: Lang) => {
    setLangState(lang);
    try { localStorage.setItem("warkahbiz_language", lang); } catch {}
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, []);

  const t = useCallback((key: string) => {
    return translations[language]?.[key] ?? translations.en?.[key] ?? key;
  }, [language]);

  useEffect(() => { document.documentElement.lang = language; }, [language]);

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be used inside LanguageProvider");
  return ctx;
}
