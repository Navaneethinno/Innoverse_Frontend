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
} from "./customerWizardShared";
import { notifications } from "@/Utils/Lib/notifications";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";

// Same 3-step stepper and field/dropdown plumbing as AddCustomerWizard.jsx/
// ViewCustomerWizard.jsx, but EDIT loads whatever already exists for this
// Customer up front (useCustomerExistingData), lets the user jump to ANY
// step directly, and saves ONE step at a time via saveCustomerStep (an
// `edit` call carrying that step's `sections` entry). No CREATE call ever
// fires here — the profile already exists. Mirrors
// EditDigitalProductWizard.jsx exactly.
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
  const lookups = useCustomerLookups(currentEntity);

  const isDirty = JSON.stringify(values[currentEntity]) !== JSON.stringify(savedValues[currentEntity]);
  const setFieldValue = (key, next) =>
    setValues((prev) => ({ ...prev, [currentEntity]: { ...prev[currentEntity], [key]: next } }));

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
    if (!isDraft) {
      const missing = findMissingField(currentEntity, values[currentEntity]);
      if (missing) {
        notifications.error(requiredFieldMessage(missing, tr));
        return;
      }
    }
    setBusy(true);
    try {
      const config = CONFIGS[currentEntity];
      await saveCustomerStep({ id: profile.id, entity: currentEntity, values, recordIds, isDraft });
      notifications.success(`${tr(config.title)} ${isDraft ? tr("draft saved") : tr("saved")}`);
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
      {initialLoading ? (
        <div className="flex justify-center py-12">
          <LoadingAnimation className="h-16 w-48" />
        </div>
      ) : (
        <CustomerStepFields
          entity={currentEntity}
          values={values[currentEntity]}
          onFieldChange={setFieldValue}
          lookups={lookups}
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
