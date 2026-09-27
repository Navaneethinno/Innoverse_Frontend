import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { Modal } from "@/Components/Common/Modal";
import { useAuth } from "@/Hooks/useAuth";
import { amlSetupApi } from "@/Services/InnoAML/aml.api";
import { riskActionApi } from "@/Services/Epurse/risk.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications, apiMessage } from "@/Utils/Lib/notifications";
import { FormFooter, InstitutionField, inputClass, labelClass, saveRecord } from "@/Components/Epurse/NotificationCenter/notificationShared";
import { LevelsEditor, chainLevels } from "@/Components/Epurse/RiskAssessment/LevelsEditor";

const DEFAULT_BANDS = [
  { code: "CLEAR", name: "Clear", min_score: 0, max_score: 60, color_code: "#2E7D32", risk_action_id: "" },
  { code: "POSSIBLE", name: "Possible match", min_score: 60, max_score: 85, color_code: "#F9A825", risk_action_id: "" },
  { code: "STRONG", name: "Strong match", min_score: 85, max_score: 100, color_code: "#C62828", risk_action_id: "" },
];
const idOrEmpty = (v) => (v === null || v === undefined ? "" : v);

// The institution's active risk actions, for each band's action.
function useRiskActions(instProfileId) {
  const [actions, setActions] = useState([]);
  useEffect(() => {
    if (!instProfileId) {
      setActions([]);
      return;
    }
    riskActionApi
      .getActive({ inst_profile_id: Number(instProfileId), view: "dropdown" })
      .then((r) => setActions(rowsOf(r)))
      .catch(() => setActions([]));
  }, [instProfileId]);
  return actions;
}

// Add / edit the institution's one AML setup: score bands (the risk level
// editor), minimum match score and ongoing re-screening. The server checks
// the bands cover 0–100 and the minimum fits the lowest band.
export function AMLSetupForm({ editing, onClose, onSaved }) {
  const { t } = useTranslation(["aml", "common"]);
  const myInstitution = useAuth((state) => state.user?.inst_profile_id);
  const [form, setForm] = useState(() => ({
    inst_profile_id: editing?.inst_profile_id ?? myInstitution ?? "",
    description: editing?.description ?? "",
    min_match_score: String(editing?.min_match_score ?? 50),
    ongoing_rescreen: editing?.ongoing_rescreen ?? true,
    levels: editing?.levels?.length ? editing.levels.map((l) => ({ ...l, color_code: l.color_code ?? "", risk_action_id: idOrEmpty(l.risk_action_id) })) : DEFAULT_BANDS,
  }));
  const [saving, setSaving] = useState(false);
  const riskActions = useRiskActions(form.inst_profile_id);

  const save = async (draft) => {
    const minScore = Number(form.min_match_score);
    if (!Number.isFinite(minScore) || minScore < 30 || minScore > 100) {
      notifications.error(t("aml:minMatchScoreRange"));
      return;
    }
    setSaving(true);
    try {
      const body = {
        description: form.description.trim(),
        min_match_score: minScore,
        ongoing_rescreen: form.ongoing_rescreen,
        levels: chainLevels(form.levels).map((l) => ({
          code: l.code.trim(),
          name: l.name.trim(),
          min_score: Number(l.min_score),
          max_score: Number(l.max_score),
          color_code: l.color_code || null,
          risk_action_id: l.risk_action_id === "" ? null : Number(l.risk_action_id),
        })),
        ...(editing ? {} : { inst_profile_id: form.inst_profile_id }),
      };
      const response = await saveRecord(amlSetupApi, { editing, body, draft });
      notifications.success(apiMessage(response, t("aml:setupSaved")));
      onSaved();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const addLabel = t("aml:addSetup");
  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={editing ? t("aml:editSetup") : addLabel}
      footer={<FormFooter saving={saving} editing={editing} addLabel={addLabel} onCancel={onClose} onSave={(draft) => void save(draft)} />}
    >
      <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
        <InstitutionField value={form.inst_profile_id} disabled={Boolean(editing)} onChange={(v) => setForm({ ...form, inst_profile_id: v })} />
        <label className={labelClass}>
          {t("aml:minMatchScore")} <span className="text-red-500">*</span>
          <input type="number" min={30} max={100} value={form.min_match_score} onChange={(e) => setForm({ ...form, min_match_score: e.target.value })} className={inputClass} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("aml:minMatchScoreHint")}</span>
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          {t("common:description")}
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputClass} min-h-16`} />
        </label>
        <div className="md:col-span-2">
          <CheckboxPill checked={form.ongoing_rescreen} onChange={(checked) => setForm({ ...form, ongoing_rescreen: checked })} label={t("aml:ongoingRescreen")} />
          <p className="mt-1 text-[11px] text-muted-foreground">{t("aml:ongoingRescreenHint")}</p>
        </div>
        <div className="md:col-span-2">
          <LevelsEditor
            title={t("aml:bands")}
            hint={t("aml:bandsHint")}
            levels={form.levels}
            riskActions={riskActions}
            onChange={(levels) => setForm((f) => ({ ...f, levels }))}
          />
        </div>
      </div>
    </Modal>
  );
}
