import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";

// A list of number prefixes as chips: type digits, Enter (or a comma, or
// leaving the box) adds `${lead}${digits}`; × removes one. `lead` is fixed
// text shown before the box, e.g. a dialling code "+258".
export function DigitChips({ value = [], onChange, lead = "", placeholder, disabled, className }) {
  const { t } = useTranslation("common");
  const [text, setText] = useState("");
  const add = (raw = text) => {
    const digits = raw.replace(/\D/g, "");
    setText("");
    if (!digits) return;
    const next = `${lead}${digits}`;
    if (!value.includes(next)) onChange([...value, next]);
  };
  return (
    <div className={cn("flex min-h-[40px] flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card px-2 py-1.5", disabled && "bg-muted/40", className)}>
      {value.map((v) => (
        <span key={v} className="flex items-center gap-0.5 rounded-full bg-muted py-0.5 pl-2.5 pr-1 font-mono text-xs font-bold">
          {v}
          {!disabled && (
            <button type="button" aria-label={t("remove", { defaultValue: "Remove" })} onClick={() => onChange(value.filter((x) => x !== v))} className="rounded-full p-0.5 text-muted-foreground hover:text-red-600">
              <X size={11} />
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        <span className="flex min-w-[7rem] flex-1 items-center gap-1 text-sm">
          {lead && <span className="font-mono text-xs text-muted-foreground">{lead}</span>}
          <input
            inputMode="numeric"
            className="min-w-0 flex-1 bg-transparent py-1 font-mono text-sm outline-none placeholder:text-muted-foreground/60"
            value={text}
            placeholder={placeholder}
            onChange={(e) => {
              const v = e.target.value;
              if (/[, ]/.test(v)) add(v);
              else setText(v.replace(/\D/g, ""));
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              } else if (e.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1));
            }}
            onBlur={() => add()}
          />
        </span>
      )}
    </div>
  );
}
