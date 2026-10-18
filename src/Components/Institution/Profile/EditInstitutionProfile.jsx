import { useTranslation } from "react-i18next";
import { EditField, EditSelect, EditToggle, LoginMethodsGrid, OTP_LENGTHS, PayToPhoneSettings, PortalEditionField, PortalIdentifiersGrid, AppSignupTypesField, SignupPrefixesField, StoreWalletsField, usesPin } from "./InstitutionProfileForm";
import { DateFormatField } from "./DateFormatField";
import { useTimezones } from "@/Hooks/Master/masterHooks";

// Edit-institution form fields — split out of the old monolithic
// InstitutionDetailPage.jsx's inline editMode branch. ViewInstitutionProfile
// still owns the surrounding state (form/setField/submit); this file only
// owns the field markup, matching payse's EditInstitutions.jsx convention.
export function EditInstitutionProfile({ institution, form, setField }) {
  const { t } = useTranslation("institutions");
  const { timezones } = useTimezones();
  const timezoneOptions = timezones.map((timezone) => {
    const value = timezone.name ?? timezone.id;
    return { value, label: value };
  });
  // Records created before this dropdown existed (or via the old free-text
  // field) can hold a value — an IANA zone like "Asia/Kolkata", or anything
  // else someone typed — that isn't one of the master list's descriptive
  // names. Keep it selectable/visible instead of silently blanking the
  // field out from under an edit that never touches this value.
  if (form.timezone && !timezoneOptions.some((option) => option.value === form.timezone)) {
    timezoneOptions.unshift({ value: form.timezone, label: form.timezone });
  }
  return (
    <>
      <div className="rounded-2xl p-5 bg-white/70 border border-white/80 space-y-4">
        <h2 className="text-sm font-bold text-slate-700">{t("institutionInformation")}</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <EditField label={t("institutionCode")} value={form.code} onChange={setField("code")} />
          <EditField label={t("institutionName")} value={form.name} onChange={setField("name")} />
          <EditField label={t("institutionType")} value={institution.type_name ?? institution.type} disabled />
          <EditSelect
            label={t("timezoneLabel")}
            value={form.timezone}
            onChange={setField("timezone")}
            options={timezoneOptions}
            placeholder={t("selectTimezone")}
          />
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
            hint={t("sameLoginTxnPinHint")}
            value={form.is_same_login_txn_pin_allowed}
            onChange={setField("is_same_login_txn_pin_allowed")}
          />
          <EditSelect label={t("otpLength")} value={form.otp_length} onChange={(v) => setField("otp_length")(Number(v) || 6)} options={OTP_LENGTHS} placeholder="6" />
          {usesPin(form.portal_login_methods) && (
            <EditField label={t("loginPinLength")} type="number" value={form.login_pin_length} onChange={setField("login_pin_length")} />
          )}
          <LoginMethodsGrid value={form.portal_login_methods} onChange={setField("portal_login_methods")} />
          <StoreWalletsField value={form.store_wallets} onChange={setField("store_wallets")} />
          <PortalEditionField value={form.portal_edition} onChange={setField("portal_edition")} />
          <PortalIdentifiersGrid value={form.portal_identifiers} onChange={setField("portal_identifiers")} />
          <PayToPhoneSettings value={form.pay_to_phone} onChange={setField("pay_to_phone")} />
          <SignupPrefixesField value={form.signup_phone_prefixes} onChange={setField("signup_phone_prefixes")} phoneCodes={institution?.phone_codes} />
          <AppSignupTypesField value={form.app_signup_types} onChange={setField("app_signup_types")} />
        </div>
      </div>

      <div className="rounded-2xl p-5 bg-white/70 border border-white/80 space-y-3">
        <h2 className="text-sm font-bold text-slate-700">{t("narrationLabel")}</h2>
        <textarea
          value={form.narration ?? ""}
          onChange={(e) => setField("narration")(e.target.value)}
          placeholder={t("reasonForChangeOptionalPlaceholder")}
          className="min-h-20 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
        />
      </div>
    </>
  );
}
