import { useSearchParams } from "react-router-dom";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { useTranslation } from "react-i18next";
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
  { value: "individual", labelKey: "customer:individual" },
  { value: "corporate", labelKey: "customer:corporate" },
];

export function OnboardingConfigurationHub() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const type = searchParams.get("type") === "corporate" ? "corporate" : "individual";
  const setType = (next) => {
    // Individual has no ?type= at all (the plain, default URL) rather than
    // an explicit ?type=individual, so the common case stays a clean link.
    setSearchParams(next === "corporate" ? { type: "corporate" } : {}, { replace: true });
  };

  return (
    <div>
      <SegmentedSwitch className="mb-3" options={TYPES.map((o) => ({ value: o.value, label: t(o.labelKey) }))} value={type} onChange={setType} />
      {/* key re-mounts the wrapper so each switch replays the fade-in. */}
      <div key={type} className="segmented-view-enter">
        {type === "corporate" ? <CorporateOnboardingConfigurationPage /> : <OnboardingConfigurationPage />}
      </div>
    </div>
  );
}
