import { useSearchParams } from "react-router-dom";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";
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
  const tr = useConfigLabel();
  const [searchParams, setSearchParams] = useSearchParams();
  const type = searchParams.get("type") === "corporate" ? "corporate" : "individual";
  const setType = (next) => {
    // Individual has no ?type= at all (the plain, default URL) rather than
    // an explicit ?type=individual, so the common case stays a clean link.
    setSearchParams(next === "corporate" ? { type: "corporate" } : {}, { replace: true });
  };

  return (
    <div>
      <SegmentedSwitch className="mb-3" options={TYPES.map((t) => ({ ...t, label: tr(t.label) }))} value={type} onChange={setType} />
      {/* key re-mounts the wrapper so each switch replays the fade-in. */}
      <div key={type} className="segmented-view-enter">
        {type === "corporate" ? <CorporateOnboardingConfigurationPage /> : <OnboardingConfigurationPage />}
      </div>
    </div>
  );
}
