import { useL } from "@/Components/InnoCBS/cbsOps";
import { useLanguages } from "@/Hooks/Master/masterHooks";
import { inputClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { cn } from "@/Utils/Lib/utils";

// Shared bits of the InnoFMS screens (Admin_42).

export const langCode = (l) => String(l?.code ?? l?.language_code ?? l?.lang_code ?? "").toLowerCase();

// The institution's languages other than English (one input each).
export function useOtherLanguages() {
  const { languages } = useLanguages();
  return languages.map(langCode).filter((c) => c && c !== "en");
}

// { fr: "…", pt: "…" }: one input per institution language; empty ones are dropped on save.
export function TranslationsInput({ value, onChange, disabled, placeholder, maxLength = 200 }) {
  const L = useL();
  const langs = useOtherLanguages();
  const v = value && typeof value === "object" ? value : {};
  if (!langs.length) return <p className="mt-1 text-[11px] font-normal text-muted-foreground">{L("The institution has no other languages.")}</p>;
  return (
    <div className="mt-1 grid gap-2 sm:grid-cols-2">
      {langs.map((c) => (
        <label key={c} className="text-[11px] font-semibold text-muted-foreground">
          {c.toUpperCase()}
          <input className={cn(inputClass, "mt-0.5")} disabled={disabled} maxLength={maxLength} placeholder={placeholder} value={v[c] ?? ""} onChange={(e) => onChange({ ...v, [c]: e.target.value })} />
        </label>
      ))}
    </div>
  );
}
export const cleanTranslations = (o) => Object.fromEntries(Object.entries(o ?? {}).map(([k, v]) => [k, String(v ?? "").trim()]).filter(([, v]) => v));

// { value, label } choices from a list of { value, label }, codes or records.
export const opts = (list) =>
  (list ?? []).map((x) => (x && typeof x === "object" ? { value: String(x.value ?? x.id ?? x.code), label: x.label ?? [x.code, x.name].filter(Boolean).join(" · ") ?? String(x.value) } : { value: String(x), label: String(x) }));

export const num = (v) => (v === "" || v == null ? "—" : Number(v).toLocaleString(undefined, { maximumFractionDigits: 3 }));
