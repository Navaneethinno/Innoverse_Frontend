import { useState } from "react";
import { Modal } from "@/Components/Common/Modal";
import { HorizontalStepper } from "@/Components/Common/HorizontalStepper";
import { LoadingAnimation } from "@/Components/Common/LoadingAnimation";
import { DIGITAL_PRODUCT_STEPS } from "./digitalProductSteps";
import { DigitalProductStepFields, useDigitalProductExistingData, useDigitalProductLookups } from "./digitalProductWizardShared";

// Read-only counterpart to AddDigitalProductWizard.jsx/
// EditDigitalProductWizard.jsx: same 9-step stepper and the exact same
// field/dropdown rendering (DigitalProductStepFields, so a selected
// institution/product/etc. shows its real name, not just an id) via
// digitalProductWizardShared.jsx, but every field is rendered disabled and
// there is no Save/Save-draft/Submit anywhere — just Cancel to close. Free
// navigation to any step (the stepper isn't gated to a "visited" ceiling,
// same as Edit) since there's nothing to lose by jumping around when
// nothing here can be changed.
export function ViewDigitalProductWizard({ product, onClose }) {
  const steps = DIGITAL_PRODUCT_STEPS;
  const [stepIndex, setStepIndex] = useState(0);
  const { values, recordIds, loading } = useDigitalProductExistingData(product);
  const currentStep = steps[stepIndex];
  const currentEntity = currentStep.entity;
  const lookups = useDigitalProductLookups(currentEntity);

  return (
    <Modal
      open
      onClose={onClose}
      title="View Digital Product"
      size="full"
      fixedHeight
      footer={
        <>
          <button type="button" onClick={onClose} className="px-3 py-2 text-sm font-bold text-slate-500">
            Close
          </button>
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              className="rounded-xl border px-4 py-2 text-sm font-bold text-slate-600"
            >
              Back
            </button>
          )}
          {stepIndex < steps.length - 1 && (
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
            >
              Next
            </button>
          )}
        </>
      }
    >
      <div className="mb-5">
        <HorizontalStepper
          steps={steps}
          activeIndex={stepIndex}
          isStepCompleted={(step) => recordIds[step.entity] != null}
          onStepClick={setStepIndex}
        />
      </div>
      <h2 className="mb-3 text-sm font-bold text-slate-800">{currentStep.label}</h2>
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingAnimation className="h-16 w-48" />
        </div>
      ) : recordIds[currentEntity] == null ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 py-14 text-center">
          <p className="text-sm font-semibold text-slate-600">No {currentStep.label.toLowerCase()} configured</p>
          <p className="text-xs text-slate-400">Nothing has been added for this step yet.</p>
        </div>
      ) : (
        <DigitalProductStepFields
          entity={currentEntity}
          values={values[currentEntity]}
          onFieldChange={() => {}}
          lookups={lookups}
          disabled
        />
      )}
    </Modal>
  );
}
