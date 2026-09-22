import { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";

export const SidebarSearch = forwardRef(function SidebarSearch(
  { value, onChange, onClear, isCollapsed },
  ref,
) {
  const { t } = useTranslation("sidebar");
  if (isCollapsed) return null;
  return (
    <div className="px-2">
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={ref}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t("searchMenuPlaceholder")}
          className="w-full pl-7 pr-6 py-1.5 rounded-lg text-[11px] text-slate-700 bg-muted border border-border outline-none focus:border-[var(--primary)]"
        />
        {value && (
          <button
            type="button"
            onClick={onClear}
            aria-label={t("clearSearch")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-600"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
});
