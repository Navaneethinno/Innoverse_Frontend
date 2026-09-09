import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle,
  ClipboardCheck,
  FileText,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/Utils/Lib/cn";
import {
  useInstitutionCreateMutation,
} from "@/Hooks/Institutions/institutionHooks";
import { Skeleton } from "@/Components/UI/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/Components/UI/alert";
import { DateFormatField } from "@/Components/Institution/InstitutionProfile/DateFormatField";
import { useInstitutionTypes, useLanguages, useTimezones } from "@/Hooks/Master/masterHooks";

// Field set matches POST /institution/profile/add's confirmed body exactly
// (Postman collection, "Institution/Profile" folder) — no KYC/legal/address
// sub-objects, since those live under separate out-of-scope sub-entities
// (Institution/Legal, Institution/Branding, ...).
const STEP_DEFS = [
  { key: "stepBasicInfo", icon: FileText },
  { key: "stepKycPolicy", icon: ShieldCheck },
  { key: "stepLoginPinPolicy", icon: KeyRound },
  { key: "stepReviewSubmit", icon: ClipboardCheck },
];
const EMPTY = {
  code: "",
  name: "",
  type: "PLATFORM_USER",
  timezone: "",
  languageDefault: "en",
  languageSupported: ["en"],
  date_format: "DD-MM-YYYY",
  has_branch: false,
  max_branches_allowed: 1,
  kyc_enabled: false,
  total_kyc_levels: 0,
  allow_downgrade_kyc: false,
  auto_approve_kyc_level: false,
  allowed_login_identifiers: "USERNAME",
  primary_login_identifier: "USERNAME",
  is_login_pin_enabled: false,
  login_pin_length: 4,
  login_pin_type: "NUMERIC",
  allow_biometric_login: false,
  is_txn_pin_enabled: false,
  txn_pin_length: 4,
  is_same_login_txn_pin_allowed: false,
  narration: "",
};

// The created record's id isn't independently confirmed for this specific
// response (no live capture of /institution/profile/add yet) — tolerant of
// the two shapes already confirmed elsewhere in this codebase (a bare
// object on `data`, or the single-element array wrapper seen on
// login/pending) so a "Continue Editing Draft" link can be offered when
// it's actually present, and simply omitted (no crash, no guess) when not.
function extractCreatedId(payload) {
  const data = payload?.data;
  const record = Array.isArray(data) ? data[0] : data;
  return record?.id ?? null;
}

function buildPayload(form, isDraft) {
  return {
    code: form.code,
    name: form.name,
    narration: form.narration.trim(),
    is_draft: isDraft,
    type: Number(form.type) || 1,
    timezone: form.timezone,
    language: { default: form.languageDefault, supported: form.languageSupported },
    date_format: form.date_format,
    has_branch: form.has_branch,
    max_branches_allowed: Number(form.max_branches_allowed) || 0,
    kyc_enabled: form.kyc_enabled,
    total_kyc_levels: Number(form.total_kyc_levels) || 0,
    allow_downgrade_kyc: form.allow_downgrade_kyc,
    auto_approve_kyc_level: Boolean(form.auto_approve_kyc_level),
    // Confirmed shape is an object of booleans keyed by identifier name
    // (e.g. { "email": true, "mobile": true }), not an { identifiers: [...] }
    // array wrapper — built here from the comma-separated admin input.
    allowed_login_identifiers: Object.fromEntries(
      form.allowed_login_identifiers
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean)
        .map((identifier) => [identifier, true]),
    ),
    primary_login_identifier: form.primary_login_identifier,
    is_login_pin_enabled: form.is_login_pin_enabled,
    login_pin_length: Number(form.login_pin_length) || 0,
    login_pin_type: form.login_pin_type,
    allow_biometric_login: form.allow_biometric_login,
    is_txn_pin_enabled: form.is_txn_pin_enabled,
    txn_pin_length: Number(form.txn_pin_length) || 0,
    is_same_login_txn_pin_allowed: form.is_same_login_txn_pin_allowed,
  };
}

function InputField({ label, fieldKey, placeholder, required = false, value, error, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && " *"}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full px-4 py-2.5 rounded-xl bg-slate-50 border text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all",
          error ? "border-red-300 bg-red-50" : "border-slate-200",
        )}
      />
      {error && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
}
function NumberField({ label, fieldKey, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
      />
    </div>
  );
}
function ToggleField({ label, fieldKey, value, onChange }) {
  return (
    <label className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(fieldKey, e.target.checked)}
        className="h-4 w-4"
      />
    </label>
  );
}
function ReviewRow({ label, value }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-700 text-right ml-4 min-w-0 break-all">
        {typeof value === "boolean" ? (value ? t("common:yes") : t("common:no")) : value || "—"}
      </span>
    </div>
  );
}

function LivePreview({ form, step, steps, t }) {
  const value = (item) => item || t("previewNotSet");
  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-card/80 shadow-xl shadow-blue-900/10 backdrop-blur-xl dark:border-white/10">
        <div className="border-b border-border/60 bg-gradient-to-br from-primary/10 via-transparent to-teal-100/20 px-6 py-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Live preview</p>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-foreground">{value(form.name)}</h2>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary">
              {t("stepOfTotal", { step: step + 1, total: steps.length })}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-brand-gradient transition-all duration-300" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
        </div>
        <div className="space-y-5 p-6">
          <PreviewSection title={t("institutionSectionLabel")}>
            <PreviewItem label={t("reviewCode")} value={form.code} />
            <PreviewItem label={t("reviewName")} value={form.name} />
            <PreviewItem label={t("reviewType")} value={form.type} />
            <PreviewItem label={t("reviewTimezone")} value={form.timezone} />
            <PreviewItem label={t("reviewDateFormat")} value={form.date_format} />
          </PreviewSection>
          <PreviewSection title="Configuration">
            <PreviewItem label={t("defaultLanguage")} value={form.languageDefault} />
            <PreviewItem label={t("supportedLanguages")} value={form.languageSupported.join(", ")} />
            <PreviewItem label={t("hasBranch")} value={form.has_branch ? t("common:yes") : t("common:no")} />
          </PreviewSection>
          <PreviewSection title={t("kycLoginPolicySectionLabel")}>
            <PreviewItem label={t("kycEnabled")} value={form.kyc_enabled ? t("common:yes") : t("common:no")} />
            <PreviewItem label={t("loginPinEnabled")} value={form.is_login_pin_enabled ? t("common:yes") : t("common:no")} />
            <PreviewItem label={t("transactionPinEnabled")} value={form.is_txn_pin_enabled ? t("common:yes") : t("common:no")} />
          </PreviewSection>
        </div>
      </div>
    </aside>
  );
}

function PreviewSection({ title, children }) {
  return (
    <section>
      <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{title}</h3>
      <div className="divide-y divide-border/60 rounded-xl border border-border/60 px-3">{children}</div>
    </section>
  );
}

function PreviewItem({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="max-w-[60%] truncate text-right text-xs font-semibold text-foreground">{value || "Not set"}</span>
    </div>
  );
}

export function AddInstitutionProfile() {
  const { t } = useTranslation("institutions");
  const navigate = useNavigate();
  // Real permission source (see useHasInstitutionAction) — the old
  // `currentUser?.institution?.type === "PLATFORM_OWNER"` check referenced a
  // field the auth flow never sets, so this page blocked every user
  // regardless of their actual "Add" permission from login's menu_array.
  const { mutateAsync: createInstitution, isPending: isLoading, error: mutationError } =
    useInstitutionCreateMutation();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [savedAsDraft, setSavedAsDraft] = useState(false);
  const [createdId, setCreatedId] = useState(null);
  const { types: institutionTypes } = useInstitutionTypes();
  const { languages } = useLanguages();
  const { timezones } = useTimezones();
  const STEPS = STEP_DEFS.map((step) => ({ ...step, label: t(step.key) }));

  if (submitted) {
    return (
      <div className="pt-4 pb-8">
        <div className="max-w-xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-10 border border-slate-100 shadow-sm text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={28} className="text-emerald-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">
              {savedAsDraft ? t("savedAsDraftTitle") : t("submittedForApprovalTitle")}
            </h2>
            <p className="text-sm text-slate-500 mb-1">
              {t("createdWithStatusPrefix")}{" "}
              <span className="font-semibold text-amber-600">
                {savedAsDraft ? t("statusDraft") : t("statusPendingAdd")}
              </span>
              .
            </p>
            <p className="text-sm text-slate-400 mb-6">
              {savedAsDraft
                ? t("draftVisibleOnlyToYou")
                : t("checkerMustApprove")}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setForm(EMPTY);
                  setStep(0);
                  setSubmitted(false);
                  setCreatedId(null);
                }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                {t("createAnother")}
              </button>
              <button
                onClick={() => navigate("/institutions")}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                {t("viewInstitutions")}
              </button>
              {savedAsDraft && createdId != null && (
                <button
                  onClick={() => navigate(`/institutions/${createdId}?edit=1`)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md shadow-blue-200/40"
                  style={{ background: "#2266EE" }}
                >
                  {t("continueEditingDraft")}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }
  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };
  const validate = () => {
    const next = {};
    if (step === 0) {
      if (!form.code.trim()) next.code = t("codeRequired");
      if (!form.name.trim()) next.name = t("nameRequired");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const handleNext = async (isDraft = false) => {
    if (!validate()) return;
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    try {
      const result = await createInstitution(buildPayload(form, isDraft));
      if (result) {
        setSavedAsDraft(isDraft);
        setCreatedId(extractCreatedId(result));
        setSubmitted(true);
      }
    } catch {
      // The mutation error is rendered below without changing the existing flow.
    }
  };
  return (
    <div className="pt-4 pb-8">
      <div className="mx-auto max-w-7xl">
        <button
          onClick={() => navigate("/institutions")}
          className="mb-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={15} /> {t("common:back")}
        </button>

        <div className="mb-8">
          <h1 className="text-xl font-semibold text-foreground">{t("createInstitutionTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("stepOfTotal", { step: step + 1, total: STEPS.length })}
          </p>
        </div>

        <div className="flex items-start mb-8">
          {STEPS.map(({ label, icon: Icon }, index) => {
            const isCompleted = index < step;
            const isCurrent = index === step;
            return (
              <div
                key={label}
                className={cn("flex items-center", index < STEPS.length - 1 && "flex-1")}
              >
                <div className="flex shrink-0 flex-col items-center gap-2">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 bg-card transition-colors",
                      isCompleted
                        ? "border-primary bg-primary text-primary-foreground"
                        : isCurrent
                          ? "border-primary text-primary"
                          : "border-border text-muted-foreground",
                    )}
                    style={isCurrent ? { background: "var(--primary-light)" } : undefined}
                  >
                    {isCompleted ? <Check size={18} /> : <Icon size={17} />}
                  </div>
                  <p
                    className={cn(
                      "w-20 text-center text-[11px] font-semibold leading-tight transition-colors",
                      isCurrent
                        ? "text-primary"
                        : isCompleted
                          ? "text-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </p>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 mx-2 rounded-full transition-colors duration-300",
                      index < step ? "bg-primary" : "bg-border",
                    )}
                    style={{ marginTop: "1.25rem" }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-start">
          <div>
        {mutationError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("unableToSubmit")}</AlertTitle>
            <AlertDescription>{mutationError.message}</AlertDescription>
          </Alert>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm"
          >
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
                {step === 0 && (
                  <div className="space-y-5">
                    <h2 className="text-sm font-semibold text-slate-800">{t("basicInformation")}</h2>
                    <InputField
                      label={t("institutionCode")}
                      fieldKey="code"
                      placeholder={t("institutionCodePlaceholder")}
                      required
                      value={form.code}
                      error={errors.code}
                      onChange={setField}
                    />
                    <InputField
                      label={t("institutionName")}
                      fieldKey="name"
                      placeholder={t("institutionNamePlaceholder")}
                      required
                      value={form.name}
                      error={errors.name}
                      onChange={setField}
                    />
                    <label className="block text-sm font-medium text-slate-700">
                      <span className="mb-1.5 block">{t("typeLabel")}</span>
                      <select
                        value={form.type}
                        onChange={(e) => setField("type", e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      >
                        <option value="">{t("selectInstitutionType")}</option>
                        {institutionTypes.map((type) => {
                          const value = type.id ?? type.type ?? type.code;
                          const label = type.name ?? type.type_name ?? type.code ?? value;
                          return <option key={value} value={value}>{label}</option>;
                        })}
                      </select>
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="block text-sm font-medium text-slate-700">
                        <span className="mb-1.5 block">{t("timezoneLabel")}</span>
                        <select
                          value={form.timezone}
                          onChange={(e) => setField("timezone", e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        >
                          <option value="">{t("selectTimezone")}</option>
                          {timezones.map((timezone) => {
                            const value = timezone.name ?? timezone.id;
                            return <option key={timezone.id ?? value} value={value}>{value}</option>;
                          })}
                        </select>
                      </label>
                      <DateFormatField
                        value={form.date_format}
                        onChange={(value) => setField("date_format", value)}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-slate-700">{t("defaultLanguage")}</label>
                      <select
                        value={form.languageDefault}
                        onChange={(e) => setField("languageDefault", e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                      >
                        {languages.map((language) => {
                          const value = typeof language === "string" ? language : language.code ?? language.id ?? language.language_code;
                          return <option key={value} value={value}>{typeof language === "string" ? language : language.name ?? language.language_name ?? value}</option>;
                        })}
                      </select>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("supportedLanguages")}</p>
                      <div className="flex flex-wrap gap-4">
                        {languages.map((language) => {
                          const value = typeof language === "string" ? language : language.code ?? language.id ?? language.language_code;
                          const label = typeof language === "string" ? language : language.name ?? language.language_name ?? value;
                          const checked = form.languageSupported.includes(value);
                          return (
                            <label key={value} className="flex items-center gap-2 text-sm text-slate-600">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => setField("languageSupported", e.target.checked
                                  ? [...new Set([...form.languageSupported, value])]
                                  : form.languageSupported.filter((item) => item !== value))}
                              />
                              {label}{form.languageDefault === value ? ` ${t("defaultSuffix")}` : ""}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <ToggleField
                      label={t("hasBranch")}
                      fieldKey="has_branch"
                      value={form.has_branch}
                      onChange={setField}
                    />
                    {form.has_branch && (
                      <NumberField
                        label={t("maxBranchesAllowed")}
                        fieldKey="max_branches_allowed"
                        value={form.max_branches_allowed}
                        onChange={setField}
                      />
                    )}
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-5">
                    <h2 className="text-sm font-semibold text-slate-800">{t("stepKycPolicy")}</h2>
                    <ToggleField
                      label={t("kycEnabled")}
                      fieldKey="kyc_enabled"
                      value={form.kyc_enabled}
                      onChange={setField}
                    />
                    {form.kyc_enabled && (
                      <>
                        <NumberField
                          label={t("totalKycLevels")}
                          fieldKey="total_kyc_levels"
                          value={form.total_kyc_levels}
                          onChange={setField}
                        />
                        <ToggleField
                          label={t("autoApproveKycLevel")}
                          fieldKey="auto_approve_kyc_level"
                          value={form.auto_approve_kyc_level}
                          onChange={setField}
                        />
                        <ToggleField
                          label={t("allowDowngradeKyc")}
                          fieldKey="allow_downgrade_kyc"
                          value={form.allow_downgrade_kyc}
                          onChange={setField}
                        />
                      </>
                    )}
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5">
                    <h2 className="text-sm font-semibold text-slate-800">{t("stepLoginPinPolicy")}</h2>
                    <InputField
                      label={t("allowedLoginIdentifiers")}
                      fieldKey="allowed_login_identifiers"
                      placeholder={t("allowedLoginIdentifiersPlaceholder")}
                      value={form.allowed_login_identifiers}
                      onChange={setField}
                    />
                    <InputField
                      label={t("primaryLoginIdentifier")}
                      fieldKey="primary_login_identifier"
                      placeholder={t("primaryLoginIdentifierPlaceholder")}
                      value={form.primary_login_identifier}
                      onChange={setField}
                    />
                    <ToggleField
                      label={t("loginPinEnabled")}
                      fieldKey="is_login_pin_enabled"
                      value={form.is_login_pin_enabled}
                      onChange={setField}
                    />
                    {form.is_login_pin_enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <NumberField
                          label={t("loginPinLength")}
                          fieldKey="login_pin_length"
                          value={form.login_pin_length}
                          onChange={setField}
                        />
                        <InputField
                          label={t("loginPinType")}
                          fieldKey="login_pin_type"
                          placeholder={t("loginPinTypePlaceholder")}
                          value={form.login_pin_type}
                          onChange={setField}
                        />
                      </div>
                    )}
                    <ToggleField
                      label={t("allowBiometricLogin")}
                      fieldKey="allow_biometric_login"
                      value={form.allow_biometric_login}
                      onChange={setField}
                    />
                    <ToggleField
                      label={t("transactionPinEnabled")}
                      fieldKey="is_txn_pin_enabled"
                      value={form.is_txn_pin_enabled}
                      onChange={setField}
                    />
                    {form.is_txn_pin_enabled && (
                      <>
                        <NumberField
                          label={t("transactionPinLength")}
                          fieldKey="txn_pin_length"
                          value={form.txn_pin_length}
                          onChange={setField}
                        />
                        <ToggleField
                          label={t("sameLoginTxnPinAllowed")}
                          fieldKey="is_same_login_txn_pin_allowed"
                          value={form.is_same_login_txn_pin_allowed}
                          onChange={setField}
                        />
                      </>
                    )}
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-5">
                    <h2 className="text-sm font-semibold text-slate-800">{t("stepReviewSubmit")}</h2>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        {t("institutionSectionLabel")}
                      </p>
                      <div className="rounded-xl border border-slate-100 px-4">
                        <ReviewRow label={t("reviewCode")} value={form.code} />
                        <ReviewRow label={t("reviewName")} value={form.name} />
                        <ReviewRow label={t("reviewType")} value={form.type} />
                        <ReviewRow label={t("reviewTimezone")} value={form.timezone} />
                        <ReviewRow label={t("reviewDateFormat")} value={form.date_format} />
                        <ReviewRow label={t("reviewHasBranch")} value={form.has_branch} />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        {t("kycLoginPolicySectionLabel")}
                      </p>
                      <div className="rounded-xl border border-slate-100 px-4">
                        <ReviewRow label={t("kycEnabled")} value={form.kyc_enabled} />
                        <ReviewRow
                          label={t("reviewLoginIdentifiers")}
                          value={form.allowed_login_identifiers}
                        />
                        <ReviewRow label={t("loginPinEnabled")} value={form.is_login_pin_enabled} />
                        <ReviewRow label={t("reviewTxnPinEnabled")} value={form.is_txn_pin_enabled} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        {t("narrationOptional")}
                      </label>
                      <textarea
                        value={form.narration}
                        onChange={(e) => setField("narration", e.target.value)}
                        placeholder={t("reasonForRequestPlaceholder")}
                        className="w-full min-h-20 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
                      <AlertCircle size={15} className="text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-amber-800">
                          {t("makerCheckerRequired")}
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          {t("makerCheckerCreatedWithStatus")} <strong>{t("statusPendingAdd")}</strong>.{" "}
                          {t("makerCheckerDifferentUserMustApprove")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-3 mt-5">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {t("common:back")}
            </button>
          )}
          {step === STEPS.length - 1 && (
            <button
              onClick={() => void handleNext(true)}
              disabled={isLoading}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-60"
            >
              {t("saveAsDraft")}
            </button>
          )}
          <button
            onClick={() => void handleNext(false)}
            disabled={isLoading}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-[var(--primary)] shadow-md shadow-blue-200/40 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60"
          >
            {step === STEPS.length - 1 ? t("submitForApproval") : t("continueButton")}
          </button>
        </div>
          </div>
          <LivePreview form={form} step={step} steps={STEPS} t={t} />
        </div>
      </div>
    </div>
  );
}
