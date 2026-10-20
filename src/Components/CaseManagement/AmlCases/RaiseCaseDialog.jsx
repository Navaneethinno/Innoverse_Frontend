import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/Components/Common/Button";
import { Modal } from "@/Components/Common/Modal";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { inputClass, labelClass } from "@/Components/GlobalSettings/Notifications/notificationShared";
import { useOpenMenu } from "@/Pages/Sidebar/menuContext";
import { amlCasesApi } from "@/Services/CaseManagement/amlCases.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";

// Raise an AML case for a customer, from a flag ({ flag_id }), a screening
// ({ screening_id }) or a customer ({ customer_kind, reference_id }). One
// open case per customer: raising again adds to it. The reason is
// internal; the title and first message are what the customer sees.
export function RaiseCaseDialog({ target, subtitle, onClose, onRaised }) {
  const { t } = useTranslation(["cases", "common"]);
  const openMenu = useOpenMenu();
  const [form, setForm] = useState({ reason: "", priority: "NORMAL", title: "", message: "" });
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e?.target ? e.target.value : e }));

  const raise = async () => {
    setBusy(true);
    try {
      const response = await amlCasesApi.raise({
        ...target,
        reason: form.reason.trim(),
        priority: form.priority,
        ...(form.title.trim() ? { title: form.title.trim() } : {}),
        ...(form.message.trim() ? { message: form.message.trim() } : {}),
      });
      const kase = rowsOf(response)[0];
      notifications.success(apiMessage(response, t("cases:caseRaised")));
      onRaised?.(kase);
      if (kase?.id) openMenu("amlcases", { caseId: kase.id });
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={t("cases:raiseCase")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common:cancel")}
          </Button>
          <Button loading={busy} disabled={!form.reason.trim()} onClick={() => void raise()}>
            {t("cases:raiseCase")}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        <p className="text-xs text-muted-foreground">{t("cases:raiseHint")}</p>
        <label className={labelClass}>
          {t("cases:reason")} <span className="text-red-500">*</span>
          <textarea value={form.reason} maxLength={4000} onChange={set("reason")} className={`${inputClass} min-h-20`} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("cases:reasonInternal")}</span>
        </label>
        <div>
          <p className={labelClass}>{t("cases:priority")}</p>
          <SegmentedSwitch className="mt-1.5" value={form.priority} onChange={set("priority")} options={["LOW", "NORMAL", "HIGH"].map((p) => ({ value: p, label: t(`cases:${p.toLowerCase()}`) }))} />
        </div>
        <label className={labelClass}>
          {t("cases:caseTitle")}
          <input value={form.title} maxLength={200} onChange={set("title")} className={inputClass} placeholder={t("cases:caseTitlePlaceholder")} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("cases:caseTitleHint")}</span>
        </label>
        <label className={labelClass}>
          {t("cases:firstMessage")}
          <textarea value={form.message} maxLength={4000} onChange={set("message")} className={`${inputClass} min-h-20`} placeholder={t("cases:messagePlaceholder")} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("cases:amlCustomerMessageHint")}</span>
        </label>
      </div>
    </Modal>
  );
}
