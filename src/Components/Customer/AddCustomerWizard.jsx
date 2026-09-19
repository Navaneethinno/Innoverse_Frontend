import { useState } from "react";
import { Modal } from "@/Components/Common/Modal";
import { HorizontalStepper } from "@/Components/Common/HorizontalStepper";
import { Spinner } from "@/Components/Common/Spinner";
import { LoadingAnimation } from "@/Components/Common/LoadingAnimation";
import { CUSTOMER_STEPS } from "./customerSteps";
import { indvProfileApi, indvOnboardingApi } from "@/Services/Customer/customer.api";
import {
  CustomerStepFields,
  emptyValuesFor,
  findMissingField,
  requiredFieldMessage,
  saveCustomerStep,
  useCustomerLookups,
  rowsOf,
  ageFromDob,
} from "./customerWizardShared";
import {
  useCustomerInstProfileId,
  useCustomerPartyOwnershipIds,
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

// The self-service Individual Customer Onboarding wizard — redesigned per
// the "customer onboards themselves" handoff (see the PR/commit message for
// the full doc). What changed from the old internal maker-entry form:
//  - No Institution profile / Party type / Ownership dropdowns, and no
//    free-typed Onboarding ID box: a self-onboarding customer never picks
//    any of these. inst_profile_id comes straight from the logged-in
//    session (useCustomerInstProfileId), party_type_id/ownership_id are
//    resolved once from master data and hardcoded to CUSTOMER/INDIVIDUAL
//    (useCustomerPartyOwnershipIds — fails loud via notifications.error if
//    either can't be resolved, rather than guessing a numeric id), and
//    onboarding_id is generated automatically.
//  - Contact is now step 1: submitting it calls
//    POST /customer/indv_onboarding/start (same email/phone resumes an
//    existing attempt automatically — nothing extra needed here), and the
//    returned id becomes onboarding_id, carried silently into every later
//    call.
//  - wizard_config is fetched ONCE at the very start (before rendering the
//    Personal Details/Identification/Address steps) and drives: the
//    Ownership sub type dropdown (filtered to what this institution
//    accepts; skipped entirely when there's only one option), and the
//    Identification/Address steps' own per-type rows (front/back image
//    requirement, mandatory/same-as address rules).
export function AddCustomerWizard({ onClose, onSuccess }) {
  const tr = useConfigLabel();
  const steps = CUSTOMER_STEPS;
  const instProfileId = useCustomerInstProfileId();
  const { partyTypeId, ownershipId, loading: idsLoading } = useCustomerPartyOwnershipIds(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [profileId, setProfileId] = useState(null);
  const [onboardingId, setOnboardingId] = useState(null);
  const [recordIds, setRecordIds] = useState(() => Object.fromEntries(steps.map((step) => [step.entity, step.dynamic ? {} : null])));
  const [values, setValues] = useState(() =>
    Object.fromEntries(steps.map((step) => [step.entity, step.dynamic ? {} : emptyValuesFor(step.entity)])),
  );
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savingStep, setSavingStep] = useState(false);
  const currentStep = steps[stepIndex];
  const currentEntity = currentStep.entity;
  const isLastStep = stepIndex === steps.length - 1;
  const masterLookups = useCustomerLookups(currentEntity);

  // Once the customer has picked their sub-type on Personal Details, the
  // config can optionally be re-fetched filtered to it (handoff's
  // optional re-call) — here we just filter the already-fetched arrays
  // client-side instead, which the handoff says is equally valid.
  const {
    ownershipSubTypes,
    identificationTypes,
    addressTypes,
    employmentStatuses,
    documentRequirements,
    documentTypes,
    loading: wizardConfigLoading,
  } = useWizardConfig(instProfileId);
  // Fallback list only — used when this institution has NO document types
  // configured at all (documentTypes.length === 0); see
  // customerDynamicSteps.jsx's DocumentStepFields comment for why the
  // institution's own wizard_config.document_types is now the primary
  // source instead.
  const { documentTypes: kycDocumentTypes } = useKycDocumentTypes(currentEntity === "document" && documentTypes.length === 0);
  const chosenSubType = values.profile?.ownership_sub_type_id || null;
  const filteredIdentificationTypes = identificationTypes.filter((t) => t.ownership_sub_type_id == null || String(t.ownership_sub_type_id) === String(chosenSubType));
  const filteredAddressTypes = addressTypes.filter((t) => t.ownership_sub_type_id == null || String(t.ownership_sub_type_id) === String(chosenSubType));

  const lookups = { ...masterLookups, ownershipSubTypes };

  // Employment conditional reveal (bug fix): employer_name/employer_address/
  // employer_contact only render when the chosen employment_statuses row
  // has is_employer_details_required true.
  const employmentId = values.employment?.employment_id || null;
  const employmentFieldFilter = (key) =>
    !["employer_name", "employer_address", "employer_phone", "employer_email"].includes(key) || employmentRequiresEmployerDetails(employmentStatuses, employmentId);
  const businessRelevant = isBusinessEmployment(employmentStatuses, employmentId);
  const pepFieldFilter = (key, vals) =>
    key === "is_pep" || vals.is_pep === true || vals.is_pep === "true";

  const customerAge = ageFromDob(values.profile?.date_of_birth);
  const isForeigner = isForeignOwnershipSubType(ownershipSubTypes, chosenSubType);
  const hasNominee = Object.values(values.relationship ?? {}).some((row) => isNomineeRelationshipType(masterLookups.relationshipTypes, row.relationship_type_id));
  const visibleDocumentRequirements = documentRequirements.filter((req) => {
    if (req.requirement_type === "MANDATORY" || req.requirement_type === "OPTIONAL") return true;
    if (req.requirement_type === "CONDITIONAL") {
      return evaluateDocumentCondition(req.condition_rule, { age: customerAge, isForeigner, hasNominee });
    }
    return true;
  });

  const setFieldValue = (key, next) =>
    setValues((prev) => ({ ...prev, [currentEntity]: { ...prev[currentEntity], [key]: next } }));
  const setDynamicRow = (entity, rowKey, nextRow) =>
    setValues((prev) => ({ ...prev, [entity]: { ...prev[entity], [rowKey]: nextRow } }));

  const fixedIds = { inst_profile_id: instProfileId, party_type_id: partyTypeId, ownership_id: ownershipId, onboarding_id: onboardingId };

  // Contact step: kicks off (or resumes) onboarding instead of touching
  // the profile at all — there's no profile yet until Personal Details.
  const saveContactStep = async () => {
    const { primary_mobile, personal_email } = values.contact;
    // Confirmed live: /customer/indv_onboarding/start rejects
    // primary_mobile/personal_email with "request failed validation:
    // either email or phone_number is required" — it wants `email`/
    // `phone_number`, not the indv_profile "contact" section's own field
    // names (which stay primary_mobile/personal_email for the profile's
    // own /add|/edit calls, just not for /start).
    const response = await indvOnboardingApi().start({ inst_profile_id: instProfileId, phone_number: primary_mobile, email: personal_email });
    const id = rowsOf(response)[0]?.id ?? onboardingId;
    setOnboardingId(id);
    return id;
  };

  const saveIdentificationStep = async () => {
    const payload = buildIdentificationPayload(filteredIdentificationTypes, values.identification, recordIds.identification);
    // Never send `identification: []` — omit the key entirely when nothing
    // was filled in yet (the server treats an empty array as "clear the
    // section", not "nothing to save this time").
    if (payload.length === 0) return;
    await indvProfileApi().edit({ id: profileId, is_draft: true, sections: { identification: payload } });
  };
  const saveAddressStep = async () => {
    const payload = buildAddressPayload(filteredAddressTypes, values.address, recordIds.address);
    await indvProfileApi().edit({ id: profileId, is_draft: true, sections: { address: payload } });
  };
  const saveRelationshipStep = async () => {
    const payload = buildRelationshipPayload(values.relationship, recordIds.relationship);
    await indvProfileApi().edit({ id: profileId, is_draft: true, sections: { relationship: payload } });
  };
  const saveDocumentStep = async () => {
    const payload = buildDocumentPayload(visibleDocumentRequirements, values.document, recordIds.document);
    await indvProfileApi().edit({ id: profileId, is_draft: true, sections: { document: payload } });
  };

  const saveStep = async (isDraft) => {
    if (currentEntity === "contact") {
      await saveContactStep();
      return profileId;
    }
    if (currentEntity === "identification") {
      await saveIdentificationStep();
      return profileId;
    }
    if (currentEntity === "address") {
      await saveAddressStep();
      return profileId;
    }
    if (currentEntity === "relationship") {
      await saveRelationshipStep();
      return profileId;
    }
    if (currentEntity === "document") {
      await saveDocumentStep();
      return profileId;
    }
    if (currentEntity === "business" && !businessRelevant) {
      return profileId;
    }
    const id = await saveCustomerStep({ id: profileId, entity: currentEntity, values, recordIds, isDraft, fixedIds });
    if (id !== profileId) setProfileId(id);
    return id;
  };

  const goNext = async () => {
    if (currentEntity === "contact") {
      const missing = findMissingField("contact", values.contact);
      if (missing) {
        notifications.error(requiredFieldMessage(missing, tr));
        return;
      }
    }
    if (currentEntity === "profile") {
      const missing = findMissingField("profile", values.profile);
      if (missing) {
        notifications.error(requiredFieldMessage(missing, tr));
        return;
      }
      if (isSubTypeRequired(ownershipSubTypes) && !values.profile.ownership_sub_type_id) {
        notifications.error(`${tr("Please select")} ${tr("Ownership sub type").toLowerCase()}`);
        return;
      }
      if (instProfileId == null) {
        notifications.error("Could not determine your institution — please sign in again.");
        return;
      }
      if (partyTypeId == null || ownershipId == null) return; // useCustomerPartyOwnershipIds already surfaced the error
    }
    if (currentEntity === "identification") {
      const missing = findMissingIdentification(filteredIdentificationTypes, values.identification);
      if (missing) {
        notifications.error(tr(missing));
        return;
      }
    }
    if (currentEntity === "employment" && employerNameMissing(employmentStatuses, employmentId, values.employment?.employer_name)) {
      notifications.error(`${tr("Please enter")} ${tr("Employer name").toLowerCase()}`);
      return;
    }
    if (currentEntity === "document") {
      const missing = findMissingDocument(visibleDocumentRequirements, values.document);
      if (missing) {
        notifications.error(`${tr("Please provide")} ${missing.name ?? missing.document_category} (${tr("mandatory")})`);
        return;
      }
    }
    if (currentEntity === "address") {
      const missing = findMissingAddress(filteredAddressTypes, values.address);
      if (missing) {
        notifications.error(`${tr("Please fill in")} ${missing.name} (${tr("mandatory")})`);
        return;
      }
    }
    setSavingStep(true);
    try {
      await saveStep(true);
      const next = Math.min(stepIndex + 1, steps.length - 1);
      setStepIndex(next);
      setMaxVisited((m) => Math.max(m, next));
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setSavingStep(false);
    }
  };
  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      await saveStep(true);
      notifications.success(`${tr("Customer")} ${tr("draft saved")}`);
      onSuccess?.();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await saveStep(true);
      if (profileId == null) throw new Error("Save the Personal Details step before submitting");
      const r = await indvProfileApi().submit({ id: profileId });
      notifications.success(r?.message || `${tr("Customer")} ${tr("submitted for authorization")}`);
      onSuccess?.();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const busy = idsLoading || (currentEntity === "profile" && wizardConfigLoading);

  return (
    <Modal
      open
      onClose={onClose}
      title="Add Customer"
      size="full"
      fixedHeight
      footer={
        <>
          <button type="button" onClick={onClose} className="px-3 py-2 text-sm font-bold text-slate-500">
            {tr("Cancel")}
          </button>
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="rounded-xl border px-4 py-2 text-sm font-bold text-slate-600"
            >
              {tr("Back")}
            </button>
          )}
          {profileId != null && (
            <button
              type="button"
              disabled={savingDraft}
              onClick={() => void handleSaveDraft()}
              className="flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-50"
            >
              {savingDraft && <Spinner size={13} />}
              {tr("Save as draft")}
            </button>
          )}
          {!isLastStep ? (
            <button
              type="button"
              disabled={savingStep || busy}
              onClick={() => void goNext()}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {savingStep && <Spinner size={13} />}
              {tr("Next")}
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSubmit()}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {submitting && <Spinner size={13} />}
              {tr("Submit")}
            </button>
          )}
        </>
      }
    >
      <div className="mb-5">
        <HorizontalStepper
          steps={steps}
          activeIndex={stepIndex}
          onStepClick={(index) => index <= maxVisited && setStepIndex(index)}
        />
      </div>
      <h2 className="mb-3 text-sm font-bold text-slate-800">{currentStep.label}</h2>
      {busy ? (
        <div className="flex justify-center py-12">
          <LoadingAnimation className="h-16 w-48" />
        </div>
      ) : currentEntity === "identification" ? (
        <IdentificationStepFields
          types={filteredIdentificationTypes}
          values={values.identification}
          onRowChange={(rowKey, nextRow) => setDynamicRow("identification", rowKey, nextRow)}
        />
      ) : currentEntity === "address" ? (
        <AddressStepFields
          types={filteredAddressTypes}
          values={values.address}
          onRowChange={(rowKey, nextRow) => setDynamicRow("address", rowKey, nextRow)}
          lookups={masterLookups}
        />
      ) : currentEntity === "relationship" ? (
        <RelationshipStepFields
          relationshipTypes={masterLookups.relationshipTypes}
          values={values.relationship}
          onRowChange={(rowKey, nextRow) => setDynamicRow("relationship", rowKey, nextRow)}
          onAddRow={() => setDynamicRow("relationship", newRelationshipRowKey(), emptyRelationshipRow())}
          onRemoveRow={(rowKey) =>
            setValues((prev) => {
              const next = { ...prev.relationship };
              delete next[rowKey];
              return { ...prev, relationship: next };
            })
          }
          minorAge={customerAge != null && customerAge < 18}
        />
      ) : currentEntity === "document" ? (
        <DocumentStepFields
          requirements={visibleDocumentRequirements}
          documentTypes={documentTypes}
          kycDocumentTypes={kycDocumentTypes}
          values={values.document}
          onRowChange={(rowKey, nextRow) => setDynamicRow("document", rowKey, nextRow)}
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
    </Modal>
  );
}
