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
} from "./customerWizardShared";
import { useCustomerInstProfileId, useCustomerPartyOwnershipIds, useWizardConfig } from "./customerWizardConfig";
import {
  IdentificationStepFields,
  AddressStepFields,
  buildIdentificationPayload,
  buildAddressPayload,
  findMissingAddress,
} from "./customerDynamicSteps";
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
  const { ownershipSubTypes, identificationTypes, addressTypes, loading: wizardConfigLoading } = useWizardConfig(instProfileId);
  const chosenSubType = values.profile?.ownership_sub_type_id || null;
  const filteredIdentificationTypes = identificationTypes.filter((t) => t.ownership_sub_type_id == null || String(t.ownership_sub_type_id) === String(chosenSubType));
  const filteredAddressTypes = addressTypes.filter((t) => t.ownership_sub_type_id == null || String(t.ownership_sub_type_id) === String(chosenSubType));

  const lookups = { ...masterLookups, ownershipSubTypes };

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
    await indvProfileApi().edit({ id: profileId, sections: { identification: payload } });
  };
  const saveAddressStep = async () => {
    const payload = buildAddressPayload(filteredAddressTypes, values.address, recordIds.address);
    await indvProfileApi().edit({ id: profileId, sections: { address: payload } });
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
      if (instProfileId == null) {
        notifications.error("Could not determine your institution — please sign in again.");
        return;
      }
      if (partyTypeId == null || ownershipId == null) return; // useCustomerPartyOwnershipIds already surfaced the error
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
        />
      ) : (
        <CustomerStepFields
          entity={currentEntity}
          values={values[currentEntity]}
          onFieldChange={setFieldValue}
          lookups={lookups}
        />
      )}
    </Modal>
  );
}
