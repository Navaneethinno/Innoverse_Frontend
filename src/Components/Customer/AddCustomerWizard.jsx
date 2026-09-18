import { useState } from "react";
import { Modal } from "@/Components/Common/Modal";
import { HorizontalStepper } from "@/Components/Common/HorizontalStepper";
import { CUSTOMER_STEPS } from "./customerSteps";
import { indvProfileApi } from "@/Services/Customer/customer.api";
import {
  CustomerStepFields,
  emptyValuesFor,
  findMissingField,
  requiredFieldMessage,
  saveCustomerStep,
  useCustomerLookups,
} from "./customerWizardShared";
import { notifications } from "@/Utils/Lib/notifications";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";

// The single Add-flow entry point for Customer: a 3-step wizard (Customer,
// Contact, Address) — same shape as AddDigitalProductWizard.jsx. Step 0
// creates the profile as a Draft (`add`, is_draft: true); every later step
// immediately saves into that same profile via `edit` + a `sections` entry
// (see saveCustomerStep). Save as draft simply stops there; Submit saves
// whatever step is current, then calls `/submit` (which itself enforces
// that `contact` was filled in, surfacing the backend's own message if
// not).
export function AddCustomerWizard({ onClose, onSuccess }) {
  const tr = useConfigLabel();
  const steps = CUSTOMER_STEPS;
  const [stepIndex, setStepIndex] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [profileId, setProfileId] = useState(null);
  const [recordIds, setRecordIds] = useState(() => Object.fromEntries(steps.map((step) => [step.entity, null])));
  const [values, setValues] = useState(() =>
    Object.fromEntries(steps.map((step) => [step.entity, emptyValuesFor(step.entity)])),
  );
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savingStep, setSavingStep] = useState(false);
  const currentStep = steps[stepIndex];
  const currentEntity = currentStep.entity;
  const isLastStep = stepIndex === steps.length - 1;
  const lookups = useCustomerLookups(currentEntity);

  const setFieldValue = (key, next) =>
    setValues((prev) => ({ ...prev, [currentEntity]: { ...prev[currentEntity], [key]: next } }));

  const saveStep = async (isDraft) => {
    const id = await saveCustomerStep({ id: profileId, entity: currentEntity, values, recordIds, isDraft });
    if (id !== profileId) setProfileId(id);
    if (currentEntity !== "profile" && id != null) {
      const response = await indvProfileApi().get({ id });
      const data = response?.data?.[0] ?? {};
      const address = Array.isArray(data.address) ? data.address[0] : data.address;
      setRecordIds((prev) => ({
        ...prev,
        contact: data.contact?.id ?? prev.contact,
        address: address?.id ?? prev.address,
      }));
    }
    return id;
  };

  const goNext = async () => {
    if (currentEntity === "profile") {
      const missing = findMissingField(currentEntity, values[currentEntity]);
      if (missing) {
        notifications.error(requiredFieldMessage(missing, tr));
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
      const id = await saveStep(true);
      if (id == null) throw new Error("Save the Customer step before submitting");
      const r = await indvProfileApi().submit({ id });
      notifications.success(r?.message || `${tr("Customer")} ${tr("submitted for authorization")}`);
      onSuccess?.();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

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
          <button
            type="button"
            disabled={savingDraft}
            onClick={() => void handleSaveDraft()}
            className="rounded-xl border px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-50"
          >
            {tr("Save as draft")}
          </button>
          {!isLastStep ? (
            <button
              type="button"
              disabled={savingStep}
              onClick={() => void goNext()}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {tr("Next")}
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSubmit()}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
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
      <CustomerStepFields
        entity={currentEntity}
        values={values[currentEntity]}
        onFieldChange={setFieldValue}
        lookups={lookups}
      />
    </Modal>
  );
}
