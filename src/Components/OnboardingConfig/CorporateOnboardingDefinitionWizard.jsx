import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/Components/Common/Modal";
import { HorizontalStepper } from "@/Components/Common/HorizontalStepper";
import { LoadingAnimation } from "@/Components/Common/LoadingAnimation";
import { Spinner } from "@/Components/Common/Spinner";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { notifications } from "@/Utils/Lib/notifications";
import { corpOnboardingDefinitionApi, corpOnboardingDefinitionOps, masterApis, rowsOf } from "@/Services/Onboarding/onboarding.api";
import { ListEditor, cleanConfig } from "./ListEditor";
import { useCorpOnboardingCatalog, useCorpOnboardingMasters } from "./corporateOnboardingHooks";

// Corporate mirror of OnboardingDefinitionWizard.jsx (Corporate_Onboarding_
// Configuration_API.md §4-5): one in-memory `config` object edited across
// steps and replaced whole by save_config. No KYC-levels concept here yet
// (guide §8), and Basics only carries home_country_id/effective_from — no
// minor_age_years/kyc_group_id.
const STEPS = [
  { id: "basics", labelKey: "stepBasics" },
  { id: "sections", labelKey: "stepSections" },
  { id: "fields", labelKey: "stepFields" },
  { id: "addresses", labelKey: "stepAddresses" },
  { id: "related_parties", labelKey: "stepRelatedParties" },
  { id: "documents", labelKey: "stepDocuments" },
  { id: "taxes", labelKey: "stepTaxIdentifiers" },
  { id: "screenings", labelKey: "stepScreenings" },
  { id: "rules", labelKey: "stepRules" },
  { id: "review", labelKey: "stepReview" },
];

const EMPTY_CONFIG = {
  sections: [],
  fields: [],
  address_types: [],
  relationships: [],
  documents: [],
  taxes: [],
  screenings: [],
  rules: [],
};

const TARGET_TYPES = ["section", "field", "document", "address_type", "relationship", "tax"];
const asOptions = (list, valueKey = "code", labelOf = (x) => `${x.name} (${x.code})`) =>
  (list ?? []).map((x) => ({ value: x[valueKey], label: labelOf(x) }));

// Facts whose value is an id in a corp_ master (guide §3's rule_facts) and
// where to pick it/where "Add ..." should send the user.
const FACT_REF_SOURCE = {
  RELATIONSHIP_ADDED: "corp_relationship_type",
  ADDRESS_TYPE_ADDED: "corp_address_type",
  DOCUMENT_ADDED: "corp_document_type",
  TAX_TYPE_ADDED: "corp_tax_type",
};
const REF_SOURCE_MASTER = {
  corp_relationship_type: ["/corprelationshiptype", "addCorporateRelationshipType"],
  corp_address_type: ["/corpaddresstype", "addCorporateAddressType"],
  corp_document_type: ["/corpdocumenttype", "addCorporateDocumentType"],
  corp_tax_type: ["/taxtype", "addTaxType"],
};
const BOOLEAN_FACTS = new Set(["IS_FOREIGN_INCORPORATED"]);
const NUMBER_FACTS = new Set(["YEARS_SINCE_INCORPORATION"]);
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
  const { t } = useTranslation(["onboarding", "common"]);
  const { fact_code: fact, operator_code: operator } = condition;
  if (!fact || !operator || NO_VALUE_OPERATORS.has(operator)) return null;
  const set = (patch) => setCondition({ ...condition, ...patch });
  const input = "mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm disabled:bg-muted";
  if (BOOLEAN_FACTS.has(fact)) {
    return <CheckboxPill checked={Boolean(condition.value_boolean)} onChange={(v) => set({ value_boolean: v })} label={t("onboarding:valueIsTrue")} disabled={disabled} className="self-start" />;
  }
  if (NUMBER_FACTS.has(fact)) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          {t("onboarding:value")}
          <input type="number" min={0} className={input} disabled={disabled} value={condition.value_number ?? ""} onChange={(e) => set({ value_number: e.target.value === "" ? "" : Number(e.target.value) })} />
        </label>
        {RANGE_OPERATORS.has(operator) && (
          <label className="text-sm font-semibold text-slate-700">
            {t("onboarding:to")}
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
          <p className="text-sm font-semibold text-slate-700">{t("onboarding:values")}</p>
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
        {t("onboarding:value")}
        <FilterSelect
          className="mt-1.5"
          disabled={disabled}
          value={condition.value_ref_ids?.[0] ?? ""}
          onChange={(v) => set({ value_ref_ids: v === "" ? [] : [v] })}
          addAction={REF_SOURCE_MASTER[refSource] ? { label: t(`onboarding:${REF_SOURCE_MASTER[refSource][1]}`), onClick: () => navigate(REF_SOURCE_MASTER[refSource][0]) } : undefined}
          options={[{ value: "", label: t("onboarding:select") }, ...options]}
        />
      </label>
    );
  }
  // FIELD_VALUE (text) and anything else
  return (
    <label className="text-sm font-semibold text-slate-700">
      {t("onboarding:value")}
      <input className={input} disabled={disabled} value={condition.value_text ?? ""} onChange={(e) => set({ value_text: e.target.value })} />
    </label>
  );
}

// Reachable for a Draft (9), Rejected Add (5) or Active (1) definition — same
// reopen-for-reconfiguration rule as the individual wizard (guide §4).
const EDITABLE_PROCESS_STATUSES = new Set([9, 5, 1, 6, 7, 12, 15]);

export function CorporateOnboardingDefinitionWizard({ definition, forceReadOnly = false, onClose, onSaved }) {
  const { t } = useTranslation(["onboarding", "common"]);
  const steps = STEPS.map((s) => ({ ...s, label: t(`onboarding:${s.labelKey}`) }));
  const catalog = useCorpOnboardingCatalog();
  const { masters, countries, loading: mastersLoading } = useCorpOnboardingMasters();
  const [validationRules, setValidationRules] = useState([]);
  const [verificationMethods, setVerificationMethods] = useState([]);
  const [def, setDef] = useState(definition ?? null);
  const [basics, setBasics] = useState({ home_country_id: "", effective_from: "", narration: "" });
  const [config, setConfig] = useState(EMPTY_CONFIG);
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [problems, setProblems] = useState(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    masterApis.validation_rule
      .list({ page: 1, limit: 200 })
      .then((r) => setValidationRules(rowsOf(r).filter((row) => Number(row.status) === 1)))
      .catch(() => setValidationRules([]));
    masterApis.verification_method
      .list({ page: 1, limit: 200 })
      .then((r) => setVerificationMethods(rowsOf(r).filter((row) => Number(row.status) === 1)))
      .catch(() => setVerificationMethods([]));
  }, []);

  const processStatus = Number(def?.process_status ?? 9);
  const readOnly = forceReadOnly || (Boolean(def) && !EDITABLE_PROCESS_STATUSES.has(processStatus));
  const readOnlyReason = forceReadOnly
    ? t("onboarding:viewingOnly")
    : t("onboarding:configurationFrozenReason", { status: def?.process_status_name ?? t("onboarding:frozen") });
  const isRejected = processStatus === 5;

  useEffect(() => {
    let cancelled = false;
    corpOnboardingDefinitionOps
      .get({ id: definition.id })
      .then((response) => {
        if (cancelled) return;
        const data = rowsOf(response)[0] ?? {};
        setDef(data.definition ?? definition);
        setConfig({ ...EMPTY_CONFIG, ...(data.config ?? {}) });
        setBasics({
          home_country_id: data.definition?.home_country_id ?? "",
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

  const targetOptions = {
    section: codesOf("sections", "section_code"),
    field: codesOf("fields", "field_code"),
    document: codesOf("documents", "document_type_code"),
    address_type: codesOf("address_types", "address_type_code"),
    relationship: codesOf("relationships", "relationship_type_code"),
    tax: codesOf("taxes", "tax_type_code"),
  };
  const refOptions = {
    corp_relationship_type: (masters.corp_relationship_type ?? []).map((m) => ({ value: m.id, label: m.name })),
    corp_address_type: (masters.corp_address_type ?? []).map((m) => ({ value: m.id, label: m.name })),
    corp_document_type: (masters.corp_document_type ?? []).map((m) => ({ value: m.id, label: m.name })),
    corp_tax_type: (masters.corp_tax_type ?? []).map((m) => ({ value: m.id, label: m.name })),
  };

  const seedSections = () => {
    const have = new Set(config.sections.map((s) => s.section_code));
    const added = (catalog?.sections ?? [])
      .filter((s) => s.is_customer_entered !== false && !have.has(s.code))
      .map((s) => ({ section_code: s.code, enabled: true, mandatory: s.code === "GENERAL", sequence_no: s.sequence_no }));
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
      { key: "section_code", label: t("onboarding:section"), type: "select", required: true, options: asOptions((catalog?.sections ?? []).filter((s) => s.is_customer_entered !== false)) },
      { key: "enabled", label: t("onboarding:enabled"), type: "bool", defaultValue: true, disabled: (i) => i.section_code === "GENERAL" },
      { key: "mandatory", label: t("onboarding:mandatory"), type: "bool" },
      { key: "sequence_no", label: t("onboarding:order"), type: "number" },
      { key: "label_override", label: t("onboarding:labelOverride"), type: "text" },
    ],
    fields: [
      {
        key: "field_code",
        label: t("onboarding:field"),
        type: "select",
        required: true,
        options: asOptions(
          (catalog?.fields ?? []).filter((f) => enabledSectionCodes.has(f.section_code) && !f.is_system_populated),
        ),
      },
      { key: "mandatory", label: t("onboarding:mandatory"), type: "bool", disabled: (i) => lockedFieldCodes.has(i.field_code) },
      { key: "visible", label: t("onboarding:visible"), type: "bool", defaultValue: true, disabled: (i) => lockedFieldCodes.has(i.field_code) },
      { key: "read_only", label: t("onboarding:readOnly"), type: "bool" },
      { key: "sequence_no", label: t("onboarding:order"), type: "number" },
      { key: "validation_rule_code", label: t("onboarding:validationRule"), type: "select", addTo: ["/validationrule", t("onboarding:addValidationRule")], options: asOptions(validationRules) },
      { key: "label_override", label: t("onboarding:labelOverride"), type: "text" },
      { key: "help_text", label: t("onboarding:helpText"), type: "text" },
      { key: "default_value", label: t("onboarding:defaultValue"), type: "text" },
    ],
    address_types: [
      { key: "address_type_code", label: t("onboarding:addressType"), type: "select", addTo: ["/corpaddresstype", t("onboarding:addCorporateAddressType")], required: true, options: asOptions(masters.corp_address_type) },
      { key: "mandatory", label: t("onboarding:mandatory"), type: "bool" },
      { key: "min_count", label: t("onboarding:minCount"), type: "number" },
      { key: "max_count", label: t("onboarding:maxCount"), type: "number", defaultValue: 1, hint: t("onboarding:n0AnyNumber") },
      { key: "proof_required", label: t("onboarding:proofRequired"), type: "bool" },
      { key: "sequence_no", label: t("onboarding:order"), type: "number" },
      { key: "allow_same_as", label: t("onboarding:allowSameAsAnotherAddress"), type: "bool" },
      {
        key: "same_as_address_type_code",
        label: t("onboarding:sameAs"),
        type: "select",
        showIf: (i) => i.allow_same_as,
        options: (i) => asOptions(masters.corp_address_type).filter((o) => o.value !== i.address_type_code),
      },
    ],
    relationships: [
      { key: "relationship_type_code", label: t("onboarding:relationshipType"), type: "select", addTo: ["/corprelationshiptype", t("onboarding:addCorporateRelationshipType")], required: true, options: asOptions(masters.corp_relationship_type) },
      { key: "mandatory", label: t("onboarding:mandatory"), type: "bool" },
      { key: "min_count", label: t("onboarding:minCount"), type: "number" },
      { key: "max_count", label: t("onboarding:maxCount"), type: "number", hint: t("onboarding:omittedOr0AnyNumber") },
      { key: "sequence_no", label: t("onboarding:order"), type: "number" },
      { key: "share_percent_required", label: t("onboarding:ownershipRequired"), type: "bool" },
      { key: "fixed_share_percent", label: t("onboarding:fixedShare"), type: "number", showIf: (i) => i.share_percent_required, hint: t("onboarding:eG100ForASoleProprietor") },
    ],
    documents: [
      { key: "document_type_code", label: t("onboarding:documentType"), type: "select", addTo: ["/corpdocumenttype", t("onboarding:addCorporateDocumentType")], required: true, options: asOptions(masters.corp_document_type) },
      { key: "mandatory", label: t("onboarding:mandatory"), type: "bool" },
      { key: "min_count", label: t("onboarding:minCount"), type: "number", defaultValue: 1 },
      { key: "max_count", label: t("onboarding:maxCount"), type: "number", defaultValue: 1, hint: t("onboarding:n0AnyNumberMultiple") },
      { key: "front_required", label: t("onboarding:frontRequired"), type: "bool", defaultValue: true },
      { key: "back_required", label: t("onboarding:backRequired"), type: "bool" },
      { key: "number_required", label: t("onboarding:numberRequired"), type: "bool" },
      { key: "number_validation_rule_code", label: t("onboarding:numberValidationRule"), type: "select", addTo: ["/validationrule", t("onboarding:addValidationRule")], options: asOptions(validationRules), showIf: (i) => i.number_required },
      { key: "issue_date_required", label: t("onboarding:issueDateRequired"), type: "bool" },
      { key: "expiry_date_required", label: t("onboarding:expiryDateRequired"), type: "bool" },
      { key: "verification_required", label: t("onboarding:verificationRequired"), type: "bool" },
      { key: "verification_method_code", label: t("onboarding:verificationMethod"), type: "select", addTo: ["/verificationmethod", t("onboarding:addVerificationMethod")], options: asOptions(verificationMethods), showIf: (i) => i.verification_required },
      { key: "max_file_size_kb", label: t("onboarding:maxFileSizeKb"), type: "number" },
      { key: "file_formats", label: t("onboarding:fileFormatsEmptyAny"), type: "multi", wide: true, options: (catalog?.file_formats ?? []).map((f) => ({ value: f.code ?? f, label: f.code ?? f })) },
      { key: "sequence_no", label: t("onboarding:order"), type: "number" },
    ],
    taxes: [
      { key: "tax_type_code", label: t("onboarding:taxType"), type: "select", addTo: ["/taxtype", t("onboarding:addTaxType")], required: true, options: asOptions(masters.corp_tax_type) },
      { key: "mandatory", label: t("onboarding:mandatory"), type: "bool", hint: t("onboarding:aConditionalTaxIdentifierIsLeftUnmandatory") },
      { key: "number_validation_rule_code", label: t("onboarding:numberValidationRule"), type: "select", addTo: ["/validationrule", t("onboarding:addValidationRule")], options: asOptions(validationRules) },
      { key: "sequence_no", label: t("onboarding:order"), type: "number" },
    ],
    screenings: [
      {
        key: "relationship_type_code",
        label: t("onboarding:relatedPartyRole"),
        type: "select",
        placeholder: t("onboarding:theCompanyItself"),
        options: asOptions(masters.corp_relationship_type),
        hint: t("onboarding:leaveUnsetToScreenTheCompanyItself"),
      },
      { key: "screening_type_code", label: t("onboarding:screening"), type: "select", addTo: ["/screeningtype", t("onboarding:addScreeningType")], required: true, options: asOptions(masters.corp_screening_type) },
      { key: "mandatory", label: t("onboarding:mandatory"), type: "bool", defaultValue: true },
      { key: "sequence_no", label: t("onboarding:order"), type: "number" },
    ],
    rules: [
      { key: "code", label: t("onboarding:ruleCode"), type: "text", required: true },
      { key: "name", label: t("onboarding:ruleName"), type: "text", required: true },
      { key: "description", label: t("common:description"), type: "text", wide: true },
      { key: "priority", label: t("onboarding:priorityLowerRunsFirst"), type: "number", defaultValue: 100 },
      { key: "enabled", label: t("onboarding:enabled"), type: "bool", defaultValue: true },
      {
        key: "conditions",
        label: t("onboarding:whenAllOfTheseAreTrue"),
        type: "list",
        addLabel: t("onboarding:addCondition"),
        itemTitle: (c, i) => t("onboarding:conditionN", { n: i + 1 }),
        spec: [
          { key: "fact_code", label: t("onboarding:fact"), type: "select", required: true, options: asOptions(catalog?.rule_facts) },
          { key: "operator_code", label: t("onboarding:operator"), type: "select", required: true, options: asOptions(catalog?.rule_operators) },
          {
            key: "field_code",
            label: t("onboarding:field"),
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
        label: t("onboarding:thenApplyAllOfThese"),
        type: "list",
        addLabel: t("onboarding:addEffect"),
        itemTitle: (e, i) => t("onboarding:effectN", { n: i + 1 }),
        spec: [
          { key: "action_code", label: t("onboarding:action"), type: "select", required: true, options: asOptions(catalog?.rule_actions) },
          { key: "target_type", label: t("onboarding:targetType"), type: "select", required: true, options: TARGET_TYPES.map((t) => ({ value: t, label: t })) },
          {
            key: "target_key",
            label: t("onboarding:target"),
            type: "select",
            required: true,
            options: (e) => (targetOptions[e.target_type] ?? []).map((code) => ({ value: code, label: code })),
            hint: t("onboarding:onlyItemsAlreadyInThisDefinitionS"),
          },
        ],
      },
    ],
  };

  // Locked catalog fields can never be hidden/optional (guide §6); force it
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
      home_country_id: basics.home_country_id === "" ? undefined : Number(basics.home_country_id),
      effective_from: basics.effective_from,
    });

  // Same reasoning as the individual wizard's persist(): `edit ...
  // is_draft:true` both updates Basics AND is what reopens an Active
  // definition for config editing again, so it's safe to run
  // unconditionally rather than branching on "first save".
  const persist = async () => {
    const id = definition.id;
    await corpOnboardingDefinitionApi.edit({ id, name: def?.name ?? definition.name, ...basicsPayload(), is_draft: true });
    await corpOnboardingDefinitionOps.saveConfig({ id, config: prepared() });
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
      const response = await corpOnboardingDefinitionOps.validate({ id });
      const result = rowsOf(response)[0] ?? {};
      setProblems(result.problems ?? []);
      if (result.valid) notifications.success("Configuration is valid");
      return result.valid;
    });

  const submit = () =>
    run("submit", async () => {
      const id = await persist();
      const check = rowsOf(await corpOnboardingDefinitionOps.validate({ id }))[0] ?? {};
      setProblems(check.problems ?? []);
      if (!check.valid) {
        notifications.error("Fix the listed problems before submitting");
        return;
      }
      if (isRejected) await corpOnboardingDefinitionApi.edit({ id, name: def?.name ?? definition.name, ...basicsPayload(), is_draft: false });
      else await corpOnboardingDefinitionApi.submit({ id, narration: basics.narration || "Submitted for review" });
      notifications.success("Submitted for review");
      onSaved?.();
      onClose();
    });

  const attemptClose = () => {
    if (dirty && !readOnly && !window.confirm(t("onboarding:unsavedChangesConfirm"))) return;
    onClose();
  };

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const ready = catalog && !mastersLoading && !loading;

  const summary = [
    [t("onboarding:stepSections"), config.sections.length],
    [t("onboarding:stepFields"), config.fields.length],
    [t("onboarding:addressTypes"), config.address_types.length],
    [t("onboarding:stepRelatedParties"), config.relationships.length],
    [t("onboarding:documents"), config.documents.length],
    [t("onboarding:stepTaxIdentifiers"), config.taxes.length],
    [t("onboarding:stepScreenings"), config.screenings.length],
    [t("onboarding:stepRules"), config.rules.length],
  ];

  return (
    <Modal
      open
      onClose={attemptClose}
      title={t(readOnly ? "onboarding:viewCorporateOnboardingConfigurationTitle" : "onboarding:editCorporateOnboardingConfigurationTitle", { name: def?.name ?? definition?.name ?? definition?.code ?? "" })}
      size="full"
      growWithContent
      footer={
        <>
          <button type="button" onClick={attemptClose} className="px-3 py-2 text-sm font-bold text-muted-foreground">
            {readOnly ? t("common:close") : t("common:cancel")}
          </button>
          {stepIndex > 0 && (
            <button type="button" onClick={() => setStepIndex((i) => i - 1)} className="rounded-xl border px-4 py-2 text-sm font-bold text-slate-600">
              {t("common:back")}
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
              {t("onboarding:saveDraft")}
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
              {t("common:next")}
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
                  {t("onboarding:validate")}
                </button>
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void submit()}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busy === "submit" && <Spinner size={13} />}
                  {isRejected ? t("onboarding:resubmit") : t("common:submit")}
                </button>
              </>
            )
          )}
        </>
      }
    >
      <div className="mb-5">
        <HorizontalStepper steps={steps} activeIndex={stepIndex} onStepClick={(index) => setStepIndex(index)} />
      </div>
      {!ready ? (
        <div className="flex justify-center py-12">
          <LoadingAnimation className="h-16 w-48" />
        </div>
      ) : (
        <>
          <h2 className="mb-3 text-sm font-bold text-slate-800">{steps[stepIndex].label}</h2>
          {readOnly && <p className="mb-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">{readOnlyReason}</p>}
          {step.id === "basics" && (
            <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                {t("onboarding:homeCountry")}
                <FilterSelect className="mt-1.5" disabled={readOnly} disabledReason={readOnlyReason} value={basics.home_country_id} onChange={(v) => setBasic("home_country_id", v)} options={[{ value: "", label: t("onboarding:selectCountry") }, ...countries.map((c) => ({ value: c.id, label: c.name }))]} />
                <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("onboarding:corpHomeCountryHint")}</span>
              </label>
              <label className="text-sm font-semibold text-slate-700">
                {t("onboarding:effectiveFrom")}
                <input type="date" disabled={readOnly} title={readOnly ? readOnlyReason : undefined} value={basics.effective_from} onChange={(e) => setBasic("effective_from", e.target.value)} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm disabled:bg-muted" />
              </label>
              {!readOnly && (
                <label className="text-sm font-semibold text-slate-700 md:col-span-2">
                  {t("onboarding:narration")}
                  <textarea value={basics.narration} onChange={(e) => setBasic("narration", e.target.value)} className="mt-1.5 min-h-20 w-full rounded-xl border p-3 text-sm" />
                </label>
              )}
            </div>
          )}
          {step.id === "sections" && (
            <ListEditor items={config.sections} onChange={setList("sections")} spec={specs.sections} addLabel={t("onboarding:addSection")} readOnly={readOnly} readOnlyReason={readOnlyReason} itemTitle={(s) => s.section_code || t("onboarding:newSection")} seed={{ label: t("onboarding:addAllSections"), onClick: seedSections }} emptyText={t("onboarding:noSectionsYetGeneralMustBeEnabled")} />
          )}
          {step.id === "fields" && (
            <ListEditor items={config.fields} onChange={setList("fields")} spec={specs.fields} addLabel={t("onboarding:addField")} readOnly={readOnly} readOnlyReason={readOnlyReason} itemTitle={(f) => f.field_code || t("onboarding:newField")} seed={{ label: t("onboarding:addAllFieldsOfEnabledSections"), onClick: seedFields }} emptyText={t("onboarding:onlyFieldsOfEnabledSectionsCanBe")} />
          )}
          {step.id === "addresses" && (
            <ListEditor items={config.address_types} onChange={setList("address_types")} spec={specs.address_types} addLabel={t("onboarding:addAddressType")} readOnly={readOnly} readOnlyReason={readOnlyReason} itemTitle={(a) => a.address_type_code || t("onboarding:newAddressType")} />
          )}
          {step.id === "related_parties" && (
            <ListEditor items={config.relationships} onChange={setList("relationships")} spec={specs.relationships} addLabel={t("onboarding:addRelatedPartyType")} readOnly={readOnly} readOnlyReason={readOnlyReason} itemTitle={(r) => r.relationship_type_code || t("onboarding:newRelatedPartyType")} />
          )}
          {step.id === "documents" && (
            <ListEditor items={config.documents} onChange={setList("documents")} spec={specs.documents} addLabel={t("onboarding:addDocument")} readOnly={readOnly} readOnlyReason={readOnlyReason} itemTitle={(d) => d.document_type_code || t("onboarding:newDocument")} />
          )}
          {step.id === "taxes" && (
            <ListEditor items={config.taxes} onChange={setList("taxes")} spec={specs.taxes} addLabel={t("onboarding:addTaxIdentifier")} readOnly={readOnly} readOnlyReason={readOnlyReason} itemTitle={(x) => x.tax_type_code || t("onboarding:newTaxIdentifier")} />
          )}
          {step.id === "screenings" && (
            <ListEditor items={config.screenings} onChange={setList("screenings")} spec={specs.screenings} addLabel={t("onboarding:addScreening")} readOnly={readOnly} readOnlyReason={readOnlyReason} itemTitle={(s) => s.screening_type_code || t("onboarding:newScreening")} emptyText={t("onboarding:noScreeningsYet")} />
          )}
          {step.id === "rules" && (
            <ListEditor items={config.rules} onChange={setList("rules")} spec={specs.rules} addLabel={t("onboarding:addRule")} readOnly={readOnly} readOnlyReason={readOnlyReason} itemTitle={(r) => r.name || r.code || t("onboarding:newRule")} emptyText={t("onboarding:noRulesRulesAdaptTheConfigurationE2")} />
          )}
          {step.id === "review" && (
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-4">
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
                    {problems.length ? t("onboarding:problemsToFix", { count: problems.length }) : t("onboarding:noProblemsReadyToSubmit")}
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
              {!readOnly && <p className="text-xs text-muted-foreground">{t("onboarding:validateRunsTheSameChecksAsSubmit")}</p>}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
