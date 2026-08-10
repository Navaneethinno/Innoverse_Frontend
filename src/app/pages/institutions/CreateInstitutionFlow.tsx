import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import { useInstitutionStore } from "../../features/institution/institution.store";
import { useAuthStore } from "../../features/auth/auth.store";
import type { Institution } from "../../features/institution/institution.types";
import { Skeleton } from "../../components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { toast } from "sonner";

export function CreateInstitutionFlow() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const isPlatformOwner = currentUser?.institution?.type === "PLATFORM_OWNER";
  const { createInstitution, isLoading, error } = useInstitutionStore();

  const [step, setStep] = useState(0);
  const steps = ["Basic Info", "Address", "Review"];
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [data, setData] = useState({
    name: "",
    type: "Commercial Bank",
    email: "",
    phone: "",
    address_line1: "",
    city: "",
    state: "",
    postal_code: "",
    country: "United States",
  });

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

  const set = (key: string, value: string) => {
    setData((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (step === 0) {
      if (!data.name.trim()) nextErrors.name = "Institution name is required";
      if (!data.email.trim()) nextErrors.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) nextErrors.email = "Invalid email format";
    }
    if (step === 1) {
      if (!data.address_line1.trim()) nextErrors.address_line1 = "Address is required";
      if (!data.city.trim()) nextErrors.city = "City is required";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;
    if (step < steps.length - 1) { setStep((s) => s + 1); return; }
    const created = await createInstitution(data as Partial<Institution>);
    if (created) {
      toast.success("Institution submitted for approval");
      navigate("/institutions");
    } else if (error) {
      toast.error(error);
    }
  };

  const InputField = ({ label, fieldKey, placeholder, type = "text" }: { label: string; fieldKey: string; placeholder: string; type?: string }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={data[fieldKey as keyof typeof data]}
        onChange={(e) => set(fieldKey, e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full px-4 py-2.5 rounded-xl bg-slate-50 border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all",
          errors[fieldKey] ? "border-red-300 bg-red-50" : "border-slate-200",
        )}
      />
      {errors[fieldKey] && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors[fieldKey]}</p>
      )}
    </div>
  );

  return (
    <div className="pt-4 pb-8">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate("/institutions")} className="text-sm text-slate-500 hover:text-slate-800 transition-colors">← Back</button>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Create Institution</h1>
            <p className="text-sm text-slate-500 mt-0.5">Step {step + 1} of {steps.length}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-8">
          {steps.map((label, index) => (
            <div key={label} className="flex-1">
              <div className={cn("h-1 rounded-full transition-all duration-400", index <= step ? "bg-indigo-500" : "bg-slate-200")} />
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
                {step === 0 && (
                  <div className="space-y-5">
                    <h2 className="text-sm font-semibold text-slate-800">Basic Information</h2>
                    <InputField label="Institution Name *" fieldKey="name" placeholder="Apex Financial Group" />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Institution Type</label>
                      <select value={data.type} onChange={(e) => set("type", e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all">
                        {["Commercial Bank", "Credit Union", "Savings Bank", "Investment Bank", "Trust Company", "Community Bank"].map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <InputField label="Primary Email *" fieldKey="email" placeholder="admin@institution.com" type="email" />
                    <InputField label="Phone" fieldKey="phone" placeholder="+1 (555) 000-0000" type="tel" />
                  </div>
                )}
                {step === 1 && (
                  <div className="space-y-5">
                    <h2 className="text-sm font-semibold text-slate-800">Address Details</h2>
                    <InputField label="Street Address *" fieldKey="address_line1" placeholder="123 Finance Street" />
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label="City *" fieldKey="city" placeholder="New York" />
                      <InputField label="State" fieldKey="state" placeholder="NY" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label="Postal Code" fieldKey="postal_code" placeholder="10001" />
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Country</label>
                        <select value={data.country} onChange={(e) => set("country", e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all">
                          {["United States", "United Kingdom", "Canada", "Australia"].map((c) => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
                {step === 2 && (
                  <div className="space-y-4">
                    <h2 className="text-sm font-semibold text-slate-800">Review & Submit</h2>
                    <div className="space-y-0 divide-y divide-slate-50">
                      {[
                        { label: "Name", value: data.name || "—" },
                        { label: "Type", value: data.type },
                        { label: "Email", value: data.email || "—" },
                        { label: "Phone", value: data.phone || "—" },
                        { label: "Address", value: [data.address_line1, data.city, data.state, data.postal_code].filter(Boolean).join(", ") || "—" },
                        { label: "Country", value: data.country },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-start justify-between py-2.5">
                          <span className="text-sm text-slate-500 shrink-0">{label}</span>
                          <span className="text-sm font-medium text-slate-700 text-right ml-4 min-w-0 break-all">{value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
                      <AlertCircle size={15} className="text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-amber-800">Maker-Checker Required</p>
                        <p className="text-xs text-amber-700 mt-0.5">Institution will be created in Draft status and requires checker approval to go Active.</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-3 mt-5">
          {step > 0 && <button onClick={() => setStep((s) => s - 1)} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Back</button>}
          <button
            onClick={handleNext}
            disabled={isLoading}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md shadow-indigo-200/40 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60"
          >
            {step === steps.length - 1 ? "Submit for Approval" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
