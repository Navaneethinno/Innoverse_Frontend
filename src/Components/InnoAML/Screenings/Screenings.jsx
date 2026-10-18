import { PageTitle } from "@/Components/Common/PageTitle";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { useAmlBands } from "./useAmlBands";
import { ScreeningsList } from "./ScreeningsList";
import { ScreeningChanges } from "./ScreeningChanges";

// InnoAML > AML Screening > Screenings (menu 102): every screening of the
// institution's customers (recorded only — nothing is blocked), and the
// Changes tab of ongoing re-screening. ?reference_id= opens it filtered to
// one customer.
export function Screenings() {
  const { t } = useTranslation("aml");
  const [params] = useSearchParams();
  const [view, setView] = useState(params.get("view") === "changes" ? "changes" : "screenings");
  const bands = useAmlBands();
  const referenceId = params.get("reference_id") ?? "";

  return (
    <div className="pt-1 pb-6">
      <div className="mb-3">
        <PageTitle>{t("screeningsTitle")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("screeningsSubtitle")}</p>
      </div>
      <SegmentedSwitch
        className="mb-3"
        options={[
          { value: "screenings", label: t("screeningsTab") },
          { value: "changes", label: t("changesTab") },
        ]}
        value={view}
        onChange={setView}
      />
      {view === "changes" ? <ScreeningChanges bands={bands} /> : <ScreeningsList bands={bands} initial={referenceId ? { reference_id: referenceId } : {}} />}
    </div>
  );
}
