import { DateInput } from "@/Components/Common/DateInput";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useAudienceTranslation } from "@/Hooks/useAudienceTranslation";
import { useOpenMenu } from "@/Pages/Sidebar/menuContext";
import { Modal } from "@/Components/Common/Modal";
import { HorizontalStepper } from "@/Components/Common/HorizontalStepper";
import { LoadingAnimation } from "@/Components/Common/LoadingAnimation";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { countryOption } from "@/Components/Common/countryOption";
import { masterApi } from "@/Services/Master/master.api";
import { kycSchemeApi, rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { inputClass } from "./FieldOptionsEditor";
import { useFieldLibrary, useFieldTypes, useSectionLibrary } from "./formBuilderHooks";
import { DragGrip, moveItem, useDragReorder } from "@/Components/Common/dragReorder";
import { cn } from "@/Utils/Lib/utils";
import { UsesStep } from "./UsesStep";

import { Button } from "@/Components/Common/Button";
// The form on a definition (Admin portal handoff: onboarding form builder,
// §5), shared by individual and corporate: Basics (the definition's own
// columns), the ordered sections, the rules, the uses (which fields serve
// which purpose) and a review with the server's problems and snapshot.
// `edit ... is_draft:true` saves the basics (and reopens an Active
// definition as a draft); save_form saves the form.
const STEPS = ["basics", "sections", "rules", "uses", "review"];
const EMPTY_FORM = { sections: [], rules: [], uses: {} };

const OPERATORS = ["EQ", "NEQ", "GT", "GTE", "LT", "LTE", "IN", "NOT_IN", "BETWEEN", "IS_SET", "IS_EMPTY"];
const LIST_OPERATORS = new Set(["IN", "NOT_IN", "BETWEEN"]);
const NO_VALUE = new Set(["IS_SET", "IS_EMPTY"]);
const ACTIONS = ["SHOW", "HIDE", "REQUIRE", "OPTIONAL"];


// Condition values are typed as text; numbers go back as numbers (a list
// field is compared with the chosen row's id).
const parseValue = (text) => {
  const trimmed = String(text ?? "").trim();
  return trimmed !== "" && !Number.isNaN(Number(trimmed)) ? Number(trimmed) : trimmed;
};
const placementLabel = (f) => f.label || undefined;
const valueText = (value) => (Array.isArray(value) ? value.join(", ") : (value ?? ""));

// Draft / Rejected / Active (and Active with a rejected change) can be
// edited: saving an Active one reopens it as a draft.
const EDITABLE_PROCESS_STATUSES = new Set([9, 5, 1, 6, 7, 12, 15]);

function MoveButtons({ index, count, onMove, onRemove, t }) {
  return (
    <>
      <button type="button" disabled={index === 0} onClick={() => onMove(-1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-muted disabled:opacity-30" aria-label={t("formBuilder:moveUp")}>
        <ArrowUp size={14} />
      </button>
      <button type="button" disabled={index === count - 1} onClick={() => onMove(1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-muted disabled:opacity-30" aria-label={t("formBuilder:moveDown")}>
        <ArrowDown size={14} />
      </button>
      <button type="button" onClick={onRemove} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" aria-label={t("formBuilder:remove")}>
        <Trash2 size={14} />
      </button>
    </>
  );
}

// A library section's fields as the customer sees them: the server's
// resolved_fields, else its placements over the field details.
const resolvedFields = (section, fieldDetails) =>
  section?.resolved_fields ?? (section?.fields ?? []).map((p) => ({ ...fieldDetails.get(p.field_key), key: p.field_key, ...(p.label ? { label: p.label } : {}), ...(typeof p.required === "boolean" ? { required: p.required } : {}) }));

// One section on the definition: drag grip, its name, a fields pill that
// opens the list of the fields it asks, Required, and move / remove.
function SectionCard({ placed, index, count, section, fields, typeName, readOnly, dnd, onRequired, onMove, onRemove, t }) {
  const [open, setOpen] = useState(false);
  return (
    <div {...(readOnly ? {} : dnd.rowProps(index))} className={cn("rounded-xl border bg-white/70", !readOnly && dnd.rowClass(index))}>
      <div className="flex flex-wrap items-center gap-3 px-3 py-2.5">
        {!readOnly && <DragGrip label={t("formBuilder:dragToReorder")} {...dnd.gripProps(index)} />}
        <span className="w-6 text-center text-xs font-bold text-muted-foreground">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">
            {section?.heading ?? placed.section_key}
            {!section && <span className="ml-2 text-xs font-normal text-red-600">{t("formBuilder:notInLibrary")}</span>}
          </p>
          <p className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
            <span className="truncate">{section?.name}</span> · <code>{placed.section_key}</code>
            {section?.multi_row ? <span>· {t("formBuilder:repeatable")}</span> : null}
          </p>
        </div>
        <button
          type="button"
          disabled={!fields.length}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          title={t(open ? "formBuilder:hideFields" : "formBuilder:showFields")}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-colors disabled:opacity-50",
            open ? "border-primary bg-primary/10 text-primary" : "text-slate-600 hover:border-primary hover:text-primary",
          )}
        >
          {t("formBuilder:fieldsN", { count: fields.length })}
          <ChevronDown size={13} className={cn("transition-transform duration-200", open && "rotate-180")} />
        </button>
        <CheckboxPill checked={placed.required !== false} disabled={readOnly} onChange={onRequired} label={t("formBuilder:requiredSection")} />
        {!readOnly && <MoveButtons t={t} index={index} count={count} onMove={onMove} onRemove={onRemove} />}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeOut" }} className="overflow-hidden">
            <ol className="grid max-h-72 gap-2 overflow-y-auto border-t bg-muted/30 p-3 sm:grid-cols-2 lg:grid-cols-3">
              {fields.map((f, i) => (
                <li key={f.key ?? f.field_key ?? i} className="flex min-w-0 items-center gap-2.5 rounded-lg border bg-white/80 px-2.5 py-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800">
                      {f.label ?? f.key}
                      {f.required && <span className="text-red-500"> *</span>}
                    </p>
                    <p className="truncate font-mono text-[10px] text-muted-foreground">{f.key ?? f.field_key}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{typeName(f.field_type)}</span>
                </li>
              ))}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RuleEditor({ rule, onChange, fieldOptions, sectionOptions, disabled, t }) {
  const set = (patch) => onChange({ ...rule, ...patch });
  const setAt = (listKey, index, patch) => set({ [listKey]: (rule[listKey] ?? []).map((x, i) => (i === index ? { ...x, ...patch } : x)) });
  const removeAt = (listKey, index) => set({ [listKey]: (rule[listKey] ?? []).filter((_, i) => i !== index) });
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-4">
        <label className="text-xs font-semibold text-slate-700">
          {t("formBuilder:ruleCode")}
          <input className={inputClass} disabled={disabled} value={rule.code ?? ""} onChange={(e) => set({ code: e.target.value.toUpperCase() })} />
        </label>
        <label className="text-xs font-semibold text-slate-700 md:col-span-2">
          {t("formBuilder:ruleName")}
          <input className={inputClass} disabled={disabled} value={rule.name ?? ""} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          {t("formBuilder:priority")}
          <input type="number" className={inputClass} disabled={disabled} value={rule.priority ?? 100} onChange={(e) => set({ priority: e.target.value === "" ? "" : Number(e.target.value) })} />
        </label>
      </div>
      <CheckboxPill className="self-start" checked={rule.enabled !== false} disabled={disabled} onChange={(on) => set({ enabled: on })} label={t("formBuilder:enabled")} />
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("formBuilder:whenAll")}</p>
        <div className="flex flex-col gap-2">
          {(rule.conditions ?? []).map((c, i) => (
            <div key={i} className="grid items-end gap-2 md:grid-cols-[2fr_1fr_2fr_auto]">
              <FilterSelect disabled={disabled} value={c.field ?? ""} onChange={(v) => setAt("conditions", i, { field: v })} options={[{ value: "", label: t("formBuilder:pickField") }, ...fieldOptions]} />
              <FilterSelect disabled={disabled} value={c.operator ?? "EQ"} onChange={(v) => setAt("conditions", i, { operator: v, ...(NO_VALUE.has(v) ? { value: undefined } : {}) })} options={OPERATORS.map((o) => ({ value: o, label: t(`formBuilder:op_${o}`, { defaultValue: o }) }))} />
              {NO_VALUE.has(c.operator) ? (
                <span />
              ) : (
                <input
                  className={`${inputClass} !mt-0`}
                  disabled={disabled}
                  placeholder={LIST_OPERATORS.has(c.operator) ? t("formBuilder:valuesCommaSeparated") : t("formBuilder:value")}
                  value={c._text ?? valueText(c.value)}
                  onChange={(e) =>
                    setAt("conditions", i, {
                      _text: e.target.value,
                      value: LIST_OPERATORS.has(c.operator) ? e.target.value.split(",").map(parseValue).filter((v) => v !== "") : parseValue(e.target.value),
                    })
                  }
                />
              )}
              {!disabled && (
                <button type="button" onClick={() => removeAt("conditions", i)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label={t("formBuilder:remove")}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {!disabled && (
            <button type="button" onClick={() => set({ conditions: [...(rule.conditions ?? []), { field: "", operator: "EQ" }] })} className="flex w-fit items-center gap-1.5 rounded-lg border border-dashed px-3 py-1.5 text-xs font-bold text-primary">
              <Plus size={13} /> {t("formBuilder:addCondition")}
            </button>
          )}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("formBuilder:thenApply")}</p>
        <div className="flex flex-col gap-2">
          {(rule.effects ?? []).map((effect, i) => (
            <div key={i} className="grid items-end gap-2 md:grid-cols-[1fr_1fr_2fr_auto]">
              <FilterSelect disabled={disabled} value={effect.action ?? "REQUIRE"} onChange={(v) => setAt("effects", i, { action: v })} options={ACTIONS.map((a) => ({ value: a, label: t(`formBuilder:action_${a}`, { defaultValue: a }) }))} />
              <FilterSelect
                disabled={disabled}
                value={effect.target ?? "field"}
                onChange={(v) => setAt("effects", i, { target: v, key: "" })}
                options={[
                  { value: "field", label: t("formBuilder:targetField") },
                  { value: "section", label: t("formBuilder:targetSection") },
                ]}
              />
              <FilterSelect
                disabled={disabled}
                value={effect.key ?? ""}
                onChange={(v) => setAt("effects", i, { key: v })}
                options={[{ value: "", label: effect.target === "section" ? t("formBuilder:pickSection") : t("formBuilder:pickField") }, ...(effect.target === "section" ? sectionOptions : fieldOptions)]}
              />
              {!disabled && (
                <button type="button" onClick={() => removeAt("effects", i)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label={t("formBuilder:remove")}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {!disabled && (
            <button type="button" onClick={() => set({ effects: [...(rule.effects ?? []), { action: "REQUIRE", target: "field", key: "" }] })} className="flex w-fit items-center gap-1.5 rounded-lg border border-dashed px-3 py-1.5 text-xs font-bold text-primary">
              <Plus size={13} /> {t("formBuilder:addEffect")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Problems({ problems, t }) {
  if (!problems) return null;
  return (
    <div className={`rounded-xl border p-4 ${problems.length ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
      <p className={`text-sm font-bold ${problems.length ? "text-red-700" : "text-emerald-700"}`}>
        {problems.length ? t("formBuilder:problemsToFix", { count: problems.length }) : t("formBuilder:noProblems")}
      </p>
      {problems.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-sm text-red-700">
          {problems.map((p, i) => (
            <li key={i}>{typeof p === "string" ? p : (p.message ?? JSON.stringify(p))}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// kind: "individual" | "corporate". api/ops: the definition's lifecycle
// and its get / save_form / validate.
export function DefinitionFormWizard({ kind, api, ops, definition, forceReadOnly = false, onClose, onSaved }) {
  const { t } = useAudienceTranslation(["formBuilder", "onboarding", "common"]);
  const openMenu = useOpenMenu();
  const sectionLibrary = useSectionLibrary();
  const vocabulary = useFieldTypes();
  const fieldLibrary = useFieldLibrary();
  const [def, setDef] = useState(definition);
  const [basics, setBasics] = useState({ minor_age_years: 18, home_country_id: "", kyc_group_id: "", effective_from: "", narration: "" });
  const [form, setForm] = useState(EMPTY_FORM);
  const [snapshot, setSnapshot] = useState(null);
  const [problems, setProblems] = useState(null);
  const [countries, setCountries] = useState([]);
  const [kycGroups, setKycGroups] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [pickSection, setPickSection] = useState("");

  const processStatus = Number(def?.process_status ?? 9);
  const readOnly = forceReadOnly || !EDITABLE_PROCESS_STATUSES.has(processStatus);
  const readOnlyReason = forceReadOnly ? t("onboarding:viewingOnly") : t("onboarding:configurationFrozenReason", { status: def?.process_status_name ?? t("onboarding:frozen") });
  const isRejected = processStatus === 5;

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      ops.get({ id: definition.id }).then((r) => rowsOf(r)[0] ?? {}),
      masterApi.countryList().catch(() => []),
      kind === "individual" ? kycSchemeApi.list({ page: 1, limit: 200 }).then(rowsOf).catch(() => []) : Promise.resolve([]),
    ])
      .then(([data, countryList, groups]) => {
        if (cancelled) return;
        const d = data.definition ?? definition;
        setDef(d);
        setForm({ ...EMPTY_FORM, ...(data.form ?? {}) });
        setSnapshot(data.snapshot ?? null);
        setBasics({
          minor_age_years: d.minor_age_years ?? 18,
          home_country_id: d.home_country_id ?? "",
          kyc_group_id: d.kyc_group_id ?? "",
          effective_from: String(d.effective_from ?? "").slice(0, 10),
          narration: "",
        });
        setCountries(countryList);
        setKycGroups(groups.filter((g) => Number(g.status) === 1));
      })
      .catch((error) => notifications.error(error.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [definition, kind, ops]);

  const change = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };
  // Stable, so the Uses step's one-time suggestion effect doesn't re-run.
  const setUses = useCallback((uses) => {
    setForm((f) => ({ ...f, uses }));
    setDirty(true);
  }, []);
  const setBasic = (key, value) => {
    setBasics((b) => ({ ...b, [key]: value }));
    setDirty(true);
  };

  // The fields on the form (from the library sections it places), for the
  // rule and uses pickers.
  const sectionByKey = useMemo(() => new Map(sectionLibrary.rows.map((s) => [s.key, s])), [sectionLibrary.rows]);
  // Field details: the saved snapshot first, then the library (for
  // sections added since the last save).
  const snapshotFields = useMemo(() => {
    const map = new Map(fieldLibrary.rows.map((f) => [f.key, f]));
    for (const s of snapshot?.sections ?? []) for (const f of s.fields ?? []) map.set(f.key, { ...f, section: s.key });
    return map;
  }, [snapshot, fieldLibrary.rows]);
  const formFields = useMemo(() => {
    const out = [];
    const seen = new Set();
    for (const { section_key } of form.sections) {
      const section = sectionByKey.get(section_key);
      const resolved = resolvedFields(section, snapshotFields);
      for (const f of resolved) {
        const key = f.key ?? f.field_key;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const known = snapshotFields.get(key) ?? {};
        out.push({
          key,
          label: placementLabel(f) ?? known.label ?? key,
          name: known.name ?? f.name ?? "",
          field_type: f.field_type ?? known.field_type,
          source_table: f.options?.source_table ?? known.options?.source_table ?? "",
          options: f.options ?? known.options ?? {},
          choices: f.choices ?? known.choices,
          section: section_key,
          sectionName: section?.name ?? section?.heading ?? section_key,
          multiRow: Boolean(section?.multi_row),
        });
      }
    }
    return out;
  }, [form.sections, sectionByKey, snapshotFields]);
  const fieldOptions = formFields.map((f) => ({ value: f.key, label: `${f.label} (${f.key})` }));
  const sectionOptions = form.sections.map((s) => ({ value: s.section_key, label: `${sectionByKey.get(s.section_key)?.name ?? s.section_key} (${s.section_key})` }));


  const payloadForm = () => ({
    sections: form.sections.map((s) => ({ section_key: s.section_key, required: s.required !== false })),
    rules: form.rules.map((r) => ({
      ...r,
      priority: r.priority === "" || r.priority === undefined ? 100 : Number(r.priority),
      enabled: r.enabled !== false,
      conditions: (r.conditions ?? []).map(({ _text, ...c }) => (NO_VALUE.has(c.operator) ? { field: c.field, operator: c.operator } : c)),
    })),
    uses: Object.fromEntries(Object.entries(form.uses ?? {}).filter(([, keys]) => Array.isArray(keys) && keys.length)),
  });

  const basicsPayload = () => {
    const out = {};
    if (kind === "individual" && basics.minor_age_years !== "") out.minor_age_years = Number(basics.minor_age_years);
    if (basics.home_country_id !== "") out.home_country_id = Number(basics.home_country_id);
    if (kind === "individual" && basics.kyc_group_id !== "") out.kyc_group_id = Number(basics.kyc_group_id);
    if (basics.effective_from) out.effective_from = basics.effective_from;
    return out;
  };

  const persist = async () => {
    const id = definition.id;
    await api.edit({ id, name: def?.name ?? definition.name, ...basicsPayload(), is_draft: true });
    const saved = rowsOf(await ops.saveForm({ id, form: payloadForm() }))[0] ?? {};
    if (saved.snapshot) setSnapshot(saved.snapshot);
    setProblems(saved.problems ?? []);
    setDirty(false);
    return id;
  };

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

  const saveDraft = () =>
    run("draft", async () => {
      await persist();
      notifications.success(t("formBuilder:draftSaved"));
      onSaved?.();
    });

  const validate = () =>
    run("validate", async () => {
      const id = await persist();
      const result = rowsOf(await ops.validate({ id }))[0] ?? {};
      setProblems(result.problems ?? []);
      if (result.valid) notifications.success(t("formBuilder:formIsValid"));
    });

  const submit = () =>
    run("submit", async () => {
      const id = await persist();
      const check = rowsOf(await ops.validate({ id }))[0] ?? {};
      setProblems(check.problems ?? []);
      if (check.valid === false || (check.problems ?? []).length) {
        notifications.error(t("formBuilder:fixProblemsFirst"));
        setStepIndex(STEPS.length - 1);
        return;
      }
      if (isRejected) await api.edit({ id, name: def?.name ?? definition.name, ...basicsPayload(), is_draft: false });
      else await api.submit({ id, narration: basics.narration || t("formBuilder:submittedForReview") });
      notifications.success(t("formBuilder:submittedForReview"));
      onSaved?.();
      onClose();
    });

  const attemptClose = () => {
    if (dirty && !readOnly && !window.confirm(t("onboarding:unsavedChangesConfirm"))) return;
    onClose();
  };

  const steps = STEPS.map((id) => ({ id, label: t(`formBuilder:step_${id}`) }));
  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const ready = !loading && !sectionLibrary.loading && !fieldLibrary.loading;
  const moveSection = (from, to) => change({ sections: moveItem(form.sections, from, to) });
  const dnd = useDragReorder(moveSection);
  const typeName = (type) => vocabulary?.types?.find((x) => x.type === type)?.name ?? type ?? "-";
  const placedSections = new Set(form.sections.map((s) => s.section_key));

  return (
    <Modal
      open
      onClose={attemptClose}
      title={t(readOnly ? "onboarding:viewOnboardingConfigurationTitle" : "onboarding:editOnboardingConfigurationTitle", { name: def?.name ?? definition?.name ?? definition?.code ?? "" })}
      size="full"
      growWithContent
      footer={
        <>
          <Button variant="ghost" onClick={attemptClose}>
            {readOnly ? t("common:close") : t("common:cancel")}
          </Button>
          {stepIndex > 0 && (
            <Button variant="secondary" onClick={() => setStepIndex((i) => i - 1)}>
              {t("common:back")}
            </Button>
          )}
          {!readOnly && (
            <Button variant="secondary" disabled={Boolean(busy) || !ready} onClick={() => void saveDraft()} loading={Boolean(busy === "draft")}>
              {t("onboarding:saveDraft")}
            </Button>
          )}
          {!isLast ? (
            <Button disabled={!ready} onClick={() => setStepIndex((i) => i + 1)}>
              {t("common:next")}
            </Button>
          ) : (
            !readOnly && (
              <>
                <Button variant="secondary" disabled={Boolean(busy)} onClick={() => void validate()} loading={Boolean(busy === "validate")}>
                  {t("onboarding:validate")}
                </Button>
                <Button disabled={Boolean(busy)} onClick={() => void submit()} loading={Boolean(busy === "submit")}>
                  {isRejected ? t("onboarding:resubmit") : t("common:submit")}
                </Button>
              </>
            )
          )}
        </>
      }
    >
      <div className="mb-5">
        <HorizontalStepper steps={steps} activeIndex={stepIndex} onStepClick={setStepIndex} />
      </div>
      {!ready ? (
        <div className="flex justify-center py-12">
          <LoadingAnimation className="h-16 w-48" />
        </div>
      ) : (
        <>
          <h2 className="mb-3 text-sm font-bold text-slate-800">{steps[stepIndex].label}</h2>
          {readOnly && <p className="mb-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">{readOnlyReason}</p>}

          {step === "basics" && (
            <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
              {kind === "individual" && (
                <label className="text-sm font-semibold text-slate-700">
                  {t("onboarding:minorAgeYears")}
                  <input type="number" min={0} disabled={readOnly} value={basics.minor_age_years} onChange={(e) => setBasic("minor_age_years", e.target.value)} className={inputClass} />
                  <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("onboarding:minorAgeHint")}</span>
                </label>
              )}
              <label className="text-sm font-semibold text-slate-700">
                {t("onboarding:homeCountry")}
                <FilterSelect className="mt-1.5" disabled={readOnly} disabledReason={readOnlyReason} value={basics.home_country_id} onChange={(v) => setBasic("home_country_id", v)} options={[{ value: "", label: t("onboarding:selectCountry") }, ...countries.map(countryOption)]} />
                <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("onboarding:homeCountryHint")}</span>
              </label>
              {kind === "individual" && (
                <label className="text-sm font-semibold text-slate-700">
                  {t("onboarding:kycScheme")}
                  <FilterSelect
                    className="mt-1.5"
                    disabled={readOnly}
                    disabledReason={readOnlyReason}
                    addAction={{ label: t("onboarding:addKycScheme"), onClick: () => openMenu("kycschemes") }}
                    value={basics.kyc_group_id}
                    onChange={(v) => setBasic("kyc_group_id", v)}
                    options={[{ value: "", label: t("onboarding:selectKycScheme") }, ...kycGroups.map((g) => ({ value: g.id, label: `${g.name} (${g.code})` }))]}
                  />
                  <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("onboarding:kycSchemeHint")}</span>
                </label>
              )}
              <label className="text-sm font-semibold text-slate-700">
                {t("onboarding:effectiveFrom")}
                <DateInput disabled={readOnly} value={basics.effective_from} onChange={(e) => setBasic("effective_from", e.target.value)} className={inputClass} />
              </label>
              {!readOnly && (
                <label className="text-sm font-semibold text-slate-700 md:col-span-2">
                  {t("onboarding:narration")}
                  <textarea value={basics.narration} onChange={(e) => setBasic("narration", e.target.value)} className="mt-1.5 min-h-20 w-full rounded-xl border p-3 text-sm" />
                </label>
              )}
            </div>
          )}

          {step === "sections" && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">{t("formBuilder:sectionsStepHint")}</p>
              {form.sections.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{t("formBuilder:noSectionsOnForm")}</p>}
              {form.sections.map((s, index) => {
                const section = sectionByKey.get(s.section_key);
                return (
                  <SectionCard
                    key={s.section_key}
                    t={t}
                    placed={s}
                    index={index}
                    count={form.sections.length}
                    section={section}
                    fields={resolvedFields(section, snapshotFields)}
                    typeName={typeName}
                    readOnly={readOnly}
                    dnd={dnd}
                    onRequired={(on) => change({ sections: form.sections.map((x, i) => (i === index ? { ...x, required: on } : x)) })}
                    onMove={(d) => moveSection(index, index + d)}
                    onRemove={() => change({ sections: form.sections.filter((_, i) => i !== index) })}
                  />
                );
              })}
              {!readOnly && (
                <FilterSelect
                  value={pickSection}
                  onChange={(key) => {
                    if (!key) return;
                    change({ sections: [...form.sections, { section_key: key, required: true }] });
                    setPickSection("");
                  }}
                  addAction={{ label: t("formBuilder:newSectionInLibrary"), onClick: () => openMenu("formsections") }}
                  options={[
                    { value: "", label: t("formBuilder:addSectionFromLibrary") },
                    ...sectionLibrary.rows.filter((s) => !placedSections.has(s.key)).map((s) => ({ value: s.key, label: `${s.name} (${s.key})`, searchText: `${s.name} ${s.key} ${s.heading}` })),
                  ]}
                />
              )}
            </div>
          )}

          {step === "rules" && (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-muted-foreground">{t("formBuilder:rulesStepHint")}</p>
              {form.rules.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{t("formBuilder:noRules")}</p>}
              {form.rules.map((rule, index) => (
                <div key={index} className="rounded-2xl border bg-white/70 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-800">{rule.name || rule.code || t("formBuilder:ruleN", { n: index + 1 })}</p>
                    {!readOnly && (
                      <button type="button" onClick={() => change({ rules: form.rules.filter((_, i) => i !== index) })} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" aria-label={t("formBuilder:remove")}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <RuleEditor t={t} rule={rule} disabled={readOnly} fieldOptions={fieldOptions} sectionOptions={sectionOptions} onChange={(next) => change({ rules: form.rules.map((r, i) => (i === index ? next : r)) })} />
                </div>
              ))}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => change({ rules: [...form.rules, { code: "", name: "", priority: 100, enabled: true, conditions: [{ field: "", operator: "EQ" }], effects: [{ action: "REQUIRE", target: "field", key: "" }] }] })}
                  className="flex w-fit items-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-xs font-bold text-primary"
                >
                  <Plus size={13} /> {t("formBuilder:addRule")}
                </button>
              )}
            </div>
          )}

          {step === "uses" && (
            <UsesStep kind={kind} fields={formFields} uses={form.uses} readOnly={readOnly} problems={problems} onChange={setUses} />
          )}

          {step === "review" && (
            <div className="flex flex-col gap-4">
              {!readOnly && <p className="text-xs text-muted-foreground">{t("formBuilder:reviewHint")}</p>}
              <Problems problems={problems} t={t} />
              {dirty && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">{t("formBuilder:snapshotOutdated")}</p>}
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("formBuilder:whatWillBeAsked")}</h3>
                {!snapshot?.sections?.length ? (
                  <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{t("formBuilder:noSnapshotYet")}</p>
                ) : (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {snapshot.sections.map((s) => (
                      <div key={s.key} className="rounded-xl border bg-white/70 p-3">
                        <p className="text-sm font-bold text-slate-800">
                          {s.heading}
                          {s.required === false && <span className="ml-2 text-[11px] font-normal text-muted-foreground">({t("formBuilder:optional")})</span>}
                        </p>
                        {s.subheading && <p className="text-[11px] text-muted-foreground">{s.subheading}</p>}
                        <ul className="mt-2 flex flex-col gap-1 text-xs text-slate-600">
                          {(s.fields ?? []).map((f) => (
                            <li key={f.key}>
                              {f.label}
                              {f.required && <span className="text-red-500"> *</span>} <span className="text-muted-foreground">· {f.field_type}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
