import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { inputClass } from "@/Components/Finance/Deposits/depositShared";
import { cn } from "@/Utils/Lib/utils";

// A key component typed by a custodian: masked (with a show/hide eye), only
// 0-9 and A-F, grouped in fours while typing, with a counter. `value` is
// the bare hex (no spaces); the caller sends it and clears it after the call.
export function HexComponentInput({ value, onChange, length, className }) {
  const { t } = useTranslation("common");
  const [shown, setShown] = useState(false);
  const grouped = value.replace(/(.{4})(?=.)/g, "$1 ");
  return (
    <div className={className}>
      <div className="relative">
        <input
          type={shown ? "text" : "password"}
          autoComplete="new-password"
          spellCheck={false}
          data-lpignore="true"
          data-1p-ignore="true"
          className={cn(inputClass, "pr-10 font-mono tracking-wider")}
          value={grouped}
          onChange={(e) =>
            onChange(
              e.target.value
                .toUpperCase()
                .replace(/[^0-9A-F]/g, "")
                .slice(0, length),
            )
          }
          placeholder={t("hexChars", { count: length })}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={t(shown ? "hide" : "show")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
        >
          {shown ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      <p
        className={cn(
          "mt-1 text-right text-[10px] tabular-nums",
          value.length === length ? "text-emerald-700" : "text-muted-foreground",
        )}
      >
        {value.length} / {length}
      </p>
    </div>
  );
}
