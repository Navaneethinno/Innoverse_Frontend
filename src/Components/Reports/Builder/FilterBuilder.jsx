import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { Button } from "@/Components/Common/Button";
import { DateInput } from "@/Components/Common/DateInput";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { Spinner } from "@/Components/Common/Spinner";
import { inputClass } from "@/Components/TermDeposits/depositShared";
import { reportBuilderApi } from "@/Services/Reports/reportBuilder.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { cn } from "@/Utils/Lib/utils";
import {
  DATE_TYPES,
  NO_VALUE_OPS,
  NUMBER_TYPES,
  emptyValue,
  isComplete,
  isGroup,
  newCondition,
  newGroup,
} from "./builderShared";

// Picks option values: from the field's own `options`, or, for a lookup
// field, from `options` on the server as the user types. Selected values
// keep the labels they were picked with.
export function OptionPicker({ source, field, multi, value, onChange, invalid }) {
  const { t } = useTranslation("builder");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [found, setFound] = useState(field.options ?? []);
  const [loading, setLoading] = useState(false);
  const [labels, setLabels] = useState(() =>
    Object.fromEntries((field.options ?? []).map((o) => [o.value, o.label])),
  );
  const box = useRef(null);
  const selected = multi ? (value ?? []) : value ? [value] : [];

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !box.current?.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    if (!open || !field.has_lookup) return undefined;
    let cancelled = false;
    const id = window.setTimeout(() => {
      setLoading(true);
      reportBuilderApi
        .options({ source, field: field.key, search: search.trim(), limit: 50 })
        .then((r) => !cancelled && setFound(rowsOf(r)))
        .catch(() => !cancelled && setFound([]))
        .finally(() => !cancelled && setLoading(false));
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [open, search, source, field.key, field.has_lookup]);

  const term = search.trim().toLowerCase();
  const shown = field.has_lookup
    ? found
    : found.filter(
        (o) =>
          !term ||
          o.label.toLowerCase().includes(term) ||
          String(o.value).toLowerCase().includes(term),
      );
  const pick = (o) => {
    setLabels((l) => ({ ...l, [o.value]: o.label }));
    if (!multi) {
      onChange(o.value);
      setOpen(false);
      return;
    }
    onChange(
      selected.includes(o.value) ? selected.filter((v) => v !== o.value) : [...selected, o.value],
    );
  };

  return (
    <div ref={box} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex min-h-[38px] w-full items-center gap-1.5 rounded-xl border bg-card px-3 py-1.5 text-left text-sm",
          invalid ? "border-red-300" : "border-border",
          open && "border-primary",
        )}
      >
        <span className="flex min-w-0 flex-1 flex-wrap gap-1">
          {selected.length === 0 && (
            <span className="text-muted-foreground">{t("pickValues")}</span>
          )}
          {selected.slice(0, 6).map((v) => (
            <span
              key={v}
              className="max-w-[14rem] truncate rounded-full bg-[var(--primary-light)] px-2 py-0.5 text-xs font-semibold text-primary"
            >
              {labels[v] ?? v}
            </span>
          ))}
          {selected.length > 6 && (
            <span className="text-xs font-bold text-muted-foreground">+{selected.length - 6}</span>
          )}
        </span>
        <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 rounded-xl border border-border bg-card p-2 shadow-lg">
          <input
            autoFocus
            className={inputClass}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchValues")}
          />
          <div className="mt-1.5 max-h-60 overflow-y-auto">
            {loading && (
              <div className="flex justify-center p-2">
                <Spinner size={14} />
              </div>
            )}
            {!loading && shown.length === 0 && (
              <p className="p-2 text-xs text-muted-foreground">{t("noValues")}</p>
            )}
            {!loading &&
              shown.map((o) => {
                const on = selected.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => pick(o)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted",
                      on && "font-semibold text-primary",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        on ? "border-primary bg-primary text-primary-foreground" : "border-border",
                      )}
                    >
                      {on && <Check size={11} />}
                    </span>
                    <span className="min-w-0 truncate">{o.label}</span>
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

// A comma-separated list for `in` / `not_in` on text and numbers.
function ListInput({ value, onChange, numeric, invalid }) {
  const { t } = useTranslation("builder");
  const [text, setText] = useState(() => (value ?? []).join(", "));
  return (
    <input
      className={cn(inputClass, "flex-1", invalid && "border-red-300")}
      value={text}
      placeholder={t("commaSeparated")}
      onChange={(e) => {
        setText(e.target.value);
        const parts = e.target.value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        onChange(numeric ? parts.map(Number).filter((n) => Number.isFinite(n)) : parts);
      }}
    />
  );
}

// The value part of one condition, by the field's type and the operator.
function ValueInput({ source, field, rule, periods, onChange }) {
  const { t } = useTranslation("builder");
  const invalid = !isComplete(rule);
  if (NO_VALUE_OPS.includes(rule.op)) return null;
  const multi = ["in", "not_in"].includes(rule.op);
  if (field.type === "enum")
    return (
      <OptionPicker
        key={`${rule.op}`}
        source={source}
        field={field}
        multi={multi}
        value={rule.value}
        onChange={onChange}
        invalid={invalid}
      />
    );
  if (rule.op === "period")
    return (
      <div className="min-w-0 flex-1">
        <FilterSelect value={rule.value ?? ""} onChange={onChange} options={periods} />
      </div>
    );
  if (multi)
    return (
      <ListInput
        value={rule.value}
        onChange={onChange}
        numeric={NUMBER_TYPES.includes(field.type)}
        invalid={invalid}
      />
    );
  const dates = DATE_TYPES.includes(field.type);
  const one = (v, set, placeholder) =>
    dates ? (
      <DateInput
        value={v ?? ""}
        onChange={(e) => set(e.target.value)}
        className={cn(inputClass, "w-auto min-w-[9rem]")}
      />
    ) : (
      <input
        type={NUMBER_TYPES.includes(field.type) ? "number" : "text"}
        className={cn(inputClass, "min-w-0 flex-1", invalid && v === "" && "border-red-300")}
        value={v ?? ""}
        placeholder={placeholder}
        onChange={(e) => set(e.target.value)}
      />
    );
  if (rule.op === "between") {
    const [from, to] = rule.value ?? ["", ""];
    return (
      <span className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-muted-foreground">
        {one(from, (v) => onChange([v, to]), t("from"))}
        {t("and")}
        {one(to, (v) => onChange([from, v]), t("to"))}
      </span>
    );
  }
  return one(rule.value, onChange, t("value"));
}

// One condition: field, operator, value. A required one (User Activity's
// user and date) keeps its field and cannot be removed.
function Condition({ source, meta, rule, onChange, onRemove, required }) {
  const { t } = useTranslation("builder");
  const field = meta.fields.find((f) => f.key === rule.field);
  const filterable = meta.fields.filter((f) => f.filterable !== false);
  if (!field) return null;
  return (
    <div className="flex flex-wrap items-start gap-2 rounded-xl border border-border bg-card/60 p-2">
      <div className="w-full sm:w-48">
        {required ? (
          <p className="px-1 py-2 text-sm font-semibold">
            {field.label} <span className="text-red-600">*</span>
          </p>
        ) : (
          <FilterSelect
            value={rule.field}
            onChange={(key) =>
              onChange(
                newCondition(
                  meta.fields.find((f) => f.key === key),
                  meta.periods,
                ),
              )
            }
            options={filterable.map((f) => ({ value: f.key, label: f.label }))}
          />
        )}
      </div>
      <div className="w-full sm:w-44">
        <FilterSelect
          value={rule.op}
          onChange={(op) => onChange({ ...rule, op, value: emptyValue(field, op, meta.periods) })}
          options={field.operators.map((op) => ({
            value: op,
            label: t(`op_${op}`, { defaultValue: op }),
          }))}
        />
      </div>
      <div className="flex min-w-[12rem] flex-1 items-center gap-2">
        <ValueInput
          source={source}
          field={field}
          rule={rule}
          periods={meta.periods ?? []}
          onChange={(value) => onChange({ ...rule, value })}
        />
      </div>
      {!required && (
        <ActionIconButton label={t("removeFilter")} intent="delete" icon={X} onClick={onRemove} />
      )}
    </div>
  );
}

// A group of conditions joined by ALL or ANY; groups nest up to the
// report's max_depth, with at most max_filters conditions in all.
export function FilterGroup({ source, meta, group, onChange, onRemove, depth = 1, total }) {
  const { t } = useTranslation("builder");
  const limits = meta.limits ?? {};
  const full = total >= (limits.max_filters ?? 50);
  const required = depth === 1 ? (meta.required_filters ?? []) : [];
  const firstField = meta.fields.find((f) => f.filterable !== false);
  const setRule = (id, next) =>
    onChange({ ...group, rules: group.rules.map((r) => (r.id === id ? next : r)) });
  const remove = (id) => onChange({ ...group, rules: group.rules.filter((r) => r.id !== id) });
  return (
    <div
      className={cn(
        "grid gap-2",
        depth > 1 &&
          "rounded-xl border border-dashed border-primary/40 bg-[var(--primary-light)]/30 p-2.5",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {group.rules.length > 1 && (
          <>
            <SegmentedSwitch
              value={group.match}
              onChange={(match) => onChange({ ...group, match })}
              options={[
                { value: "ALL", label: t("matchAll") },
                { value: "ANY", label: t("matchAny") },
              ]}
            />
            <span className="text-xs text-muted-foreground">
              {t(group.match === "ANY" ? "matchAnyHint" : "matchAllHint")}
            </span>
          </>
        )}
        {onRemove && (
          <ActionIconButton
            className="ml-auto"
            label={t("removeGroup")}
            intent="delete"
            icon={X}
            onClick={onRemove}
          />
        )}
      </div>
      {group.rules.map((rule) =>
        isGroup(rule) ? (
          <FilterGroup
            key={rule.id}
            source={source}
            meta={meta}
            group={rule}
            depth={depth + 1}
            total={total}
            onChange={(next) => setRule(rule.id, next)}
            onRemove={() => remove(rule.id)}
          />
        ) : (
          <Condition
            key={rule.id}
            source={source}
            meta={meta}
            rule={rule}
            required={
              required.includes(rule.field) &&
              group.rules.filter((r) => r.field === rule.field)[0] === rule
            }
            onChange={(next) => setRule(rule.id, { ...next, id: rule.id })}
            onRemove={() => remove(rule.id)}
          />
        ),
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          icon={Plus}
          disabled={full || !firstField}
          onClick={() =>
            onChange({ ...group, rules: [...group.rules, newCondition(firstField, meta.periods)] })
          }
        >
          {t("addFilter")}
        </Button>
        {depth < (limits.max_depth ?? 3) && (
          <Button
            size="sm"
            variant="ghost"
            icon={Plus}
            disabled={full || !firstField}
            onClick={() =>
              onChange({
                ...group,
                rules: [...group.rules, newGroup([newCondition(firstField, meta.periods)])],
              })
            }
          >
            {t("addGroup")}
          </Button>
        )}
        {depth === 1 && full && (
          <span className="self-center text-xs text-amber-700">
            {t("filtersFull", { count: limits.max_filters ?? 50 })}
          </span>
        )}
      </div>
    </div>
  );
}
