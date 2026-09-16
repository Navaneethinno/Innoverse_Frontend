import { useState } from "react";
import { Modal } from "@/Components/Common/Modal";
import { HorizontalStepper } from "@/Components/Common/HorizontalStepper";
import { DIGITAL_PRODUCT_STEPS } from "./digitalProductSteps";
import { buildDigitalProductWorkflowPayload } from "./digitalProductWorkflowPayload";
import { submitDigitalProductWorkflow } from "@/Services/DigitalProduct/digitalProductWorkflow.api";
import {
  DigitalProductStepFields,
  emptyValuesFor,
  findMissingField,
  requiredFieldMessage,
  useDigitalProductLookups,
} from "./digitalProductWizardShared";
import { notifications } from "@/Utils/Lib/notifications";

// The single Add-flow entry point for Digital Product: a 9-step wizard
// (Digital Product, Product Map, Security Config, KYC Config, KYC Level,
// Channel Config, Channel Transaction, Eligibility Config, Residency) that
// collects every step's fields into local state and only calls the backend
// ONCE, on the final Submit — see digitalProductWorkflow.api.js. It reuses
// DigitalProductResource.jsx's own CONFIGS (field definitions) and
// DigitalProductFieldInput (the dropdown/input rendering, including every
// existing dropdown API) via digitalProductWizardShared.jsx — the same
// shared plumbing EditDigitalProductWizard.jsx uses — so every step's form
// is identical to that entity's own standalone Add form, just writing into
// wizard state instead of submitting immediately. Every existing standalone
// Add/Edit/View/Delete page for these 9 entities is untouched and still
// reachable at its own route; this wizard doesn't replace them.
export function AddDigitalProductWizard({ onClose, onSuccess }) {
  const steps = DIGITAL_PRODUCT_STEPS;
  const [stepIndex, setStepIndex] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [values, setValues] = useState(() =>
    Object.fromEntries(steps.map((step) => [step.entity, emptyValuesFor(step.entity)])),
  );
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const currentStep = steps[stepIndex];
  const currentEntity = currentStep.entity;
  const isLastStep = stepIndex === steps.length - 1;
  const lookups = useDigitalProductLookups(currentEntity);

  const setFieldValue = (key, next) =>
    setValues((prev) => ({ ...prev, [currentEntity]: { ...prev[currentEntity], [key]: next } }));

  const goNext = () => {
    const missing = findMissingField(currentEntity, values[currentEntity]);
    if (missing) {
      notifications.error(requiredFieldMessage(missing));
      return;
    }
    const next = Math.min(stepIndex + 1, steps.length - 1);
    setStepIndex(next);
    setMaxVisited((m) => Math.max(m, next));
  };
  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  // Unlike Next/Submit, a draft is deliberately allowed to be incomplete —
  // that's the point of saving one — so this skips findMissingField
  // entirely rather than blocking on whichever fields the current step
  // hasn't been filled in yet. Goes through the same single isolated
  // submitDigitalProductWorkflow integration point as the final Submit
  // (just with is_draft: true), not a new/separate endpoint.
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      await submitDigitalProductWorkflow({ ...buildDigitalProductWorkflowPayload(values), is_draft: true });
      notifications.success("Digital Product draft saved");
      onSuccess?.();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    const missing = findMissingField(currentEntity, values[currentEntity]);
    if (missing) {
      notifications.error(requiredFieldMessage(missing));
      return;
    }
    setSubmitting(true);
    try {
      // ONE call, only here — no step before this one ever touches the
      // network for a create. See digitalProductWorkflow.api.js: the real
      // endpoint isn't live yet, so this currently rejects with a clear
      // message instead of silently pretending to succeed; the data stays
      // in place so the user can retry once it's wired up.
      await submitDigitalProductWorkflow(buildDigitalProductWorkflowPayload(values));
      notifications.success("Digital Product created");
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
      title="Add Digital Product"
      size="full"
      fixedHeight
      footer={
        <>
          <button type="button" onClick={onClose} className="px-3 py-2 text-sm font-bold text-slate-500">
            Cancel
          </button>
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="rounded-xl border px-4 py-2 text-sm font-bold text-slate-600"
            >
              Back
            </button>
          )}
          <button
            type="button"
            disabled={savingDraft}
            onClick={() => void handleSaveDraft()}
            className="rounded-xl border px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-50"
          >
            Save as draft
          </button>
          {!isLastStep ? (
            <button
              type="button"
              onClick={goNext}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSubmit()}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              Submit
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
      <DigitalProductStepFields
        entity={currentEntity}
        values={values[currentEntity]}
        onFieldChange={setFieldValue}
        lookups={lookups}
      />
    </Modal>
  );
}
