import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Mail, Plus, Smartphone, X } from "lucide-react";
import { Modal } from "@/Components/Common/Modal";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { useAuth } from "@/Hooks/useAuth";
import { notificationGroupApi } from "@/Services/Epurse/notification.api";
import { notifications, apiMessage } from "@/Utils/Lib/notifications";
import { FormFooter, InstitutionField, codeOf, inputClass, labelClass, saveRecord } from "../notificationShared";

const emptyMember = () => ({ type: "EMAIL", value: "" });

// Add / edit a group: code, name, description and 1–100 recipients. The
// server cleans the list (case, spaces, duplicates) and its response is what
// the list shows afterwards.
export function NotificationGroupForm({ editing, onClose, onSaved }) {
  const { t } = useTranslation(["notification", "common"]);
  const myInstitution = useAuth((state) => state.user?.inst_profile_id);
  const [form, setForm] = useState(() => ({
    inst_profile_id: editing?.inst_profile_id ?? myInstitution ?? "",
    code: editing?.code ?? "",
    name: editing?.name ?? "",
    description: editing?.description ?? "",
    members: editing?.members?.length ? editing.members.map((m) => ({ type: m.type, value: m.value })) : [emptyMember()],
  }));
  const [saving, setSaving] = useState(false);
  const setMember = (index, patch) => setForm((f) => ({ ...f, members: f.members.map((m, i) => (i === index ? { ...m, ...patch } : m)) }));

  const save = async (draft) => {
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
        members: form.members.filter((m) => m.value.trim()).map((m) => ({ type: m.type, value: m.value.trim() })),
        ...(editing ? {} : { inst_profile_id: form.inst_profile_id, code: form.code }),
      };
      const response = await saveRecord(notificationGroupApi, { editing, body, draft });
      notifications.success(apiMessage(response, t("notification:saved")));
      onSaved();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={editing ? t("notification:editGroup") : t("notification:addGroup")}
      footer={<FormFooter saving={saving} editing={editing} addLabel={t("notification:addGroup")} onCancel={onClose} onSave={(draft) => void save(draft)} />}
    >
      <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
        <InstitutionField value={form.inst_profile_id} disabled={Boolean(editing)} onChange={(v) => setForm({ ...form, inst_profile_id: v })} />
        <label className={labelClass}>
          {t("notification:code")} <span className="text-red-500">*</span>
          <input value={form.code} disabled={Boolean(editing)} onChange={(e) => setForm({ ...form, code: codeOf(e.target.value) })} className={`${inputClass} font-mono`} placeholder="OPS_TEAM" />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("notification:codeHint")}</span>
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          {t("notification:name")} <span className="text-red-500">*</span>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          {t("common:description")}
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputClass} min-h-16`} />
        </label>

        <div className="md:col-span-2">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">
                {t("notification:recipients")} <span className="text-red-500">*</span>
              </p>
              <p className="text-[11px] text-muted-foreground">{t("notification:recipientsHint")}</p>
            </div>
            <button
              type="button"
              disabled={form.members.length >= 100}
              onClick={() => setForm({ ...form, members: [...form.members, emptyMember()] })}
              className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold text-primary disabled:opacity-50"
            >
              <Plus size={13} /> {t("notification:addRecipient")}
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {form.members.map((member, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex shrink-0 rounded-xl border p-0.5">
                  {[
                    ["EMAIL", Mail, t("notification:email")],
                    ["MOBILE", Smartphone, t("notification:mobile")],
                  ].map(([type, Icon, label]) => (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={member.type === type}
                      onClick={() => setMember(index, { type })}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${member.type === type ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary"}`}
                    >
                      <Icon size={13} /> <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>
                <input
                  value={member.value}
                  type={member.type === "EMAIL" ? "email" : "tel"}
                  onChange={(e) => setMember(index, { value: e.target.value })}
                  placeholder={member.type === "EMAIL" ? t("notification:emailPlaceholder") : t("notification:mobilePlaceholder")}
                  className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm"
                />
                <UiTooltip label={t("notification:removeRecipient")}>
                  <button
                    type="button"
                    disabled={form.members.length === 1}
                    onClick={() => setForm({ ...form, members: form.members.filter((_, i) => i !== index) })}
                    className="rounded-lg p-2 text-muted-foreground hover:text-destructive disabled:opacity-30"
                  >
                    <X size={14} />
                  </button>
                </UiTooltip>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
