import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/Components/Common/Modal";
import { HorizontalStepper } from "@/Components/Common/HorizontalStepper";
import { getMenuIcon } from "@/Pages/Sidebar/moduleIcons";
import { CONFIGS, DigitalProductFieldInput } from "./digitalProductFields";
import { DIGITAL_PRODUCT_STEPS } from "./digitalProductSteps";
import { buildDigitalProductWorkflowPayload } from "./digitalProductWorkflowPayload";
import { submitDigitalProductWorkflow } from "@/Services/DigitalProduct/digitalProductWorkflow.api";
import { digitalProductApi } from "@/Services/DigitalProduct/digitalProduct.api";
import { configKycApi } from "@/Services/Config/config.api";
import { useActiveInstitutionsQuery } from "@/Hooks/Institutions/institutionHooks";
import { useChannels, useTransactions, useResidencyTypes } from "@/Hooks/Master/masterHooks";
import { notifications } from "@/Utils/Lib/notifications";

const rowsOf = (r) => (Array.isArray(r?.data) ? r.data : (r?.data?.data ?? []));

function emptyValuesFor(entity) {
  return Object.fromEntries(CONFIGS[entity].fields.map(([key, , type]) => [key, type === "boolean" ? false : ""]));
}

// Same required-field definition DigitalProductResource.jsx's Editor/save()
// already enforce (native `required` on plain code/name inputs, a manual
// check for the "_id" dropdown fields that have no native control) — this
// wizard has no <form> per step to get that native validation for free, so
// it's made explicit here instead of duplicating a different rule.
function findMissingField(entity, values) {
  return CONFIGS[entity].fields.find(([key]) => {
    const isRequired = key.endsWith("_id") || ["code", "name"].includes(key);
    return isRequired && (values[key] === "" || values[key] == null);
  });
}

function requiredFieldMessage([key, label]) {
  const verb = key.endsWith("_id") ? "select" : "enter";
  const article = /^[aeiou]/i.test(label) ? "an" : "a";
  return `Please ${verb} ${article} ${label.toLowerCase()}`;
}

// The single Add-flow entry point for Digital Product: a 9-step wizard
// (Digital Product, Product Map, Security Config, KYC Config, KYC Level,
// Channel Config, Channel Transaction, Eligibility Config, Residency) that
// collects every step's fields into local state and only calls the backend
// ONCE, on the final Submit — see digitalProductWorkflow.api.js. It reuses
// DigitalProductResource.jsx's own CONFIGS (field definitions) and
// DigitalProductFieldInput (the dropdown/input rendering, including every
// existing dropdown API) so every step's form is identical to that entity's
// own standalone Add form, just writing into wizard state instead of
// submitting immediately. Every existing standalone Add/Edit/View/Delete
// page for these 9 entities is untouched and still reachable at its own
// route; this wizard doesn't replace them.
export function AddDigitalProductWizard({ onClose, onSuccess }) {
  const steps = useMemo(
    () => DIGITAL_PRODUCT_STEPS.map((step) => ({ ...step, icon: getMenuIcon(step.label) })),
    [],
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [values, setValues] = useState(() =>
    Object.fromEntries(steps.map((step) => [step.entity, emptyValuesFor(step.entity)])),
  );
  const [submitting, setSubmitting] = useState(false);
  const currentStep = steps[stepIndex];
  const currentEntity = currentStep.entity;
  const isLastStep = stepIndex === steps.length - 1;

  // Exactly the dropdown sources DigitalProductResource.jsx's own Add form
  // uses for these fields, gated by the CURRENT wizard step instead of a
  // route entity — same API calls, same hooks, same error surfacing.
  const { data: institutions = [], error: institutionsError } = useActiveInstitutionsQuery();
  const { channels = [], error: channelsError } = useChannels(currentEntity === "channel_config");
  const { transactions = [], error: transactionsError } = useTransactions(currentEntity === "channel_transaction");
  const { residencyTypes = [], error: residencyTypesError } = useResidencyTypes(currentEntity === "residency");
  const [products, setProducts] = useState([]);
  const [accountProducts, setAccountProducts] = useState([]);
  const [kycGroups, setKycGroups] = useState([]);
  const [channelConfigs, setChannelConfigs] = useState([]);
  const [eligibilityConfigs, setEligibilityConfigs] = useState([]);

  useEffect(() => {
    if (institutionsError) notifications.error(institutionsError.message);
  }, [institutionsError]);
  useEffect(() => {
    if (channelsError) notifications.error(channelsError.message);
  }, [channelsError]);
  useEffect(() => {
    if (transactionsError) notifications.error(transactionsError.message);
  }, [transactionsError]);
  useEffect(() => {
    if (residencyTypesError) notifications.error(residencyTypesError.message);
  }, [residencyTypesError]);
  useEffect(() => {
    if (currentEntity !== "product_map") return;
    digitalProductApi("product")
      .getActive({ view: "dropdown" })
      .then((r) => setProducts(rowsOf(r)))
      .catch((e) => notifications.error(e.message));
  }, [currentEntity]);
  useEffect(() => {
    if (currentEntity !== "product_map") return;
    configKycApi("acct_product")
      .getActive({ view: "dropdown" })
      .then((r) => setAccountProducts(rowsOf(r)))
      .catch((e) => notifications.error(e.message));
  }, [currentEntity]);
  useEffect(() => {
    if (currentEntity !== "kyc_config") return;
    configKycApi("kyc_group")
      .getActive({ view: "dropdown" })
      .then((r) => setKycGroups(rowsOf(r)))
      .catch((e) => notifications.error(e.message));
  }, [currentEntity]);
  useEffect(() => {
    if (currentEntity !== "channel_transaction") return;
    digitalProductApi("channel_config")
      .getActive({ view: "dropdown" })
      .then((r) => setChannelConfigs(rowsOf(r)))
      .catch((e) => notifications.error(e.message));
  }, [currentEntity]);
  useEffect(() => {
    if (currentEntity !== "residency") return;
    digitalProductApi("eligibility_config")
      .getActive({ view: "dropdown" })
      .then((r) => setEligibilityConfigs(rowsOf(r)))
      .catch((e) => notifications.error(e.message));
  }, [currentEntity]);

  const lookups = {
    institutions,
    products,
    accountProducts,
    kycGroups,
    channels,
    channelConfigs,
    transactions,
    eligibilityConfigs,
    residencyTypes,
  };

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
      <div className="grid gap-4 md:grid-cols-2">
        {CONFIGS[currentEntity].fields.map(([key, label, type]) => (
          <label key={key} className="text-sm font-semibold text-slate-700">
            {label}
            <DigitalProductFieldInput
              fieldKey={key}
              type={type}
              value={values[currentEntity][key]}
              onChange={(next) => setFieldValue(key, next)}
              lookups={lookups}
            />
          </label>
        ))}
      </div>
    </Modal>
  );
}
