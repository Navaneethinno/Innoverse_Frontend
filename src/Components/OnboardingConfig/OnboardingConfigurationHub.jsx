import { useSearchParams } from "react-router-dom";
import { OnboardingConfigurationPage } from "./OnboardingConfigurationPage";
import { CorporateOnboardingConfigurationPage } from "./CorporateOnboardingConfigurationPage";

// "Frontend fixes — onboarding menus and corporate masters", 2026-09, fix 1:
// there is ONE "Onboarding Configuration" menu, not one per ownership type —
// the separate corporate menu/page is gone. This hosts both existing screens
// (OnboardingConfigurationPage/CorporateOnboardingConfigurationPage,
// unchanged) behind an Individual|Corporate switch, kept in the URL
// (?type=individual|corporate) so a refresh or a shared link reopens the
// same view. Individual is the default.
const TYPES = [
  { value: "individual", label: "Individual" },
  { value: "corporate", label: "Corporate" },
];

export function OnboardingConfigurationHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const type = searchParams.get("type") === "corporate" ? "corporate" : "individual";
  const setType = (next) => {
    // Individual has no ?type= at all (the plain, default URL) rather than
    // an explicit ?type=individual, so the common case stays a clean link.
    setSearchParams(next === "corporate" ? { type: "corporate" } : {}, { replace: true });
  };

  return (
    <div>
      <div className="mb-3 inline-flex rounded-xl border p-1" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={
              "rounded-lg px-4 py-1.5 text-xs font-bold transition-colors " +
              (type === t.value ? "bg-primary text-white" : "text-muted-foreground hover:text-primary")
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      {type === "corporate" ? <CorporateOnboardingConfigurationPage /> : <OnboardingConfigurationPage />}
    </div>
  );
}
