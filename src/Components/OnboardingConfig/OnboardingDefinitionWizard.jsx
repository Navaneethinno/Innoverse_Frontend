import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/Components/Common/Modal";
import { HorizontalStepper } from "@/Components/Common/HorizontalStepper";
import { LoadingAnimation } from "@/Components/Common/LoadingAnimation";
import { Spinner } from "@/Components/Common/Spinner";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { notifications } from "@/Utils/Lib/notifications";
import { onboardingDefinitionApi, onboardingDefinitionOps, rowsOf } from "@/Services/Onboarding/onboarding.api";
import { ListEditor, cleanConfig } from "./ListEditor";
import { useOnboardingCatalog, useOnboardingMasters } from "./onboardingHooks";

// Customer-type configuration wizard (Onboarding_Configuration_API.md §8):
// one in-memory `config` object edited across steps 2–9 and replaced whole
// by save_config; step 1 edits the definition's own basics columns; step 10
// validates and submits. There is no separate "version" any more — the
// definition IS the configuration, so every call here targets the
// definition's own id directly (§8.1).
const STEPS = [
  { id: "basics", label: "Basics" },
  { id: "sections", label: "Sections" },
  { id: "fields", label: "Fields" },
  { id: "documents", label: "Documents" },
  { id: "addresses", label: "Addresses" },
  { id: "employment", label: "Employment" },
  { id: "relationships", label: "Relationships" },
  { id: "sources", label: "Sources of fund" },
  { id: "rules", label: "Rules" },
  { id: "review", label: "Review" },
];

const EMPTY_CONFIG = {
  sections: [],
  fields: [],
  document_groups: [],
  documents: [],
  address_types: [],
  employments: [],
  relationships: [],
  sources_of_fund: [],
  rules: [],
};

const TARGET_TYPES = ["section", "field", "document", "document_group", "address_type", "relationship"];
const asOptions = (list, valueKey = "code", labelOf = (x) => `${x.name} (${x.code})`) =>
  (list ?? []).map((x) => ({ value: x[valueKey], label: labelOf(x) }));

// Facts whose value is an id in a master (guide §8.10) and where to pick it.
const FACT_REF_SOURCE = {
  EMPLOYMENT_STATUS: "employment",
  ID_TYPE_SELECTED: "document_type",
  RELATIONSHIP_ADDED: "relationship_type",
  SOURCE_OF_FUND_SELECTED: "source_of_fund",
  COUNTRY_OF_RESIDENCE: "countries",
  NATIONALITY: "countries",
  RESIDENCY_STATUS: "residencyTypes",
};
const REF_SOURCE_MASTER = {
  employment: ["/employment", "employment status"],
  document_type: ["/documenttype", "document type"],
  relationship_type: ["/relationshiptype", "relationship type"],
  source_of_fund: ["/sourceoffund", "source of funds"],
};
const BOOLEAN_FACTS = new Set(["IS_MINOR", "PEP_FLAG"]);
const NUMBER_FACTS = new Set(["AGE"]);
const RANGE_OPERATORS = new Set(["BETWEEN"]);
const NO_VALUE_OPERATORS = new Set(["IS_SET", "IS_EMPTY"]);
const LIST_OPERATORS = new Set(["IN", "NOT_IN"]);

// Keeps only the value members that apply to the condition's current
// fact/operator, so switching either doesn't leave a stale value behind.
function pruneCondition({ _value, ...c }) {
  const base = { fact_code: c.fact_code, operator_code: c.operator_code, ...(c.field_code ? { field_code: c.field_code } : {}) };
  if (!c.fact_code || NO_VALUE_OPERATORS.has(c.operator_code)) return base;
  if (BOOLEAN_FACTS.has(c.fact_code)) return { ...base, value_boolean: Boolean(c.value_boolean) };
  if (NUMBER_FACTS.has(c.fact_code)) {
    return { ...base, value_number: c.value_number, ...(RANGE_OPERATORS.has(c.operator_code) ? { value_number_to: c.value_number_to } : {}) };
  }
  if (FACT_REF_SOURCE[c.fact_code]) return { ...base, value_ref_ids: c.value_ref_ids ?? [] };
  return { ...base, value_text: c.value_text };
}

function ValueMembers({ condition, setCondition, refOptions, disabled }) {
  const navigate = useNavigate();
  const { fact_code: fact, operator_code: operator } = condition;
  if (!fact || !operator || NO_VALUE_OPERATORS.has(operator)) return null;
  const set = (patch) => setCondition({ ...condition, ...patch });
  const input = "mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm disabled:bg-muted";
  if (BOOLEAN_FACTS.has(fact)) {
    return <CheckboxPill checked={Boolean(condition.value_boolean)} onChange={(v) => set({ value_boolean: v })} label="Value is true" disabled={disabled} className="self-start" />;
  }
  if (NUMBER_FACTS.has(fact)) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          Value
          <input type="number" min={0} className={input} disabled={disabled} value={condition.value_number ?? ""} onChange={(e) => set({ value_number: e.target.value === "" ? "" : Number(e.target.value) })} />
        </label>
        {RANGE_OPERATORS.has(operator) && (
          <label className="text-sm font-semibold text-slate-700">
            To
            <input type="number" min={0} className={input} disabled={disabled} value={condition.value_number_to ?? ""} onChange={(e) => set({ value_number_to: e.target.value === "" ? "" : Number(e.target.value) })} />
          </label>
        )}
      </div>
    );
  }
  const refSource = FACT_REF_SOURCE[fact];
  if (refSource) {
    const options = refOptions[refSource] ?? [];
    if (LIST_OPERATORS.has(operator)) {
      return (
        <div>
          <p className="text-sm font-semibold text-slate-700">Values</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {options.map((o) => (
              <CheckboxPill
                key={o.value}
                checked={(condition.value_ref_ids ?? []).includes(o.value)}
                disabled={disabled}
                label={o.label}
                onChange={(on) =>
                  set({ value_ref_ids: on ? [...(condition.value_ref_ids ?? []), o.value] : (condition.value_ref_ids ?? []).filter((v) => v !== o.value) })
                }
              />
            ))}
          </div>
        </div>
      );
    }
    return (
      <label className="text-sm font-semibold text-slate-700">
        Value
        <FilterSelect
          className="mt-1.5"
          disabled={disabled}
          value={condition.value_ref_ids?.[0] ?? ""}
          onChange={(v) => set({ value_ref_ids: v === "" ? [] : [v] })}
          addAction={REF_SOURCE_MASTER[refSource] ? { label: `Add ${REF_SOURCE_MASTER[refSource][1]}`, onClick: () => navigate(REF_SOURCE_MASTER[refSource][0]) } : undefined}
          options={[{ value: "", label: "Select..." }, ...options]}
        />
      </label>
    );
  }
  // FIELD_VALUE (text) and anything else
  return (
    <label className="text-sm font-semibold text-slate-700">
      Value
      <input className={input} disabled={disabled} value={condition.value_text ?? ""} onChange={(e) => set({ value_text: e.target.value })} />
    </label>
  );
}

// Reachable for a Draft (9), Rejected Add (5) or Active (1) definition —
// Active is included because "editing" an Active definition IS the reopen-
// for-config action now (guide §8.4/§10), not a dead end that forces a new
// version. Rejected-metadata-edit states (6, 7, 12, 15) behave like Active:
// the definition stayed Active with its prior config, only metadata was
// proposed and rejected.
const EDITABLE_PROCESS_STATUSES = new Set([9, 5, 1, 6, 7, 12, 15]);

export function OnboardingDefinitionWizard({ definition, forceReadOnly = false, onClose, onSaved }) {
  const navigate = useNavigate();
  const catalog = useOnboardingCatalog();
  const { masters, countries, residencyTypes, kycGroups, loading: mastersLoading } = useOnboardingMasters();
  const [def, setDef] = useState(definition ?? null);
  const [basics, setBasics] = useState({ minor_age_years: 18, home_country_id: "", kyc_group_id: "", effective_from: "", narration: "" });
  const [config, setConfig] = useState(EMPTY_CONFIG);
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [problems, setProblems] = useState(null);
  const [dirty, setDirty] = useState(false);

  const processStatus = Number(def?.process_status ?? 9);
  // Opened via the row's View action — no Edit/Save-draft/Submit at all,
  // regardless of what the record's own status would otherwise allow.
  const readOnly = forceReadOnly || (Boolean(def) && !EDITABLE_PROCESS_STATUSES.has(processStatus));
  const readOnlyReason = forceReadOnly
    ? "Viewing only."
    : `This configuration is ${def?.process_status_name ?? "frozen"} and cannot be changed right now.`;
  const isRejected = processStatus === 5;

  useEffect(() => {
    let cancelled = false;
    onboardingDefinitionOps
      .get({ id: definition.id })
      .then((response) => {
        if (cancelled) return;
        const data = rowsOf(response)[0] ?? {};
        setDef(data.definition ?? definition);
        setConfig({ ...EMPTY_CONFIG, ...(data.config ?? {}) });
        setBasics({
          minor_age_years: data.definition?.minor_age_years ?? 18,
          home_country_id: data.definition?.home_country_id ?? "",
          kyc_group_id: data.definition?.kyc_group_id ?? "",
          effective_from: String(data.definition?.effective_from ?? "").slice(0, 10),
          narration: "",
        });
      })
      .catch((error) => notifications.error(error.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [definition.id]);

  const setList = (key) => (next) => {
    setConfig((c) => ({ ...c, [key]: next }));
    setDirty(true);
  };
  const setBasic = (key, value) => {
    setBasics((b) => ({ ...b, [key]: value }));
    setDirty(true);
  };

  const enabledSectionCodes = useMemo(
    () => new Set(config.sections.filter((s) => s.enabled !== false).map((s) => s.section_code)),
    [config.sections],
  );
  const lockedFieldCodes = useMemo(
    () => new Set((catalog?.fields ?? []).filter((f) => f.is_locked_required).map((f) => f.code)),
    [catalog],
  );
  const codesOf = (key, codeKey) => config[key].map((x) => x[codeKey]).filter(Boolean);

  // What the picker for each rule effect target_type offers — the target must
  // be part of THIS definition's own configuration (guide §8.10).
  const targetOptions = {
    section: codesOf("sections", "section_code"),
    field: codesOf("fields", "field_code"),
    document: codesOf("documents", "document_type_code"),
    document_group: codesOf("document_groups", "code"),
    address_type: codesOf("address_types", "address_type_code"),
    relationship: codesOf("relationships", "relationship_type_code"),
  };
  const refOptions = {
    employment: (masters.employment ?? []).map((m) => ({ value: m.id, label: m.name })),
    document_type: (masters.document_type ?? []).map((m) => ({ value: m.id, label: m.name })),
    relationship_type: (masters.relationship_type ?? []).map((m) => ({ value: m.id, label: m.name })),
    source_of_fund: (masters.source_of_fund ?? []).map((m) => ({ value: m.id, label: m.name })),
    countries: countries.map((c) => ({ value: c.id, label: c.name })),
    residencyTypes: residencyTypes.map((r) => ({ value: r.id, label: r.name })),
  };

  const seedSections = () => {
    const have = new Set(config.sections.map((s) => s.section_code));
    const added = (catalog?.sections ?? [])
      .filter((s) => s.is_customer_entered !== false && !have.has(s.code))
      .map((s) => ({ section_code: s.code, enabled: true, mandatory: s.code === "PERSONAL", sequence_no: s.sequence_no }));
    setList("sections")([...config.sections, ...added]);
  };
  const seedFields = () => {
    const have = new Set(config.fields.map((f) => f.field_code));
    const added = (catalog?.fields ?? [])
      .filter((f) => enabledSectionCodes.has(f.section_code) && !f.is_system_populated && !have.has(f.code))
      .map((f, i) => ({ field_code: f.code, mandatory: Boolean(f.is_locked_required), visible: true, sequence_no: config.fields.length + i + 1 }));
    setList("fields")([...config.fields, ...added]);
  };

  const specs = {
    sections: [
      { key: "section_code", label: "Section", type: "select", required: true, options: asOptions((catalog?.sections ?? []).filter((s) => s.is_customer_entered !== false)) },
      { key: "enabled", label: "Enabled", type: "bool", defaultValue: true, disabled: (i) => i.section_code === "PERSONAL" },
      { key: "mandatory", label: "Mandatory", type: "bool" },
      { key: "sequence_no", label: "Order", type: "number" },
      { key: "label_override", label: "Label override", type: "text" },
    ],
    fields: [
      {
        key: "field_code",
        label: "Field",
        type: "select",
        required: true,
        options: asOptions(
          (catalog?.fields ?? []).filter((f) => enabledSectionCodes.has(f.section_code) && !f.is_system_populated),
        ),
      },
      { key: "mandatory", label: "Mandatory", type: "bool", disabled: (i) => lockedFieldCodes.has(i.field_code), hint: "" },
      { key: "visible", label: "Visible", type: "bool", defaultValue: true, disabled: (i) => lockedFieldCodes.has(i.field_code) },
      { key: "read_only", label: "Read only", type: "bool" },
      { key: "sequence_no", label: "Order", type: "number" },
      { key: "validation_rule_code", label: "Validation rule", type: "select", addTo: ["/validationrule", "validation rule"], options: asOptions(masters.validation_rule) },
      { key: "label_override", label: "Label override", type: "text" },
      { key: "help_text", label: "Help text", type: "text" },
      { key: "default_value", label: "Default value", type: "text" },
    ],
    document_groups: [
      { key: "code", label: "Group code", type: "text", required: true },
      { key: "name", label: "Group name", type: "text", required: true },
      { key: "purpose_code", label: "Purpose", type: "select", required: true, options: asOptions(catalog?.document_purposes) },
      { key: "min_required", label: "Min required", type: "number", defaultValue: 1 },
      { key: "max_allowed", label: "Max allowed", type: "number" },
      { key: "sequence_no", label: "Order", type: "number" },
    ],
    documents: [
      { key: "document_type_code", label: "Document type", type: "select", addTo: ["/documenttype", "document type"], required: true, options: asOptions(masters.document_type) },
      {
        key: "group_code",
        label: "Document group",
        type: "select",
        placeholder: "None (stand-alone)",
        options: config.document_groups.filter((g) => g.code).map((g) => ({ value: g.code, label: `${g.name || g.code} (${g.code})` })),
      },
      { key: "mandatory", label: "Mandatory (stand-alone only)", type: "bool", disabled: (i) => Boolean(i.group_code) },
      { key: "sequence_no", label: "Order", type: "number" },
      { key: "number_required", label: "Number required", type: "bool" },
      { key: "number_validation_rule_code", label: "Number validation rule", type: "select", addTo: ["/validationrule", "validation rule"], options: asOptions(masters.validation_rule), showIf: (i) => i.number_required },
      { key: "issue_date_required", label: "Issue date required", type: "bool" },
      { key: "expiry_date_required", label: "Expiry date required", type: "bool" },
      { key: "front_required", label: "Front required", type: "bool", defaultValue: true },
      { key: "back_required", label: "Back required", type: "bool" },
      { key: "verification_required", label: "Verification required", type: "bool" },
      { key: "verification_method_code", label: "Verification method", type: "select", addTo: ["/verificationmethod", "verification method"], options: asOptions(masters.verification_method), showIf: (i) => i.verification_required },
      { key: "min_count", label: "Min count", type: "number", defaultValue: 1 },
      { key: "max_count", label: "Max count", type: "number", defaultValue: 1 },
      { key: "max_file_size_kb", label: "Max file size (KB)", type: "number" },
      { key: "file_formats", label: "File formats (empty = any)", type: "multi", wide: true, options: (catalog?.file_formats ?? []).map((f) => ({ value: f.code ?? f, label: f.code ?? f })) },
    ],
    address_types: [
      { key: "address_type_code", label: "Address type", type: "select", addTo: ["/addresstype", "address type"], required: true, options: asOptions(masters.address_type) },
      { key: "mandatory", label: "Mandatory", type: "bool" },
      { key: "max_count", label: "Max count", type: "number", defaultValue: 1 },
      { key: "sequence_no", label: "Order", type: "number" },
      { key: "allow_same_as", label: 'Allow "same as" another address', type: "bool" },
      {
        key: "same_as_address_type_code",
        label: "Same as",
        type: "select",
        showIf: (i) => i.allow_same_as,
        options: (i) => asOptions(masters.address_type).filter((o) => o.value !== i.address_type_code),
      },
    ],
    employments: [
      { key: "employment_code", label: "Employment status", type: "select", addTo: ["/employment", "employment status"], required: true, options: asOptions(masters.employment) },
      { key: "employer_details_required", label: "Employer details required", type: "bool" },
      { key: "business_details_required", label: "Business details required", type: "bool" },
      { key: "sequence_no", label: "Order", type: "number" },
    ],
    relationships: [
      { key: "relationship_type_code", label: "Relationship type", type: "select", addTo: ["/relationshiptype", "relationship type"], required: true, options: asOptions(masters.relationship_type) },
      { key: "mandatory", label: "Mandatory", type: "bool" },
      { key: "min_count", label: "Min count", type: "number", defaultValue: 0 },
      { key: "max_count", label: "Max count", type: "number", defaultValue: 1 },
      { key: "sequence_no", label: "Order", type: "number" },
    ],
    sources_of_fund: [
      { key: "source_of_fund_code", label: "Source of funds", type: "select", addTo: ["/sourceoffund", "source of funds"], required: true, options: asOptions(masters.source_of_fund) },
      { key: "employer_details_required", label: "Employer details required", type: "bool" },
      { key: "sequence_no", label: "Order", type: "number" },
    ],
    rules: [
      { key: "code", label: "Rule code", type: "text", required: true },
      { key: "name", label: "Rule name", type: "text", required: true },
      { key: "description", label: "Description", type: "text", wide: true },
      { key: "priority", label: "Priority (lower runs first)", type: "number", defaultValue: 100 },
      { key: "enabled", label: "Enabled", type: "bool", defaultValue: true },
      {
        key: "conditions",
        label: "WHEN all of these are true",
        type: "list",
        addLabel: "Add condition",
        itemTitle: (c, i) => `Condition ${i + 1}`,
        spec: [
          { key: "fact_code", label: "Fact", type: "select", required: true, options: asOptions(catalog?.rule_facts) },
          { key: "operator_code", label: "Operator", type: "select", required: true, options: asOptions(catalog?.rule_operators) },
          {
            key: "field_code",
            label: "Field",
            type: "select",
            showIf: (c) => c.fact_code === "FIELD_VALUE",
            options: targetOptions.field.map((code) => ({ value: code, label: code })),
          },
          {
            key: "_value",
            type: "custom",
            wide: true,
            render: (c, patch, disabled) => (
              <ValueMembers condition={c} setCondition={(next) => patch({ ...next })} refOptions={refOptions} disabled={disabled} />
            ),
          },
        ],
      },
      {
        key: "effects",
        label: "THEN apply all of these",
        type: "list",
        addLabel: "Add effect",
        itemTitle: (e, i) => `Effect ${i + 1}`,
        spec: [
          { key: "action_code", label: "Action", type: "select", required: true, options: asOptions(catalog?.rule_actions) },
          { key: "target_type", label: "Target type", type: "select", required: true, options: TARGET_TYPES.map((t) => ({ value: t, label: t })) },
          {
            key: "target_key",
            label: "Target",
            type: "select",
            required: true,
            options: (e) => (targetOptions[e.target_type] ?? []).map((code) => ({ value: code, label: code })),
            hint: "Only items already in this definition's configuration can be targeted.",
          },
        ],
      },
    ],
  };

  // Locked catalog fields can never be hidden/optional (guide §8.7); force it
  // rather than let a stale toggle produce a server refusal.
  const prepared = () =>
    cleanConfig({
      ...config,
      fields: config.fields.map((f) => (lockedFieldCodes.has(f.field_code) ? { ...f, mandatory: true, visible: true } : f)),
      rules: config.rules.map((r) => ({
        ...r,
        conditions: (r.conditions ?? []).map(pruneCondition),
      })),
    });

  const basicsPayload = () =>
    cleanConfig({
      minor_age_years: basics.minor_age_years === "" ? undefined : Number(basics.minor_age_years),
      home_country_id: basics.home_country_id === "" ? undefined : Number(basics.home_country_id),
      kyc_group_id: basics.kyc_group_id === "" ? undefined : Number(basics.kyc_group_id),
      effective_from: basics.effective_from,
    });

  // Persists everything on the definition's own row: `edit ... is_draft:true`
  // both updates the basics AND is what reopens an Active definition for
  // config editing again (moves process_status to Draft, status stays
  // Active) — calling it on an already-Draft definition just edits its
  // fields, so it's safe to run unconditionally rather than branching on
  // whether this is "the first save" the way a separate version id used to
  // require. Then save_config replaces the whole `config` object.
  const persist = async () => {
    const id = definition.id;
    await onboardingDefinitionApi.edit({ id, name: def?.name ?? definition.name, ...basicsPayload(), is_draft: true });
    await onboardingDefinitionOps.saveConfig({ id, config: prepared() });
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
      notifications.success("Draft saved");
      onSaved?.();
    });

  const goNext = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));

  const validate = () =>
    run("validate", async () => {
      const id = await persist();
      const response = await onboardingDefinitionOps.validate({ id });
      const result = rowsOf(response)[0] ?? {};
      setProblems(result.problems ?? []);
      if (result.valid) notifications.success("Configuration is valid");
      return result.valid;
    });

  const submit = () =>
    run("submit", async () => {
      const id = await persist();
      const check = rowsOf(await onboardingDefinitionOps.validate({ id }))[0] ?? {};
      setProblems(check.problems ?? []);
      if (!check.valid) {
        notifications.error("Fix the listed problems before submitting");
        return;
      }
      // A rejected definition is resubmitted through edit(is_draft:false);
      // only a Draft uses submit (guide §9).
      if (isRejected) await onboardingDefinitionApi.edit({ id, name: def?.name ?? definition.name, ...basicsPayload(), is_draft: false });
      else await onboardingDefinitionApi.submit({ id, narration: basics.narration || "Submitted for review" });
      notifications.success("Submitted for review");
      onSaved?.();
      onClose();
    });

  const attemptClose = () => {
    if (dirty && !readOnly && !window.confirm("You have unsaved changes. Close without saving?")) return;
    onClose();
  };

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const ready = catalog && !mastersLoading && !loading;

  const summary = [
    ["Sections", config.sections.length],
    ["Fields", config.fields.length],
    ["Document groups", config.document_groups.length],
    ["Documents", config.documents.length],
    ["Address types", config.address_types.length],
    ["Employment statuses", config.employments.length],
    ["Relationship types", config.relationships.length],
    ["Sources of fund", config.sources_of_fund.length],
    ["Rules", config.rules.length],
  ];

  return (
    <Modal
      open
      onClose={attemptClose}
      title={`${readOnly ? "View" : "Edit"} onboarding configuration — ${def?.name ?? definition?.name ?? definition?.code ?? ""}`}
      size="full"
      growWithContent
      footer={
        <>
          <button type="button" onClick={attemptClose} className="px-3 py-2 text-sm font-bold text-muted-foreground">
            {readOnly ? "Close" : "Cancel"}
          </button>
          {stepIndex > 0 && (
            <button type="button" onClick={() => setStepIndex((i) => i - 1)} className="rounded-xl border px-4 py-2 text-sm font-bold text-slate-600">
              Back
            </button>
          )}
          {!readOnly && (
            <button
              type="button"
              disabled={Boolean(busy) || !ready}
              onClick={() => void saveDraft()}
              className="flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-50"
            >
              {busy === "draft" && <Spinner size={13} />}
              Save draft
            </button>
          )}
          {!isLast ? (
            <button
              type="button"
              disabled={Boolean(busy) || !ready}
              onClick={() => (readOnly ? setStepIndex((i) => i + 1) : void goNext())}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy === "next" && <Spinner size={13} />}
              Next
            </button>
          ) : (
            !readOnly && (
              <>
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void validate()}
                  className="flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-50"
                >
                  {busy === "validate" && <Spinner size={13} />}
                  Validate
                </button>
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void submit()}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busy === "submit" && <Spinner size={13} />}
                  {isRejected ? "Resubmit" : "Submit"}
                </button>
              </>
            )
          )}
        </>
      }
    >
      <div className="mb-5">
        <HorizontalStepper
          steps={STEPS}
          activeIndex={stepIndex}
          onStepClick={(index) => setStepIndex(index)}
        />
      </div>
      {!ready ? (
        <div className="flex justify-center py-12">
          <LoadingAnimation className="h-16 w-48" />
        </div>
      ) : (
        <>
          <h2 className="mb-3 text-sm font-bold text-slate-800">{step.label}</h2>
          {readOnly && (
            <p className="mb-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">{readOnlyReason}</p>
          )}
          {step.id === "basics" && (
            <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Minor age (years)
                <input type="number" min={0} disabled={readOnly} title={readOnly ? readOnlyReason : undefined} value={basics.minor_age_years} onChange={(e) => setBasic("minor_age_years", e.target.value)} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm disabled:bg-muted" />
                <span className="mt-1 block text-[11px] font-normal text-muted-foreground">Below this age the IS_MINOR rule fact is true.</span>
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Home country
                <FilterSelect className="mt-1.5" disabled={readOnly} disabledReason={readOnlyReason} value={basics.home_country_id} onChange={(v) => setBasic("home_country_id", v)} options={[{ value: "", label: "Select country" }, ...countries.map((c) => ({ value: c.id, label: c.name }))]} />
                <span className="mt-1 block text-[11px] font-normal text-muted-foreground">Required if any rule uses RESIDENCY_STATUS.</span>
              </label>
              <label className="text-sm font-semibold text-slate-700">
                KYC scheme
                <FilterSelect className="mt-1.5" disabled={readOnly} disabledReason={readOnlyReason} addAction={{ label: "Add KYC scheme", onClick: () => navigate("/kycschemes") }} value={basics.kyc_group_id} onChange={(v) => setBasic("kyc_group_id", v)} options={[{ value: "", label: "Select KYC scheme" }, ...kycGroups.map((g) => ({ value: g.id, label: `${g.name} (${g.code})` }))]} />
                <span className="mt-1 block text-[11px] font-normal text-muted-foreground">Must be an approved (Active) scheme by the time you submit.</span>
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Effective from
                <input type="date" disabled={readOnly} title={readOnly ? readOnlyReason : undefined} value={basics.effective_from} onChange={(e) => setBasic("effective_from", e.target.value)} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm disabled:bg-muted" />
              </label>
              {!readOnly && (
                <label className="text-sm font-semibold text-slate-700 md:col-span-2">
                  Narration
                  <textarea value={basics.narration} onChange={(e) => setBasic("narration", e.target.value)} className="mt-1.5 min-h-20 w-full rounded-xl border p-3 text-sm" />
                </label>
              )}
            </div>
          )}
          {step.id === "sections" && (
            <ListEditor items={config.sections} onChange={setList("sections")} spec={specs.sections} addLabel="Add section" readOnly={readOnly} readOnlyReason={readOnlyReason} itemTitle={(s) => s.section_code || "New section"} seed={{ label: "Add all standard sections", onClick: seedSections }} emptyText="No sections yet. PERSONAL must be enabled." />
          )}
          {step.id === "fields" && (
            <ListEditor items={config.fields} onChange={setList("fields")} spec={specs.fields} addLabel="Add field" readOnly={readOnly} readOnlyReason={readOnlyReason} itemTitle={(f) => f.field_code || "New field"} seed={{ label: "Add all fields of enabled sections", onClick: seedFields }} emptyText="Only fields of enabled sections can be added." />
          )}
          {step.id === "documents" && (
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="mb-2 text-sm font-bold text-slate-700">Document groups ("any N of these")</h3>
                <ListEditor items={config.document_groups} onChange={setList("document_groups")} spec={specs.document_groups} addLabel="Add group" readOnly={readOnly} readOnlyReason={readOnlyReason} itemTitle={(g) => g.name || g.code || "New group"} />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-bold text-slate-700">Documents</h3>
                <ListEditor items={config.documents} onChange={setList("documents")} spec={specs.documents} addLabel="Add document" readOnly={readOnly} readOnlyReason={readOnlyReason} itemTitle={(d) => d.document_type_code || "New document"} />
              </div>
            </div>
          )}
          {step.id === "addresses" && (
            <ListEditor items={config.address_types} onChange={setList("address_types")} spec={specs.address_types} addLabel="Add address type" readOnly={readOnly} readOnlyReason={readOnlyReason} itemTitle={(a) => a.address_type_code || "New address type"} />
          )}
          {step.id === "employment" && (
            <ListEditor items={config.employments} onChange={setList("employments")} spec={specs.employments} addLabel="Add employment status" readOnly={readOnly} readOnlyReason={readOnlyReason} itemTitle={(e) => e.employment_code || "New employment status"} />
          )}
          {step.id === "relationships" && (
            <ListEditor items={config.relationships} onChange={setList("relationships")} spec={specs.relationships} addLabel="Add relationship type" readOnly={readOnly} readOnlyReason={readOnlyReason} itemTitle={(r) => r.relationship_type_code || "New relationship type"} />
          )}
          {step.id === "sources" && (
            <ListEditor items={config.sources_of_fund} onChange={setList("sources_of_fund")} spec={specs.sources_of_fund} addLabel="Add source of funds" readOnly={readOnly} readOnlyReason={readOnlyReason} itemTitle={(s) => s.source_of_fund_code || "New source of funds"} />
          )}
          {step.id === "rules" && (
            <ListEditor items={config.rules} onChange={setList("rules")} spec={specs.rules} addLabel="Add rule" readOnly={readOnly} readOnlyReason={readOnlyReason} itemTitle={(r) => r.name || r.code || "New rule"} emptyText="No rules. Rules adapt the configuration, e.g. require a guardian for a minor." />
          )}
          {step.id === "review" && (
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {summary.map(([label, count]) => (
                  <div key={label} className="rounded-xl border bg-muted p-3">
                    <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                    <p className="text-lg font-black text-slate-800">{count}</p>
                  </div>
                ))}
              </div>
              {problems && (
                <div className={`rounded-xl border p-4 ${problems.length ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
                  <p className={`text-sm font-bold ${problems.length ? "text-red-700" : "text-emerald-700"}`}>
                    {problems.length ? `${problems.length} problem(s) to fix` : "No problems found — ready to submit"}
                  </p>
                  {problems.length > 0 && (
                    <ul className="mt-2 list-disc pl-5 text-sm text-red-700">
                      {problems.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {!readOnly && <p className="text-xs text-muted-foreground">Validate runs the same checks as Submit. Once submitted, the configuration is frozen.</p>}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
