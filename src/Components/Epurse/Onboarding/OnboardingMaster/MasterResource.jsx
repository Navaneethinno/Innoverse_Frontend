import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { notifications, apiMessage } from "@/Utils/Lib/notifications";
import { masterApi } from "@/Services/Master/master.api";
import { masterApis as baseMasterApis, createLifecycle, rowsOf } from "@/Services/Epurse/onboarding.api";
import { usePartyTypes } from "@/Hooks/Master/masterHooks";
import { LifecycleList } from "../OnboardingConfiguration/LifecycleList";
import { FieldInput, cleanConfig } from "../OnboardingConfiguration/ListEditor";
import { useOnboardingCatalog } from "../OnboardingConfiguration/onboardingHooks";

// One schema-driven page for the institution masters that carry extra fields
// beyond name/description (guide §5): validation rules, income / net-worth /
// turnover ranges, risk categories, document types, plus the plain
// code+name masters (title, kinship, business nature). Every master shares
// the maker-checker lifecycle, so each just declares its API base, its
// columns and the fields of its add/edit form.
const HEX = /^#[0-9a-fA-F]{6}$/;
const LENGTH_TEXT_TYPES = new Set(["ANY_TEXT", "NUMERIC", "ALPHABETIC", "ALPHANUMERIC"]);
const asOptions = (list, valueKey = "id", labelOf = (x) => x.name ?? x.code) => (list ?? []).map((x) => ({ value: x[valueKey], label: labelOf(x) }));

// A /master/currency record is { id, alpha_code, currency_name, ... } — no
// `name`/`code` fields, unlike every other master this page's asOptions
// default (x.name ?? x.code) was written for. Left as the default, every
// currency option silently rendered a blank label (asOptions' fallback
// resolved to undefined) and the table column's own `.name` lookup below
// always missed too, falling through to the raw currency_id.
const currencyLabel = (c) => c.currency_name ?? c.alpha_code ?? String(c.id);
const rangeConfig = (title, base) => ({
  title,
  base,
  columns: (ctx) => [
    { key: "code", label: ctx.t("onboarding:code") },
    { key: "name", label: ctx.t("onboarding:name") },
    // The row itself already carries currency_name straight from the API
    // (Net_Worth_Range's /list response, confirmed live) — no need to
    // cross-reference the separate /master/currency list at all, and it
    // stays correct even before that list has finished loading.
    { key: "currency_id", label: ctx.t("onboarding:currency"), render: (r) => r.currency_name ?? r.currency_id ?? "-" },
    { key: "min_value", label: ctx.t("onboarding:min"), render: (r) => r.min_value ?? "-" },
    { key: "max_value", label: ctx.t("onboarding:max"), render: (r) => r.max_value ?? ctx.t("onboarding:andAbove") },
  ],
  fields: (ctx) => [
    { key: "currency_id", label: ctx.t("onboarding:currency"), type: "select", required: true, options: asOptions(ctx.currencies, "id", currencyLabel), lockedOnEdit: true },
    { key: "min_value", label: ctx.t("onboarding:minValue"), type: "number", required: true },
    { key: "max_value", label: ctx.t("onboarding:maxValue"), type: "number", hint: ctx.t("onboarding:leaveEmptyForAndAboveRangesOf") },
  ],
});

const plain = (title, base) => ({ title, base, columns: (ctx) => [{ key: "code", label: ctx.t("onboarding:code") }, { key: "name", label: ctx.t("onboarding:name") }], fields: () => [] });

// title/kinship/business_nature/the four ranges/document_type moved under
// indv_ (2026-09 route change); risk_category/validation_rule below are
// shared masters that kept their old routes.
const CONFIGS = {
  title: plain("Title", "/master_config/indv_title"),
  kinship: plain("Kinship", "/master_config/indv_kinship"),
  business_nature: plain("Business Nature", "/master_config/indv_business_nature"),
  annual_income_range: rangeConfig("Annual Income Range", "/master_config/indv_annual_income_range"),
  monthly_income_range: rangeConfig("Monthly Income Range", "/master_config/indv_monthly_income_range"),
  net_worth_range: rangeConfig("Net Worth Range", "/master_config/indv_net_worth_range"),
  turnover_range: rangeConfig("Turnover Range", "/master_config/indv_turnover_range"),
  document_type: {
    title: "Document Type",
    base: "/master_config/indv_document_type",
    columns: (ctx) => [
      { key: "code", label: ctx.t("onboarding:code") },
      { key: "name", label: ctx.t("onboarding:name") },
      { key: "purpose_id", label: ctx.t("onboarding:purpose"), render: (r) => ctx.catalog?.document_purposes?.find((p) => p.id === r.purpose_id)?.name ?? r.purpose_id ?? "-" },
    ],
    fields: (ctx) => [
      { key: "purpose_id", label: ctx.t("onboarding:purpose"), type: "select", required: true, options: asOptions(ctx.catalog?.document_purposes, "id"), hint: ctx.t("onboarding:decidesWhichDocumentGroupAndKycSlot") },
    ],
  },
  risk_category: {
    title: "Risk Category",
    base: "/master_config/risk_category",
    columns: (ctx) => [
      { key: "code", label: ctx.t("onboarding:code") },
      { key: "name", label: ctx.t("onboarding:name") },
      { key: "score", label: ctx.t("onboarding:scoreBand"), sortable: false, render: (r) => `${r.min_score} – ${r.max_score}` },
      { key: "color_code", label: ctx.t("onboarding:colour"), sortable: false, render: (r) => (r.color_code ? <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded border" style={{ backgroundColor: r.color_code }} />{r.color_code}</span> : "-") },
      { key: "risk_action_id", label: ctx.t("onboarding:action"), render: (r) => ctx.catalog?.risk_actions?.find((a) => a.id === r.risk_action_id)?.name ?? r.risk_action_id ?? "-" },
    ],
    fields: (ctx) => [
      { key: "min_score", label: ctx.t("onboarding:minScore0100"), type: "number", required: true },
      { key: "max_score", label: ctx.t("onboarding:maxScore0100"), type: "number", required: true, hint: ctx.t("onboarding:scoreBandsMustNotOverlap") },
      { key: "color_code", label: ctx.t("onboarding:colourRrggbb"), type: "text", hint: "e.g. #C62828" },
      { key: "risk_action_id", label: ctx.t("onboarding:riskAction"), type: "select", required: true, options: asOptions(ctx.catalog?.risk_actions, "id") },
    ],
  },
  validation_rule: {
    title: "Validation Rule",
    base: "/master_config/validation_rule",
    columns: (ctx) => [
      { key: "code", label: ctx.t("onboarding:code") },
      { key: "name", label: ctx.t("onboarding:name") },
      { key: "validation_type_id", label: ctx.t("onboarding:type"), render: (r) => ctx.catalog?.validation_types?.find((t) => t.id === r.validation_type_id)?.name ?? r.validation_type_id ?? "-" },
      { key: "error_message", label: ctx.t("onboarding:errorMessage"), render: (r) => r.error_message ?? "-" },
    ],
    // Which parameters apply depends on the chosen validation type; sending
    // one the type doesn't use is refused (guide §5.4), so hide the rest.
    fields: (ctx) => {
      const type = (item) => ctx.catalog?.validation_types?.find((t) => t.id === item.validation_type_id);
      const is = (item, flag) => Boolean(type(item)?.[flag]);
      return [
        { key: "validation_type_id", label: ctx.t("onboarding:validationType"), type: "select", required: true, options: asOptions(ctx.catalog?.validation_types, "id", (t) => `${t.name} (${t.code})`), lockedOnEdit: true, hint: ctx.t("onboarding:theTypeDecidesWhichParametersApply") },
        { key: "fixed_length", label: ctx.t("onboarding:fixedLength"), type: "number", showIf: (i) => is(i, "requires_fixed_length") || type(i)?.code === "NUMERIC" },
        { key: "min_length", label: ctx.t("onboarding:minLength"), type: "number", showIf: (i) => is(i, "requires_length_range") || LENGTH_TEXT_TYPES.has(type(i)?.code) },
        { key: "max_length", label: ctx.t("onboarding:maxLength"), type: "number", showIf: (i) => is(i, "requires_length_range") || LENGTH_TEXT_TYPES.has(type(i)?.code) },
        { key: "pattern", label: ctx.t("onboarding:patternRegex"), type: "text", wide: true, showIf: (i) => is(i, "requires_pattern") },
        { key: "allowed_chars", label: ctx.t("onboarding:allowedCharacters"), type: "text", showIf: (i) => is(i, "requires_allowed_chars") },
        { key: "min_value", label: ctx.t("onboarding:minValue"), type: "number", showIf: (i) => is(i, "requires_value_range") },
        { key: "max_value", label: ctx.t("onboarding:maxValue"), type: "number", showIf: (i) => is(i, "requires_value_range") },
        { key: "min_date", label: ctx.t("onboarding:minDate"), type: "date", showIf: (i) => is(i, "requires_date_range") },
        { key: "max_date", label: ctx.t("onboarding:maxDate"), type: "date", showIf: (i) => is(i, "requires_date_range") },
        { key: "min_age_years", label: ctx.t("onboarding:minAgeYears"), type: "number", showIf: (i) => is(i, "requires_age_range") },
        { key: "max_age_years", label: ctx.t("onboarding:maxAgeYears"), type: "number", showIf: (i) => is(i, "requires_age_range") },
        { key: "error_message", label: ctx.t("onboarding:errorMessageShownToTheCustomer"), type: "text", required: true, wide: true },
      ];
    },
  },
  // --- Corporate Onboarding Configuration masters (Corporate_Onboarding_
  // Configuration_API.md §2, 2026-09) — same maker-checker CRUD shape as
  // the individual masters above, under their own corp_ base paths.
  corp_company_type: plain("Company Type", "/master_config/corp_company_type"),
  corp_address_type: plain("Corporate Address Type", "/master_config/corp_address_type"),
  corp_relationship_type: plain("Corporate Relationship Type", "/master_config/corp_relationship_type"),
  corp_document_type: plain("Corporate Document Type", "/master_config/corp_document_type"),
  corp_identification_type: {
    title: "Identification Type",
    base: "/master_config/corp_identification_type",
    columns: (ctx) => [
      { key: "code", label: ctx.t("onboarding:code") },
      { key: "name", label: ctx.t("onboarding:name") },
      { key: "front_required", label: ctx.t("onboarding:frontRequired"), render: (r) => (r.front_required ? ctx.t("common:yes") : ctx.t("common:no")) },
      { key: "back_required", label: ctx.t("onboarding:backRequired"), render: (r) => (r.back_required ? ctx.t("common:yes") : ctx.t("common:no")) },
      { key: "validation_rule_id", label: ctx.t("onboarding:validationRule"), render: (r) => ctx.validationRules?.find((v) => v.id === r.validation_rule_id)?.name ?? "-" },
    ],
    fields: (ctx) => [
      { key: "front_required", label: ctx.t("onboarding:frontRequired"), type: "bool", defaultValue: true },
      // Backend refuses back_required without front_required — surfaced as
      // its own error rather than blocked client-side, same as every other
      // cross-field refusal in this app (guide §2: "back_required needs
      // front_required").
      { key: "back_required", label: ctx.t("onboarding:backRequired"), type: "bool" },
      {
        key: "validation_rule_id",
        label: ctx.t("onboarding:validationRule"),
        type: "select",
        options: asOptions(ctx.validationRules),
        hint: ctx.t("onboarding:mustBeAnActiveRuleThatApplies"),
      },
    ],
  },
  corp_tax_type: plain("Tax Type", "/master_config/corp_tax_type"),
  corp_screening_type: plain("Screening Type", "/master_config/corp_screening_type"),
  corp_business_nature: plain("Corporate Business Nature", "/master_config/corp_business_nature"),
  corp_industry_sector: plain("Industry Sector", "/master_config/corp_industry_sector"),
  corp_merchant_category: plain("Merchant Category", "/master_config/corp_merchant_category"),
  corp_merchant_group: {
    title: "Merchant Group",
    base: "/master_config/corp_merchant_group",
    columns: (ctx) => [
      { key: "code", label: ctx.t("onboarding:code") },
      { key: "name", label: ctx.t("onboarding:name") },
      { key: "party_type_id", label: ctx.t("onboarding:partyType"), render: (r) => ctx.partyTypes?.find((p) => p.id === r.party_type_id)?.name ?? r.party_type_id ?? "-" },
    ],
    fields: (ctx) => [
      {
        key: "party_type_id",
        label: ctx.t("onboarding:partyType"),
        type: "select",
        required: true,
        options: asOptions(ctx.partyTypes),
        hint: ctx.t("onboarding:mustBeMerchantOrAgentRefusedOtherwise"),
      },
    ],
  },
  corp_gst_registration_status: plain("GST Registration Status", "/master_config/corp_gst_registration_status"),
  corp_tax_exemption_status: plain("Tax Exemption Status", "/master_config/corp_tax_exemption_status"),
  // Shared by every customer type (not corp_-prefixed) — the settlement
  // account bank/branch masters (guide §2).
  bank: plain("Bank", "/master_config/bank"),
  bank_branch: {
    title: "Bank Branch",
    base: "/master_config/bank_branch",
    columns: (ctx) => [
      { key: "code", label: ctx.t("onboarding:code") },
      { key: "name", label: ctx.t("onboarding:name") },
      { key: "bank_id", label: ctx.t("onboarding:bank"), render: (r) => ctx.banks?.find((b) => b.id === r.bank_id)?.name ?? r.bank_id ?? "-" },
    ],
    fields: (ctx) => [
      { key: "bank_id", label: ctx.t("onboarding:bank"), type: "select", required: true, options: asOptions(ctx.banks), lockedOnEdit: true, hint: ctx.t("onboarding:codeAndNameAreUniqueWithinThe") },
    ],
  },
};

const apiCache = {};
const apiFor = (name) => (apiCache[name] ??= baseMasterApis[name] ?? createLifecycle(CONFIGS[name].base));

// While a Draft edit is staged, the live /list row is intentionally left
// untouched (the staged values only exist in a new /audit row until a
// checker approves) — reopening Edit straight off the /list row therefore
// always showed the pre-edit values. The newest audit row (audit is
// newest-first) holds what was actually staged.
async function draftAwareRow(api, row) {
  if (String(row?.process_status_name ?? "").trim().toUpperCase() !== "DRAFT") return row;
  try {
    const response = await api.audit({ id: row.id, page: 1, limit: 1 });
    const latest = (Array.isArray(response?.data) ? response.data : response?.data?.data ?? [])[0];
    return latest ? { ...row, ...latest } : row;
  } catch {
    return row;
  }
}

export function MasterResource({ entity }) {
  const { t } = useTranslation(["onboarding", "common"]);
  const config = CONFIGS[entity];
  // config.title stays English: it is also the menu name the permission
  // check matches. The heading/buttons show this translated title instead.
  const displayTitle = t(`onboarding:masterTitle_${entity}`, { defaultValue: config.title });
  const api = apiFor(entity);
  const catalog = useOnboardingCatalog();
  const { partyTypes } = usePartyTypes(entity === "corp_merchant_group");
  const [currencies, setCurrencies] = useState([]);
  const [validationRules, setValidationRules] = useState([]);
  const [banks, setBanks] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const ctx = useMemo(
    () => ({ catalog, currencies, validationRules, banks, partyTypes, t }),
    [catalog, currencies, validationRules, banks, partyTypes, t],
  );

  useEffect(() => {
    if (!entity.endsWith("_range")) return;
    masterApi.currencyList().then(setCurrencies).catch(() => setCurrencies([]));
  }, [entity]);

  useEffect(() => {
    if (entity !== "corp_identification_type") return;
    baseMasterApis.validation_rule
      .list({ page: 1, limit: 200 })
      .then((r) => setValidationRules(rowsOf(r).filter((row) => Number(row.status) === 1)))
      .catch(() => setValidationRules([]));
  }, [entity]);

  useEffect(() => {
    if (entity !== "bank_branch") return;
    apiFor("bank")
      .list({ page: 1, limit: 200 })
      .then((r) => setBanks(rowsOf(r).filter((row) => Number(row.status) === 1)))
      .catch(() => setBanks([]));
  }, [entity]);

  const fields = config.fields(ctx);
  const editing = form?.editingRow;

  const save = async (draft) => {
    if (!form.code?.trim() || !form.name?.trim()) {
      notifications.error("Code and name are required");
      return;
    }
    if (form.color_code && !HEX.test(form.color_code)) {
      notifications.error("Colour must be a hex value like #C62828");
      return;
    }
    setSaving(true);
    try {
      const values = Object.fromEntries(Object.entries(form).filter(([k]) => k !== "editingRow"));
      const known = new Set(["code", "name", "description", ...fields.map((f) => f.key)]);
      const body = cleanConfig(Object.fromEntries(Object.entries(values).filter(([k]) => known.has(k))));
      if (body.code) body.code = String(body.code).trim().toUpperCase();
      // Collapse runs of blank lines a paste/held-Enter can leave behind.
      if (body.description) body.description = String(body.description).trim().replace(/\n{3,}/g, "\n\n");
      // Only the fields the current validation type uses go on the wire.
      if (entity === "validation_rule") {
        const visible = new Set(["code", "name", "description", ...fields.filter((f) => !f.showIf || f.showIf(form)).map((f) => f.key)]);
        for (const key of Object.keys(body)) if (!visible.has(key)) delete body[key];
      }
      const response = editing
        ? await api.edit({ id: editing.id, ...body, is_draft: draft, ...(editing.updated_time ? { expected_updated_time: editing.updated_time } : {}) })
        : await api.add({ ...body, is_draft: draft });
      // Confirmed live (see InstitutionBranding.jsx's identical fix):
      // /edit with is_draft:false only updates fields — it never advances
      // process_status by itself. Without this, "Save changes" on a Draft
      // row looked like it submitted but left it stuck in Draft, with no
      // Submit button on the row to recover it.
      const wasDraft = editing && (editing.auth_status === "DRAFT" || editing.process_status_name === "Draft");
      if (wasDraft && !draft) {
        await api.submit({ id: editing.id, narration: "Submitted for review" });
      }
      notifications.success(apiMessage(response, t("onboarding:titleSaved", { title: displayTitle })));
      setForm(null);
      setReloadKey((k) => k + 1);
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (row) =>
    void (async () => {
      const e = await draftAwareRow(api, row);
      setForm({ ...e, editingRow: row });
    })();

  return (
    <>
      <LifecycleList
        title={displayTitle}
        subtitle={t("onboarding:manageMasterData", { title: displayTitle.toLowerCase() })}
        api={api}
        menuName={config.title}
        columns={config.columns(ctx)}
        reloadKey={reloadKey}
        onEdit={openEdit}
        addButton={
          <button type="button" onClick={() => setForm({ code: "", name: "", description: "" })} className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white">
            <Plus size={14} /> {t("onboarding:addTitle", { title: displayTitle })}
          </button>
        }
      />
      {form && (
        <Modal
          open
          onClose={() => setForm(null)}
          title={t(editing ? "onboarding:editTitle" : "onboarding:addTitle", { title: displayTitle })}
          footer={
            <>
              <button type="button" onClick={() => setForm(null)} className="px-3 py-2 text-sm font-bold text-muted-foreground">
                {t("common:cancel")}
              </button>
              <button type="button" disabled={saving} onClick={() => void save(true)} className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-50">
                {saving && <Spinner size={13} />}
                {t("onboarding:saveAsDraft")}
              </button>
              <button type="button" disabled={saving} onClick={() => void save(false)} className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                {saving && <Spinner size={13} />}
                {editing ? t("onboarding:saveChanges") : t("onboarding:addTitle", { title: displayTitle })}
              </button>
            </>
          }
        >
          <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              {t("onboarding:code")} <span className="text-red-500">*</span>
              <input
                value={form.code ?? ""}
                disabled={Boolean(editing)}
                title={editing ? t("onboarding:codeCantBeChanged") : undefined}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") })}
                className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-mono text-sm disabled:bg-muted"
              />
              <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("onboarding:codeCharsHint")}</span>
            </label>
            <label className="text-sm font-semibold text-slate-700">
              {t("onboarding:name")} <span className="text-red-500">*</span>
              <input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" />
            </label>
            <label className="text-sm font-semibold text-slate-700 md:col-span-2">
              {t("common:description")}
              <textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={250} className="mt-1.5 min-h-20 w-full rounded-xl border p-3 text-sm" />
              <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{(form.description ?? "").length}/250</span>
            </label>
            {fields
              .filter((field) => !field.showIf || field.showIf(form))
              .map((field) => (
                <FieldInput
                  key={field.key}
                  field={{
                    ...field,
                    disabled: () => Boolean(editing && field.lockedOnEdit),
                    disabledReason: t("onboarding:cantBeChangedAfterCreation"),
                  }}
                  item={form}
                  setItem={setForm}
                />
              ))}
          </div>
        </Modal>
      )}
    </>
  );
}
