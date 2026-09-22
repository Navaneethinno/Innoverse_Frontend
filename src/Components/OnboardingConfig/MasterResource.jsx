import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { notifications, apiMessage } from "@/Utils/Lib/notifications";
import { masterApi } from "@/Services/Master/master.api";
import { masterApis as baseMasterApis, createLifecycle } from "@/Services/Onboarding/onboarding.api";
import { LifecycleList } from "./LifecycleList";
import { FieldInput, cleanConfig } from "./ListEditor";
import { useOnboardingCatalog } from "./onboardingHooks";

// One schema-driven page for the institution masters that carry extra fields
// beyond name/description (guide §5): validation rules, income / net-worth /
// turnover ranges, risk categories, document types, plus the plain
// code+name masters (title, kinship, business nature). Every master shares
// the maker-checker lifecycle, so each just declares its API base, its
// columns and the fields of its add/edit form.
const HEX = /^#[0-9a-fA-F]{6}$/;
const LENGTH_TEXT_TYPES = new Set(["ANY_TEXT", "NUMERIC", "ALPHABETIC", "ALPHANUMERIC"]);
const asOptions = (list, valueKey = "id", labelOf = (x) => x.name ?? x.code) => (list ?? []).map((x) => ({ value: x[valueKey], label: labelOf(x) }));

const rangeConfig = (title, base) => ({
  title,
  base,
  columns: (ctx) => [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "currency_id", label: "Currency", render: (r) => ctx.currencies.find((c) => c.id === r.currency_id)?.name ?? r.currency_id ?? "-" },
    { key: "min_value", label: "Min", render: (r) => r.min_value ?? "-" },
    { key: "max_value", label: "Max", render: (r) => r.max_value ?? "and above" },
  ],
  fields: (ctx) => [
    { key: "currency_id", label: "Currency", type: "select", required: true, options: asOptions(ctx.currencies), lockedOnEdit: true },
    { key: "min_value", label: "Min value", type: "number", required: true },
    { key: "max_value", label: "Max value", type: "number", hint: "Leave empty for “and above”. Ranges of the same currency must not overlap (checked at approval)." },
  ],
});

const plain = (title, base) => ({ title, base, columns: () => [{ key: "code", label: "Code" }, { key: "name", label: "Name" }], fields: () => [] });

const CONFIGS = {
  title: plain("Title", "/master_config/title"),
  kinship: plain("Kinship", "/master_config/kinship"),
  business_nature: plain("Business Nature", "/master_config/business_nature"),
  annual_income_range: rangeConfig("Annual Income Range", "/master_config/annual_income_range"),
  monthly_income_range: rangeConfig("Monthly Income Range", "/master_config/monthly_income_range"),
  net_worth_range: rangeConfig("Net Worth Range", "/master_config/net_worth_range"),
  turnover_range: rangeConfig("Turnover Range", "/master_config/turnover_range"),
  document_type: {
    title: "Document Type",
    base: "/master_config/document_type",
    columns: (ctx) => [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "purpose_id", label: "Purpose", render: (r) => ctx.catalog?.document_purposes?.find((p) => p.id === r.purpose_id)?.name ?? r.purpose_id ?? "-" },
    ],
    fields: (ctx) => [
      { key: "purpose_id", label: "Purpose", type: "select", required: true, options: asOptions(ctx.catalog?.document_purposes, "id"), hint: "Decides which document group and KYC slot it can fill." },
    ],
  },
  risk_category: {
    title: "Risk Category",
    base: "/master_config/risk_category",
    columns: (ctx) => [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "score", label: "Score band", sortable: false, render: (r) => `${r.min_score} – ${r.max_score}` },
      { key: "color_code", label: "Colour", sortable: false, render: (r) => (r.color_code ? <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded border" style={{ backgroundColor: r.color_code }} />{r.color_code}</span> : "-") },
      { key: "risk_action_id", label: "Action", render: (r) => ctx.catalog?.risk_actions?.find((a) => a.id === r.risk_action_id)?.name ?? r.risk_action_id ?? "-" },
    ],
    fields: (ctx) => [
      { key: "min_score", label: "Min score (0–100)", type: "number", required: true },
      { key: "max_score", label: "Max score (0–100)", type: "number", required: true, hint: "Score bands must not overlap." },
      { key: "color_code", label: "Colour (#RRGGBB)", type: "text", hint: "e.g. #C62828" },
      { key: "risk_action_id", label: "Risk action", type: "select", required: true, options: asOptions(ctx.catalog?.risk_actions, "id") },
    ],
  },
  validation_rule: {
    title: "Validation Rule",
    base: "/master_config/validation_rule",
    columns: (ctx) => [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "validation_type_id", label: "Type", render: (r) => ctx.catalog?.validation_types?.find((t) => t.id === r.validation_type_id)?.name ?? r.validation_type_id ?? "-" },
      { key: "error_message", label: "Error message", render: (r) => r.error_message ?? "-" },
    ],
    // Which parameters apply depends on the chosen validation type; sending
    // one the type doesn't use is refused (guide §5.4), so hide the rest.
    fields: (ctx) => {
      const type = (item) => ctx.catalog?.validation_types?.find((t) => t.id === item.validation_type_id);
      const is = (item, flag) => Boolean(type(item)?.[flag]);
      return [
        { key: "validation_type_id", label: "Validation type", type: "select", required: true, options: asOptions(ctx.catalog?.validation_types, "id", (t) => `${t.name} (${t.code})`), lockedOnEdit: true, hint: "The type decides which parameters apply." },
        { key: "fixed_length", label: "Fixed length", type: "number", showIf: (i) => is(i, "requires_fixed_length") || type(i)?.code === "NUMERIC" },
        { key: "min_length", label: "Min length", type: "number", showIf: (i) => is(i, "requires_length_range") || LENGTH_TEXT_TYPES.has(type(i)?.code) },
        { key: "max_length", label: "Max length", type: "number", showIf: (i) => is(i, "requires_length_range") || LENGTH_TEXT_TYPES.has(type(i)?.code) },
        { key: "pattern", label: "Pattern (regex)", type: "text", wide: true, showIf: (i) => is(i, "requires_pattern") },
        { key: "allowed_chars", label: "Allowed characters", type: "text", showIf: (i) => is(i, "requires_allowed_chars") },
        { key: "min_value", label: "Min value", type: "number", showIf: (i) => is(i, "requires_value_range") },
        { key: "max_value", label: "Max value", type: "number", showIf: (i) => is(i, "requires_value_range") },
        { key: "min_date", label: "Min date", type: "date", showIf: (i) => is(i, "requires_date_range") },
        { key: "max_date", label: "Max date", type: "date", showIf: (i) => is(i, "requires_date_range") },
        { key: "min_age_years", label: "Min age (years)", type: "number", showIf: (i) => is(i, "requires_age_range") },
        { key: "max_age_years", label: "Max age (years)", type: "number", showIf: (i) => is(i, "requires_age_range") },
        { key: "error_message", label: "Error message shown to the customer", type: "text", required: true, wide: true },
      ];
    },
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
  const config = CONFIGS[entity];
  const api = apiFor(entity);
  const catalog = useOnboardingCatalog();
  const [currencies, setCurrencies] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const ctx = useMemo(() => ({ catalog, currencies }), [catalog, currencies]);

  useEffect(() => {
    if (!entity.endsWith("_range")) return;
    masterApi.currencyList().then(setCurrencies).catch(() => setCurrencies([]));
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
      // Confirmed live (see InstitutionBrandingPage.jsx's identical fix):
      // /edit with is_draft:false only updates fields — it never advances
      // process_status by itself. Without this, "Save changes" on a Draft
      // row looked like it submitted but left it stuck in Draft, with no
      // Submit button on the row to recover it.
      const wasDraft = editing && (editing.auth_status === "DRAFT" || editing.process_status_name === "Draft");
      if (wasDraft && !draft) {
        await api.submit({ id: editing.id, narration: "Submitted for review" });
      }
      notifications.success(apiMessage(response, `${config.title} saved`));
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
        title={config.title}
        subtitle={`Manage ${config.title.toLowerCase()} master data.`}
        api={api}
        menuName={config.title}
        columns={config.columns(ctx)}
        reloadKey={reloadKey}
        onEdit={openEdit}
        addButton={
          <button type="button" onClick={() => setForm({ code: "", name: "", description: "" })} className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white">
            <Plus size={14} /> Add {config.title}
          </button>
        }
      />
      {form && (
        <Modal
          open
          onClose={() => setForm(null)}
          title={`${editing ? "Edit" : "Add"} ${config.title}`}
          footer={
            <>
              <button type="button" onClick={() => setForm(null)} className="px-3 py-2 text-sm font-bold text-muted-foreground">
                Cancel
              </button>
              <button type="button" disabled={saving} onClick={() => void save(true)} className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-50">
                {saving && <Spinner size={13} />}
                Save as draft
              </button>
              <button type="button" disabled={saving} onClick={() => void save(false)} className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                {saving && <Spinner size={13} />}
                {editing ? "Save changes" : `Add ${config.title}`}
              </button>
            </>
          }
        >
          <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Code <span className="text-red-500">*</span>
              <input
                value={form.code ?? ""}
                disabled={Boolean(editing)}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") })}
                className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-mono text-sm disabled:bg-muted"
              />
              <span className="mt-1 block text-[11px] font-normal text-muted-foreground">A–Z, 0–9 and _. Cannot be changed later.</span>
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Name <span className="text-red-500">*</span>
              <input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" />
            </label>
            <label className="text-sm font-semibold text-slate-700 md:col-span-2">
              Description
              <textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={250} className="mt-1.5 min-h-20 w-full rounded-xl border p-3 text-sm" />
              <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{(form.description ?? "").length}/250</span>
            </label>
            {fields
              .filter((field) => !field.showIf || field.showIf(form))
              .map((field) => (
                <FieldInput
                  key={field.key}
                  field={{ ...field, disabled: () => Boolean(editing && field.lockedOnEdit) }}
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
