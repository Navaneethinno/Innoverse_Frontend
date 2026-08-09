import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, Check, X } from "lucide-react";
import { GradientMesh } from "../../legacy/legacy-components";
import { cn } from "../../lib/utils";
import { useInstitutionStore } from "../../features/institution/institution.store";
import type { Institution } from "../../features/institution/institution.types";
import { Skeleton } from "../../components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { toast } from "sonner";

export function CreateInstitutionFlow() {
  const navigate = useNavigate();
  const { createInstitution, isLoading, error } = useInstitutionStore();
  const [step, setStep] = useState(0);
  const steps = ["Basic Info", "Address", "Banking", "Review"];
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [data, setData] = useState({
    name: "",
    type: "Commercial Bank",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "United States",
    regNumber: "",
    swift: "",
    routing: "",
    tags: ["Regulated", "Tier-1"] as string[],
  });
  const [tagInput, setTagInput] = useState("");

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
      if (!data.address.trim()) nextErrors.address = "Address is required";
      if (!data.city.trim()) nextErrors.city = "City is required";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    const created = await createInstitution(data as Partial<Institution>);
    if (created) {
      toast.success("Institution submitted for approval");
      navigate("/institutions");
    } else if (error) {
      toast.error(error);
    }
  };

  const addTag = () => {
    const value = tagInput.trim();
    if (value && !data.tags.includes(value)) {
      setData((d) => ({ ...d, tags: [...d.tags, value] }));
      setTagInput("");
    }
  };

  const InputField = ({
    label,
    fieldKey,
    placeholder,
    type = "text",
    mono = false,
  }: {
    label: string;
    fieldKey: string;
    placeholder: string;
    type?: string;
    mono?: boolean;
  }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={data[fieldKey as keyof typeof data] as string}
        onChange={(e) => set(fieldKey, e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full px-4 py-2.5 rounded-xl bg-slate-50 border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all",
          mono && "font-mono",
          errors[fieldKey] ? "border-red-300 bg-red-50" : "border-slate-200",
        )}
      />
      {errors[fieldKey] && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle size={11} /> {errors[fieldKey]}
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 relative bg-[#F9FAFB]">
      <GradientMesh />
      <div className="relative max-w-xl mx-auto">
        <div className="flex items-center gap-4 mb-8 pt-2">
          <button onClick={() => navigate("/institutions")} className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
            ← Back
          </button>
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
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm"
          >
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <>
                {step === 0 && (
                  <div className="space-y-5">
                    <h2 className="text-sm font-semibold text-slate-800">Basic Information</h2>
                    <InputField label="Institution Name *" fieldKey="name" placeholder="Apex Financial Group" />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Institution Type</label>
                      <select value={data.type} onChange={(e) => set("type", e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all">
                        {["Commercial Bank", "Credit Union", "Savings Bank", "Investment Bank", "Trust Company", "Community Bank"].map((type) => <option key={type}>{type}</option>)}
                      </select>
                    </div>
                    <InputField label="Primary Email *" fieldKey="email" placeholder="admin@institution.com" type="email" />
                    <InputField label="Phone" fieldKey="phone" placeholder="+1 (555) 000-0000" type="tel" />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Classification Tags</label>
                      <div className="flex flex-wrap gap-2 mb-2 min-h-6">
                        {data.tags.map((tag) => (
                          <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
                            {tag}
                            <button onClick={() => setData((d) => ({ ...d, tags: d.tags.filter((item) => item !== tag) }))} aria-label={`Remove ${tag}`}>
                              <X size={10} className="hover:text-indigo-900" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                          placeholder="Add tag…"
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all"
                        />
                        <button onClick={addTag} className="px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition-colors">Add</button>
                      </div>
                    </div>
                  </div>
                )}
                {step === 1 && (
                  <div className="space-y-5">
                    <h2 className="text-sm font-semibold text-slate-800">Address Details</h2>
                    <InputField label="Street Address *" fieldKey="address" placeholder="123 Finance Street" />
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label="City *" fieldKey="city" placeholder="New York" />
                      <InputField label="State" fieldKey="state" placeholder="NY" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label="ZIP Code" fieldKey="zip" placeholder="10001" />
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Country</label>
                        <select value={data.country} onChange={(e) => set("country", e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all">
                          {["United States", "United Kingdom", "Canada", "Australia"].map((country) => <option key={country}>{country}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
                {step === 2 && (
                  <div className="space-y-5">
                    <h2 className="text-sm font-semibold text-slate-800">Banking Details</h2>
                    <InputField label="Registration Number" fieldKey="regNumber" placeholder="REG-2024-XXXXX" />
                    <InputField label="SWIFT / BIC Code" fieldKey="swift" placeholder="XXXXUS33XXX" mono />
                    <InputField label="ABA Routing Number" fieldKey="routing" placeholder="123456789" mono />
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
                      <AlertCircle size={15} className="text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-amber-800">Maker-Checker Required</p>
                        <p className="text-xs text-amber-700 mt-0.5">Institution will be created in Draft status and requires checker approval to go Active.</p>
                      </div>
                    </div>
                  </div>
                )}
                {step === 3 && (
                  <div className="space-y-4">
                    <h2 className="text-sm font-semibold text-slate-800">Review & Submit</h2>
                    <div className="space-y-0 divide-y divide-slate-50">
                      {[
                        { label: "Name", value: data.name || "—" },
                        { label: "Type", value: data.type },
                        { label: "Email", value: data.email || "—" },
                        { label: "Phone", value: data.phone || "—" },
                        { label: "Address", value: [data.address, data.city, data.state, data.zip].filter(Boolean).join(", ") || "—" },
                        { label: "Country", value: data.country },
                        { label: "Registration", value: data.regNumber || "—" },
                        { label: "SWIFT", value: data.swift || "—" },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-start justify-between py-2.5">
                          <span className="text-sm text-slate-500 shrink-0">{label}</span>
                          <span className="text-sm font-medium text-slate-700 text-right ml-4 min-w-0 break-all">{value}</span>
                        </div>
                      ))}
                    </div>
                    {data.tags.length > 0 && (
                      <div className="flex items-center justify-between pt-2.5 border-t border-slate-50">
                        <span className="text-sm text-slate-500">Tags</span>
                        <div className="flex gap-1.5 flex-wrap justify-end">
                          {data.tags.map((tag) => <span key={tag} className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs">{tag}</span>)}
                        </div>
                      </div>
                    )}
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
