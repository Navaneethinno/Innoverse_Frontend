import { useTranslation } from "react-i18next";
import { Section } from "@/Components/InnoCBS/Deposits/depositShared";
import { SectionScreen } from "@/Components/InnoCBS/Settings/SectionScreen";
import { payRequestApi } from "@/Services/PaysePay/paysePay.api";
import { DocFields, asForm, rangeProblem, typed } from "./docShared";

const requestFields = (t) => [
  { key: "requests_enabled", label: t("rm_requestsEnabled"), type: "bool" },
  { key: "request_ttl_hours", label: t("rm_requestTtl"), type: "int", min: 1, max: 720 },
  { key: "max_open_per_requester", label: t("rm_maxOpenRequester"), type: "int", min: 1, max: 500 },
  { key: "max_per_requester_per_day", label: t("rm_maxPerDay"), type: "int", min: 1, max: 500 },
  { key: "max_open_per_payer", label: t("rm_maxOpenPayer"), type: "int", min: 1, max: 500 },
];
const qrFields = (t) => [
  { key: "qr_enabled", label: t("rm_qrEnabled"), type: "bool" },
  { key: "qr_ttl_seconds", label: t("rm_qrTtl"), type: "int", min: 60, max: 86400 },
];

// GLOBAL SETTINGS > Request Money & QR (menu 220): limits on money requests
// and payment QRs. One document under maker-checker; edit sends every field.
export function RequestMoney() {
  const { t } = useTranslation("paysePay");
  const fields = [...requestFields(t), ...qrFields(t)];
  return (
    <SectionScreen
      api={payRequestApi}
      ns="paysePay"
      valueKey="setup"
      framed={false}
      fallbackTitle={t("rm_title")}
      subtitle={t("rm_subtitle")}
      toForm={(setup) => asForm(fields, setup ?? {})}
      bodyOf={(form) => typed(fields, form)}
      problemOf={(_, form) => rangeProblem(t, fields, form)}
    >
      {({ data, shown, editing, setForm }) => (
        <>
          <Section title={t("rm_requests")}>
            <DocFields fields={requestFields(t)} value={shown} fallback={asForm(fields, data?.defaults)} editing={editing} onChange={setForm} />
          </Section>
          <Section title={t("rm_qr")}>
            <DocFields fields={qrFields(t)} value={shown} fallback={asForm(fields, data?.defaults)} editing={editing} onChange={setForm} />
          </Section>
        </>
      )}
    </SectionScreen>
  );
}
