import { useEffect, useState } from "react";
import { Modal } from "@/Components/Common/Modal";
import { HorizontalStepper } from "@/Components/Common/HorizontalStepper";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { LoadingAnimation } from "@/Components/Common/LoadingAnimation";
import { CONFIGS } from "./digitalProductFields";
import { DIGITAL_PRODUCT_STEPS } from "./digitalProductSteps";
import { saveDigitalProductWorkflowStep } from "@/Services/DigitalProduct/digitalProductWorkflow.api";
import { digitalProductApi } from "@/Services/DigitalProduct/digitalProduct.api";
import {
  DigitalProductStepFields,
  emptyValuesFor,
  findMissingField,
  requiredFieldMessage,
  rowsOf,
  useDigitalProductLookups,
} from "./digitalProductWizardShared";
import { notifications } from "@/Utils/Lib/notifications";

function pickFields(entity, record) {
  return Object.fromEntries(
    CONFIGS[entity].fields.map(([key, , type]) => [key, record?.[key] ?? (type === "boolean" ? false : "")]),
  );
}

// Finds the existing record (if any) for `entity` whose `parentField`
// equals `parentId`, by listing that entity's own existing /list endpoint
// (the same one DigitalProductResource.jsx's own listing page for that
// entity already calls) and filtering client-side — there is no dedicated
// "get by parent id" endpoint, and inventing one isn't in scope here.
async function findChildRecord(entity, parentField, parentId) {
  if (parentId == null) return undefined;
  const response = await digitalProductApi(entity).list({ page: 1, limit: 500 });
  return rowsOf(response).find((row) => String(row[parentField]) === String(parentId));
}

// Same 9-step horizontal stepper and field/dropdown plumbing as
// AddDigitalProductWizard.jsx (both share digitalProductWizardShared.jsx),
// but a fundamentally different mode: EDIT loads whatever configuration
// already exists for this Digital Product across all 9 steps up front, so
// the stepper can show real "already configured" checkmarks (not just
// "visited this session"), lets the user jump to ANY step directly, and
// saves ONE step at a time through that step's own existing edit/add API
// (see saveDigitalProductWorkflowStep) rather than collecting everything
// for one final call the way Add does. No CREATE call ever fires for a
// step that already has an existing record — its real id is always sent.
export function EditDigitalProductWizard({ product, onClose, onSaved }) {
  const steps = DIGITAL_PRODUCT_STEPS;
  const [stepIndex, setStepIndex] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [values, setValues] = useState(() =>
    Object.fromEntries(steps.map((step) => [step.entity, emptyValuesFor(step.entity)])),
  );
  const [savedValues, setSavedValues] = useState(values);
  const [recordIds, setRecordIds] = useState(() => Object.fromEntries(steps.map((step) => [step.entity, null])));
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [pendingNav, setPendingNav] = useState(null);
  const currentStep = steps[stepIndex];
  const currentEntity = currentStep.entity;
  const lookups = useDigitalProductLookups(currentEntity);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const nextValues = { product: pickFields("product", product) };
      const nextRecordIds = { product: product.id };

      await Promise.all(
        steps
          .filter((step) => step.parentEntity === "product")
          .map(async (step) => {
            const record = await findChildRecord(step.entity, step.parentIdField, product.id).catch(() => undefined);
            nextValues[step.entity] = record ? pickFields(step.entity, record) : emptyValuesFor(step.entity);
            nextRecordIds[step.entity] = record?.id ?? null;
          }),
      );

      // kyc_level / channel_transaction / residency each depend on a
      // record resolved in the pass above (kyc_config / channel_config /
      // eligibility_config respectively) — must run after it, not in
      // parallel with it.
      await Promise.all(
        steps
          .filter((step) => step.parentEntity && step.parentEntity !== "product")
          .map(async (step) => {
            const parentId = nextRecordIds[step.parentEntity];
            const record = await findChildRecord(step.entity, step.parentIdField, parentId).catch(() => undefined);
            nextValues[step.entity] = record ? pickFields(step.entity, record) : emptyValuesFor(step.entity);
            nextRecordIds[step.entity] = record?.id ?? null;
          }),
      );

      if (cancelled) return;
      setValues(nextValues);
      setSavedValues(nextValues);
      setRecordIds(nextRecordIds);
      setInitialLoading(false);
    }
    load().catch((e) => {
      if (cancelled) return;
      notifications.error(e.message);
      setInitialLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

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
        notifications.error(requiredFieldMessage(missing));
        return;
      }
    }
    setBusy(true);
    try {
      const config = CONFIGS[currentEntity];
      const recordId = recordIds[currentEntity];
      const payload = Object.fromEntries(
        config.fields
          .filter(([key]) => !recordId || !config.readOnlyOnEdit?.includes(key))
          .map(([key]) => [key, values[currentEntity][key]]),
      );
      const response = await saveDigitalProductWorkflowStep(currentEntity, payload, recordId, isDraft);
      notifications.success(`${config.title} ${isDraft ? "draft saved" : "saved"}`);
      const savedRecord = rowsOf(response)[0];
      if (savedRecord?.id != null) {
        setRecordIds((prev) => ({ ...prev, [currentEntity]: savedRecord.id }));
      }
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
    <Modal open onClose={attemptClose} title="Edit Digital Product" size="full" fixedHeight
      footer={
        <>
          <button type="button" onClick={attemptClose} className="px-3 py-2 text-sm font-bold text-slate-500">
            Cancel
          </button>
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={() => goToStep(stepIndex - 1)}
              className="rounded-xl border px-4 py-2 text-sm font-bold text-slate-600"
            >
              Back
            </button>
          )}
          <button
            type="button"
            disabled={savingDraft || saving || initialLoading}
            onClick={() => void handleSaveDraft()}
            className="rounded-xl border px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-50"
          >
            Save as draft
          </button>
          <button
            type="button"
            disabled={saving || savingDraft || initialLoading}
            onClick={() => void handleSave()}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            Save Changes
          </button>
        </>
      }
    >
      <div className="mb-5">
        <HorizontalStepper
          steps={steps}
          activeIndex={stepIndex}
          isStepCompleted={(step) => recordIds[step.entity] != null}
          onStepClick={goToStep}
        />
      </div>
      <h2 className="mb-3 text-sm font-bold text-slate-800">{currentStep.label}</h2>
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
          title="Discard unsaved changes?"
          description={`You have unsaved changes to ${currentStep.label} that haven't been saved. Discard them?`}
          confirmLabel="Discard changes"
          destructive
          onClose={() => setPendingNav(null)}
          onConfirm={() => resolvePendingNav(true)}
        />
      )}
    </Modal>
  );
}
