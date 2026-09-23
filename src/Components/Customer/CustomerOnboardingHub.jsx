import { useSearchParams } from "react-router-dom";
import { CustomerOnboardingResource } from "./CustomerOnboardingResource";
import { CorporateCustomerOnboardingResource } from "./CorporateCustomerOnboardingResource";

// "Frontend fixes — onboarding menus and corporate masters", 2026-09, fix 2:
// same idea as OnboardingConfigurationHub.jsx — ONE "Onboarding Wizard"
// menu, individual and corporate hosted behind an Individual|Corporate
// switch kept in ?type=, instead of a separate corporate menu/page. "New
// onboarding" already starts the flow of whichever view is selected (each
// Resource component owns its own add button/dialog) — no extra
// "which type?" prompt needed on top of the switch itself.
const TYPES = [
  { value: "individual", label: "Individual" },
  { value: "corporate", label: "Corporate" },
];

export function CustomerOnboardingHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const type = searchParams.get("type") === "corporate" ? "corporate" : "individual";
  const setType = (next) => {
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
      {type === "corporate" ? <CorporateCustomerOnboardingResource /> : <CustomerOnboardingResource />}
    </div>
  );
}
