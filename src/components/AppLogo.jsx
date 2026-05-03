import { useTranslation } from "@/hooks/useTranslation.js";

/**
 * @param {{ size?: "lg" | "sm"; showName?: boolean; className?: string }} props
 */
export default function AppLogo({ size = "lg", showName = false, className = "" }) {
  const { t } = useTranslation();
  const isLg = size === "lg";
  const box = isLg ? "w-20 h-20 rounded-2xl" : "w-9 h-9 rounded-xl";
  const wText = isLg ? "text-3xl" : "text-lg";

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div
        className={`relative ${box} bg-gradient-to-br from-[#16A34A] to-[#15803D] shadow-lg flex items-center justify-center shrink-0`}
        aria-hidden
      >
        <span className={`font-extrabold text-white ${wText} tracking-tight`}>W</span>
        <span className="absolute -bottom-0.5 -right-0.5 text-[10px] font-bold bg-[#F59E0B] text-[#0F172A] rounded-md px-1 py-0.5 leading-none shadow-sm">
          RM
        </span>
      </div>
      {showName ? (
        <span className="mt-2 text-lg font-bold tracking-tight text-[#0F172A] dark:text-slate-100">{t("appName")}</span>
      ) : null}
    </div>
  );
}
