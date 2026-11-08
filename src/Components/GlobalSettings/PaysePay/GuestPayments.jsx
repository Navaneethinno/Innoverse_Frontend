import { useTranslation } from "react-i18next";
import { SectionScreen } from "@/Components/InnoCBS/Settings/SectionScreen";
import { guestPayApi } from "@/Services/PaysePay/paysePay.api";
import { DocFields, asForm, rangeProblem, typed } from "./docShared";

// choices.types (AIRTIME, PREPAID_ELECTRICITY, BILL_PAYMENT) and
// choices.sources (EXT_WALLET).
const pick = (t, list, prefix) => ({ type: "multi", options: (list ?? []).map((v) => ({ value: v, label: t(`${prefix}${v}`, { defaultValue: v }) })) });

const fieldsOf = (t, data) => [
  { key: "enabled", label: t("gp_enabled"), type: "bool" },
  { key: "otp_required", label: t("gp_otpRequired"), type: "bool" },
  { key: "allowed_types", label: t("gp_allowedTypes"), ...pick(t, data?.choices?.types, "gp_type_") },
  { key: "sources", label: t("gp_sources"), ...pick(t, data?.choices?.sources, "gp_source_") },
  { key: "max_amount", label: t("gp_maxAmount"), type: "amount", emptyText: t("noLimit"), hint: t("emptyNoLimit") },
  { key: "daily_device_cap", label: t("gp_dailyDeviceCap"), type: "amount", emptyText: t("noLimit"), hint: t("emptyNoLimit") },
  { key: "daily_phone_cap", label: t("gp_dailyPhoneCap"), type: "amount", emptyText: t("noLimit"), hint: t("emptyNoLimit") },
  { key: "daily_count", label: t("gp_dailyCount"), type: "int", min: 0, max: 100, optional: true, emptyAs: 0, hint: t("gp_dailyCountHint") },
  { key: "session_mins", label: t("gp_sessionMins"), type: "int", min: 5, max: 60, optional: true, zeroOk: true, emptyAs: 0, hint: t("gp_sessionMinsHint") },
];

// GLOBAL SETTINGS > Guest Payments (menu 244): payments by people without an
// account. One document under maker-checker; edit sends it under `setup`.
export function GuestPayments() {
  const { t } = useTranslation("paysePay");
  const fields = fieldsOf(t, null);
  return (
    <SectionScreen
      api={guestPayApi}
      ns="paysePay"
      valueKey="setup"
      fallbackTitle={t("gp_title")}
      subtitle={t("gp_subtitle")}
      toForm={(setup) => asForm(fields, setup ?? {})}
      bodyOf={(form) => typed(fields, form)}
      problemOf={(_, form) => rangeProblem(t, fields, form)}
    >
      {({ data, shown, editing, setForm }) => <DocFields fields={fieldsOf(t, data)} value={shown} editing={editing} onChange={setForm} />}
    </SectionScreen>
  );
}
