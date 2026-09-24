import { useSearchParams } from "react-router-dom";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { useTranslation } from "react-i18next";
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
  { value: "individual", labelKey: "customer:individual" },
  { value: "corporate", labelKey: "customer:corporate" },
];

export function CustomerOnboardingHub() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const type = searchParams.get("type") === "corporate" ? "corporate" : "individual";
  const setType = (next) => {
    setSearchParams(next === "corporate" ? { type: "corporate" } : {}, { replace: true });
  };

  return (
    <div>
      <SegmentedSwitch className="mb-3" options={TYPES.map((o) => ({ value: o.value, label: t(o.labelKey) }))} value={type} onChange={setType} />
      {/* key re-mounts the wrapper so each switch replays the fade-in. */}
      <div key={type} className="segmented-view-enter">
        {type === "corporate" ? <CorporateCustomerOnboardingResource /> : <CustomerOnboardingResource />}
      </div>
    </div>
  );
}
