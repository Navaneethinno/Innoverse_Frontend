import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/Utils/Lib/cn";
import {
  useInstitutionCreateMutation,
} from "@/Hooks/Institutions/institutionHooks";
import { Skeleton } from "@/Components/UI/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/Components/UI/alert";
import { DateFormatField } from "@/Components/Institutions/DateFormatField";

// Field set matches POST /institution/profile/add's confirmed body exactly
// (Postman collection, "Institution/Profile" folder) — no KYC/legal/address
// sub-objects, since those live under separate out-of-scope sub-entities
// (Institution/Legal, Institution/Branding, ...).
const STEPS = ["Basic Info", "KYC Policy", "Login & PIN Policy", "Review & Submit"];
const EMPTY = {
  code: "",
  name: "",
  type: "PLATFORM_USER",
  timezone: "Asia/Kolkata",
  language: "en",
  date_format: "DD-MM-YYYY",
  has_branch: false,
  max_branches_allowed: 1,
  kyc_enabled: false,
  total_kyc_levels: 0,
  allow_downgrade_kyc: false,
  auto_approve_kyc_level: 0,
  allowed_login_identifiers: "USERNAME",
  primary_login_identifier: "USERNAME",
  is_login_pin_enabled: false,
  login_pin_length: 4,
  login_pin_type: "NUMERIC",
  allow_biometric_login: false,
  is_txn_pin_enabled: false,
  txn_pin_length: 4,
  is_same_login_txn_pin_allowed: false,
};

function buildPayload(form) {
  return {
    code: form.code,
    name: form.name,
    type: Number(form.type) || 1,
    timezone: form.timezone,
    language: {
      default: form.language.split(",").map((v) => v.trim()).filter(Boolean)[0] || "en",
      supported: form.language.split(",").map((v) => v.trim()).filter(Boolean),
    },
    date_format: form.date_format,
    has_branch: form.has_branch,
    max_branches_allowed: Number(form.max_branches_allowed) || 0,
    kyc_enabled: form.kyc_enabled,
    total_kyc_levels: Number(form.total_kyc_levels) || 0,
    allow_downgrade_kyc: form.allow_downgrade_kyc,
    auto_approve_kyc_level: Number(form.auto_approve_kyc_level) > 0,
    allowed_login_identifiers: {
      identifiers: form.allowed_login_identifiers
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    },
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
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-700 text-right ml-4 min-w-0 break-all">
        {typeof value === "boolean" ? (value ? "Yes" : "No") : value || "—"}
      </span>
    </div>
  );
}

export function CreateInstitutionFlow() {
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
            <h2 className="text-lg font-bold text-slate-800 mb-2">Submitted for Approval</h2>
            <p className="text-sm text-slate-500 mb-1">
              The institution has been created with status{" "}
              <span className="font-semibold text-amber-600">Pending Add</span>.
            </p>
            <p className="text-sm text-slate-400 mb-6">
              A different authorized checker must approve it — you cannot approve your own
              submission.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setForm(EMPTY);
                  setStep(0);
                  setSubmitted(false);
                }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Create Another
              </button>
              <button
                onClick={() => navigate("/institutions")}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md shadow-blue-200/40"
                style={{ background: "#2266EE" }}
              >
                View Institutions
              </button>
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
      if (!form.code.trim()) next.code = "Code is required";
      if (!form.name.trim()) next.name = "Institution name is required";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const handleNext = async () => {
    if (!validate()) return;
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    try {
      const result = await createInstitution(buildPayload(form));
      if (result) setSubmitted(true);
    } catch {
      // The mutation error is rendered below without changing the existing flow.
    }
  };
  return (
    <div className="pt-4 pb-8">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/institutions")}
            className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Create Institution</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Step {step + 1} of {STEPS.length}
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-8">
          {STEPS.map((label, index) => (
            <div key={label} className="flex-1">
              <div
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  index <= step ? "bg-blue-500" : "bg-slate-200",
                )}
              />
              <p
                className={cn(
                  "text-[11px] mt-1.5 font-medium transition-colors",
                  index === step ? "text-blue-600" : "text-slate-400",
                )}
              >
                {label}
              </p>
            </div>
          ))}
        </div>

        {mutationError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to submit</AlertTitle>
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
                    <h2 className="text-sm font-semibold text-slate-800">Basic Information</h2>
                    <InputField
                      label="Institution Code"
                      fieldKey="code"
                      placeholder="NEWBANK"
                      required
                      value={form.code}
                      error={errors.code}
                      onChange={setField}
                    />
                    <InputField
                      label="Institution Name"
                      fieldKey="name"
                      placeholder="New Bank Ltd"
                      required
                      value={form.name}
                      error={errors.name}
                      onChange={setField}
                    />
                    <InputField
                      label="Type"
                      fieldKey="type"
                      placeholder="PLATFORM_USER"
                      value={form.type}
                      onChange={setField}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <InputField
                        label="Timezone"
                        fieldKey="timezone"
                        placeholder="Asia/Kolkata"
                        value={form.timezone}
                        onChange={setField}
                      />
                      <DateFormatField
                        value={form.date_format}
                        onChange={(value) => setField("date_format", value)}
                      />
                    </div>
                    <InputField
                      label="Language(s) (comma separated)"
                      fieldKey="language"
                      placeholder="en"
                      value={form.language}
                      onChange={setField}
                    />
                    <ToggleField
                      label="Has Branch"
                      fieldKey="has_branch"
                      value={form.has_branch}
                      onChange={setField}
                    />
                    {form.has_branch && (
                      <NumberField
                        label="Max Branches Allowed"
                        fieldKey="max_branches_allowed"
                        value={form.max_branches_allowed}
                        onChange={setField}
                      />
                    )}
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-5">
                    <h2 className="text-sm font-semibold text-slate-800">KYC Policy</h2>
                    <ToggleField
                      label="KYC Enabled"
                      fieldKey="kyc_enabled"
                      value={form.kyc_enabled}
                      onChange={setField}
                    />
                    {form.kyc_enabled && (
                      <>
                        <NumberField
                          label="Total KYC Levels"
                          fieldKey="total_kyc_levels"
                          value={form.total_kyc_levels}
                          onChange={setField}
                        />
                        <NumberField
                          label="Auto Approve KYC Level"
                          fieldKey="auto_approve_kyc_level"
                          value={form.auto_approve_kyc_level}
                          onChange={setField}
                        />
                        <ToggleField
                          label="Allow Downgrade KYC"
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
                    <h2 className="text-sm font-semibold text-slate-800">Login & PIN Policy</h2>
                    <InputField
                      label="Allowed Login Identifiers (comma separated)"
                      fieldKey="allowed_login_identifiers"
                      placeholder="USERNAME,EMAIL,MOBILE"
                      value={form.allowed_login_identifiers}
                      onChange={setField}
                    />
                    <InputField
                      label="Primary Login Identifier"
                      fieldKey="primary_login_identifier"
                      placeholder="USERNAME"
                      value={form.primary_login_identifier}
                      onChange={setField}
                    />
                    <ToggleField
                      label="Login PIN Enabled"
                      fieldKey="is_login_pin_enabled"
                      value={form.is_login_pin_enabled}
                      onChange={setField}
                    />
                    {form.is_login_pin_enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <NumberField
                          label="Login PIN Length"
                          fieldKey="login_pin_length"
                          value={form.login_pin_length}
                          onChange={setField}
                        />
                        <InputField
                          label="Login PIN Type"
                          fieldKey="login_pin_type"
                          placeholder="NUMERIC"
                          value={form.login_pin_type}
                          onChange={setField}
                        />
                      </div>
                    )}
                    <ToggleField
                      label="Allow Biometric Login"
                      fieldKey="allow_biometric_login"
                      value={form.allow_biometric_login}
                      onChange={setField}
                    />
                    <ToggleField
                      label="Transaction PIN Enabled"
                      fieldKey="is_txn_pin_enabled"
                      value={form.is_txn_pin_enabled}
                      onChange={setField}
                    />
                    {form.is_txn_pin_enabled && (
                      <>
                        <NumberField
                          label="Transaction PIN Length"
                          fieldKey="txn_pin_length"
                          value={form.txn_pin_length}
                          onChange={setField}
                        />
                        <ToggleField
                          label="Same Login/Transaction PIN Allowed"
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
                    <h2 className="text-sm font-semibold text-slate-800">Review & Submit</h2>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        Institution
                      </p>
                      <div className="rounded-xl border border-slate-100 px-4">
                        <ReviewRow label="Code" value={form.code} />
                        <ReviewRow label="Name" value={form.name} />
                        <ReviewRow label="Type" value={form.type} />
                        <ReviewRow label="Timezone" value={form.timezone} />
                        <ReviewRow label="Date Format" value={form.date_format} />
                        <ReviewRow label="Has Branch" value={form.has_branch} />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        KYC & Login Policy
                      </p>
                      <div className="rounded-xl border border-slate-100 px-4">
                        <ReviewRow label="KYC Enabled" value={form.kyc_enabled} />
                        <ReviewRow
                          label="Login Identifiers"
                          value={form.allowed_login_identifiers}
                        />
                        <ReviewRow label="Login PIN Enabled" value={form.is_login_pin_enabled} />
                        <ReviewRow label="Txn PIN Enabled" value={form.is_txn_pin_enabled} />
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
                      <AlertCircle size={15} className="text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-amber-800">
                          Maker-Checker Required
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Institution will be created with status <strong>Pending Add</strong>. A
                          different authorized user must approve it — you cannot approve your own
                          submission.
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
              Back
            </button>
          )}
          <button
            onClick={() => void handleNext()}
            disabled={isLoading}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 shadow-md shadow-blue-200/40 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60"
          >
            {step === STEPS.length - 1 ? "Submit for Approval" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
