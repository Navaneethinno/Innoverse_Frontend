import { TypedInput } from "@/Components/Common/DateInput";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Toggle } from "@/Components/Common/Toggle";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { accountDate, money } from "@/Components/Epurse/Accounts/accountShared";
import { useAuth } from "@/Hooks/useAuth";
import { canChooseInstitution } from "@/Utils/Lib/institutionScope";
import { cn } from "@/Utils/Lib/utils";
import { amountInput, dayDate, inputClass, labelClass, ratePct } from "../TermDeposits/depositShared";

// Pieces shared by the Loans screens.

// "HALF YEARLY" / "REDUCING_BALANCE" -> "Half yearly" / "Reducing balance".
const humanize = (code) => {
  const text = String(code ?? "").replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// A code from the options lists as a label; an unknown code reads as words.
export const loanLabel = (t, code) => (code == null || code === "" ? "—" : t(`loans:opt_${String(code).replace(/\W/g, "_")}`, { defaultValue: humanize(code) }));

// The page's institution: a platform user (SuperAdmin, System) picks one,
// their own first; an institution user always works in their own.
export function useInstitutionScope() {
  const me = useAuth((s) => s.user);
  const chooser = canChooseInstitution();
  const [institution, setInstitution] = useState(chooser ? (me?.inst_profile_id ?? "") : null);
  const scope = useCallback((body = {}) => (chooser && institution ? { ...body, inst_profile_id: Number(institution) } : body), [chooser, institution]);
  return { chooser, institution, setInstitution, scope };
}

// One input of a RowsEditor / form, by type:
// amount | rate | int | text | date | select | bool | multi.
export function Field({ field, value, onChange, disabled, decimals = 2 }) {
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
          const on = list.includes(v);
          return (
            <button
              key={v}
              type="button"
              disabled={disabled}
              onClick={() => onChange(on ? list.filter((x) => x !== v) : [...list, v])}
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
    int: (v) => String(v).replace(/\D/g, ""),
  }[type];
  return (
    <TypedInput
      type={type === "date" ? "date" : "text"}
      inputMode={clean ? (type === "int" ? "numeric" : "decimal") : undefined}
      className={cn(inputClass, "mt-1", clean && "tabular-nums")}
      disabled={disabled}
      placeholder={placeholder ?? (type === "amount" ? "0.00" : undefined)}
      value={value ?? ""}
      onChange={(e) => onChange(clean ? clean(e.target.value) : e.target.value)}
    />
  );
}

// An editable list of rows: each row a grid of Fields and a remove button.
// `fields`: [{ key, label, type, options, span }]. `blank()` makes a new row.
export function RowsEditor({ rows, fields, onChange, blank, addLabel, disabled, decimals, columns = "lg:grid-cols-4", renderExtra }) {
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
                  <Field field={f} value={row[f.key]} disabled={disabled} decimals={decimals} onChange={(v) => set(i, { [f.key]: v })} />
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

// A simple read-only table: columns [{ key, label, render?, align? }].
export function MiniTable({ columns, rows, empty, rowKey = (r, i) => r.id ?? i, rowClass }) {
  const { t } = useTranslation("loans");
  if (!rows?.length) return <p className="py-4 text-center text-sm text-muted-foreground">{empty ?? t("nothingYet")}</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-xs">
        <thead className="bg-muted/50 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={cn("whitespace-nowrap px-3 py-2", c.align === "right" && "text-right")}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey(r, i)} className={cn("border-t border-border", rowClass?.(r))}>
              {columns.map((c) => (
                <td key={c.key} className={cn("whitespace-nowrap px-3 py-2", c.align === "right" && "text-right tabular-nums")}>
                  {c.render ? c.render(r) : (r[c.key] ?? "—")}
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
  const m = (v) => money(v, currency);
  const live = installments?.some((r) => r.status);
  return (
    <MiniTable
      rows={installments}
      rowKey={(r) => r.installment_number}
      rowClass={(r) => (r.status === "OVERDUE" ? "bg-red-50" : r.status === "CANCELLED" ? "opacity-50" : undefined)}
      columns={[
        { key: "installment_number", label: "#" },
        { key: "due_date", label: t("dueDate"), render: (r) => dayDate(r.due_date) },
        { key: "principal_due", label: t("principal"), align: "right", render: (r) => m(r.principal_due) },
        { key: "interest_due", label: t("interest"), align: "right", render: (r) => m(r.interest_due) },
        { key: "fees_due", label: t("fees"), align: "right", render: (r) => m(r.fees_due) },
        live && { key: "penalty_due", label: t("penalty"), align: "right", render: (r) => m(r.penalty_due) },
        { key: "total_due", label: t("total"), align: "right", render: (r) => <b>{m(r.total_due)}</b> },
        live && { key: "paid", label: t("paid"), align: "right", render: (r) => m(Number(r.principal_paid ?? 0) + Number(r.interest_paid ?? 0) + Number(r.fees_paid ?? 0) + Number(r.penalty_paid ?? 0)) },
        installments?.some((r) => r.closing_principal != null) && { key: "closing_principal", label: t("balanceAfter"), align: "right", render: (r) => m(r.closing_principal) },
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
    <ol className="relative grid gap-4 border-l border-border pl-5">
      {events.map((e, i) => (
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

// A status filter strip above a list.
export function StatusStrip({ statuses, value, onChange, labelOf }) {
  const { t } = useTranslation("loans");
  return (
    <div className="mb-3 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1">
      {["", ...statuses].map((key) => (
        <button
          key={key || "all"}
          type="button"
          onClick={() => onChange(key)}
          className={cn("shrink-0 rounded-xl px-3 py-2 text-xs font-bold", value === key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-[var(--primary-light)] hover:text-primary")}
        >
          {key ? labelOf(key) : t("all")}
        </button>
      ))}
    </div>
  );
}

