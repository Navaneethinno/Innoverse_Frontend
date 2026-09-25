import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Braces, Info, Search } from "lucide-react";
import { Modal } from "@/Components/Common/Modal";
import { CheckboxPill, CheckboxPillGroup } from "@/Components/Common/CheckboxPill";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { LoadingAnimation } from "@/Components/Common/LoadingAnimation";
import { useAuth } from "@/Hooks/useAuth";
import { notificationAlertApi } from "@/Services/Epurse/notification.api";
import { notifications, apiMessage } from "@/Utils/Lib/notifications";
import { FormFooter, InstitutionField, codeOf, inputClass, labelClass, saveRecord } from "../notificationShared";
import { triggerKey, useAlertOptions } from "./useAlertOptions";
import { TriggerGrid } from "./TriggerGrid";

const SMS_MAX = 640;

// Add / edit an alert. `options` (called on open, per institution) drives
// the trigger checkboxes, the group picker and the placeholder chips; the
// server enforces every rule (channels, placeholders, recipients, triggers)
// and its message is shown as-is.
export function NotificationAlertForm({ editing, onClose, onSaved }) {
  const { t } = useTranslation(["notification", "common"]);
  const myInstitution = useAuth((state) => state.user?.inst_profile_id);
  const [form, setForm] = useState(() => ({
    inst_profile_id: editing?.inst_profile_id ?? myInstitution ?? "",
    code: editing?.code ?? "",
    name: editing?.name ?? "",
    description: editing?.description ?? "",
    send_email: editing ? Boolean(editing.send_email) : true,
    send_sms: Boolean(editing?.send_sms),
    notify_maker: Boolean(editing?.notify_maker),
    email_subject: editing?.email_subject ?? "",
    email_body: editing?.email_body ?? "",
    sms_body: editing?.sms_body ?? "",
    group_ids: editing?.group_ids ?? [],
    triggers: new Set((editing?.triggers ?? []).map((tr) => triggerKey(tr.menu_id, tr.action_id))),
  }));
  const [saving, setSaving] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const { options, loading } = useAlertOptions(form.inst_profile_id);

  // Placeholder chips insert at the cursor of the last message field used.
  const emailSubjectRef = useRef(null);
  const emailBodyRef = useRef(null);
  const smsBodyRef = useRef(null);
  const [activeField, setActiveField] = useState("email_body");
  const insertPlaceholder = (name) => {
    const key = form[activeField === "sms_body" ? "send_sms" : "send_email"] ? activeField : form.send_email ? "email_body" : "sms_body";
    const el = { email_subject: emailSubjectRef, email_body: emailBodyRef, sms_body: smsBodyRef }[key].current;
    const text = form[key];
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const token = `{${name}}`;
    setForm((f) => ({ ...f, [key]: text.slice(0, start) + token + text.slice(end) }));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };
  const messageProps = (key) => ({
    value: form[key],
    onFocus: () => setActiveField(key),
    onChange: (e) => setForm({ ...form, [key]: e.target.value }),
  });

  // Menus grouped under their parent, filtered by the search box.
  const menuGroups = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    const groups = new Map();
    for (const menu of options.menus) {
      if (q && !`${menu.parent_menu_name} ${menu.menu_name}`.toLowerCase().includes(q)) continue;
      const parent = menu.parent_menu_name || "";
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push(menu);
    }
    return [...groups.entries()];
  }, [options.menus, menuSearch]);

  const save = async (draft) => {
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
        send_email: form.send_email,
        send_sms: form.send_sms,
        notify_maker: form.notify_maker,
        // Only the switched-on channels' texts go on the wire.
        email_subject: form.send_email ? form.email_subject : "",
        email_body: form.send_email ? form.email_body : "",
        sms_body: form.send_sms ? form.sms_body : "",
        group_ids: form.group_ids,
        triggers: [...form.triggers].map((key) => {
          const [menu_id, action_id] = key.split(":").map(Number);
          return { menu_id, action_id };
        }),
        ...(editing ? {} : { inst_profile_id: form.inst_profile_id, code: form.code }),
      };
      const response = await saveRecord(notificationAlertApi, { editing, body, draft });
      notifications.success(apiMessage(response, t("notification:saved")));
      onSaved();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const section = "rounded-2xl border p-4";
  const sectionTitle = "text-sm font-bold text-slate-800";

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={editing ? t("notification:editAlert") : t("notification:addAlert")}
      footer={<FormFooter saving={saving} editing={editing} addLabel={t("notification:addAlert")} onCancel={onClose} onSave={(draft) => void save(draft)} />}
    >
      <div className="space-y-4">
        <p className="flex items-start gap-2 rounded-xl bg-primary-light px-3 py-2 text-xs text-slate-700">
          <Info size={14} className="mt-0.5 shrink-0 text-primary" /> {t("notification:sendingNotLive")}
        </p>

        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
          <InstitutionField
            value={form.inst_profile_id}
            disabled={Boolean(editing)}
            onChange={(v) => setForm({ ...form, inst_profile_id: v, group_ids: [] })}
          />
          <label className={labelClass}>
            {t("notification:code")} <span className="text-red-500">*</span>
            <input value={form.code} disabled={Boolean(editing)} onChange={(e) => setForm({ ...form, code: codeOf(e.target.value) })} className={`${inputClass} font-mono`} placeholder="PROVINCE_CHANGES" />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("notification:codeHint")}</span>
          </label>
          <label className={labelClass}>
            {t("notification:name")} <span className="text-red-500">*</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </label>
          <label className={labelClass}>
            {t("common:description")}
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
          </label>
        </div>

        {/* What to send */}
        <div className={section}>
          <p className={sectionTitle}>{t("notification:message")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <CheckboxPill checked={form.send_email} onChange={(v) => setForm({ ...form, send_email: v })} label={t("notification:email")} />
            <CheckboxPill checked={form.send_sms} onChange={(v) => setForm({ ...form, send_sms: v })} label={t("notification:sms")} />
          </div>
          {(form.send_email || form.send_sms) && options.placeholders.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] text-muted-foreground">{t("notification:placeholdersHint")}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {options.placeholders.map((p) => (
                  <UiTooltip key={p.name} label={p.description}>
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertPlaceholder(p.name)} className="flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 font-mono text-[11px] font-semibold text-primary hover:bg-primary-light">
                      <Braces size={11} /> {p.name}
                    </button>
                  </UiTooltip>
                ))}
              </div>
            </div>
          )}
          {form.send_email && (
            <div className="mt-4 grid gap-3">
              <label className={labelClass}>
                {t("notification:emailSubject")} <span className="text-red-500">*</span>
                <input ref={emailSubjectRef} {...messageProps("email_subject")} maxLength={255} className={inputClass} placeholder="{Menu}: {Action} by {User}" />
              </label>
              <label className={labelClass}>
                {t("notification:emailBody")} <span className="text-red-500">*</span>
                <textarea ref={emailBodyRef} {...messageProps("email_body")} className={`${inputClass} min-h-24`} />
              </label>
            </div>
          )}
          {form.send_sms && (
            <label className={`${labelClass} mt-4`}>
              {t("notification:smsBody")} <span className="text-red-500">*</span>
              <textarea ref={smsBodyRef} {...messageProps("sms_body")} maxLength={SMS_MAX} className={`${inputClass} min-h-16`} />
              <span className="mt-1 block text-right text-[11px] font-normal text-muted-foreground">
                {form.sms_body.length}/{SMS_MAX}
              </span>
            </label>
          )}
        </div>

        {/* Who gets it */}
        <div className={section}>
          <p className={sectionTitle}>{t("notification:recipients")}</p>
          {options.groups.length ? (
            <CheckboxPillGroup
              className="mt-2 flex-row flex-wrap"
              value={form.group_ids}
              onChange={(ids) => setForm({ ...form, group_ids: ids })}
              options={options.groups.map((g) => ({ value: g.id, label: g.name }))}
            />
          ) : (
            !loading && <p className="mt-2 text-xs text-muted-foreground">{t("notification:noActiveGroups")}</p>
          )}
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.notify_maker} onChange={(e) => setForm({ ...form, notify_maker: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
            {t("notification:notifyMaker")}
          </label>
        </div>

        {/* When it's sent */}
        <div className={section}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className={sectionTitle}>
                {t("notification:triggers")} <span className="ml-1 text-xs font-semibold text-muted-foreground">{t("notification:triggerCount", { count: form.triggers.size })}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">{t("notification:triggersHint")}</p>
            </div>
            <label className="flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5">
              <Search size={13} className="text-muted-foreground" />
              <input value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)} placeholder={t("notification:searchMenus")} className="w-36 bg-transparent text-xs outline-none" />
            </label>
          </div>
          {loading ? (
            <div className="py-6">
              <LoadingAnimation />
            </div>
          ) : (
            <TriggerGrid groups={menuGroups} selected={form.triggers} onChange={(triggers) => setForm((f) => ({ ...f, triggers }))} />
          )}
        </div>
      </div>
    </Modal>
  );
}
