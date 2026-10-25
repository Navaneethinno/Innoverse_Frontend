import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { inputClass } from "@/Components/Finance/Deposits/depositShared";
import { notifications } from "@/Utils/Lib/notifications";

// Pick one record by typing part of it: `search(term)` resolves to the
// matching rows (300 ms after typing stops), `renderItem(row)` draws a row
// in the list and the chosen one (with Change). `rowKey(row)`: its key.
export function SearchPicker({ value, onChange, search, renderItem, rowKey = (r) => r.id, placeholder, empty }) {
  const { t } = useTranslation("common");
  const [term, setTerm] = useState("");
  const [found, setFound] = useState(null);
  useEffect(() => {
    const text = term.trim();
    if (!text) {
      setFound(null);
      return undefined;
    }
    let current = true;
    const timer = setTimeout(() => {
      search(text)
        .then((rows) => current && setFound(rows))
        .catch((e) => current && (setFound([]), notifications.error(e.message)));
    }, 300);
    return () => {
      current = false;
      clearTimeout(timer);
    };
    // `search` is a new function each render; the term drives the lookup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs">
        <span className="min-w-0">{renderItem(value)}</span>
        <button
          type="button"
          onClick={() => {
            setTerm("");
            onChange(null);
          }}
          className="shrink-0 text-[11px] font-bold text-primary hover:underline"
        >
          {t("change")}
        </button>
      </div>
    );
  }
  return (
    <div className="relative">
      <input className={inputClass} placeholder={placeholder} value={term} onChange={(e) => setTerm(e.target.value)} />
      {found && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
          {found.length ? (
            found.map((row) => (
              <li key={rowKey(row)}>
                <button type="button" onClick={() => onChange(row)} className="block w-full px-3 py-2 text-left text-xs hover:bg-muted">
                  {renderItem(row)}
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-xs text-muted-foreground">{empty}</li>
          )}
        </ul>
      )}
    </div>
  );
}
