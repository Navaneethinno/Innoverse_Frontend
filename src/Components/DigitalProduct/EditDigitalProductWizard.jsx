import { useEffect, useState } from "react";
import { Modal } from "@/Components/Common/Modal";
import { HorizontalStepper } from "@/Components/Common/HorizontalStepper";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { LoadingAnimation } from "@/Components/Common/LoadingAnimation";
import { CONFIGS } from "./digitalProductFields";
import { DIGITAL_PRODUCT_STEPS } from "./digitalProductSteps";
import {
  DigitalProductStepFields,
  findMissingField,
  requiredFieldMessage,
  isStepConfigured,
  saveDigitalProductStep,
  useDigitalProductExistingData,
  useDigitalProductLookups,
} from "./digitalProductWizardShared";
import { notifications } from "@/Utils/Lib/notifications";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";

// Same 9-step horizontal stepper and field/dropdown plumbing as
// AddDigitalProductWizard.jsx/ViewDigitalProductWizard.jsx (all three share
// digitalProductWizardShared.jsx), but a fundamentally different mode: EDIT
// loads whatever configuration already exists for this Digital Product
// across all 9 steps up front (useDigitalProductExistingData), so the
// stepper can show real "already configured" checkmarks (not just "visited
// this session"), lets the user jump to ANY step directly, and saves ONE
// step at a time via saveDigitalProductStep (an `edit` call carrying that
// step's `sections` entry) rather than collecting everything for one final
// call. No CREATE call ever fires here — the product already exists.
export function EditDigitalProductWizard({ product, onClose, onSaved }) {
  const tr = useConfigLabel();
  const steps = DIGITAL_PRODUCT_STEPS;
  const [stepIndex, setStepIndex] = useState(0);
  const {
    values: loadedValues,
    recordIds,
    reload,
    loading: initialLoading,
  } = useDigitalProductExistingData(product);
  const [values, setValues] = useState(loadedValues);
  const [savedValues, setSavedValues] = useState(loadedValues);
  useEffect(() => {
    if (!initialLoading) {
      setValues(loadedValues);
      setSavedValues(loadedValues);
    }
    // Only re-sync once loading finishes, not on every loadedValues object
    // identity change (there is none after that point) or `values` changing
    // as the user types — this must not clobber in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoading]);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [pendingNav, setPendingNav] = useState(null);
  const currentStep = steps[stepIndex];
  const currentEntity = currentStep.entity;
  const lookups = useDigitalProductLookups(currentEntity);

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

  // Shared by Save Changes and Save as draft — the only difference is
  // whether the current step's required fields are enforced first (a draft
  // is deliberately allowed to be incomplete, same as Add's own Save as
  // draft) and which is_draft flag reaches the API.
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
      await saveDigitalProductStep({ id: product.id, entity: currentEntity, values, recordIds, isDraft });
      notifications.success(`${tr(config.title)} ${isDraft ? tr("draft saved") : tr("saved")}`);
      // The add/edit response doesn't echo back a newly-created section
      // row's id, so re-fetch the whole tree — needed so a later nested
      // step (kyc_level/channel_transaction/residency) links to the right
      // parent record.
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
    <Modal open onClose={attemptClose} title={tr("Edit Digital Product")} size="full" fixedHeight
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
            className="rounded-xl border px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-50"
          >
            {tr("Save as draft")}
          </button>
          <button
            type="button"
            disabled={saving || savingDraft || initialLoading}
            onClick={() => void handleSave()}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {tr("Save Changes")}
          </button>
        </>
      }
    >
      <div className="mb-5">
        <HorizontalStepper
          steps={steps}
          activeIndex={stepIndex}
          isStepCompleted={(step) => step.entity === "product" || isStepConfigured(step.entity, values)}
          onStepClick={goToStep}
        />
      </div>
      <h2 className="mb-3 text-sm font-bold text-slate-800">{tr(currentStep.label)}</h2>
      {initialLoading ? (
        <div className="flex justify-center py-12">
          <LoadingAnimation className="h-16 w-48" />
        </div>
      ) : (
        <DigitalProductStepFields
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
          description={`${tr("You have unsaved changes to")} ${tr(currentStep.label)} ${tr("that haven't been saved. Discard them?")}`}
          confirmLabel={tr("Discard changes")}
          destructive
          onClose={() => setPendingNav(null)}
          onConfirm={() => resolvePendingNav(true)}
        />
      )}
    </Modal>
  );
}
