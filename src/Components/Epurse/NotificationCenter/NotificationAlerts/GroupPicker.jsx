import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";

// Recipient groups for an alert. A row of pills stopped scaling once an
// institution has many groups, so: the chosen groups as removable chips on
// top, then a searchable, fixed-height checklist — the section keeps the
// same size however many groups exist.
export function GroupPicker({ groups, value, onChange }) {
  const { t } = useTranslation("notification");
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(value.map(String)), [value]);
  const byId = useMemo(() => new Map(groups.map((g) => [String(g.id), g])), [groups]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? groups.filter((g) => `${g.name ?? ""} ${g.code ?? ""}`.toLowerCase().includes(q)) : groups;
  }, [groups, query]);

  const toggle = (id) => onChange(selected.has(String(id)) ? value.filter((v) => String(v) !== String(id)) : [...value, id]);
  const selectShown = () => onChange([...value, ...shown.map((g) => g.id).filter((id) => !selected.has(String(id)))]);
  const memberCount = (g) => g.member_count ?? g.members_count ?? g.members?.length;

  return (
    <div className="mt-2 space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <span key={id} className="inline-flex items-center gap-1 rounded-full bg-primary-light py-0.5 pl-2.5 pr-1 text-xs font-semibold text-primary">
              {byId.get(String(id))?.name ?? `#${id}`}
              <button type="button" onClick={() => toggle(id)} aria-label={t("removeGroup")} className="rounded-full p-0.5 hover:bg-primary/10">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search size={14} className="shrink-0 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchGroups")} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          <span className="shrink-0 text-[11px] text-muted-foreground">{t("groupsSelected", { count: value.length, total: groups.length })}</span>
          <button type="button" onClick={selectShown} disabled={!shown.length} className="shrink-0 text-[11px] font-bold text-primary disabled:opacity-40">
            {t("selectShown")}
          </button>
          <button type="button" onClick={() => onChange([])} disabled={!value.length} className="shrink-0 text-[11px] font-bold text-muted-foreground hover:text-destructive disabled:opacity-40">
            {t("clearSelection")}
          </button>
        </div>
        <ul className="max-h-48 overflow-y-auto">
          {shown.length === 0 ? (
            <li className="px-3 py-4 text-center text-xs text-muted-foreground">{t("noGroupsMatch")}</li>
          ) : (
            shown.map((g) => (
              <li key={g.id}>
                <label className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-muted">
                  <input type="checkbox" checked={selected.has(String(g.id))} onChange={() => toggle(g.id)} className="h-4 w-4 shrink-0 accent-[var(--primary)]" />
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{g.name}</span>
                  {g.code && g.code !== g.name && <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{g.code}</span>}
                  {memberCount(g) != null && <span className="shrink-0 text-[10px] text-muted-foreground">{t("recipientCount", { count: memberCount(g) })}</span>}
                </label>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
