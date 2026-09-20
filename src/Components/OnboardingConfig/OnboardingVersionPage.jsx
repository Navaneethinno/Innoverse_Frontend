import { useEffect, useState } from "react";
import { notifications } from "@/Utils/Lib/notifications";
import { onboardingDefinitionApi, onboardingVersionApi, rowsOf } from "@/Services/Onboarding/onboarding.api";
import { LifecycleList } from "./LifecycleList";
import { OnboardingVersionWizard } from "./OnboardingVersionWizard";

// Every version of every customer type — the checker's inbox (guide §9) and
// the place to open any version. Content is frozen once a version is
// submitted, so Edit only exists for a Draft (9) or Rejected Add (5) version;
// everyone else opens it read-only in the same wizard for review. Approve /
// reject go through the shared maker-checker dialogs (with the pending diff),
// and rolling back is reactivating an older version (guide §10).
const EDITABLE = [9, 5];
const isEditable = (row) => EDITABLE.includes(Number(row.process_status));

export function OnboardingVersionPage() {
  const [definitions, setDefinitions] = useState([]);
  const [wizard, setWizard] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    onboardingDefinitionApi
      .list({ page: 1, limit: 200 })
      .then((r) => setDefinitions(rowsOf(r)))
      .catch((error) => notifications.error(error.message));
  }, []);

  const definitionOf = (row) => definitions.find((d) => String(d.id) === String(row.definition_id)) ?? { id: row.definition_id };
  const open = (row) => setWizard({ definition: definitionOf(row), versionId: row.id });

  const columns = [
    {
      key: "definition_id",
      label: "Customer type",
      render: (r) => <span className="font-semibold">{definitionOf(r).name ?? `#${r.definition_id}`}</span>,
    },
    { key: "version_no", label: "Version", render: (r) => `v${r.version_no ?? "-"}` },
    { key: "effective_from", label: "Effective from", render: (r) => String(r.effective_from ?? "-").slice(0, 10) },
    { key: "minor_age_years", label: "Minor age", render: (r) => r.minor_age_years ?? "-" },
    { key: "created_by", label: "Maker", render: (r) => r.created_by ?? "-" },
  ];

  return (
    <>
      <LifecycleList
        title="Onboarding Versions"
        subtitle="Review and approve customer-type configurations. A submitted version is frozen; approving it makes it the active version and retires the previous one."
        api={onboardingVersionApi}
        menuName="Onboarding Version|Individual Type Config"
        columns={columns}
        reloadKey={reloadKey}
        onView={open}
        onEdit={open}
        canEditRow={isEditable}
        canDeleteRow={isEditable}
        describeRow={(r) => `${definitionOf(r).name ?? "customer type"} v${r.version_no}`}
        auditFields={[["version_no", "Version"], ["effective_from", "Effective from"], ["kyc_group_id", "KYC scheme"], ["minor_age_years", "Minor age"]]}
        emptyTitle="No versions yet"
      />
      {wizard && (
        <OnboardingVersionWizard
          definition={wizard.definition}
          versionId={wizard.versionId}
          onClose={() => setWizard(null)}
          onSaved={() => setReloadKey((k) => k + 1)}
        />
      )}
    </>
  );
}
