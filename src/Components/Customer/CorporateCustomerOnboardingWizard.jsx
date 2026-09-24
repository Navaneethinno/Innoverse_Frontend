import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, ArrowLeft, ArrowRight, Check, Send } from "lucide-react";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { HorizontalStepper } from "@/Components/Common/HorizontalStepper";
import { notifications } from "@/Utils/Lib/notifications";
import { corpCustomerOnboardingApi, startCorpOnboarding, loadCorpWizard, saveCorpSection } from "@/Services/Onboarding/corporateCustomerOnboarding.api";
import { OnboardingField } from "./OnboardingField";
import { PORTAL_DRAFT_REASON, PortalDraftBanner, isPortalDraft } from "./customerPortal";
import { useUnsavedChangesGuard } from "@/Hooks/useUnsavedChangesGuard";

// Corporate mirror of CustomerOnboardingWizard.jsx (Customer Onboarding
// (Corporate) — Frontend Guide, 2026-09): "it works exactly like the
// individual wizard... this guide covers only what is different" — so this
// keeps the same generic, nothing-hard-coded rendering (sections/fields/
// options/rules all come from wizard.sections) and only changes what the
// guide says changed: the picker is party type -> company type (no
// ownership/sub-type axis), there is no KYC-levels panel or level_no on
// submit, and everything hits /customer/corporate/* instead of
// /customer/individual/*.
const REJECTED_PROCESS_STATUSES = new Set([5, 6, 7, 12, 15]);
function StatusNotice({ onboarding }) {
  const { t } = useTranslation("customer");
  if (!onboarding) return null;
  const status = Number(onboarding.status);
  const processStatus = Number(onboarding.process_status);
  if (status === 9 && processStatus === 9) return null;
  const label = onboarding.process_status_name || onboarding.status_name;
  if (!label) return null;
  const rejected = REJECTED_PROCESS_STATUSES.has(processStatus);
  const approved = status === 1 && processStatus === 1;
  const tone = rejected ? "bg-red-50 text-red-700" : approved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700";
  return (
    <div className={`mt-4 rounded-lg p-2.5 text-xs font-semibold ${tone}`}>
      {label}
      {rejected && onboarding.narration ? `: ${onboarding.narration}` : ""}
      {rejected ? ` ${t("editSectionsAndResubmit")}` : ""}
    </div>
  );
}

// `referenceId` (optional) resumes an existing onboarding straight into the
// section view; otherwise the party type / company type picker runs first.
export function CorporateCustomerOnboardingWizard({ referenceId, forceReadOnly = false, onClose, onChanged }) {
  const { t } = useTranslation(["customer", "onboarding", "common"]);
  const [options, setOptions] = useState(null);
  const [pick, setPick] = useState({ party_type_id: "", company_type_id: "", email: "", phone_number: "" });
  const [starting, setStarting] = useState(false);
  const [wizard, setWizard] = useState(null);
  const [loading, setLoading] = useState(Boolean(referenceId));
  const [activeSection, setActiveSection] = useState(0);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (referenceId) return;
    corpCustomerOnboardingApi
      .options({})
      .then((r) => setOptions((Array.isArray(r?.data) ? r.data[0] : r?.data) ?? { party_types: [] }))
      .catch((error) => notifications.error(error.message));
  }, [referenceId]);

  useEffect(() => {
    if (!referenceId) return;
    setLoading(true);
    loadCorpWizard(referenceId)
      .then(setWizard)
      .catch((error) => notifications.error(error.message))
      .finally(() => setLoading(false));
  }, [referenceId]);

  const sections = wizard?.sections ?? [];
  const section = sections[activeSection];
  // A customer-portal draft stays view-only here even when reached via a
  // staff `add` that resumed it (same contact) — it's the customer's own
  // form until they complete it (Admin Panel handoff §2).
  const portalDraft = isPortalDraft(wizard?.onboarding);
  const editable = !forceReadOnly && !portalDraft && wizard?.onboarding?.editable !== false;
  const notEditableReason = forceReadOnly
    ? t("customer:viewingOnlyNothingCanBeChanged")
    : portalDraft
      ? t(PORTAL_DRAFT_REASON)
      : t("customer:recordCantBeEditedNow");

  // Reseed the section draft whenever the active section or the wizard
  // itself changes — done synchronously during render (see
  // CustomerOnboardingWizard.jsx for why an effect is too late here: a
  // single -> multi-row step change would render once with `draft` still
  // holding the previous section's shape).
  const seedKey = section ? `${section.code}:${wizard?.onboarding?.updated_time}` : null;
  const seedKeyRef = useRef(null);
  let effectiveDraft = draft;
  if (seedKeyRef.current !== seedKey) {
    seedKeyRef.current = seedKey;
    effectiveDraft = section
      ? section.multi_row
        ? section.values?.length
          ? section.values
          : [{}]
        : (section.values ?? {})
      : null;
    setDraft(effectiveDraft);
  }

  // Edits typed into the section on screen but not saved yet. Leaving the
  // section or closing the wizard asks first instead of silently dropping them.
  const sectionSeed = section ? (section.multi_row ? (section.values?.length ? section.values : [{}]) : (section.values ?? {})) : null;
  const dirty = editable && effectiveDraft != null && JSON.stringify(effectiveDraft) !== JSON.stringify(sectionSeed);
  const { guard, dialog: unsavedDialog } = useUnsavedChangesGuard(dirty);

  const partyTypes = options?.party_types ?? [];
  const chosenParty = partyTypes.find((p) => String(p.id) === String(pick.party_type_id));
  const companyTypes = chosenParty?.company_types ?? [];

  const beginOnboarding = async () => {
    if (!pick.party_type_id || !pick.company_type_id) {
      notifications.error("Choose the party type and company type");
      return;
    }
    if (!pick.email.trim() && !pick.phone_number.trim()) {
      notifications.error("Enter an email or a phone number");
      return;
    }
    setStarting(true);
    try {
      const w = await startCorpOnboarding({
        party_type_id: Number(pick.party_type_id),
        company_type_id: Number(pick.company_type_id),
        ...(pick.email.trim() ? { email: pick.email.trim() } : {}),
        ...(pick.phone_number.trim() ? { phone_number: pick.phone_number.trim() } : {}),
      });
      if (w?.notice) notifications.info(w.notice);
      setWizard(w);
      setActiveSection(0);
      onChanged?.();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setStarting(false);
    }
  };

  const setFieldValue = (fieldKey, value) => {
    setDraft((prev) => ({ ...prev, [fieldKey]: value }));
  };
  const setRowValue = (rowIndex, fieldKey, value) => {
    setDraft((prev) => prev.map((row, i) => (i === rowIndex ? { ...row, [fieldKey]: value } : row)));
  };
  const setValue = (rowIndex, fieldKey, value) =>
    rowIndex === undefined ? setFieldValue(fieldKey, value) : setRowValue(rowIndex, fieldKey, value);
  const addRow = () => setDraft((prev) => [...prev, {}]);
  const removeRow = (rowIndex) => setDraft((prev) => prev.filter((_, i) => i !== rowIndex));

  const issueFor = (fieldKey, rowIndex) =>
    section?.issues?.find((i) => i.field === fieldKey && (rowIndex === undefined || i.row === rowIndex))?.message;

  const persistSection = async () => {
    if (!section) return;
    setSaving(true);
    try {
      const w = await saveCorpSection({
        reference_id: wizard.onboarding.reference_id,
        section_code: section.code,
        data: effectiveDraft,
        expected_updated_time: wizard.onboarding.updated_time,
      });
      setWizard(w);
      notifications.success("Saved");
      onChanged?.();
      const nextCode = w?.progress?.next_section;
      if (nextCode && nextCode !== section.code) {
        const idx = (w.sections ?? []).findIndex((s) => s.code === nextCode);
        if (idx >= 0) setActiveSection(idx);
      }
    } catch (error) {
      if (error.conflict) {
        notifications.error(error.message);
        const fresh = await loadCorpWizard(wizard.onboarding.reference_id).catch(() => null);
        if (fresh) setWizard(fresh);
      } else {
        notifications.error(error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const submitForApproval = async () => {
    setSubmitting(true);
    try {
      const response = await corpCustomerOnboardingApi.submit({ reference_id: wizard.onboarding.reference_id });
      const w = Array.isArray(response?.data) ? response.data[0] : response?.data;
      if (w) setWizard(w);
      else {
        const fresh = await loadCorpWizard(wizard.onboarding.reference_id).catch(() => null);
        if (fresh) setWizard(fresh);
      }
      notifications.success("Submitted for approval");
      onChanged?.();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fieldOptionsFor = (field, row) => {
    if (!field.parent_key) return field.options;
    const parentValue = row ? row[field.parent_key] : effectiveDraft?.[field.parent_key];
    return (field.options ?? []).filter((o) => String(o.parent_id) === String(parentValue));
  };

  const typeFieldCaption = (fields) => fields.find((f) => f.key === section.type_field)?.label ?? t("customer:type");
  const visibleFields = (fields) => (section.type_field ? fields.filter((f) => f.key !== section.type_field) : fields);

  // Addresses may carry "same as" (guide §4): instead of repeating an
  // address's fields, the row is marked same_as_address_type_id and takes
  // that other address's values at approval. A related party's own
  // "same as the company's address" is a plain boolean field
  // (same_as_company_address) the server already sends as an ordinary
  // field — no special-case wiring needed for that one, OnboardingField's
  // checkbox handles it like any other field.
  const sameAsTargets = (row) => {
    const currentType = section.types?.find((t) => t.id === row?.[section.type_field]);
    const eligible = currentType?.same_as ?? [];
    return (section.types ?? []).filter((t) => eligible.includes(t.id));
  };

  const renderRow = (fields, row, rowIndex) => {
    const sameAsOptions = sameAsTargets(row);
    const sameAsId = row?.same_as_address_type_id;
    return (
    <div
      key={rowIndex ?? "single"}
      className={rowIndex === undefined ? "grid gap-4 sm:grid-cols-2" : "grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2"}
    >
      {section.type_field && (
        <div className="sm:col-span-2">
          <label className="block text-sm font-semibold text-slate-700">
            {typeFieldCaption(fields)}
            <FilterSelect
              className="mt-1.5"
              value={row?.[section.type_field] ?? ""}
              onChange={(v) => setValue(rowIndex, section.type_field, Number(v))}
              disabled={!editable}
              disabledReason={notEditableReason}
              options={[
                { value: "", label: t("customer:selectType") },
                ...(section.types ?? []).map((t) => ({ value: t.id, label: t.name })),
              ]}
            />
          </label>
        </div>
      )}
      {sameAsOptions.length > 0 && (
        <div className="sm:col-span-2">
          <CheckboxPill
            checked={Boolean(sameAsId)}
            disabled={!editable}
            disabledReason={notEditableReason}
            label={t("customer:sameAsAnotherAddress")}
            onChange={(checked) => setValue(rowIndex, "same_as_address_type_id", checked ? sameAsOptions[0].id : undefined)}
          />
          {sameAsId && (
            <label className="mt-2 block text-sm font-semibold text-slate-700">
              {t("onboarding:sameAs")}
              <FilterSelect
                className="mt-1.5"
                disabled={!editable}
                disabledReason={notEditableReason}
                value={sameAsId}
                onChange={(v) => setValue(rowIndex, "same_as_address_type_id", Number(v))}
                options={sameAsOptions.map((t) => ({ value: t.id, label: t.name }))}
              />
            </label>
          )}
        </div>
      )}
      {!sameAsId &&
        visibleFields(fields).map((field) => (
          <OnboardingField
            key={field.key}
            field={editable ? field : { ...field, read_only: true, read_only_reason: notEditableReason }}
            value={row?.[field.key]}
            options={fieldOptionsFor(field, row)}
            error={issueFor(field.key, rowIndex)}
            onChange={(v) => setValue(rowIndex, field.key, v)}
          />
        ))}
      {rowIndex !== undefined && editable && (
        <div className="sm:col-span-2">
          <button
            type="button"
            onClick={() => removeRow(rowIndex)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
          >
            <Trash2 size={13} /> {t("onboarding:remove")}
          </button>
        </div>
      )}
    </div>
    );
  };

  const body = () => {
    if (!referenceId && !wizard) {
      return (
        <div className="grid gap-4">
          <label className="text-sm font-semibold text-slate-700">
            {t("onboarding:partyType")}
            <FilterSelect
              className="mt-1.5"
              value={pick.party_type_id}
              onChange={(v) => setPick({ ...pick, party_type_id: v, company_type_id: "" })}
              options={[{ value: "", label: t("onboarding:selectPartyType") }, ...partyTypes.map((p) => ({ value: p.id, label: p.name }))]}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            {t("onboarding:companyType")}
            <FilterSelect
              className="mt-1.5"
              value={pick.company_type_id}
              onChange={(v) => setPick({ ...pick, company_type_id: v })}
              options={[{ value: "", label: t("onboarding:selectCompanyType") }, ...companyTypes.map((c) => ({ value: c.id, label: c.name }))]}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              {t("customer:email")}
              <input
                type="email"
                className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
                value={pick.email}
                onChange={(e) => setPick({ ...pick, email: e.target.value })}
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              {t("customer:phoneNumber")}
              <input
                type="text"
                className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
                value={pick.phone_number}
                onChange={(e) => setPick({ ...pick, phone_number: e.target.value })}
              />
            </label>
          </div>
          <p className="text-[11px] text-muted-foreground">{t("customer:atLeastOneOfEmailOrPhone")}</p>
        </div>
      );
    }
    if (loading || !wizard) return <div className="flex justify-center py-10"><Spinner size={22} /></div>;
    if (!section) return <p className="py-6 text-center text-sm text-muted-foreground">{t("customer:thisCustomerTypeHasNoConfiguredSections")}</p>;

    return (
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {t("customer:requiredSectionsProgress", { done: wizard.progress.sections_done, required: wizard.progress.sections_required, percent: wizard.progress.percent })}
          </div>
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-primary" style={{ width: `${wizard.progress.percent}%` }} />
          </div>
        </div>
        <HorizontalStepper
          className="mb-4"
          steps={sections.map((s) => ({ id: s.code, label: s.label ?? s.name }))}
          activeIndex={activeSection}
          onStepClick={guard((index) => setActiveSection(index))}
          isStepCompleted={(_, i) => sections[i]?.state === "complete"}
        />
        <h2 className="mb-3 text-sm font-bold text-slate-700">{section.label ?? section.name}</h2>
        {section.document_groups?.length > 0 && (
          <div className="mb-3 rounded-lg bg-muted p-2.5 text-[11px] text-muted-foreground">
            {section.document_groups.map((g) => (
              <div key={g.code}>{g.max_allowed ? t("customer:documentGroupRuleUpTo", { name: g.name, min: g.min_required, max: g.max_allowed }) : t("customer:documentGroupRule", { name: g.name, min: g.min_required })}</div>
            ))}
          </div>
        )}
        {section.multi_row ? (
          <div className="grid gap-3">
            {(Array.isArray(effectiveDraft) ? effectiveDraft : []).map((row, i) => renderRow(section.fields, row, i))}
            {editable && (
              <button
                type="button"
                onClick={addRow}
                className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-primary px-3 py-1.5 text-xs font-bold text-primary"
              >
                <Plus size={13} /> {t("onboarding:addTitle", { title: (section.label ?? section.name).toLowerCase() })}
              </button>
            )}
          </div>
        ) : (
          renderRow(section.fields, effectiveDraft ?? {}, undefined)
        )}
        <StatusNotice onboarding={wizard.onboarding} />
        {portalDraft && <PortalDraftBanner />}
        {editable && wizard.progress.ready_to_submit && (
          <div className="mt-4 rounded-lg bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-700">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <Check size={14} />
                {t("customer:allRequiredSectionsAreComplete")}
              </span>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submitForApproval()}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              >
                {submitting ? <Spinner size={12} /> : <Send size={13} />}
                {t("customer:submitForApproval")}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const footer = () => {
    if (!referenceId && !wizard) {
      return (
        <>
          <button type="button" onClick={guard(onClose)} className="px-3 py-2 text-sm font-bold text-muted-foreground">{t("common:cancel")}</button>
          <button
            type="button"
            disabled={starting}
            onClick={() => void beginOnboarding()}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {starting && <Spinner size={13} />}
            {t("customer:startOnboarding")}
          </button>
        </>
      );
    }
    if (!wizard) return <button type="button" onClick={guard(onClose)} className="px-3 py-2 text-sm font-bold text-muted-foreground">{t("common:close")}</button>;
    return (
      <>
        <button
          type="button"
          disabled={activeSection === 0}
          onClick={guard(() => setActiveSection((i) => Math.max(0, i - 1)))}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-muted-foreground disabled:opacity-40"
        >
          <ArrowLeft size={14} /> {t("customer:previous")}
        </button>
        <div className="flex-1" />
        <button type="button" onClick={guard(onClose)} className="px-3 py-2 text-sm font-bold text-muted-foreground">{t("common:close")}</button>
        {editable && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void persistSection()}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving && <Spinner size={13} />}
            {t("customer:saveSection")}
          </button>
        )}
        <button
          type="button"
          disabled={activeSection >= sections.length - 1}
          onClick={guard(() => setActiveSection((i) => Math.min(Math.max(sections.length - 1, 0), i + 1)))}
          className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold text-primary disabled:opacity-40"
        >
          {t("common:next")} <ArrowRight size={14} />
        </button>
      </>
    );
  };

  return (
    <Modal
      open
      onClose={guard(onClose)}
      title={
        wizard
          ? `${wizard.customer_type.name ?? wizard.customer_type.onboarding_definition_name} — ${wizard.onboarding.email || wizard.onboarding.phone_number}${wizard.onboarding.inst_profile_name ? ` · ${wizard.onboarding.inst_profile_name}` : ""}`
          : t("customer:startCorporateOnboarding")
      }
      size="xl"
      growWithContent
      footer={footer()}
    >
      {body()}
      {unsavedDialog}
    </Modal>
  );
}
