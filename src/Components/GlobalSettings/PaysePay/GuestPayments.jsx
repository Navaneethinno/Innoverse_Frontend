import { useTranslation } from "react-i18next";
import { SectionScreen } from "@/Components/InnoCBS/Settings/SectionScreen";
import { guestPayApi } from "@/Services/PaysePay/paysePay.api";
import { DocFields, asForm, typed } from "./docShared";

// Choices for a list field: from the reply's `choices` when it sends them.
const choicesOf = (data, key) => (Array.isArray(data?.choices?.[key]) ? data.choices[key].map((c) => (typeof c === "object" ? { value: c.value ?? c.code, label: c.label ?? c.name ?? c.value ?? c.code } : { value: c, label: c })) : []);

// Picked from the choices, or typed with commas when the reply sends none.
const listOf = (data, key) => {
  const options = choicesOf(data, key);
  return options.length ? { type: "multi", options } : { type: "list", hint: "" };
};

const fieldsOf = (t, data) => [
  { key: "enabled", label: t("gp_enabled"), type: "bool" },
  { key: "otp_required", label: t("gp_otpRequired"), type: "bool" },
  { key: "allowed_types", label: t("gp_allowedTypes"), ...listOf(data, "allowed_types") },
  { key: "sources", label: t("gp_sources"), ...listOf(data, "sources") },
  { key: "max_amount", label: t("gp_maxAmount"), type: "amount", emptyText: t("noLimit"), hint: t("emptyNoLimit") },
  { key: "daily_device_cap", label: t("gp_dailyDeviceCap"), type: "amount", emptyText: t("noLimit"), hint: t("emptyNoLimit") },
  { key: "daily_phone_cap", label: t("gp_dailyPhoneCap"), type: "amount", emptyText: t("noLimit"), hint: t("emptyNoLimit") },
  { key: "daily_count", label: t("gp_dailyCount"), type: "int" },
  { key: "session_mins", label: t("gp_sessionMins"), type: "int" },
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
    >
      {({ data, shown, editing, setForm }) => <DocFields fields={fieldsOf(t, data)} value={shown} editing={editing} onChange={setForm} />}
    </SectionScreen>
  );
}
