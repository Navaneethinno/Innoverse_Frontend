import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { LoadingAnimation } from "@/Components/Common/LoadingAnimation";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { limitGroupApi, limitGroupOps, rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/cn";
import { currencyCode, useLimitLists } from "./useLimitLists";

// The rules of one limit group (Global Settings > Limit handoff, "The rules
// (config)"). The whole list is sent every time: save_config replaces it.
// A draft / rejected group saves with save_config; an approved one opens a
// draft change with edit(is_draft) and keeps its live rules until a checker
// approves. While a change is under review, `proposed_config` is shown next
// to the live rules.
const DRAFT = 9;
const REJECTED = 5;
const ACTIVE = 1;
const MATCH_MODES = ["ALL_MATCH", "ANY_MATCH"];
const POLICIES = ["STRICTEST", "HIGHEST_PRIORITY", "HYBRID"];
const input = "mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm font-normal disabled:bg-muted";
const codeOf = (v) => v.toUpperCase().replace(/[^A-Z0-9_]/g, "");
const newRule = (n) => ({ code: `RULE_${n}`, name: "", description: "", category_code: "GENERAL", priority: 100, match_mode: "ALL_MATCH", evaluation_policy: "STRICTEST", dimensions: [], thresholds: [] });

// Values one condition takes, by the dimension's value_kind and the
// operator's arity (1, 2 for BETWEEN, -1 for one or more).
function ConditionValues({ dimension, operator, values, onChange, lists, disabled, t }) {
  const arity = operator?.arity ?? 1;
  const kind = dimension?.value_kind;
  if (!dimension || !operator) return null;
  if (kind === "LIST") {
    const options = lists.sources[dimension.value_source] ?? [];
    if (arity === 1) {
      return <FilterSelect className="mt-1.5" disabled={disabled} value={values[0] ?? ""} onChange={(v) => onChange(v ? [v] : [])} options={[{ value: "", label: t("pick") }, ...options]} />;
    }
    return (
      <div className="mt-1.5 flex flex-wrap gap-2">
        {options.map((o) => (
          <CheckboxPill key={o.value} label={o.label} disabled={disabled} checked={values.includes(o.value)} onChange={(on) => onChange(on ? [...values, o.value] : values.filter((v) => v !== o.value))} />
        ))}
      </div>
    );
  }
  const type = kind === "TIME" ? "time" : "number";
  const one = (index) => (
    <input
      key={index}
      type={type}
      className={input}
      disabled={disabled}
      value={values[index] ?? ""}
      onChange={(e) => {
        const next = [...values];
        next[index] = e.target.value;
        onChange(next.filter((v, i) => v !== "" || i < index));
      }}
    />
  );
  if (arity === 2) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {one(0)}
        {one(1)}
      </div>
    );
  }
  if (arity === -1) {
    return (
      <input
        className={input}
        disabled={disabled}
        placeholder={t("commaSeparated")}
        value={values.join(", ")}
        onChange={(e) => onChange(e.target.value.split(",").map((v) => v.trim()).filter(Boolean))}
      />
    );
  }
  return one(0);
}

function RuleCard({ rule, index, onChange, onRemove, lists, disabled, t }) {
  const [open, setOpen] = useState(!rule.name);
  const set = (patch) => onChange({ ...rule, ...patch });
  const setAt = (key, i, patch) => set({ [key]: rule[key].map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const removeAt = (key, i) => set({ [key]: rule[key].filter((_, j) => j !== i) });
  const dimensionOf = (code) => lists.dimensions.find((d) => d.code === code);
  const typeOf = (code) => lists.limitTypes.find((l) => l.code === code);
  return (
    <div className="rounded-2xl border bg-white/70">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-800">{rule.name || t("ruleN", { n: index + 1 })}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            <code>{rule.code}</code> · {t("conditionsN", { count: rule.dimensions.length })} · {t("limitsN", { count: rule.thresholds.length })}
          </p>
        </div>
        {!disabled && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
            aria-label={t("remove")}
          >
            <Trash2 size={14} />
          </span>
        )}
        <ChevronDown size={16} className={cn("text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="flex flex-col gap-5 border-t p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-xs font-semibold text-slate-700">
              {t("code")}
              <input className={`${input} font-mono`} disabled={disabled} value={rule.code} onChange={(e) => set({ code: codeOf(e.target.value) })} />
            </label>
            <label className="text-xs font-semibold text-slate-700 md:col-span-2">
              {t("name")}
              <input className={input} disabled={disabled} value={rule.name} onChange={(e) => set({ name: e.target.value })} />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              {t("category")}
              <FilterSelect className="mt-1.5" disabled={disabled} value={rule.category_code ?? "GENERAL"} onChange={(v) => set({ category_code: v })} options={(lists.categories.length ? lists.categories : [{ code: "GENERAL", name: "General" }]).map((c) => ({ value: c.code, label: c.name ?? c.code }))} />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              {t("priority")}
              <input type="number" className={input} disabled={disabled} value={rule.priority ?? 100} onChange={(e) => set({ priority: e.target.value === "" ? "" : Number(e.target.value) })} />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              {t("matchMode")}
              <FilterSelect className="mt-1.5" disabled={disabled} value={rule.match_mode ?? "ALL_MATCH"} onChange={(v) => set({ match_mode: v })} options={MATCH_MODES.map((m) => ({ value: m, label: t(`match_${m}`) }))} />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              {t("policy")}
              <FilterSelect className="mt-1.5" disabled={disabled} value={rule.evaluation_policy ?? "STRICTEST"} onChange={(v) => set({ evaluation_policy: v })} options={POLICIES.map((p) => ({ value: p, label: t(`policy_${p}`) }))} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold text-slate-700">
                {t("from")}
                <input type="date" className={input} disabled={disabled} value={String(rule.effective_from ?? "").slice(0, 10)} onChange={(e) => set({ effective_from: e.target.value })} />
              </label>
              <label className="text-xs font-semibold text-slate-700">
                {t("to")}
                <input type="date" className={input} disabled={disabled} value={String(rule.effective_to ?? "").slice(0, 10)} onChange={(e) => set({ effective_to: e.target.value })} />
              </label>
            </div>
            <label className="text-xs font-semibold text-slate-700 md:col-span-4">
              {t("description")}
              <input className={input} disabled={disabled} value={rule.description ?? ""} onChange={(e) => set({ description: e.target.value })} />
            </label>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("appliesWhen")}</p>
            {rule.dimensions.length === 0 && <p className="mb-2 text-xs text-muted-foreground">{t("appliesToEverybody")}</p>}
            <div className="flex flex-col gap-2">
              {rule.dimensions.map((d, i) => {
                const dimension = dimensionOf(d.dimension_code);
                const operator = dimension?.operators?.find((o) => o.code === d.operator_code);
                return (
                  <div key={i} className="grid items-start gap-2 rounded-xl border p-3 md:grid-cols-[1fr_1fr_2fr_auto]">
                    <FilterSelect
                      disabled={disabled}
                      value={d.dimension_code ?? ""}
                      onChange={(v) => {
                        const dim = dimensionOf(v);
                        setAt("dimensions", i, { dimension_code: v, operator_code: dim?.operators?.[0]?.code ?? "", values: [] });
                      }}
                      options={[{ value: "", label: t("pickCondition") }, ...lists.dimensions.map((x) => ({ value: x.code, label: x.name ?? x.code }))]}
                    />
                    <FilterSelect
                      disabled={disabled || !dimension}
                      value={d.operator_code ?? ""}
                      onChange={(v) => setAt("dimensions", i, { operator_code: v, values: [] })}
                      options={(dimension?.operators ?? []).map((o) => ({ value: o.code, label: o.name ?? o.code }))}
                    />
                    <div className="-mt-1.5">
                      <ConditionValues dimension={dimension} operator={operator} values={d.values ?? []} lists={lists} disabled={disabled} t={t} onChange={(values) => setAt("dimensions", i, { values })} />
                    </div>
                    {!disabled && (
                      <button type="button" onClick={() => removeAt("dimensions", i)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label={t("remove")}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
              {!disabled && (
                <button type="button" onClick={() => set({ dimensions: [...rule.dimensions, { dimension_code: "", operator_code: "", values: [] }] })} className="flex w-fit items-center gap-1.5 rounded-lg border border-dashed px-3 py-1.5 text-xs font-bold text-primary">
                  <Plus size={13} /> {t("addCondition")}
                </button>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("allows")}</p>
            <div className="flex flex-col gap-2">
              {rule.thresholds.map((th, i) => {
                const type = typeOf(th.limit_type_code);
                return (
                  <div key={i} className="grid items-end gap-2 rounded-xl border p-3 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
                    <label className="text-xs font-semibold text-slate-700">
                      {t("limitType")}
                      <FilterSelect
                        className="mt-1.5"
                        disabled={disabled}
                        value={th.limit_type_code ?? ""}
                        onChange={(v) => setAt("thresholds", i, { limit_type_code: v, currency_code: undefined, min_amount: undefined, max_amount: undefined, max_count: undefined })}
                        options={[{ value: "", label: t("pick") }, ...lists.limitTypes.map((l) => ({ value: l.code, label: l.name ?? l.code }))]}
                      />
                    </label>
                    {type?.has_amount ? (
                      <>
                        <label className="text-xs font-semibold text-slate-700">
                          {t("currency")}
                          <FilterSelect className="mt-1.5" disabled={disabled} value={th.currency_code ?? ""} onChange={(v) => setAt("thresholds", i, { currency_code: v })} options={[{ value: "", label: t("pick") }, ...lists.currencies.map((c) => ({ value: currencyCode(c), label: currencyCode(c) }))]} />
                        </label>
                        <label className="text-xs font-semibold text-slate-700">
                          {t("minAmount")}
                          <input type="number" className={input} disabled={disabled || th.limit_type_code !== "PER_TRANSACTION"} value={th.min_amount ?? ""} onChange={(e) => setAt("thresholds", i, { min_amount: e.target.value === "" ? undefined : Number(e.target.value) })} />
                        </label>
                        <label className="text-xs font-semibold text-slate-700">
                          {t("maxAmount")}
                          <input type="number" className={input} disabled={disabled} value={th.max_amount ?? ""} onChange={(e) => setAt("thresholds", i, { max_amount: e.target.value === "" ? undefined : Number(e.target.value) })} />
                        </label>
                      </>
                    ) : (
                      <>
                        <span />
                        <span />
                        <span />
                      </>
                    )}
                    {type?.has_count ? (
                      <label className="text-xs font-semibold text-slate-700">
                        {t("maxCount")}
                        <input type="number" className={input} disabled={disabled} value={th.max_count ?? ""} onChange={(e) => setAt("thresholds", i, { max_count: e.target.value === "" ? undefined : Number(e.target.value) })} />
                      </label>
                    ) : (
                      <span />
                    )}
                    {!disabled && (
                      <button type="button" onClick={() => removeAt("thresholds", i)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label={t("remove")}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
              {rule.thresholds.length === 0 && <p className="text-xs font-semibold text-amber-700">{t("needsALimit")}</p>}
              {!disabled && (
                <button type="button" onClick={() => set({ thresholds: [...rule.thresholds, { limit_type_code: "" }] })} className="flex w-fit items-center gap-1.5 rounded-lg border border-dashed px-3 py-1.5 text-xs font-bold text-primary">
                  <Plus size={13} /> {t("addLimit")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Only what the limit type takes goes back (the server refuses the rest).
function cleanRules(rules, limitTypes) {
  const typeOf = (code) => limitTypes.find((l) => l.code === code);
  return rules.map((r) => {
    const out = {
      code: r.code,
      name: r.name,
      description: r.description ?? "",
      category_code: r.category_code || "GENERAL",
      priority: r.priority === "" || r.priority === undefined ? 100 : Number(r.priority),
      match_mode: r.match_mode || "ALL_MATCH",
      evaluation_policy: r.evaluation_policy || "STRICTEST",
      dimensions: (r.dimensions ?? []).filter((d) => d.dimension_code).map((d) => ({ dimension_code: d.dimension_code, operator_code: d.operator_code, values: (d.values ?? []).map(String) })),
      thresholds: (r.thresholds ?? []).filter((th) => th.limit_type_code).map((th) => {
        const type = typeOf(th.limit_type_code);
        const t = { limit_type_code: th.limit_type_code };
        if (!type || type.has_amount) {
          if (th.currency_code) t.currency_code = th.currency_code;
          if (th.max_amount !== undefined && th.max_amount !== null) t.max_amount = th.max_amount;
          if (th.limit_type_code === "PER_TRANSACTION" && th.min_amount !== undefined && th.min_amount !== null) t.min_amount = th.min_amount;
        }
        if ((!type || type.has_count) && th.max_count !== undefined && th.max_count !== null) t.max_count = th.max_count;
        return t;
      }),
    };
    if (r.effective_from) out.effective_from = r.effective_from;
    if (r.effective_to) out.effective_to = r.effective_to;
    return out;
  });
}

function RulesSummary({ title, rules, t }) {
  return (
    <div className="rounded-2xl border bg-white/70 p-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      {!rules?.length && <p className="text-xs text-muted-foreground">{t("noRules")}</p>}
      <ul className="flex flex-col gap-2 text-xs">
        {(rules ?? []).map((r) => (
          <li key={r.code} className="rounded-lg bg-muted/50 p-2">
            <p className="font-bold text-slate-800">
              {r.name} <code className="font-normal text-muted-foreground">{r.code}</code>
            </p>
            <p className="text-muted-foreground">{(r.dimensions ?? []).map((d) => `${d.dimension_code} ${d.operator_code} ${(d.values ?? []).join(", ")}`).join(" · ") || t("appliesToEverybody")}</p>
            <p>{(r.thresholds ?? []).map((th) => `${th.limit_type_code}: ${th.max_amount != null ? `${th.currency_code ?? ""} ${th.min_amount != null ? `${th.min_amount}–` : ""}${th.max_amount}` : ""}${th.max_count != null ? ` ×${th.max_count}` : ""}`).join(" · ")}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LimitRulesEditor({ group, forceReadOnly = false, onClose, onSaved }) {
  const { t } = useTranslation("limits");
  const lists = useLimitLists();
  const [record, setRecord] = useState(group);
  const [rules, setRules] = useState([]);
  const [liveRules, setLiveRules] = useState(null);
  const [proposed, setProposed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [problems, setProblems] = useState(null);
  const [dirty, setDirty] = useState(false);

  const status = Number(record.process_status);
  const editableState = [DRAFT, REJECTED, ACTIVE, 6, 7, 12, 15].includes(status);
  const readOnly = forceReadOnly || !editableState;

  useEffect(() => {
    let cancelled = false;
    limitGroupOps
      .get({ id: group.id })
      .then((response) => {
        if (cancelled) return;
        const data = rowsOf(response)[0] ?? {};
        setRecord(data.limit_group ?? group);
        const live = data.config?.rules ?? [];
        const next = data.proposed_config?.rules ?? null;
        setLiveRules(live);
        setProposed(next);
        // The maker keeps working on their proposed rules when there are some.
        setRules(next ?? live);
      })
      .catch((error) => notifications.error(error.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [group]);

  const run = async (label, work) => {
    setBusy(label);
    try {
      return await work();
    } catch (error) {
      notifications.error(error.message);
      return undefined;
    } finally {
      setBusy(null);
    }
  };

  const config = () => ({ rules: cleanRules(rules, lists?.limitTypes ?? []) });
  const isDraftLike = status === DRAFT || status === REJECTED;

  // Draft / rejected: save_config. Approved: edit as a draft change, which
  // keeps the live rules until approved; after that the draft takes
  // save_config like any other.
  const persist = async () => {
    if (isDraftLike) await limitGroupOps.saveConfig({ id: record.id, config: config() });
    else {
      const response = await limitGroupApi.edit({ id: record.id, name: record.name, description: record.description ?? "", is_draft: true, config: config() });
      const updated = rowsOf(response)[0];
      if (updated?.id) setRecord(updated);
      else setRecord((r) => ({ ...r, process_status: DRAFT }));
    }
    setDirty(false);
  };

  const save = () =>
    run("save", async () => {
      await persist();
      notifications.success(t("rulesSaved"));
      onSaved?.();
    });

  const validate = () =>
    run("validate", async () => {
      await persist();
      const result = rowsOf(await limitGroupOps.validate({ id: record.id }))[0] ?? {};
      setProblems(result.problems ?? []);
      if (result.valid) notifications.success(t("rulesValid"));
      return result.valid;
    });

  const submit = () =>
    run("submit", async () => {
      await persist();
      const check = rowsOf(await limitGroupOps.validate({ id: record.id }))[0] ?? {};
      setProblems(check.problems ?? []);
      if (check.valid === false) {
        notifications.error(t("fixProblemsFirst"));
        return;
      }
      if (status === REJECTED) await limitGroupApi.edit({ id: record.id, name: record.name, description: record.description ?? "", is_draft: false, config: config() });
      else await limitGroupApi.submit({ id: record.id, narration: t("submittedForReview") });
      notifications.success(t("submittedForReview"));
      onSaved?.();
      onClose();
    });

  const attemptClose = () => {
    if (dirty && !readOnly && !window.confirm(t("unsavedChanges"))) return;
    onClose();
  };

  const change = (next) => {
    setRules(next);
    setDirty(true);
  };
  const reviewing = readOnly && proposed;

  return (
    <Modal
      open
      onClose={attemptClose}
      size="full"
      growWithContent
      title={t(readOnly ? "viewRulesTitle" : "editRulesTitle", { name: record.name ?? record.code })}
      footer={
        <>
          <button type="button" onClick={attemptClose} className="px-3 py-2 text-sm font-bold text-muted-foreground">
            {t("close")}
          </button>
          {!readOnly && (
            <>
              <button type="button" disabled={Boolean(busy) || !lists} onClick={() => void save()} className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-50">
                {busy === "save" && <Spinner size={13} />} {t("saveDraft")}
              </button>
              <button type="button" disabled={Boolean(busy) || !lists} onClick={() => void validate()} className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-50">
                {busy === "validate" && <Spinner size={13} />} {t("validate")}
              </button>
              <button type="button" disabled={Boolean(busy) || !lists} onClick={() => void submit()} className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                {busy === "submit" && <Spinner size={13} />} {status === REJECTED ? t("resubmit") : t("submit")}
              </button>
            </>
          )}
        </>
      }
    >
      {loading || !lists ? (
        <div className="flex justify-center py-12">
          <LoadingAnimation className="h-16 w-48" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {record.is_default && <p className="rounded-xl bg-sky-50 p-3 text-xs text-sky-800">{t("defaultGroupHint")}</p>}
          {status === ACTIVE && !readOnly && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">{t("approvedChangeHint")}</p>}
          {readOnly && !forceReadOnly && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">{t("underReviewHint", { status: record.process_status_name ?? "" })}</p>}
          {problems && (
            <div className={`rounded-xl border p-3 ${problems.length ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
              <p className={`text-sm font-bold ${problems.length ? "text-red-700" : "text-emerald-700"}`}>{problems.length ? t("problemsToFix", { count: problems.length }) : t("noProblems")}</p>
              {problems.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-xs text-red-700">
                  {problems.map((p, i) => (
                    <li key={i}>{typeof p === "string" ? p : (p.message ?? JSON.stringify(p))}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {reviewing ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <RulesSummary title={t("liveRules")} rules={liveRules} t={t} />
              <RulesSummary title={t("proposedRules")} rules={proposed} t={t} />
            </div>
          ) : (
            <>
              {rules.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{t("noRules")}</p>}
              {rules.map((rule, index) => (
                <RuleCard key={index} rule={rule} index={index} lists={lists} disabled={readOnly} t={t} onChange={(next) => change(rules.map((r, i) => (i === index ? next : r)))} onRemove={() => change(rules.filter((_, i) => i !== index))} />
              ))}
              {!readOnly && (
                <button type="button" onClick={() => change([...rules, newRule(rules.length + 1)])} className="flex w-fit items-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-xs font-bold text-primary">
                  <Plus size={13} /> {t("addRule")}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
