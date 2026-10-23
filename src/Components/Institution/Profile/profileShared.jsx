import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Building2, CheckCircle2, Circle, ClipboardCheck, Globe, Lock, LogIn, Settings, Shield, UserPlus, Wallet } from "lucide-react";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { DigitChips } from "@/Components/Common/DigitChips";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Toggle } from "@/Components/Common/Toggle";
import { inputClass, labelClass } from "@/Components/Finance/Deposits/depositShared";
import { institutionsApi } from "@/Services/Institution/institutions.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";

// Institution profile, rebuilt (handoff 61). Everything the form shows —
// sections, fields, choices, defaults, rules — comes from profile/options;
// nothing here knows a field by name except to draw a kind.

export const institutionId = (inst) => inst?.id ?? inst?.inst_id ?? inst?.institution_id;

export const SECTION_ICONS = { building: Building2, globe: Globe, "log-in": LogIn, "user-plus": UserPlus, shield: Shield, wallet: Wallet, settings: Settings, "clipboard-check": ClipboardCheck };

// The form's sections (profile/options), loaded once per screen.
export function useProfileOptions() {
  const [sections, setSections] = useState(null);
  useEffect(() => {
    let cancelled = false;
    institutionsApi
      .options()
      .then((r) => !cancelled && setSections(rowsOf(r)[0]?.sections ?? []))
      .catch((e) => {
        if (cancelled) return;
        notifications.error(e.message);
        setSections([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return sections;
}

// A new institution's starting values: each field's `default` (a group's
// from its own fields).
export function defaultsOf(sections) {
  const out = {};
  for (const field of (sections ?? []).flatMap((s) => s.fields)) {
    if (field.kind === "group") out[field.key] = Object.fromEntries(field.fields.filter((f) => f.default !== undefined).map((f) => [f.key, f.default]));
    else if (field.default !== undefined) out[field.key] = field.default;
  }
  return out;
}

// The values the form sends: every field of every section, nothing else
// (old fields the record still carries stay out).
export function bodyOf(sections, values) {
  return Object.fromEntries((sections ?? []).flatMap((s) => s.fields).filter((f) => values[f.key] !== undefined).map((f) => [f.key, values[f.key]]));
}

const at = (values, path) => String(path).split(".").reduce((v, k) => v?.[k], values);
// show_when: {field, equals}; a dotted field points inside a group.
export const isShown = (field, values) => !field.show_when || at(values, field.show_when.field) === field.show_when.equals;

const labelOf = (options, value) => options?.find((o) => String(o.value) === String(value))?.label ?? value;

// A value as read-only text (review cards, profile tab, summary panel).
// null when nothing has been chosen, so it can be left out.
export function displayOf(field, value, t) {
  if (value == null || value === "" || (Array.isArray(value) && !value.length)) return null;
  switch (field.kind) {
    case "select":
      return labelOf(field.options, value);
    case "multiselect":
      return value.map((v) => labelOf(field.options, v)).join(", ");
    case "toggle":
      return value ? t("common:yes") : t("common:no");
    case "chips":
      return value.join(", ");
    case "matrix":
      return field.rows
        .map((row) => {
          const cell = value[row.value];
          if (!cell) return null;
          const text = Array.isArray(cell)
            ? cell.map((v) => labelOf(field.columns, v)).join(" + ")
            : field.columns.map((c) => `${c.label}: ${(cell[c.value] ?? []).map((v) => labelOf(field.options, v)).join(", ") || "—"}`).join(" · ");
          return `${row.label}: ${text}`;
        })
        .filter(Boolean)
        .join("\n") || null;
    case "group":
      return field.fields
        .filter((f) => isShown(f, { [field.key]: value }))
        .map((f) => {
          const shown = displayOf(f, value[f.key], t);
          return shown == null ? null : `${f.label}: ${shown}`;
        })
        .filter(Boolean)
        .join("\n") || null;
    default:
      return String(value);
  }
}

// One field, drawn by its kind. `onChange(next)` gets the field's whole
// value. `locked`: fixed once approved (lock icon, read-only).
export function ProfileField({ field, value, onChange, values, error, locked = false, phoneCodes = [] }) {
  const { t } = useTranslation(["institutions", "common"]);
  const disabled = locked;
  const control = (() => {
    switch (field.kind) {
      case "select":
        return field.options.length <= 4 ? (
          <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
            {field.options.map((o) => {
              const on = String(o.value) === String(value ?? "");
              return (
                <button
                  key={o.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(o.value)}
                  aria-pressed={on}
                  className={cn("rounded-xl border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-70", on ? "border-primary bg-[var(--primary-light)]" : "border-border bg-card hover:border-primary/50")}
                >
                  <span className={cn("block text-sm font-bold", on ? "text-primary" : "text-foreground")}>{o.label}</span>
                  {o.hint && <span className="mt-0.5 block text-[11px] text-muted-foreground">{o.hint}</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <FilterSelect className="mt-1.5" value={value ?? ""} disabled={disabled} onChange={onChange} options={[{ value: "", label: t("institutions:choose") }, ...field.options.map((o) => ({ value: o.value, label: o.label }))]} />
        );
      case "multiselect": {
        const list = Array.isArray(value) ? value : [];
        return (
          <div className="mt-1.5 flex flex-wrap gap-2">
            {field.options
              .map((o) => (
                <CheckboxPill key={o.value} label={o.label} disabled={disabled} checked={list.includes(o.value)} onChange={(on) => onChange(on ? [...list, o.value] : list.filter((v) => v !== o.value))} />
              ))}
          </div>
        );
      }
      case "toggle":
        return <Toggle checked={Boolean(value)} disabled={disabled} label={field.label} onChange={onChange} />;
      case "number":
        return (
          <input
            className={cn(inputClass, "mt-1.5 tabular-nums")}
            inputMode="numeric"
            disabled={disabled}
            value={value ?? ""}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
              onChange(digits === "" ? "" : Math.min(Number(digits), field.max ?? Infinity));
            }}
          />
        );
      case "chips":
        return <PrefixChips value={value ?? []} onChange={onChange} disabled={disabled} phoneCodes={phoneCodes} />;
      case "matrix":
        return <Matrix field={field} value={value ?? {}} onChange={onChange} disabled={disabled} />;
      case "group":
        return (
          <div className="mt-1.5 grid gap-3 rounded-xl border border-border bg-muted/30 p-3">
            {field.fields
              .filter((f) => isShown(f, values))
              .map((f) => (
                <ProfileField
                  key={f.key}
                  field={f.key === "default" && field.key === "language" ? { ...f, options: f.options.filter((o) => (value?.supported ?? []).includes(o.value)) } : f}
                  value={value?.[f.key]}
                  values={values}
                  locked={locked}
                  onChange={(v) => onChange({ ...(value ?? {}), [f.key]: v })}
                />
              ))}
          </div>
        );
      default:
        return (
          <input
            className={cn(inputClass, "mt-1.5", field.key === "code" && "font-mono uppercase")}
            disabled={disabled}
            maxLength={field.max_length}
            value={value ?? ""}
            onChange={(e) => onChange(field.key === "code" ? e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") : e.target.value)}
          />
        );
    }
  })();
  return (
    <div data-field={field.key} className={cn(field.kind === "toggle" && "flex items-start justify-between gap-3 rounded-xl border border-border px-3 py-2.5")}>
      <div className="min-w-0">
        <p className={cn(labelClass, "flex items-center gap-1.5")}>
          {field.label}
          {field.required && <span className="text-red-500">*</span>}
          {locked && (
            <span title={t("institutions:lockedHint")} className="text-muted-foreground">
              <Lock size={12} />
            </span>
          )}
        </p>
        {field.help && <p className="mt-0.5 text-[11px] text-muted-foreground">{field.help}</p>}
      </div>
      {control}
      {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}

// "Numbers that may sign up": pick a dialling code of the institution's
// phone countries, type the rest.
function PrefixChips({ value, onChange, disabled, phoneCodes }) {
  const [lead, setLead] = useState(phoneCodes[0] ?? "+");
  return (
    <div className="mt-1.5 flex flex-wrap items-start gap-2">
      {phoneCodes.length > 1 && !disabled && <FilterSelect className="w-28" value={lead} onChange={setLead} options={phoneCodes.map((c) => ({ value: c, label: c }))} />}
      <DigitChips className="min-w-[14rem] flex-1" value={value} onChange={onChange} lead={phoneCodes.length ? lead : "+"} disabled={disabled} />
    </div>
  );
}

// A matrix: one row per `rows`, one column per `columns`. Without
// `options` each cell is one tick (sign-in method: PIN / Password); with
// `options` each cell holds those as ticks (contacts: Phone / Email).
// A row (or cell) never goes empty: unticking its last tick ticks the other.
function Matrix({ field, value, onChange, disabled }) {
  const keepOne = (list, removed, all) => (list.length ? list : all.filter((v) => v !== removed).slice(0, 1));
  const toggle = (list, v, all) => (list.includes(v) ? keepOne(list.filter((x) => x !== v), v, all) : [...list, v]);
  const cols = field.columns.map((c) => c.value);
  const opts = (field.options ?? []).map((o) => o.value);
  return (
    <div className="mt-1.5 overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs font-semibold text-slate-600">
          <tr>
            <th className="px-3 py-2 text-left" />
            {field.columns.map((c) => (
              <th key={c.value} className="px-3 py-2 text-center" title={c.hint}>
                {c.label}
                {c.hint && <span className="block text-[10px] font-normal text-muted-foreground">{c.hint}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {field.rows.map((row) => (
            <tr key={row.value} className="border-t border-border">
              <td className="whitespace-nowrap px-3 py-2 text-xs font-bold">{row.label}</td>
              {field.columns.map((c) => {
                if (!field.options) {
                  const list = value[row.value] ?? [];
                  return (
                    <td key={c.value} className="px-3 py-2 text-center">
                      <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" disabled={disabled} checked={list.includes(c.value)} onChange={() => onChange({ ...value, [row.value]: toggle(list, c.value, cols) })} aria-label={`${row.label} · ${c.label}`} />
                    </td>
                  );
                }
                const cell = value[row.value]?.[c.value] ?? [];
                return (
                  <td key={c.value} className="px-3 py-2">
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {field.options.map((o) => (
                        <CheckboxPill key={o.value} label={o.label} disabled={disabled} checked={cell.includes(o.value)} onChange={() => onChange({ ...value, [row.value]: { ...(value[row.value] ?? {}), [c.value]: toggle(cell, o.value, opts) } })} />
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// A section's fields as a form. `errors`: {field: message}.
export function SectionForm({ section, values, setValues, errors = {}, lockedFields = [], phoneCodes }) {
  return (
    <div className="grid gap-4">
      {section.fields
        .filter((f) => isShown(f, values))
        .map((f) => (
          <ProfileField key={f.key} field={f} value={values[f.key]} values={values} error={errors[f.key]} locked={lockedFields.includes(f.key)} phoneCodes={phoneCodes} onChange={(v) => setValues((cur) => ({ ...cur, [f.key]: v }))} />
        ))}
    </div>
  );
}

// A section read-only: label / value rows, what has not been chosen left out.
export function SectionFacts({ section, values, compact = false }) {
  const { t } = useTranslation(["institutions", "common"]);
  const rows = section.fields.filter((f) => isShown(f, values)).map((f) => [f, displayOf(f, values[f.key], t)]).filter(([, v]) => v != null);
  if (!rows.length) return <p className="text-xs text-muted-foreground">{t("institutions:nothingChosen")}</p>;
  return (
    <dl className={cn("grid gap-x-4", compact ? "gap-y-1.5" : "gap-y-3 sm:grid-cols-2")}>
      {rows.map(([f, v]) => (
        <div key={f.key} className={cn("min-w-0", !compact && ["matrix", "group"].includes(f.kind) && "sm:col-span-2")}>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{f.label}</dt>
          <dd className={cn("whitespace-pre-line break-words font-semibold text-foreground", compact ? "text-xs" : "text-sm")}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

// A refusal's or a validate's problems, by field ({field: message}) and the
// sections that have one.
export function problemsOf(problems) {
  const byField = {};
  const sections = new Set();
  for (const p of problems ?? []) {
    if (!p?.field) continue;
    byField[p.field] ??= p.message;
    if (p.section) sections.add(p.section);
  }
  return { byField, sections };
}

// The setup checklist (profile/setup, or `setup` on get).
export function SetupChecklist({ setup, onOpen }) {
  const { t } = useTranslation("institutions");
  if (!setup) return null;
  const share = setup.required_total ? Math.round((setup.required_done / setup.required_total) * 100) : 0;
  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-bold">{setup.ready ? t("setupReady") : t("setupProgress", { done: setup.required_done, total: setup.required_total })}</p>
          <p className="text-xs text-muted-foreground">{t("setupAll", { done: setup.done, total: setup.total })}</p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full transition-all", setup.ready ? "bg-emerald-500" : "bg-primary")} style={{ width: `${share}%` }} />
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {(setup.steps ?? []).map((s) => (
          <button key={s.key} type="button" onClick={() => onOpen(s)} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/60">
            {s.done ? <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" /> : <Circle size={20} className="mt-0.5 shrink-0 text-muted-foreground" />}
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-foreground">
                {s.title}
                {!s.required && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{t("optional")}</span>}
              </span>
              <span className="block text-xs text-muted-foreground">{s.hint}</span>
              <span className="mt-1 block text-[11px] font-semibold text-slate-600">
                {t("setupCount", { count: s.count })}
                {s.pending > 0 && <span className="text-amber-700"> · {t("setupPending", { count: s.pending })}</span>}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
