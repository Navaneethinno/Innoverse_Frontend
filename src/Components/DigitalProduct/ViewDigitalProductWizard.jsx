import { useState } from "react";
import { Modal } from "@/Components/Common/Modal";
import { HorizontalStepper } from "@/Components/Common/HorizontalStepper";
import { LoadingAnimation } from "@/Components/Common/LoadingAnimation";
import { DIGITAL_PRODUCT_STEPS } from "./digitalProductSteps";
import { DigitalProductStepFields, isStepConfigured, useDigitalProductExistingData, useDigitalProductLookups } from "./digitalProductWizardShared";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";

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
  const tr = useConfigLabel();
  const steps = DIGITAL_PRODUCT_STEPS;
  const [stepIndex, setStepIndex] = useState(0);
  const { values, loading } = useDigitalProductExistingData(product);
  const currentStep = steps[stepIndex];
  const currentEntity = currentStep.entity;
  const lookups = useDigitalProductLookups(currentEntity);
  const currentConfigured = currentEntity === "product" || isStepConfigured(currentEntity, values);

  return (
    <Modal
      open
      onClose={onClose}
      title={tr("View Digital Product")}
      size="full"
      fixedHeight
      footer={
        <>
          <button type="button" onClick={onClose} className="px-3 py-2 text-sm font-bold text-muted-foreground">
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
          isStepCompleted={(step) => step.entity === "product" || isStepConfigured(step.entity, values)}
          onStepClick={setStepIndex}
        />
      </div>
      <h2 className="mb-3 text-sm font-bold text-slate-800">{tr(currentStep.label)}</h2>
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingAnimation className="h-16 w-48" />
        </div>
      ) : !currentConfigured ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-14 text-center">
          <p className="text-sm font-semibold text-slate-600">{tr("No")} {tr(currentStep.label).toLowerCase()} {tr("configured")}</p>
          <p className="text-xs text-muted-foreground">{tr("Nothing has been added for this step yet.")}</p>
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
