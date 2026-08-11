import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import { useInstitutionStore } from "../../features/institution/institution.store";
import { useAuthStore } from "../../features/auth/auth.store";
import type { CreateInstitutionPayload, InstitutionKycCreate } from "../../features/institution/institution.types";
import { Skeleton } from "../../components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";

const STEPS = ["Basic Info", "KYC — Contact & Identity", "KYC — Address", "Review & Submit"];

// Per API reference: type is always PLATFORM_USER when created via API
const INSTITUTION_TYPES = ["PLATFORM_USER"];

const COUNTRIES = ["India", "United States", "United Kingdom", "Canada", "Australia"];

interface FormData {
  // Step 1 — institution fields (only what POST /institutions accepts at top level)
  code: string;
  name: string;
  type: string;
  // Step 2 — KYC contact & identity
  kyc_legal_name: string;
  kyc_registration_number: string;
  kyc_tax_id: string;
  kyc_email: string;
  kyc_phone: string;
  kyc_website: string;
  // Step 3 — KYC address
  kyc_address_line1: string;
  kyc_address_line2: string;
  kyc_city: string;
  kyc_state: string;
  kyc_country: string;
  kyc_postal_code: string;
}

const EMPTY: FormData = {
  code: "",
  name: "",
  type: "PLATFORM_USER",
  kyc_legal_name: "",
  kyc_registration_number: "",
  kyc_tax_id: "",
  kyc_email: "",
  kyc_phone: "",
  kyc_website: "",
  kyc_address_line1: "",
  kyc_address_line2: "",
  kyc_city: "",
  kyc_state: "",
  kyc_country: "",
  kyc_postal_code: "",
};

function buildPayload(form: FormData): CreateInstitutionPayload {
  const kyc: InstitutionKycCreate = {
    legal_name:          form.kyc_legal_name          || null,
    registration_number: form.kyc_registration_number || null,
    tax_id:              form.kyc_tax_id              || null,
    email:               form.kyc_email               || null,
    phone:               form.kyc_phone               || null,
    website:             form.kyc_website             || null,
    address_line1:       form.kyc_address_line1       || null,
    address_line2:       form.kyc_address_line2       || null,
    city:                form.kyc_city                || null,
    state:               form.kyc_state               || null,
    country:             form.kyc_country             || null,
    postal_code:         form.kyc_postal_code         || null,
  };
  return { code: form.code, name: form.name, type: form.type, kyc };
}

// Module-level — stable identity across renders, no focus loss
function InputField({
  label, fieldKey, placeholder, type = "text", required = false,
  value, error, onChange,
}: {
  label: string;
  fieldKey: string;
  placeholder: string;
  type?: string;
  required?: boolean;
  value: string;
  error?: string;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}{required && " *"}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full px-4 py-2.5 rounded-xl bg-slate-50 border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all",
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

function ReviewRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-700 text-right ml-4 min-w-0 break-all">{value || "—"}</span>
    </div>
  );
}

export function CreateInstitutionFlow() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const isPlatformOwner = currentUser?.institution?.type === "PLATFORM_OWNER";
  const { createInstitution, isLoading, error } = useInstitutionStore();

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitted, setSubmitted] = useState(false);

  if (!isPlatformOwner) {
    return (
      <div className="pt-4 flex flex-col items-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle size={22} className="text-red-400" />
        </div>
        <p className="text-sm font-bold text-slate-700">No permission</p>
        <p className="text-xs text-slate-400 mt-1">Only Platform Owners can create institutions</p>
      </div>
    );
  }

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
              The institution has been created with status <span className="font-semibold text-amber-600">PENDING</span>.
            </p>
            <p className="text-sm text-slate-400 mb-6">
              An authorized checker must approve it before it becomes active. You cannot approve your own submission.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setForm(EMPTY); setStep(0); setSubmitted(false); }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Create Another
              </button>
              <button
                onClick={() => navigate("/institutions")}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md shadow-indigo-200/40"
                style={{ background: "linear-gradient(135deg, #6C7FFF 0%, #B39DFA 100%)" }}
              >
                View Institutions
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const setField = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (step === 0) {
      if (!form.code.trim()) next.code = "Code is required";
      if (!form.name.trim()) next.name = "Institution name is required";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;
    if (step < STEPS.length - 1) { setStep((s) => s + 1); return; }
    const payload = buildPayload(form);
    const created = await createInstitution(payload);
    if (created) setSubmitted(true);
  };

  return (
    <div className="pt-4 pb-8">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate("/institutions")} className="text-sm text-slate-500 hover:text-slate-800 transition-colors">← Back</button>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Create Institution</h1>
            <p className="text-sm text-slate-500 mt-0.5">Step {step + 1} of {STEPS.length}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-8">
          {STEPS.map((label, index) => (
            <div key={label} className="flex-1">
              <div className={cn("h-1 rounded-full transition-all duration-300", index <= step ? "bg-indigo-500" : "bg-slate-200")} />
              <p className={cn("text-[11px] mt-1.5 font-medium transition-colors", index === step ? "text-indigo-600" : "text-slate-400")}>{label}</p>
            </div>
          ))}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to submit</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm"
          >
            {isLoading ? (
              <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <>
                {/* ── Step 1: Basic Info ── */}
                {step === 0 && (
                  <div className="space-y-5">
                    <h2 className="text-sm font-semibold text-slate-800">Basic Information</h2>
                    <InputField label="Institution Code" fieldKey="code" placeholder="NEWBANK" required value={form.code} error={errors.code} onChange={setField} />
                    <InputField label="Institution Name" fieldKey="name" placeholder="New Bank Ltd" required value={form.name} error={errors.name} onChange={setField} />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Institution Type</label>
                      <select
                        value={form.type}
                        onChange={(e) => setField("type", e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all"
                      >
                        {INSTITUTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <p className="text-xs text-slate-400 mt-1">Institutions created via this form are always PLATFORM_USER.</p>
                    </div>
                  </div>
                )}

                {/* ── Step 2: KYC Contact & Identity ── */}
                {step === 1 && (
                  <div className="space-y-5">
                    <h2 className="text-sm font-semibold text-slate-800">KYC — Contact & Identity</h2>
                    <p className="text-xs text-slate-400">Submitted as part of the institution record. All fields optional.</p>
                    <InputField label="Legal Name" fieldKey="kyc_legal_name" placeholder="New Bank Limited" value={form.kyc_legal_name} error={errors.kyc_legal_name} onChange={setField} />
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label="Registration Number" fieldKey="kyc_registration_number" placeholder="REG-001" value={form.kyc_registration_number} error={errors.kyc_registration_number} onChange={setField} />
                      <InputField label="Tax ID" fieldKey="kyc_tax_id" placeholder="TAX-001" value={form.kyc_tax_id} error={errors.kyc_tax_id} onChange={setField} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label="Email" fieldKey="kyc_email" placeholder="admin@newbank.com" type="email" value={form.kyc_email} error={errors.kyc_email} onChange={setField} />
                      <InputField label="Phone" fieldKey="kyc_phone" placeholder="+91-9000000001" type="tel" value={form.kyc_phone} error={errors.kyc_phone} onChange={setField} />
                    </div>
                    <InputField label="Website" fieldKey="kyc_website" placeholder="https://newbank.com" value={form.kyc_website} error={errors.kyc_website} onChange={setField} />
                  </div>
                )}

                {/* ── Step 3: KYC Address ── */}
                {step === 2 && (
                  <div className="space-y-5">
                    <h2 className="text-sm font-semibold text-slate-800">KYC — Address</h2>
                    <InputField label="Address Line 1" fieldKey="kyc_address_line1" placeholder="1 Finance St" value={form.kyc_address_line1} error={errors.kyc_address_line1} onChange={setField} />
                    <InputField label="Address Line 2" fieldKey="kyc_address_line2" placeholder="Suite 400" value={form.kyc_address_line2} error={errors.kyc_address_line2} onChange={setField} />
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label="City" fieldKey="kyc_city" placeholder="Mumbai" value={form.kyc_city} error={errors.kyc_city} onChange={setField} />
                      <InputField label="State" fieldKey="kyc_state" placeholder="Maharashtra" value={form.kyc_state} error={errors.kyc_state} onChange={setField} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label="Postal Code" fieldKey="kyc_postal_code" placeholder="400001" value={form.kyc_postal_code} error={errors.kyc_postal_code} onChange={setField} />
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Country</label>
                        <select
                          value={form.kyc_country}
                          onChange={(e) => setField("kyc_country", e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all"
                        >
                          <option value="">Select…</option>
                          {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 4: Review & Submit ── */}
                {step === 3 && (
                  <div className="space-y-5">
                    <h2 className="text-sm font-semibold text-slate-800">Review & Submit</h2>

                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Institution</p>
                      <div className="rounded-xl border border-slate-100 px-4">
                        <ReviewRow label="Code" value={form.code} />
                        <ReviewRow label="Name" value={form.name} />
                        <ReviewRow label="Type" value={form.type} />
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">KYC — Contact & Identity</p>
                      <div className="rounded-xl border border-slate-100 px-4">
                        <ReviewRow label="Legal Name"    value={form.kyc_legal_name} />
                        <ReviewRow label="Reg. Number"   value={form.kyc_registration_number} />
                        <ReviewRow label="Tax ID"        value={form.kyc_tax_id} />
                        <ReviewRow label="Email"         value={form.kyc_email} />
                        <ReviewRow label="Phone"         value={form.kyc_phone} />
                        <ReviewRow label="Website"       value={form.kyc_website} />
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">KYC — Address</p>
                      <div className="rounded-xl border border-slate-100 px-4">
                        <ReviewRow label="Address Line 1" value={form.kyc_address_line1} />
                        <ReviewRow label="Address Line 2" value={form.kyc_address_line2} />
                        <ReviewRow label="City"           value={form.kyc_city} />
                        <ReviewRow label="State"          value={form.kyc_state} />
                        <ReviewRow label="Country"        value={form.kyc_country} />
                        <ReviewRow label="Postal Code"    value={form.kyc_postal_code} />
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
                      <AlertCircle size={15} className="text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-amber-800">Maker-Checker Required</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Institution will be created with status <strong>PENDING</strong>. A different authorized user must approve it — you cannot approve your own submission.
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
            onClick={handleNext}
            disabled={isLoading}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md shadow-indigo-200/40 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60"
          >
            {step === STEPS.length - 1 ? "Submit for Approval" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
