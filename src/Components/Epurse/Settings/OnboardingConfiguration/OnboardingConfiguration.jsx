import { useSearchParams } from "react-router-dom";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { useAudienceTranslation } from "@/Hooks/useAudienceTranslation";
import { NoAccess } from "@/Components/Common/NoAccess";
import { usePagePermission } from "@/Hooks/usePermission";
import { useMenuContext } from "@/Components/Layout/Menu/menuContext";
import { OnboardingConfigurationPage } from "./OnboardingConfigurationPage";
import { useFeatures } from "@/Hooks/useFeatures";

// "Frontend fixes — onboarding menus and corporate masters", 2026-09, fix 1:
// there is ONE "Onboarding Configuration" menu, not one per ownership type —
// the separate corporate menu/page is gone. This hosts both existing screens
// (OnboardingConfigurationPage/CorporateOnboardingConfigurationPage,
// unchanged) behind an Individual|Corporate switch, kept in the URL as
// ?part=individual|corporate (the setup state's part keys; the older ?type=
// still opens) so a link, a refresh or Back reopens the same tab. A party
// kind the institution does not have (features.units) has no tab.
const TYPES = [
  { value: "individual", labelKey: "customer:individual" },
  { value: "corporate", labelKey: "customer:corporate" },
];

export function OnboardingConfiguration() {
  const { t } = useAudienceTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  // One menu covers both halves.
  const can = usePagePermission("Onboarding Configuration");
  const branch = useMenuContext()?.branch;
  const { units } = useFeatures();
  const has = (kind) => !units?.length || units.includes(kind);
  const allowed = TYPES.filter((o) => (!branch || o.value === branch) && can("View") && has(o.value));
  const asked = searchParams.get("part") ?? searchParams.get("type");
  const requested = branch ?? (asked === "corporate" ? "corporate" : "individual");
  const type = allowed.some((o) => o.value === requested) ? requested : allowed[0]?.value;
  const setType = (next) => {
    const q = new URLSearchParams(searchParams);
    q.delete("type");
    q.delete("record");
    q.delete("action");
    q.set("part", next);
    setSearchParams(q);
  };

  if (!type) return <NoAccess />;

  return (
    <div>
      {allowed.length > 1 && <SegmentedSwitch className="mb-3" options={allowed.map((o) => ({ value: o.value, label: t(o.labelKey) }))} value={type} onChange={setType} />}
      {/* key re-mounts the wrapper so each switch replays the fade-in. */}
      <div key={type} className="segmented-view-enter">
        <OnboardingConfigurationPage key={type} kind={type === "corporate" ? "corporate" : "individual"} />
      </div>
    </div>
  );
}
