import { useSearchParams } from "react-router-dom";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { useTranslation } from "react-i18next";
import { NoAccess } from "@/Components/Common/NoAccess";
import { useMenuPermission, usePagePermission } from "@/Hooks/usePermission";
import { useMenuContext } from "@/Pages/Sidebar/menuContext";
import { CustomerOnboardingResource } from "./CustomerOnboardingResource";
import { CorporateCustomerOnboardingResource } from "./CorporateCustomerOnboardingResource";

// "Frontend fixes — onboarding menus and corporate masters", 2026-09, fix 2:
// same idea as OnboardingConfiguration.jsx — ONE "Onboarding Wizard"
// menu, individual and corporate hosted behind an Individual|Corporate
// switch kept in ?type=, instead of a separate corporate menu/page. "New
// onboarding" already starts the flow of whichever view is selected (each
// Resource component owns its own add button/dialog) — no extra
// "which type?" prompt needed on top of the switch itself.
const TYPES = [
  { value: "individual", labelKey: "customer:individual" },
  { value: "corporate", labelKey: "customer:corporate" },
];

export function OnboardingWizard() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  // Individual and Corporate are separate menus; each half shows only when
  // the user's profile grants View on it.
  const individualCan = usePagePermission("Onboarding Wizard");
  const corporateCan = useMenuPermission("Corporate Onboarding Wizard");
  // Opened from Onboarding > Individual|Corporate > Onboarding Wizard: that
  // half only, no switch.
  const branch = useMenuContext()?.branch;
  const allowed = TYPES.filter((o) => (!branch || o.value === branch) && (o.value === "corporate" ? corporateCan : individualCan)("View"));
  const requested = branch ?? (searchParams.get("type") === "corporate" ? "corporate" : "individual");
  const type = allowed.some((o) => o.value === requested) ? requested : allowed[0]?.value;
  const setType = (next) => {
    setSearchParams(next === "corporate" ? { type: "corporate" } : {}, { replace: true });
  };

  if (!type) return <NoAccess />;

  return (
    <div>
      {allowed.length > 1 && <SegmentedSwitch className="mb-3" options={allowed.map((o) => ({ value: o.value, label: t(o.labelKey) }))} value={type} onChange={setType} />}
      {/* key re-mounts the wrapper so each switch replays the fade-in. */}
      <div key={type} className="segmented-view-enter">
        {type === "corporate" ? <CorporateCustomerOnboardingResource /> : <CustomerOnboardingResource />}
      </div>
    </div>
  );
}
