import { useTranslation } from "react-i18next";
import { EditField, EditToggle } from "./InstitutionProfileForm";
import { DateFormatField } from "./DateFormatField";

// Edit-institution form fields — split out of the old monolithic
// InstitutionDetailPage.jsx's inline editMode branch. ViewInstitutionProfile
// still owns the surrounding state (form/setField/submit); this file only
// owns the field markup, matching payse's EditInstitutions.jsx convention.
export function EditInstitutionProfile({ institution, form, setField }) {
  const { t } = useTranslation("institutions");
  return (
    <>
      <div className="rounded-2xl p-5 bg-white/70 border border-white/80 space-y-4">
        <h2 className="text-sm font-bold text-slate-700">{t("institutionInformation")}</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <EditField label={t("institutionCode")} value={form.code} onChange={setField("code")} />
          <EditField label={t("institutionName")} value={form.name} onChange={setField("name")} />
          <EditField label={t("institutionType")} value={institution.type_name ?? institution.type} disabled />
          <EditField label={t("timezoneLabel")} value={form.timezone} onChange={setField("timezone")} />
          <DateFormatField value={form.date_format} onChange={setField("date_format")} />
          <EditToggle label={t("hasBranch")} value={form.has_branch} onChange={setField("has_branch")} />
        </div>
      </div>

      <div className="rounded-2xl p-5 bg-white/70 border border-white/80 space-y-4">
        <h2 className="text-sm font-bold text-slate-700">{t("kycLoginPolicySectionLabel")}</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <EditToggle label={t("kycEnabled")} value={form.kyc_enabled} onChange={setField("kyc_enabled")} />
          <EditField
            label={t("totalKycLevels")}
            type="number"
            value={form.total_kyc_levels}
            onChange={setField("total_kyc_levels")}
          />
          <EditToggle
            label={t("allowDowngradeKyc")}
            value={form.allow_downgrade_kyc}
            onChange={setField("allow_downgrade_kyc")}
          />
          <EditField
            label={t("primaryLoginIdentifier")}
            value={form.primary_login_identifier}
            onChange={setField("primary_login_identifier")}
          />
          <EditToggle
            label={t("loginPinEnabled")}
            value={form.is_login_pin_enabled}
            onChange={setField("is_login_pin_enabled")}
          />
          <EditToggle
            label={t("biometricLogin")}
            value={form.allow_biometric_login}
            onChange={setField("allow_biometric_login")}
          />
          <EditToggle
            label={t("reviewTxnPinEnabled")}
            value={form.is_txn_pin_enabled}
            onChange={setField("is_txn_pin_enabled")}
          />
          <EditToggle
            label={t("sameLoginTxnPin")}
            value={form.is_same_login_txn_pin_allowed}
            onChange={setField("is_same_login_txn_pin_allowed")}
          />
        </div>
      </div>

      <div className="rounded-2xl p-5 bg-white/70 border border-white/80 space-y-3">
        <h2 className="text-sm font-bold text-slate-700">{t("narrationLabel")}</h2>
        <textarea
          value={form.narration ?? ""}
          onChange={(e) => setField("narration")(e.target.value)}
          placeholder={t("reasonForChangeOptionalPlaceholder")}
          className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>
    </>
  );
}
