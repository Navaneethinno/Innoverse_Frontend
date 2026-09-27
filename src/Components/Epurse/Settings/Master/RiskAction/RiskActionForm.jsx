import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/Components/Common/Modal";
import { useAuth } from "@/Hooks/useAuth";
import { riskActionApi } from "@/Services/Epurse/risk.api";
import { notifications, apiMessage } from "@/Utils/Lib/notifications";
import {
  FormFooter,
  InstitutionField,
  codeOf,
  inputClass,
  labelClass,
  saveRecord,
} from "../../../NotificationCenter/notificationShared";

// Add / edit a risk action. Institution and code are fixed once added; the
// name must be unique within the institution (the server refuses otherwise).
export function RiskActionForm({ editing, onClose, onSaved }) {
  const { t } = useTranslation(["risk", "common"]);
  const myInstitution = useAuth((state) => state.user?.inst_profile_id);
  const [form, setForm] = useState(() => ({
    inst_profile_id: editing?.inst_profile_id ?? myInstitution ?? "",
    code: editing?.code ?? "",
    name: editing?.name ?? "",
    description: editing?.description ?? "",
  }));
  const [saving, setSaving] = useState(false);

  const save = async (draft) => {
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
        ...(editing ? {} : { inst_profile_id: form.inst_profile_id, code: form.code }),
      };
      const response = await saveRecord(riskActionApi, { editing, body, draft });
      notifications.success(apiMessage(response, t("risk:actionSaved")));
      onSaved();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const addLabel = t("risk:addAction");
  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? t("risk:editAction") : addLabel}
      footer={
        <FormFooter
          saving={saving}
          editing={editing}
          addLabel={addLabel}
          onCancel={onClose}
          onSave={(draft) => void save(draft)}
        />
      }
    >
      <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
        <InstitutionField
          value={form.inst_profile_id}
          disabled={Boolean(editing)}
          onChange={(v) => setForm({ ...form, inst_profile_id: v })}
        />
        <label className={labelClass}>
          {t("risk:code")} <span className="text-red-500">*</span>
          <input
            value={form.code}
            disabled={Boolean(editing)}
            onChange={(e) => setForm({ ...form, code: codeOf(e.target.value) })}
            className={`${inputClass} font-mono`}
            placeholder="EDD"
          />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
            {t("risk:codeHint")}
          </span>
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          {t("risk:name")} <span className="text-red-500">*</span>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
            placeholder={t("risk:actionNamePlaceholder")}
          />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
            {t("risk:actionNameHint")}
          </span>
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          {t("common:description")}
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={`${inputClass} min-h-16`}
          />
        </label>
      </div>
    </Modal>
  );
}
