import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDownWideNarrow, SlidersHorizontal, X } from "lucide-react";
import { ExportButtons } from "@/Components/Reports/Shared/reportShared";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { DateInput } from "@/Components/Common/DateInput";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { SearchBox } from "@/Components/Common/SearchBox";
import { Toggle } from "@/Components/Common/Toggle";
import { cn } from "@/Utils/Lib/utils";

const MAX_TABS = 5;
const MAX_MAIN = 3;
// An export takes the list's filters, not its paging.
const exportBody = ({ page: _page, limit: _limit, ...rest } = {}) => rest;
const control = "h-9 rounded-lg border border-border bg-card px-3 text-xs font-semibold";

// A list page's one panel (handoff 62): `list` from useServerList draws the
// tabs, search, up to 3 filters, More filters, sort, export and the active
// filter chips; the table goes in `children`. `actions`: the page's own
// button (e.g. + New). `onExport(format, body)` downloads the list as the
// chosen format (Excel / CSV; PDF is drawn from the CSV) when it has exports.
// `summary`: the list's extra figures (list.summary), drawn above the table.
export function ListView({ list, actions = null, onExport, summary = null, children }) {
  const tb = list.toolbar;
  return (
    <div className="overflow-hidden rounded-2xl" style={{ background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" }}>
      <ListToolbar tb={tb} actions={actions} onExport={onExport && ((format) => onExport(format, exportBody(list.body)))} />
      {summary}
      {children}
    </div>
  );
}

function ListToolbar({ tb, actions, onExport }) {
  const { t } = useTranslation("common");
  const [more, setMore] = useState(false);
  const o = tb.options ?? {};
  const tabs = o.tabs?.options ?? [];
  const main = tb.filterDefs.filter((f) => f.main).slice(0, MAX_MAIN);
  const side = tb.filterDefs.filter((f) => !main.includes(f));
  const sideSet = side.filter((f) => tb.filters[f.key] !== undefined).length + (tb.range.date_from || tb.range.date_to ? 1 : 0) + (tb.range.amount_min || tb.range.amount_max ? 1 : 0);
  const hasSide = side.length > 0 || o.date_range || o.amount_range;

  // Active filters as chips: "Card status: Blocked ✕".
  const chips = [
    ...tb.filterDefs
      .filter((f) => tb.filters[f.key] !== undefined)
      .map((f) => ({ key: f.key, text: `${f.label}: ${f.kind === "toggle" ? t("yes") : (f.options?.find((x) => String(x.value) === tb.filters[f.key])?.label ?? tb.filters[f.key])}`, clear: () => tb.setFilter(f.key, "") })),
    ...(tb.range.date_from || tb.range.date_to ? [{ key: "date", text: `${o.date_range?.label ?? t("date")}: ${tb.range.date_from || "…"} – ${tb.range.date_to || "…"}`, clear: () => tb.setRange({ date_from: "", date_to: "" }) }] : []),
    ...(tb.range.amount_min || tb.range.amount_max ? [{ key: "amount", text: `${o.amount_range?.label ?? t("amount")}: ${tb.range.amount_min || "…"} – ${tb.range.amount_max || "…"}`, clear: () => tb.setRange({ amount_min: "", amount_max: "" }) }] : []),
  ];

  const shownTabs = tabs.length > MAX_TABS ? tabs.slice(0, MAX_TABS - 1) : tabs;
  const moreTabs = tabs.length > MAX_TABS ? tabs.slice(MAX_TABS - 1) : [];
  const inMore = moreTabs.find((x) => x.value === tb.tab);

  return (
    <div className="flex flex-col gap-2 border-b border-border p-3">
      {(tabs.length > 0 || actions) && (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <div data-tour="status-tabs" className="thin-scrollbar flex min-w-0 items-center gap-1.5 overflow-x-auto">
            {shownTabs.map((x) => (
              <TabButton key={x.value} active={tb.tab === x.value} onClick={() => tb.onTab(x.value)}>
                {x.label}
              </TabButton>
            ))}
            {moreTabs.length > 0 && <FilterSelect size="sm" className={cn("w-auto min-w-[7rem]", inMore && "[&>button]:text-primary")} value={inMore?.value ?? ""} onChange={(v) => v && tb.onTab(v)} options={[{ value: "", label: t("moreTabs") }, ...moreTabs]} />}
          </div>
          {actions && <div data-tour="add" className="ml-auto flex shrink-0 items-center gap-2 [&>button]:h-8">{actions}</div>}
        </div>
      )}

      <div className="flex w-full flex-wrap items-center gap-2">
        <SearchBox search={tb.search} onSearch={tb.onSearch} placeholder={o.search_hint} className="min-w-[16rem] flex-[1_1_16rem]" />
        {main.map((f) => (
          <FilterControl key={f.key} f={f} value={tb.filters[f.key]} onChange={(v) => tb.setFilter(f.key, v)} t={t} />
        ))}
        {hasSide && (
          <button type="button" onClick={() => setMore(true)} className={cn(control, "flex items-center gap-1.5 text-muted-foreground hover:border-primary hover:text-primary", sideSet && "border-primary text-primary")}>
            <SlidersHorizontal size={14} /> {sideSet ? t("moreFiltersCount", { count: sideSet }) : t("moreFilters")}
          </button>
        )}
        {o.sort && o.sort_options?.length > 0 && (
          <span data-tour="sort" className="flex items-center gap-1">
            <ArrowDownWideNarrow size={14} className="text-muted-foreground" />
            <FilterSelect size="sm" className="w-36" value={tb.sort} onChange={tb.onSort} options={o.sort_options} />
          </span>
        )}
        {onExport && o.exports?.length > 0 && <ExportButtons exportFile={onExport} />}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <span key={c.key} className="flex items-center gap-1 rounded-full bg-[var(--primary-light)] py-0.5 pl-2.5 pr-1 text-[11px] font-semibold text-primary">
              {c.text}
              <button type="button" aria-label={t("remove")} onClick={c.clear} className="rounded-full p-0.5 hover:bg-primary/10">
                <X size={11} />
              </button>
            </span>
          ))}
          <button type="button" onClick={tb.clearAll} className="px-1.5 text-[11px] font-bold text-muted-foreground underline-offset-2 hover:text-primary hover:underline">
            {t("clearAll")}
          </button>
        </div>
      )}

      <Modal open={more} onClose={() => setMore(false)} title={t("moreFilters")} size="sm">
        <div className="grid gap-4">
          {side.map((f) => (
            <label key={f.key} className="grid gap-1.5 text-xs font-semibold text-slate-700">
              {f.kind !== "toggle" && f.label}
              <FilterControl f={f} value={tb.filters[f.key]} onChange={(v) => tb.setFilter(f.key, v)} t={t} wide />
            </label>
          ))}
          {o.date_range && (
            <div className="grid gap-1.5 text-xs font-semibold text-slate-700">
              {o.date_range.label}
              <div className="grid grid-cols-2 gap-2">
                <DateInput value={tb.range.date_from} max={tb.range.date_to || undefined} onChange={(e) => tb.setRange({ date_from: e.target.value })} placeholder={t("from")} />
                <DateInput value={tb.range.date_to} min={tb.range.date_from || undefined} onChange={(e) => tb.setRange({ date_to: e.target.value })} placeholder={t("to")} />
              </div>
            </div>
          )}
          {o.amount_range && (
            <div className="grid gap-1.5 text-xs font-semibold text-slate-700">
              {o.amount_range.label}
              <div className="grid grid-cols-2 gap-2">
                <AmountBox value={tb.range.amount_min} placeholder={t("min")} onChange={(v) => tb.setRange({ amount_min: v })} />
                <AmountBox value={tb.range.amount_max} placeholder={t("max")} onChange={(v) => tb.setRange({ amount_max: v })} />
              </div>
            </div>
          )}
          <div className="flex justify-between gap-2 border-t border-border pt-3">
            <Button variant="ghost" size="sm" onClick={tb.clearAll}>
              {t("clearAll")}
            </Button>
            <Button size="sm" onClick={() => setMore(false)}>
              {t("done")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex h-8 shrink-0 items-center whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition-colors", !active && "text-muted-foreground hover:bg-muted hover:text-slate-700")}
      style={active ? { background: "var(--primary-light)", color: "var(--primary)" } : undefined}
    >
      {children}
    </button>
  );
}

// One filter by its kind: select (with "Any …"), toggle, number.
function FilterControl({ f, value, onChange, t, wide = false }) {
  if (f.kind === "toggle") return <Toggle showLabel label={f.label} checked={value === "true"} onChange={(on) => onChange(on ? "true" : "")} />;
  if (f.kind === "number") return <AmountBox value={value ?? ""} placeholder={f.label} onChange={onChange} className={wide ? "" : "w-32"} />;
  return <FilterSelect size="sm" className={wide ? "w-full" : "w-44"} value={value ?? ""} onChange={(v) => onChange(String(v ?? ""))} options={[{ value: "", label: t("anyOf", { what: f.label.toLowerCase() }) }, ...f.options.map((x) => ({ value: String(x.value), label: x.label }))]} />;
}

function AmountBox({ value, onChange, placeholder, className }) {
  return <input inputMode="decimal" className={cn(control, "font-normal tabular-nums", className)} placeholder={placeholder} value={value ?? ""} onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))} />;
}

// ListView with the shared table: rows, loading and paging from `list`;
// the rest (columns, rowKey, title, emptyTitle...) goes to DataTable.
export function ListTable({ list, actions, onExport, summary, ...table }) {
  return (
    <ListView list={list} actions={actions} onExport={onExport} summary={summary}>
      <DataTable bare serverSorted rows={list.rows} isLoading={list.loading} serverPagination={list.pagination} {...table} />
    </ListView>
  );
}
