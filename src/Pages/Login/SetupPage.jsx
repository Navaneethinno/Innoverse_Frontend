import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { Check, CheckCircle, ChevronRight, Settings } from "lucide-react";
import { FilterSelect } from "@/Components/Common/FilterSelect";
function GradientMesh() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div
        className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-[0.12] blur-3xl"
        style={{ background: "radial-gradient(circle, #7C8CFF, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.10] blur-3xl"
        style={{ background: "radial-gradient(circle, #7FE0C2, transparent 70%)" }}
      />
    </div>
  );
}
export function SetupPage() {
  const { t } = useTranslation("setup");
  const [step, setStep] = useState(0);
  const nav = useNavigate();
  const steps = [t("companyInfo"), t("contact"), t("preferences")];
  const [data, setData] = useState({
    companyName: "",
    regNumber: "",
    country: "United States",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    timezone: "UTC-5 (Eastern Time)",
    currency: "USD",
  });
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 bg-[#F9FAFB]">
      <GradientMesh />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-lg z-10"
      >
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 shadow-lg shadow-teal-200/40 mb-4">
            <Settings size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-semibold text-slate-800">{t("platformSetup")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("configureWorkspace")}</p>
        </div>
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${i < step ? "text-white" : i === step ? "border-2" : "bg-slate-100 text-slate-400"}`}
                style={
                  i < step
                    ? { background: "var(--primary)" }
                    : i === step
                      ? { borderColor: "var(--primary)", background: "var(--primary-light)", color: "var(--primary)" }
                      : undefined
                }
              >
                {i < step ? <Check size={13} /> : i + 1}
              </div>
              <span
                className={`text-xs hidden sm:block ${i === step ? "text-slate-700 font-medium" : "text-slate-400"}`}
              >
                {s}
              </span>
              {i < steps.length - 1 && <ChevronRight size={13} className="text-slate-200 ml-1" />}
            </div>
          ))}
        </div>
        <div
          className="rounded-3xl border p-8"
          style={{
            background: "var(--glass-bg)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderColor: "var(--glass-border)",
            boxShadow: "0 20px 60px rgba(124,140,255,0.10), 0 4px 16px rgba(0,0,0,0.04)",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-base font-semibold text-slate-800 mb-6">{steps[step]}</h2>
              {step === 0 && (
                <div className="space-y-4">
                  <input
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                    placeholder={t("companyNamePlaceholder")}
                    value={data.companyName}
                    onChange={(e) => setData({ ...data, companyName: e.target.value })}
                  />
                  <input
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                    placeholder={t("regNumberPlaceholder")}
                    value={data.regNumber}
                    onChange={(e) => setData({ ...data, regNumber: e.target.value })}
                  />
                </div>
              )}
              {step === 1 && (
                <div className="space-y-4">
                  <input
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                    placeholder={t("contactNamePlaceholder")}
                    value={data.contactName}
                    onChange={(e) => setData({ ...data, contactName: e.target.value })}
                  />
                  <input
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                    placeholder={t("contactEmailPlaceholder")}
                    value={data.contactEmail}
                    onChange={(e) => setData({ ...data, contactEmail: e.target.value })}
                  />
                  <input
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                    placeholder={t("contactPhonePlaceholder")}
                    value={data.contactPhone}
                    onChange={(e) => setData({ ...data, contactPhone: e.target.value })}
                  />
                </div>
              )}
              {step === 2 && (
                <div className="space-y-4">
                  <FilterSelect
                    className="w-full"
                    value={data.timezone}
                    onChange={(next) => setData({ ...data, timezone: next })}
                    options={[
                      "UTC-8 (Pacific Time)",
                      "UTC-7 (Mountain Time)",
                      "UTC-6 (Central Time)",
                      "UTC-5 (Eastern Time)",
                      "UTC+0 (GMT)",
                      "UTC+1 (CET)",
                      "UTC+8 (SGT)",
                    ].map((t) => ({ value: t, label: t }))}
                  />
                  <FilterSelect
                    className="w-full"
                    value={data.currency}
                    onChange={(next) => setData({ ...data, currency: next })}
                    options={["USD", "EUR", "GBP", "CAD", "AUD", "SGD"].map((c) => ({ value: c, label: c }))}
                  />
                  <div
                    className="flex items-start gap-3 p-4 rounded-xl border"
                    style={{ background: "var(--primary-light)", borderColor: "var(--primary-light)" }}
                  >
                    <CheckCircle size={16} className="mt-0.5 shrink-0" style={{ color: "var(--primary)" }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--primary)" }}>{t("autoSaveEnabled")}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--primary)" }}>
                        {t("autoSaveDescription")}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="mt-8 flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                {t("common:back")}
              </button>
            )}
            <button
              onClick={() => (step < steps.length - 1 ? setStep((s) => s + 1) : nav("/dashboard"))}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "var(--primary)" }}
            >
              {step === steps.length - 1 ? t("launchPlatform") : t("continue")}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
