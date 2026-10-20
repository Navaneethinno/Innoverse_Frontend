import { useTranslation } from "react-i18next";
import { Filter, Search } from "lucide-react";
import { cn } from "@/Utils/Lib/cn";

// The app's list search box: types into `onSearch`; Enter or the search
// button call `onSearchSubmit` (search at once). Spread useListSearch's
// `bind` into it.
export function SearchBox({ search = "", onSearch, onSearchSubmit, placeholder, className }) {
  const { t } = useTranslation("common");
  return (
    <div data-tour="search" className={cn("relative w-full min-w-0 flex-1", className)}>
      <Filter size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={search}
        maxLength={100}
        onChange={(event) => onSearch(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          // Inside a filter form, Enter searches without submitting it.
          event.preventDefault();
          onSearchSubmit?.();
        }}
        placeholder={placeholder ?? t("searchPlaceholder")}
        className={cn("h-9 w-full rounded-lg border border-border bg-white pl-9 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10", onSearchSubmit ? "pr-10" : "pr-3")}
      />
      {onSearchSubmit && (
        <button
          type="button"
          onClick={onSearchSubmit}
          aria-label={t("search")}
          title={t("search")}
          className="absolute right-1 top-1/2 flex h-7 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--primary-light)] hover:text-[var(--primary)]"
        >
          <Search size={14} />
        </button>
      )}
    </div>
  );
}
