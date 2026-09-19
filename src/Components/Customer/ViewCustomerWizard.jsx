import { useState } from "react";
import { Modal } from "@/Components/Common/Modal";
import { HorizontalStepper } from "@/Components/Common/HorizontalStepper";
import { LoadingAnimation } from "@/Components/Common/LoadingAnimation";
import { CUSTOMER_STEPS } from "./customerSteps";
import { CustomerStepFields, isStepConfigured, useCustomerExistingData, useCustomerLookups, ageFromDob } from "./customerWizardShared";
import {
  useWizardConfig,
  employmentRequiresEmployerDetails,
  isBusinessEmployment,
  isForeignOwnershipSubType,
  isNomineeRelationshipType,
  evaluateDocumentCondition,
} from "./customerWizardConfig";
import { IdentificationStepFields, AddressStepFields, RelationshipStepFields, DocumentStepFields } from "./customerDynamicSteps";
import { useKycDocumentTypes } from "@/Hooks/Master/masterHooks";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";

// Read-only counterpart to AddCustomerWizard.jsx/EditCustomerWizard.jsx —
// same stepper and field/dropdown rendering, but every field is rendered
// disabled and there is no Save/Save-draft/Submit anywhere — just Close.
// Mirrors ViewDigitalProductWizard.jsx exactly.
export function ViewCustomerWizard({ profile, onClose }) {
  const tr = useConfigLabel();
  const steps = CUSTOMER_STEPS;
  const [stepIndex, setStepIndex] = useState(0);
  const { values, loading } = useCustomerExistingData(profile);
  const currentStep = steps[stepIndex];
  const currentEntity = currentStep.entity;
  const masterLookups = useCustomerLookups(currentEntity);
  const {
    ownershipSubTypes,
    identificationTypes,
    addressTypes,
    employmentStatuses,
    documentRequirements,
    loading: wizardConfigLoading,
  } = useWizardConfig(profile.inst_profile_id);
  const { documentTypes: kycDocumentTypes } = useKycDocumentTypes(currentEntity === "document");
  const chosenSubType = values.profile?.ownership_sub_type_id || null;
  const filteredIdentificationTypes = identificationTypes.filter((t) => t.ownership_sub_type_id == null || String(t.ownership_sub_type_id) === String(chosenSubType));
  const filteredAddressTypes = addressTypes.filter((t) => t.ownership_sub_type_id == null || String(t.ownership_sub_type_id) === String(chosenSubType));
  const lookups = { ...masterLookups, ownershipSubTypes };
  const currentConfigured = currentEntity === "profile" || isStepConfigured(currentEntity, values);

  const employmentId = values.employment?.employment_id || null;
  const employmentFieldFilter = (key) =>
    !["employer_name", "employer_address", "employer_phone", "employer_email"].includes(key) || employmentRequiresEmployerDetails(employmentStatuses, employmentId);
  const businessRelevant = isBusinessEmployment(employmentStatuses, employmentId);
  const pepFieldFilter = (key, vals) => key === "is_pep" || vals.is_pep === true || vals.is_pep === "true";
  const customerAge = ageFromDob(values.profile?.date_of_birth);
  const isForeigner = isForeignOwnershipSubType(ownershipSubTypes, chosenSubType);
  const hasNominee = Object.values(values.relationship ?? {}).some((row) => isNomineeRelationshipType(masterLookups.relationshipTypes, row.relationship_type_id));
  const visibleDocumentRequirements = documentRequirements.filter((req) => {
    if (req.requirement_type === "CONDITIONAL") {
      return evaluateDocumentCondition(req.condition_rule, { age: customerAge, isForeigner, hasNominee });
    }
    return true;
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="View Customer"
      size="full"
      fixedHeight
      footer={
        <>
          <button type="button" onClick={onClose} className="px-3 py-2 text-sm font-bold text-slate-500">
            {tr("Close")}
          </button>
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              className="rounded-xl border px-4 py-2 text-sm font-bold text-slate-600"
            >
              {tr("Back")}
            </button>
          )}
          {stepIndex < steps.length - 1 && (
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
            >
              {tr("Next")}
            </button>
          )}
        </>
      }
    >
      <div className="mb-5">
        <HorizontalStepper
          steps={steps}
          activeIndex={stepIndex}
          isStepCompleted={(step) => step.entity === "profile" || isStepConfigured(step.entity, values)}
          onStepClick={setStepIndex}
        />
      </div>
      <h2 className="mb-3 text-sm font-bold text-slate-800">{currentStep.label}</h2>
      {loading || (currentStep.dynamic && wizardConfigLoading) ? (
        <div className="flex justify-center py-12">
          <LoadingAnimation className="h-16 w-48" />
        </div>
      ) : !currentConfigured ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 py-14 text-center">
          <p className="text-sm font-semibold text-slate-600">{tr("No")} {currentStep.label.toLowerCase()} {tr("configured")}</p>
          <p className="text-xs text-slate-400">{tr("Nothing has been added for this step yet.")}</p>
        </div>
      ) : currentEntity === "identification" ? (
        <IdentificationStepFields types={filteredIdentificationTypes} values={values.identification} onRowChange={() => {}} disabled />
      ) : currentEntity === "address" ? (
        <AddressStepFields types={filteredAddressTypes} values={values.address} onRowChange={() => {}} lookups={masterLookups} disabled />
      ) : currentEntity === "relationship" ? (
        <RelationshipStepFields
          relationshipTypes={masterLookups.relationshipTypes}
          values={values.relationship}
          onRowChange={() => {}}
          onAddRow={() => {}}
          onRemoveRow={() => {}}
          minorAge={customerAge != null && customerAge < 18}
          disabled
        />
      ) : currentEntity === "document" ? (
        <DocumentStepFields
          requirements={visibleDocumentRequirements}
          documentTypes={kycDocumentTypes}
          values={values.document}
          onRowChange={() => {}}
          disabled
        />
      ) : currentEntity === "business" && !businessRelevant ? (
        <p className="text-sm text-slate-500">{tr("Business Details aren't applicable for the selected employment status.")}</p>
      ) : (
        <CustomerStepFields
          entity={currentEntity}
          values={values[currentEntity]}
          onFieldChange={() => {}}
          lookups={lookups}
          disabled
          fieldFilter={currentEntity === "employment" ? employmentFieldFilter : currentEntity === "pep" ? pepFieldFilter : undefined}
        />
      )}
    </Modal>
  );
}
