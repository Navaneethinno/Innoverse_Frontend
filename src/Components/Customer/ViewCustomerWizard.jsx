import { useState } from "react";
import { Modal } from "@/Components/Common/Modal";
import { HorizontalStepper } from "@/Components/Common/HorizontalStepper";
import { LoadingAnimation } from "@/Components/Common/LoadingAnimation";
import { CUSTOMER_STEPS } from "./customerSteps";
import { CustomerStepFields, isStepConfigured, useCustomerExistingData, useCustomerLookups } from "./customerWizardShared";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";

// Read-only counterpart to AddCustomerWizard.jsx/EditCustomerWizard.jsx —
// same 3-step stepper and field/dropdown rendering, but every field is
// rendered disabled and there is no Save/Save-draft/Submit anywhere — just
// Close. Mirrors ViewDigitalProductWizard.jsx exactly.
export function ViewCustomerWizard({ profile, onClose }) {
  const tr = useConfigLabel();
  const steps = CUSTOMER_STEPS;
  const [stepIndex, setStepIndex] = useState(0);
  const { values, loading } = useCustomerExistingData(profile);
  const currentStep = steps[stepIndex];
  const currentEntity = currentStep.entity;
  const lookups = useCustomerLookups(currentEntity);
  const currentConfigured = currentEntity === "profile" || isStepConfigured(currentEntity, values);

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
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingAnimation className="h-16 w-48" />
        </div>
      ) : !currentConfigured ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 py-14 text-center">
          <p className="text-sm font-semibold text-slate-600">{tr("No")} {currentStep.label.toLowerCase()} {tr("configured")}</p>
          <p className="text-xs text-slate-400">{tr("Nothing has been added for this step yet.")}</p>
        </div>
      ) : (
        <CustomerStepFields
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
