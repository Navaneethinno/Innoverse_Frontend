import { useEffect, useState } from "react";
import { Modal } from "@/Components/Common/Modal";
import { HorizontalStepper } from "@/Components/Common/HorizontalStepper";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { LoadingAnimation } from "@/Components/Common/LoadingAnimation";
import { Spinner } from "@/Components/Common/Spinner";
import { CONFIGS } from "./customerFields";
import { CUSTOMER_STEPS } from "./customerSteps";
import {
  CustomerStepFields,
  findMissingField,
  requiredFieldMessage,
  isStepConfigured,
  saveCustomerStep,
  useCustomerExistingData,
  useCustomerLookups,
  ageFromDob,
} from "./customerWizardShared";
import { indvProfileApi } from "@/Services/Customer/customer.api";
import {
  useWizardConfig,
  employmentRequiresEmployerDetails,
  employerNameMissing,
  isBusinessEmployment,
  isForeignOwnershipSubType,
  isNomineeRelationshipType,
  isSubTypeRequired,
  evaluateDocumentCondition,
} from "./customerWizardConfig";
import {
  IdentificationStepFields,
  AddressStepFields,
  buildIdentificationPayload,
  findMissingIdentification,
  buildAddressPayload,
  findMissingAddress,
  RelationshipStepFields,
  buildRelationshipPayload,
  emptyRelationshipRow,
  newRelationshipRowKey,
  DocumentStepFields,
  buildDocumentPayload,
  findMissingDocument,
} from "./customerDynamicSteps";
import { useKycDocumentTypes } from "@/Hooks/Master/masterHooks";
import { notifications } from "@/Utils/Lib/notifications";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";

// Same stepper and field/dropdown plumbing as AddCustomerWizard.jsx/
// ViewCustomerWizard.jsx, but EDIT loads whatever already exists for this
// Customer up front (useCustomerExistingData), lets the user jump to ANY
// step directly, and saves ONE step at a time. No onboarding/profile CREATE
// call ever fires here — the profile (and its onboarding_id) already
// exist. Mirrors EditDigitalProductWizard.jsx's shape.
export function EditCustomerWizard({ profile, onClose, onSaved }) {
  const tr = useConfigLabel();
  const steps = CUSTOMER_STEPS;
  const [stepIndex, setStepIndex] = useState(0);
  const {
    values: loadedValues,
    recordIds,
    reload,
    loading: initialLoading,
  } = useCustomerExistingData(profile);
  const [values, setValues] = useState(loadedValues);
  const [savedValues, setSavedValues] = useState(loadedValues);
  useEffect(() => {
    if (!initialLoading) {
      setValues(loadedValues);
      setSavedValues(loadedValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoading]);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [pendingNav, setPendingNav] = useState(null);
  const currentStep = steps[stepIndex];
  const currentEntity = currentStep.entity;
  const masterLookups = useCustomerLookups(currentEntity);
  const {
    ownershipSubTypes,
    identificationTypes,
    addressTypes,
    employmentStatuses,
    documentRequirements,
    documentTypes,
    loading: wizardConfigLoading,
  } = useWizardConfig(profile.inst_profile_id);
  // Fallback list only — used when this institution has NO document types
  // configured at all; see customerDynamicSteps.jsx's DocumentStepFields
  // comment for why wizard_config.document_types is the primary source.
  const { documentTypes: kycDocumentTypes } = useKycDocumentTypes(currentEntity === "document" && documentTypes.length === 0);
  const chosenSubType = values.profile?.ownership_sub_type_id || null;
  const filteredIdentificationTypes = identificationTypes.filter((t) => t.ownership_sub_type_id == null || String(t.ownership_sub_type_id) === String(chosenSubType));
  const filteredAddressTypes = addressTypes.filter((t) => t.ownership_sub_type_id == null || String(t.ownership_sub_type_id) === String(chosenSubType));
  const lookups = { ...masterLookups, ownershipSubTypes, employmentStatuses };
  const isDynamic = currentStep.dynamic;

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

  const isDirty = JSON.stringify(values[currentEntity]) !== JSON.stringify(savedValues[currentEntity]);
  const setFieldValue = (key, next) =>
    setValues((prev) => ({ ...prev, [currentEntity]: { ...prev[currentEntity], [key]: next } }));
  const setDynamicRow = (rowKey, nextRow) =>
    setValues((prev) => ({ ...prev, [currentEntity]: { ...prev[currentEntity], [rowKey]: nextRow } }));
  const removeRelationshipRow = (rowKey) =>
    setValues((prev) => {
      const next = { ...prev.relationship };
      delete next[rowKey];
      return { ...prev, relationship: next };
    });

  const goToStep = (index) => {
    if (index === stepIndex) return;
    if (isDirty) {
      setPendingNav({ type: "step", index });
      return;
    }
    setStepIndex(index);
  };
  const attemptClose = () => {
    if (isDirty) {
      setPendingNav({ type: "close" });
      return;
    }
    onClose();
  };
  const resolvePendingNav = (discard) => {
    if (!pendingNav) return;
    if (discard) {
      setValues((prev) => ({ ...prev, [currentEntity]: savedValues[currentEntity] }));
      if (pendingNav.type === "close") onClose();
      else setStepIndex(pendingNav.index);
    }
    setPendingNav(null);
  };

  const saveCurrentStep = async (isDraft, setBusy) => {
    if (!isDraft && currentEntity !== "identification" && currentEntity !== "address") {
      const missing = findMissingField(currentEntity, values[currentEntity]);
      if (missing) {
        notifications.error(requiredFieldMessage(missing, tr));
        return;
      }
    }
    if (currentEntity === "profile" && isSubTypeRequired(ownershipSubTypes) && !values.profile.ownership_sub_type_id) {
      notifications.error(`${tr("Please select")} ${tr("Ownership sub type").toLowerCase()}`);
      return;
    }
    if (!isDraft && currentEntity === "identification") {
      const missing = findMissingIdentification(filteredIdentificationTypes, values.identification);
      if (missing) {
        notifications.error(tr(missing));
        return;
      }
    }
    if (!isDraft && currentEntity === "employment" && employerNameMissing(employmentStatuses, employmentId, values.employment?.employer_name)) {
      notifications.error(`${tr("Please enter")} ${tr("Employer name").toLowerCase()}`);
      return;
    }
    if (!isDraft && currentEntity === "address") {
      const missing = findMissingAddress(filteredAddressTypes, values.address);
      if (missing) {
        notifications.error(`${tr("Please fill in")} ${missing.name} (${tr("mandatory")})`);
        return;
      }
    }
    if (!isDraft && currentEntity === "document") {
      const missing = findMissingDocument(visibleDocumentRequirements, values.document);
      if (missing) {
        notifications.error(`${tr("Please provide")} ${missing.name ?? missing.document_category} (${tr("mandatory")})`);
        return;
      }
    }
    setBusy(true);
    try {
      if (currentEntity === "identification") {
        const payload = buildIdentificationPayload(filteredIdentificationTypes, values.identification, recordIds.identification);
        if (payload.length > 0) {
          await indvProfileApi().edit({ id: profile.id, is_draft: true, sections: { identification: payload } });
        }
      } else if (currentEntity === "address") {
        await indvProfileApi().edit({ id: profile.id, is_draft: true, sections: { address: buildAddressPayload(filteredAddressTypes, values.address, recordIds.address) } });
      } else if (currentEntity === "relationship") {
        await indvProfileApi().edit({ id: profile.id, is_draft: true, sections: { relationship: buildRelationshipPayload(values.relationship, recordIds.relationship) } });
      } else if (currentEntity === "document") {
        await indvProfileApi().edit({ id: profile.id, is_draft: true, sections: { document: buildDocumentPayload(visibleDocumentRequirements, values.document, recordIds.document) } });
      } else if (currentEntity === "business" && !businessRelevant) {
        // nothing to save — section not applicable for this employment type
      } else {
        await saveCustomerStep({ id: profile.id, entity: currentEntity, values, recordIds, isDraft });
      }
      const config = CONFIGS[currentEntity];
      notifications.success(`${tr(config?.title ?? currentStep.label)} ${isDraft ? tr("draft saved") : tr("saved")}`);
      await reload();
      setSavedValues((prev) => ({ ...prev, [currentEntity]: values[currentEntity] }));
      onSaved?.();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const handleSave = () => saveCurrentStep(false, setSaving);
  const handleSaveDraft = () => saveCurrentStep(true, setSavingDraft);

  return (
    <Modal open onClose={attemptClose} title="Edit Customer" size="full" fixedHeight
      footer={
        <>
          <button type="button" onClick={attemptClose} className="px-3 py-2 text-sm font-bold text-slate-500">
            {tr("Cancel")}
          </button>
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={() => goToStep(stepIndex - 1)}
              className="rounded-xl border px-4 py-2 text-sm font-bold text-slate-600"
            >
              {tr("Back")}
            </button>
          )}
          <button
            type="button"
            disabled={savingDraft || saving || initialLoading}
            onClick={() => void handleSaveDraft()}
            className="flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-50"
          >
            {savingDraft && <Spinner size={13} />}
            {tr("Save as draft")}
          </button>
          <button
            type="button"
            disabled={saving || savingDraft || initialLoading}
            onClick={() => void handleSave()}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving && <Spinner size={13} />}
            {tr("Save Changes")}
          </button>
        </>
      }
    >
      <div className="mb-5">
        <HorizontalStepper
          steps={steps}
          activeIndex={stepIndex}
          isStepCompleted={(step) => step.entity === "profile" || isStepConfigured(step.entity, values)}
          onStepClick={goToStep}
        />
      </div>
      <h2 className="mb-3 text-sm font-bold text-slate-800">{currentStep.label}</h2>
      {initialLoading || (isDynamic && wizardConfigLoading) ? (
        <div className="flex justify-center py-12">
          <LoadingAnimation className="h-16 w-48" />
        </div>
      ) : currentEntity === "identification" ? (
        <IdentificationStepFields types={filteredIdentificationTypes} values={values.identification} onRowChange={setDynamicRow} />
      ) : currentEntity === "address" ? (
        <AddressStepFields types={filteredAddressTypes} values={values.address} onRowChange={setDynamicRow} lookups={masterLookups} />
      ) : currentEntity === "relationship" ? (
        <RelationshipStepFields
          relationshipTypes={masterLookups.relationshipTypes}
          values={values.relationship}
          onRowChange={setDynamicRow}
          onAddRow={() => setDynamicRow(newRelationshipRowKey(), emptyRelationshipRow())}
          onRemoveRow={removeRelationshipRow}
          minorAge={customerAge != null && customerAge < 18}
        />
      ) : currentEntity === "document" ? (
        <DocumentStepFields
          requirements={visibleDocumentRequirements}
          documentTypes={documentTypes}
          kycDocumentTypes={kycDocumentTypes}
          values={values.document}
          onRowChange={setDynamicRow}
        />
      ) : currentEntity === "business" && !businessRelevant ? (
        <p className="text-sm text-slate-500">{tr("Business Details aren't applicable for the selected employment status.")}</p>
      ) : (
        <CustomerStepFields
          entity={currentEntity}
          values={values[currentEntity]}
          onFieldChange={setFieldValue}
          lookups={lookups}
          fieldFilter={currentEntity === "employment" ? employmentFieldFilter : currentEntity === "pep" ? pepFieldFilter : undefined}
        />
      )}
      {pendingNav && (
        <ConfirmDialog
          open
          title={tr("Discard unsaved changes?")}
          description={`${tr("You have unsaved changes to")} ${currentStep.label} ${tr("that haven't been saved. Discard them?")}`}
          confirmLabel={tr("Discard changes")}
          destructive
          onClose={() => setPendingNav(null)}
          onConfirm={() => resolvePendingNav(true)}
        />
      )}
    </Modal>
  );
}
