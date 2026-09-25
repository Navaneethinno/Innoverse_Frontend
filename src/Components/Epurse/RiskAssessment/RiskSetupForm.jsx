import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { useAuth } from "@/Hooks/useAuth";
import { notifications, apiMessage } from "@/Utils/Lib/notifications";
import { FormFooter, InstitutionField, codeOf, inputClass, labelClass, saveRecord } from "../NotificationCenter/notificationShared";
import { RISK_KINDS, useCustomerTypeOptions } from "./riskShared";
import { useRiskOptions } from "./useRiskOptions";
import { CriteriaEditor } from "./CriteriaEditor";
import { LevelsEditor, chainLevels } from "./LevelsEditor";

const DEFAULT_LEVELS = [
  { code: "LOW", name: "Low", min_score: 0, max_score: 40, color_code: "#4CAF50", risk_action_id: "" },
  { code: "MEDIUM", name: "Medium", min_score: 40, max_score: 70, color_code: "#FFC107", risk_action_id: "" },
  { code: "HIGH", name: "High", min_score: 70, max_score: 100, color_code: "#F44336", risk_action_id: "" },
];

// Stored criteria -> editor state (scores keyed by option id, as strings so
// an empty input stays empty).
const criteriaOf = (criteria) =>
  (criteria ?? []).map((c) => ({
    field_code: c.field_code,
    weight: String(c.weight ?? ""),
    scores: Object.fromEntries((c.scores ?? []).map((s) => [s.value_id, String(s.score)])),
  }));

const idOrEmpty = (v) => (v === null || v === undefined ? "" : v);

// Add / edit a setup: customer type, weighted criteria and levels. Edit
// sends the whole record; the server returns the lists tidied (sorted,
// codes in capitals) and the list shows its response.
export function RiskSetupForm({ kind, editing, onClose, onSaved }) {
  const { t } = useTranslation(["risk", "common"]);
  const { api } = RISK_KINDS[kind];
  const myInstitution = useAuth((state) => state.user?.inst_profile_id);
  const [form, setForm] = useState(() => ({
    inst_profile_id: editing?.inst_profile_id ?? myInstitution ?? "",
    code: editing?.code ?? "",
    name: editing?.name ?? "",
    description: editing?.description ?? "",
    party_type_id: idOrEmpty(editing?.party_type_id),
    ownership_id: idOrEmpty(editing?.ownership_id),
    ownership_sub_type_id: idOrEmpty(editing?.ownership_sub_type_id),
    company_type_id: idOrEmpty(editing?.company_type_id),
    criteria: criteriaOf(editing?.criteria),
    levels: editing?.levels?.length
      ? editing.levels.map((l) => ({ ...l, color_code: l.color_code ?? "", risk_action_id: idOrEmpty(l.risk_action_id) }))
      : DEFAULT_LEVELS,
  }));
  const [saving, setSaving] = useState(false);
  const risk = useRiskOptions(api, form.inst_profile_id || undefined);
  const types = useCustomerTypeOptions(kind);
  const locked = Boolean(editing);

  // Default the new setup's levels to Allow / Review / Block once known.
  useEffect(() => {
    if (editing || !risk.options.risk_actions.length) return;
    const byCode = Object.fromEntries(risk.options.risk_actions.map((a) => [a.code, a.id]));
    const defaults = ["ALLOW", "REVIEW", "BLOCK"];
    setForm((f) => ({
      ...f,
      levels: f.levels.map((l, i) => (l.risk_action_id === "" && byCode[defaults[i]] ? { ...l, risk_action_id: byCode[defaults[i]] } : l)),
    }));
  }, [editing, risk.options.risk_actions]);

  const pick = (key) => (v) => setForm((f) => ({ ...f, [key]: v === "" ? "" : Number(v), ...(key === "ownership_id" ? { ownership_sub_type_id: "" } : {}) }));
  const num = (v) => (v === "" || v === null ? null : Number(v));

  const save = async (draft) => {
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
        criteria: form.criteria.map((c) => ({
          field_code: c.field_code,
          weight: Number(c.weight),
          scores: Object.entries(c.scores)
            .filter(([, score]) => String(score).trim() !== "")
            .map(([valueId, score]) => ({ value_id: Number(valueId), score: Number(score) })),
        })),
        levels: chainLevels(form.levels).map((l) => ({
          code: l.code.trim(),
          name: l.name.trim(),
          min_score: Number(l.min_score),
          max_score: Number(l.max_score),
          color_code: l.color_code || null,
          risk_action_id: num(l.risk_action_id),
        })),
        ...(editing
          ? {}
          : {
              inst_profile_id: form.inst_profile_id,
              code: form.code,
              party_type_id: num(form.party_type_id),
              ...(kind === "individual"
                ? { ownership_id: num(form.ownership_id), ownership_sub_type_id: num(form.ownership_sub_type_id) }
                : { company_type_id: num(form.company_type_id) }),
            }),
      };
      const response = await saveRecord(api, { editing, body, draft });
      notifications.success(apiMessage(response, t("risk:saved")));
      onSaved();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const optionList = (rows, placeholder) => [{ value: "", label: placeholder }, ...rows.map((r) => ({ value: r.id, label: r.name ?? r.code }))];
  const subTypes = types.subTypes.filter((s) => !form.ownership_id || String(s.ownership_id) === String(form.ownership_id));
  const addLabel = t("risk:addSetup");

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={editing ? t("risk:editSetup") : addLabel}
      footer={<FormFooter saving={saving} editing={editing} addLabel={addLabel} onCancel={onClose} onSave={(draft) => void save(draft)} />}
    >
      <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
        <InstitutionField value={form.inst_profile_id} disabled={locked} onChange={(v) => setForm({ ...form, inst_profile_id: v, criteria: [] })} />
        <label className={labelClass}>
          {t("risk:code")} <span className="text-red-500">*</span>
          <input value={form.code} disabled={locked} onChange={(e) => setForm({ ...form, code: codeOf(e.target.value) })} className={`${inputClass} font-mono`} placeholder="INDV_STD" />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("risk:codeHint")}</span>
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          {t("risk:name")} <span className="text-red-500">*</span>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          {t("common:description")}
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputClass} min-h-16`} />
        </label>

        <fieldset className="grid gap-4 rounded-xl border p-3 md:col-span-2 md:grid-cols-3">
          <legend className="px-1 text-sm font-semibold text-slate-700">{t("risk:customerType")}</legend>
          <label className={labelClass}>
            {t("risk:partyType")} <span className="text-red-500">*</span>
            <FilterSelect className="mt-1.5" disabled={locked} value={form.party_type_id} onChange={pick("party_type_id")} options={optionList(types.partyTypes, t("risk:selectPartyType"))} />
          </label>
          {kind === "individual" ? (
            <>
              <label className={labelClass}>
                {t("risk:ownership")} <span className="text-red-500">*</span>
                <FilterSelect className="mt-1.5" disabled={locked} value={form.ownership_id} onChange={pick("ownership_id")} options={optionList(types.ownershipTypes, t("risk:selectOwnership"))} />
              </label>
              <label className={labelClass}>
                {t("risk:subType")}
                <FilterSelect className="mt-1.5" disabled={locked} value={form.ownership_sub_type_id} onChange={pick("ownership_sub_type_id")} options={optionList(subTypes, t("risk:noSubType"))} />
              </label>
            </>
          ) : (
            <label className={labelClass}>
              {t("risk:companyType")} <span className="text-red-500">*</span>
              <FilterSelect className="mt-1.5" disabled={locked} value={form.company_type_id} onChange={pick("company_type_id")} options={optionList(types.companyTypes, t("risk:selectCompanyType"))} />
            </label>
          )}
          <p className="text-[11px] text-muted-foreground md:col-span-3">{locked ? t("risk:customerTypeLocked") : t("risk:customerTypeHint")}</p>
        </fieldset>

        <div className="md:col-span-2">
          {risk.loading ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : (
            <CriteriaEditor risk={risk} criteria={form.criteria} onChange={(criteria) => setForm((f) => ({ ...f, criteria }))} />
          )}
        </div>
        <div className="md:col-span-2">
          <LevelsEditor levels={form.levels} riskActions={risk.options.risk_actions} onChange={(levels) => setForm((f) => ({ ...f, levels }))} />
        </div>
      </div>
    </Modal>
  );
}
