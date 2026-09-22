import { useState } from "react";
import { Modal } from "@/Components/Common/Modal";
import { HorizontalStepper } from "@/Components/Common/HorizontalStepper";
import { Spinner } from "@/Components/Common/Spinner";
import { DIGITAL_PRODUCT_STEPS } from "./digitalProductSteps";
import { digitalProductApi } from "@/Services/DigitalProduct/digitalProduct.api";
import {
  DigitalProductStepFields,
  emptyValuesFor,
  findMissingField,
  requiredFieldMessage,
  saveDigitalProductStep,
  useDigitalProductLookups,
} from "./digitalProductWizardShared";
import { notifications } from "@/Utils/Lib/notifications";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";

// The single Add-flow entry point for Digital Product: a 9-step wizard
// (Digital Product, Product Map, Security Config, KYC Config, KYC Level,
// Channel Config, Channel Transaction, Eligibility Config, Residency).
// Matches the real `/digital_product/product/*` API's own shape: step 0
// creates the product as a Draft (`add`, is_draft: true) and every later
// step immediately saves into that same product via `edit` + a `sections`
// entry (see saveDigitalProductStep) — there is no single final "create
// everything at once" call. Save as draft simply stops there; Submit saves
// whatever step is current, then calls `/submit` (which itself enforces
// that Product Map + Channel Config were filled in, surfacing the
// backend's own message if not).
export function AddDigitalProductWizard({ onClose, onSuccess }) {
  const tr = useConfigLabel();
  const steps = DIGITAL_PRODUCT_STEPS;
  const [stepIndex, setStepIndex] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [productId, setProductId] = useState(null);
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
  const lookups = useDigitalProductLookups(currentEntity);

  const setFieldValue = (key, next) =>
    setValues((prev) => ({ ...prev, [currentEntity]: { ...prev[currentEntity], [key]: next } }));

  // Persists whatever the current step holds (creating the product itself
  // on step 0's first save) and, once a nested step's parent has a real id,
  // refreshes recordIds from the server so the next nested step (kyc_level,
  // channel_transaction, residency) can link to it correctly.
  const saveStep = async (isDraft) => {
    const id = await saveDigitalProductStep({ id: productId, entity: currentEntity, values, recordIds, isDraft });
    if (id !== productId) setProductId(id);
    if (currentEntity !== "product" && id != null) {
      const response = await digitalProductApi("product").get({ id });
      const data = response?.data?.[0] ?? {};
      const productMap = Array.isArray(data.product_map) ? data.product_map[0] : data.product_map;
      const channelConfig = Array.isArray(data.channel_config) ? data.channel_config[0] : data.channel_config;
      const eligibilityConfig = data.eligibility_config;
      const kycConfig = data.kyc_config;
      setRecordIds((prev) => ({
        ...prev,
        product_map: productMap?.id ?? prev.product_map,
        security_config: data.security_config?.id ?? prev.security_config,
        kyc_config: kycConfig?.id ?? prev.kyc_config,
        kyc_level: (Array.isArray(kycConfig?.kyc_level) ? kycConfig.kyc_level[0] : kycConfig?.kyc_level)?.id ?? prev.kyc_level,
        channel_config: channelConfig?.id ?? prev.channel_config,
        channel_transaction:
          (Array.isArray(channelConfig?.channel_transaction) ? channelConfig.channel_transaction[0] : channelConfig?.channel_transaction)?.id ??
          prev.channel_transaction,
        eligibility_config: eligibilityConfig?.id ?? prev.eligibility_config,
        residency: (Array.isArray(eligibilityConfig?.residency) ? eligibilityConfig.residency[0] : eligibilityConfig?.residency)?.id ?? prev.residency,
      }));
    }
    return id;
  };

  const goNext = async () => {
    if (currentEntity === "product") {
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
      notifications.success(`${tr("Digital Product")} ${tr("draft saved")}`);
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
      if (id == null) throw new Error("Save the Digital Product step before submitting");
      const r = await digitalProductApi("product").submit({ id });
      notifications.success(r?.message || `${tr("Digital Product")} ${tr("submitted for authorization")}`);
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
      title={tr("Add Digital Product")}
      size="xl"
      growWithContent
      footer={
        <>
          <button type="button" onClick={onClose} className="px-3 py-2 text-sm font-bold text-muted-foreground">
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
            className="flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-50"
          >
            {savingDraft && <Spinner size={13} />}
            {tr("Save as draft")}
          </button>
          {!isLastStep ? (
            <button
              type="button"
              disabled={savingStep}
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
      <h2 className="mb-3 text-sm font-bold text-slate-800">{tr(currentStep.label)}</h2>
      <DigitalProductStepFields
        entity={currentEntity}
        values={values[currentEntity]}
        onFieldChange={setFieldValue}
        lookups={lookups}
      />
    </Modal>
  );
}
