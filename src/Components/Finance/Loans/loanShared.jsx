import { TypedInput } from "@/Components/Common/DateInput";
import { PagedList } from "@/Components/Common/Pager";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Toggle } from "@/Components/Common/Toggle";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { accountDate, money } from "@/Components/Finance/Accounts/accountShared";
import { formatNumber } from "@/Utils/Lib/numberFormat";
import { useAuth } from "@/Hooks/useAuth";
import { useInstitutionFilter } from "@/Utils/Lib/institutionFilter";
import { canChooseInstitution } from "@/Utils/Lib/institutionScope";
import { cn } from "@/Utils/Lib/utils";
import { amountInput, dayDate, inputClass, labelClass, percentInput, ratePct } from "../Deposits/depositShared";

// Pieces shared by the Loans screens.

// "HALF YEARLY" / "REDUCING_BALANCE" -> "Half yearly" / "Reducing balance".
const humanize = (code) => {
  const text = String(code ?? "").replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// A code from the options lists as a label; an unknown code reads as words.
export const loanLabel = (t, code) => (code == null || code === "" ? "—" : t(`loans:opt_${String(code).replace(/\W/g, "_")}`, { defaultValue: humanize(code) }));

// The page's institution: a platform user (SuperAdmin, System) picks one in
// the header's institution picker (the only place it is chosen), their own
// when none is picked; an institution user always works in their own.
export function useInstitutionScope() {
  const me = useAuth((s) => s.user);
  const chooser = canChooseInstitution();
  const picked = useInstitutionFilter();
  const institution = chooser ? picked || String(me?.inst_profile_id ?? "") : null;
  const scope = useCallback((body = {}) => (chooser && institution ? { ...body, inst_profile_id: Number(institution) } : body), [chooser, institution]);
  return { chooser, institution, scope };
}

// One input of a RowsEditor / form, by type:
// amount | rate | percent (at most 100) | int | text | date | select | bool | multi.
// `invalid`: the server refused this field; it is outlined in red.
export function Field({ field, value, onChange, disabled, decimals = 2, invalid = false }) {
  const { t } = useTranslation("loans");
  const { type = "text", options = [], placeholder } = field;
  if (type === "bool") return <Toggle checked={Boolean(value)} disabled={disabled} label={field.label} onChange={onChange} />;
  if (type === "select") {
    return <FilterSelect className="mt-1" value={value ?? ""} disabled={disabled} onChange={onChange} options={[...(field.blank ? [{ value: "", label: field.blank }] : []), ...options.map((o) => (typeof o === "object" ? o : { value: o, label: loanLabel(t, o) }))]} />;
  }
  if (type === "multi") {
    const list = Array.isArray(value) ? value : [];
    return (
      <div className="mt-1 flex flex-wrap gap-1.5">
        {options.map((o) => {
          const v = typeof o === "object" ? o.value : o;
          const on = list.some((x) => String(x) === String(v));
          return (
            <button
              key={v}
              type="button"
              disabled={disabled}
              onClick={() => onChange(on ? list.filter((x) => String(x) !== String(v)) : [...list, v])}
              className={cn("rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary hover:text-primary")}
            >
              {typeof o === "object" ? o.label : loanLabel(t, o)}
            </button>
          );
        })}
      </div>
    );
  }
  const clean = {
    amount: (v) => amountInput(v, decimals),
    rate: (v) => amountInput(v, 6),
    percent: percentInput,
    int: (v) => String(v).replace(/\D/g, "").replace(/^0+(?=\d)/, ""),
    // A code: capital letters, digits and _ only, as the server requires.
    code: (v) => String(v).toUpperCase().replace(/[^A-Z0-9_]/g, ""),
  }[type];
  return (
    <TypedInput
      type={type === "date" ? "date" : "text"}
      inputMode={clean && type !== "code" ? (type === "int" ? "numeric" : "decimal") : undefined}
      name={field.key}
      aria-invalid={invalid || undefined}
      className={cn(inputClass, "mt-1", clean && "tabular-nums", type === "code" && "font-mono", invalid && "border-red-400 ring-2 ring-red-200")}
      disabled={disabled}
      placeholder={placeholder ?? (type === "amount" ? "0.00" : undefined)}
      value={value ?? ""}
      onChange={(e) => onChange(clean ? clean(e.target.value) : e.target.value)}
    />
  );
}

// An editable list of rows: each row a grid of Fields and a remove button.
// `fields`: [{ key, label, type, options, span }]. `blank()` makes a new row.
// `invalid`: field keys the server refused, outlined on every row.
export function RowsEditor({ rows, fields, onChange, blank, addLabel, disabled, decimals, columns = "lg:grid-cols-4", renderExtra, invalid = [] }) {
  const { t } = useTranslation("loans");
  const set = (i, patch) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="grid gap-2">
      {rows.map((row, i) => (
        <div key={row.id ?? `n${i}`} className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-start gap-2">
            <div className={cn("grid flex-1 gap-2 sm:grid-cols-2", columns)}>
              {fields.filter((f) => !f.showIf || f.showIf(row)).map((f) => (
                <label key={f.key} className={cn(labelClass, f.type === "bool" && "flex items-center justify-between gap-2 self-end rounded-xl border border-border px-3 py-2", f.span)}>
                  {f.label}
                  <Field field={f} value={row[f.key]} disabled={disabled || f.disabledIf?.(row)} decimals={decimals} invalid={invalid.includes(f.key)} onChange={(v) => set(i, { [f.key]: v })} />
                </label>
              ))}
            </div>
            {!disabled && <ActionIconButton label={t("remove")} intent="delete" icon={Trash2} onClick={() => onChange(rows.filter((_, j) => j !== i))} className="mt-5" />}
          </div>
          {renderExtra?.(row, (patch) => set(i, patch), i)}
        </div>
      ))}
      {!rows.length && <p className="py-3 text-center text-xs text-muted-foreground">{t("noRows")}</p>}
      {!disabled && (
        <Button variant="outline" size="sm" icon={Plus} className="w-fit" onClick={() => onChange([...rows, blank()])}>
          {addLabel}
        </Button>
      )}
    </div>
  );
}

// A simple read-only table: columns [{ key, label, render?, align?, wrap? }]
// (`wrap` lets a long cell, a note, break onto lines instead of widening the table).
// A long list (a schedule) scrolls inside the table, its headings staying in view.
// Money columns: `amount: true` (the value from `value(row)` or row[key])
// shows the number alone, the table's `currency` once in the heading;
// `strong` makes it bold. `hideIfZero` drops a column that is 0 on every row.
const LONG_TABLE = 12;

const valueOf = (c, r) => (c.value ? c.value(r) : r[c.key]);
const isZero = (v) => v == null || v === "" || Number(v) === 0;

export function MiniTable({ columns: given, rows, empty, rowKey = (r, i) => r.id ?? i, rowClass, currency }) {
  const { t } = useTranslation("loans");
  if (!rows?.length) return <p className="py-4 text-center text-sm text-muted-foreground">{empty ?? t("nothingYet")}</p>;
  const columns = given.filter((c) => !c.hideIfZero || rows.some((r) => !isZero(valueOf(c, r))));
  const cell = (c, r) => {
    if (c.render) return c.render(r);
    if (c.amount) {
      const v = valueOf(c, r);
      const text = v == null || v === "" ? "—" : formatNumber(v, { min: 2, max: 6 });
      return c.strong ? <b>{text}</b> : <span className={isZero(v) ? "text-muted-foreground" : undefined}>{text}</span>;
    }
    return r[c.key] ?? "—";
  };
  return (
    <div className={cn("overflow-auto rounded-xl border border-border", rows.length > LONG_TABLE && "max-h-[28rem]")}>
      <table className="w-full text-xs">
        <thead className="sticky top-0 z-[1] bg-card text-left text-[10px] uppercase tracking-wider text-muted-foreground shadow-[0_1px_0_var(--border)]">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={cn("whitespace-nowrap px-3 py-2", (c.align === "right" || c.amount) && "text-right")}>
                {c.label}
                {c.amount && currency && <span className="ml-1 font-semibold normal-case text-muted-foreground/70">({currency})</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey(r, i)} className={cn("border-t border-border transition-colors even:bg-muted/30 hover:bg-primary-light/40", rowClass?.(r))}>
              {columns.map((c) => (
                <td key={c.key} className={cn("px-3 py-2", c.wrap ? "min-w-[10rem] align-top" : "whitespace-nowrap", (c.align === "right" || c.amount) && "text-right tabular-nums")}>
                  {cell(c, r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// A repayment schedule: the quote's (strings) or the loan's (numbers, with
// what is paid and each instalment's status).
export function ScheduleTable({ installments, currency }) {
  const { t } = useTranslation("loans");
  const live = installments?.some((r) => r.status);
  return (
    <MiniTable
      currency={currency}
      rows={installments}
      rowKey={(r) => r.installment_number}
      rowClass={(r) => (r.status === "OVERDUE" ? "bg-red-50" : r.status === "CANCELLED" ? "opacity-50" : undefined)}
      columns={[
        { key: "installment_number", label: "#" },
        { key: "due_date", label: t("dueDate"), render: (r) => dayDate(r.due_date) },
        { key: "principal_due", label: t("principal"), amount: true },
        { key: "interest_due", label: t("interest"), amount: true },
        { key: "fees_due", label: t("fees"), amount: true, hideIfZero: true },
        live && { key: "penalty_due", label: t("penalty"), amount: true, hideIfZero: true },
        { key: "total_due", label: t("total"), amount: true, strong: true },
        live && { key: "paid", label: t("paid"), amount: true, value: (r) => Number(r.principal_paid ?? 0) + Number(r.interest_paid ?? 0) + Number(r.fees_paid ?? 0) + Number(r.penalty_paid ?? 0) },
        installments?.some((r) => r.closing_principal != null) && { key: "closing_principal", label: t("balanceAfter"), amount: true },
        live && { key: "status", label: t("status"), render: (r) => <StatusBadge status={r.status} variant="subtle" /> },
      ].filter(Boolean)}
    />
  );
}

// A record's history (events: {event, status, detail, narration, actor, at}).
export function Timeline({ events, currency }) {
  const { t } = useTranslation("loans");
  if (!events?.length) return <p className="py-4 text-center text-sm text-muted-foreground">{t("nothingYet")}</p>;
  const show = (k, v) => {
    if (Array.isArray(v)) return v.map((x) => loanLabel(t, x)).join(", ");
    if (/rate/.test(k)) return ratePct(v);
    if (/date/.test(k)) return dayDate(v);
    if (/amount|principal|fees|disbursed|value/.test(k) && !Number.isNaN(Number(v))) return money(v, currency);
    return String(v);
  };
  return (
    <PagedList items={events}>
      {(page) => (
        <ol className="relative grid gap-4 border-l border-border pl-5">
          {page.map((e, i) => (
            <li key={`${e.at}-${i}`} className="relative">
              <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-card" />
              <p className="text-sm font-bold text-foreground">
                {t(`event_${e.event}`, { defaultValue: humanize(e.event) })} <span className="text-xs font-medium text-muted-foreground">· {e.actor} · {accountDate(e.at)}</span>
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {Object.entries(e.detail ?? {})
                  .filter(([, v]) => (Array.isArray(v) ? v.length > 0 : v != null && v !== "" && typeof v !== "object"))
                  .map(([k, v]) => (
                    <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">
                      {t(`detail_${k}`, { defaultValue: humanize(k) })}: <span className="tabular-nums">{show(k, v)}</span>
                    </span>
                  ))}
              </div>
              {e.narration?.trim() && <p className="mt-1 text-xs italic text-foreground">“{e.narration.trim()}”</p>}
            </li>
          ))}
        </ol>
      )}
    </PagedList>
  );
}

// Tabs under a record's header.
// `labelOf(key)` names a tab when the labels live outside the loans words.
export function Tabs({ tabs, value, onChange, labelOf }) {
  const { t } = useTranslation("loans");
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map(({ key, count }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn("flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-bold transition-colors", value === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
        >
          {labelOf ? labelOf(key) : t(`tab_${key}`)}
          {count > 0 && <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums">{count}</span>}
        </button>
      ))}
    </div>
  );
}

