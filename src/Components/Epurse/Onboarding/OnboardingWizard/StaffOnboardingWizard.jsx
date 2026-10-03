import { canChooseInstitution } from "@/Utils/Lib/institutionScope";
import { useEffect, useRef, useState } from "react";
import { useAudienceTranslation } from "@/Hooks/useAudienceTranslation";
import { Plus, Trash2, ArrowLeft, ArrowRight, Check, ChevronDown, Send, ShieldCheck, ShieldAlert } from "lucide-react";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { HorizontalStepper } from "@/Components/Common/HorizontalStepper";
import { notifications } from "@/Utils/Lib/notifications";
import { useUnsavedChangesGuard } from "@/Hooks/useUnsavedChangesGuard";
import { CustomerRiskPanel } from "@/Components/Epurse/RiskAssessment/CustomerRisk";
import { CustomerAmlBadge } from "@/Components/InnoAML/Shared/CustomerAml";
import { FieldPreview } from "../FormBuilder/FieldPreview";
import { PORTAL_DRAFT_REASON, PortalDraftBanner, isPortalDraft } from "./customerPortal";

import { Button } from "@/Components/Common/Button";
import { CustomerAccounts, useAccountsOwner } from "@/Components/Epurse/Accounts/accountShared";
import { OwnerLimitUsage } from "@/Components/GlobalSettings/Limit/LimitUsage";
import { OwnerHistoryButton } from "@/Components/Transactions/OwnerHistory";
import { OwnerDeposits } from "@/Components/TermDeposits/Deposits/Deposits";
import { digitalProductApi } from "@/Services/Epurse/digitalProduct.api";
// The staff onboarding wizard on the institution's own form (Admin portal
// handoff: onboarding form builder, §8), for individual and corporate.
// Every section the customer is asked comes at once (a section a rule
// hides for the current answers is not sent); each `edit` saves one
// section and the reply is redrawn as-is. Fields are drawn by field_type;
// lists carry their choices inline, narrowed by a parent's answer.
const REJECTED_PROCESS_STATUSES = new Set([5, 6, 7, 12, 15]);
const first = (response) => (Array.isArray(response?.data) ? response.data[0] : response?.data) ?? null;
const isBlank = (v) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

function StatusNotice({ onboarding }) {
  const { t } = useAudienceTranslation("customer");
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

// Individual customer types with a KYC scheme: the levels, what each still
// misses (a missing item names its field; clicking jumps to it).
function KycLevelPanel({ kyc, onJump }) {
  const { t } = useAudienceTranslation("customer");
  const [expanded, setExpanded] = useState(() => new Set());
  if (!kyc) return null;
  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <div className="mb-4 rounded-xl border border-border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-700">{kyc.kyc_group_name ?? t("customer:kycLevels")}</span>
        <span className="text-[11px] text-muted-foreground">{t("customer:kycReachedAchieved", { reached: kyc.current_level_no || 0, achieved: kyc.achieved_level_no || 0 })}</span>
      </div>
      <div className="grid gap-2">
        {(kyc.levels ?? []).map((level) => {
          const id = level.kyc_level_id ?? level.level_no;
          const isOpen = expanded.has(id);
          const hasDetail = Boolean(level.description) || level.missing?.length > 0;
          return (
            <div key={id} className={`rounded-lg border p-2.5 text-xs ${level.achieved ? "border-emerald-200 bg-emerald-50" : "border-border bg-card"}`}>
              <button type="button" onClick={() => hasDetail && toggle(id)} disabled={!hasDetail} className="flex w-full items-center justify-between gap-2 text-left disabled:cursor-default">
                <span className="flex items-center gap-1.5 font-bold text-slate-700">
                  {level.achieved ? <ShieldCheck size={13} className="text-emerald-600" /> : <ShieldAlert size={13} className="text-muted-foreground" />}
                  {t("customer:levelNamed", { n: level.level_no, name: level.kyc_level_name })}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={level.met ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"}>{level.met ? t("customer:met") : t("customer:notYetMet")}</span>
                  {hasDetail && <ChevronDown size={13} className={`text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />}
                </span>
              </button>
              {isOpen && (
                <>
                  {level.description && <p className="mt-1 text-[11px] text-muted-foreground">{level.description}</p>}
                  {level.missing?.length > 0 && (
                    <ul className="mt-2 grid gap-1">
                      {level.missing.map((m, i) => (
                        <li key={i}>
                          <button
                            type="button"
                            onClick={() => m.field && onJump(m.field)}
                            className="flex w-full items-start gap-1.5 rounded-lg px-1.5 py-1 text-left text-[11px] font-medium text-amber-700 hover:bg-amber-100/60 hover:text-amber-900"
                          >
                            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                            {m.message}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// A section's saved answers as its draft: one object, or a list of rows for
// a repeatable one. A field's default_value fills a blank answer.
function seedOf(section) {
  if (!section) return null;
  const withDefaults = (row) => {
    const filled = { ...row };
    for (const f of section.fields ?? []) if (isBlank(filled[f.key]) && !isBlank(f.default_value)) filled[f.key] = f.default_value;
    return filled;
  };
  if (section.multi_row) return Array.isArray(section.values) && section.values.length ? section.values : [withDefaults({})];
  return withDefaults(section.values && !Array.isArray(section.values) ? section.values : {});
}

// Only the section's own fields go back, blanks left out.
function cleanRow(row, keys) {
  return Object.fromEntries(Object.entries(row ?? {}).filter(([k, v]) => keys.has(k) && !isBlank(v)));
}

// kind: "individual" | "corporate"; api: that kind's staff calls.
export function StaffOnboardingWizard({ kind, api, referenceId, forceReadOnly = false, onClose, onChanged }) {
  const { t } = useAudienceTranslation(["customer", "onboarding", "formBuilder", "common"]);
  const corporate = kind === "corporate";
  const [options, setOptions] = useState(null);
  const [pick, setPick] = useState({ type: null, email: "", phone_number: "", digital_product: "" });
  // The institution's Active digital products: the onboarding is sent with
  // one (X-Digital-Product-Id), picked here when there is more than one.
  const [products, setProducts] = useState([]);
  const [starting, setStarting] = useState(false);
  const [wizard, setWizard] = useState(null);
  // The customer or merchant behind these accounts: their deposits, limits
  // and transaction history are keyed by it.
  const owner = useAccountsOwner(wizard?.accounts);
  const [loading, setLoading] = useState(Boolean(referenceId));
  const [activeKey, setActiveKey] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitLevel, setSubmitLevel] = useState("");
  const [problems, setProblems] = useState([]);

  useEffect(() => {
    if (referenceId) return;
    api
      .options({})
      .then((r) => setOptions(first(r) ?? { party_types: [] }))
      .catch((error) => notifications.error(error.message));
    digitalProductApi("product")
      .getActive()
      .then((r) => setProducts((Array.isArray(r?.data) ? r.data : []).map((p) => ({ value: String(p.id ?? p.digital_product_id), label: p.name ?? p.product_name ?? p.code ?? String(p.id) }))))
      .catch(() => setProducts([]));
  }, [referenceId, api]);

  const applyWizard = (w) => {
    setWizard(w);
    if (w?.progress?.submit_level_no) setSubmitLevel(String(w.progress.submit_level_no));
  };

  useEffect(() => {
    if (!referenceId) return;
    setLoading(true);
    api
      .get(referenceId)
      .then((r) => {
        const w = first(r);
        applyWizard(w);
        setActiveKey(w?.progress?.next_section ?? w?.sections?.[0]?.key ?? null);
      })
      .catch((error) => notifications.error(error.message))
      .finally(() => setLoading(false));
  }, [referenceId, api]);

  const sections = wizard?.sections ?? [];
  // A rule can hide the section on screen: fall back to the next one due.
  const activeIndex = Math.max(0, sections.findIndex((s) => s.key === activeKey));
  const section = sections[activeIndex];
  const portalDraft = isPortalDraft(wizard?.onboarding);
  // Locked while a case decides it (16 Pending Review) and once rejected (17).
  const inCase = [16, 17].includes(Number(wizard?.onboarding?.status));
  const editable = !forceReadOnly && !portalDraft && !inCase && wizard?.onboarding?.editable !== false;
  const notEditableReason = forceReadOnly ? t("customer:viewingOnlyNothingCanBeChanged") : portalDraft ? t(PORTAL_DRAFT_REASON) : t("customer:recordCantBeEditedNow");

  // Reseed the draft during render whenever the section or the reply
  // changes, so the first render of a new section already has its shape.
  const seedKey = section ? `${section.key}:${wizard?.onboarding?.updated_time}` : null;
  const seedKeyRef = useRef(null);
  let effectiveDraft = draft;
  if (seedKeyRef.current !== seedKey) {
    seedKeyRef.current = seedKey;
    effectiveDraft = seedOf(section);
    setDraft(effectiveDraft);
  }
  const dirty = editable && effectiveDraft != null && JSON.stringify(effectiveDraft) !== JSON.stringify(seedOf(section));
  const { guard, dialog: unsavedDialog } = useUnsavedChangesGuard(dirty);

  // Start: individual picks a sub type ("No sub type" when the ownership's
  // own definition is published), corporate a company type.
  const ownership = options?.party_types?.[0]?.ownerships?.[0];
  const typeOptions = corporate
    ? (options?.party_types?.[0]?.company_types ?? []).map((c) => ({ value: String(c.id), label: c.name }))
    : [
        ...(ownership?.definition_id ? [{ value: "", label: t("onboarding:noSubTypeDefault") }] : []),
        ...(ownership?.sub_types ?? []).map((s) => ({ value: String(s.id), label: s.name })),
      ];
  const chosenType = pick.type ?? typeOptions[0]?.value ?? null;
  const chosenProduct = pick.digital_product || (products.length === 1 ? products[0].value : "");

  const beginOnboarding = async () => {
    if (chosenType === null || (corporate && !chosenType)) {
      notifications.error(t("onboarding:noPublishedDefinition"));
      return;
    }
    if (!pick.email.trim() && !pick.phone_number.trim()) {
      notifications.error(t("customer:atLeastOneOfEmailOrPhone"));
      return;
    }
    if (products.length > 1 && !chosenProduct) {
      notifications.error(t("accounts:chooseDigitalProduct"));
      return;
    }
    setStarting(true);
    try {
      const typeId = chosenType ? Number(chosenType) : null;
      const w = first(
        await api.add({
          ...(corporate ? { company_type_id: typeId } : { ownership_sub_type_id: typeId }),
          ...(pick.email.trim() ? { email: pick.email.trim() } : {}),
          ...(pick.phone_number.trim() ? { phone_number: pick.phone_number.trim() } : {}),
        }, { digitalProductId: chosenProduct }),
      );
      if (w?.notice) notifications.info(w.notice);
      applyWizard(w);
      setActiveKey(w?.progress?.next_section ?? w?.sections?.[0]?.key ?? null);
      onChanged?.();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setStarting(false);
    }
  };

  const setValue = (rowIndex, key, value) =>
    setDraft((prev) =>
      rowIndex === undefined
        ? { ...(Array.isArray(prev) ? {} : prev), [key]: value }
        : (Array.isArray(prev) ? prev : []).map((row, i) => (i === rowIndex ? { ...row, [key]: value } : row)),
    );
  const addRow = () => setDraft((prev) => [...(Array.isArray(prev) ? prev : []), seedOf({ ...section, multi_row: false, values: {} })]);
  const removeRow = (rowIndex) => setDraft((prev) => (Array.isArray(prev) ? prev : []).filter((_, i) => i !== rowIndex));
  const issueFor = (key, rowIndex) => section?.issues?.find((i) => i.field === key && (rowIndex === undefined || i.row === undefined || i.row === rowIndex))?.message;

  // A KYC item names a field: open its section and bring the field into view.
  const formRef = useRef(null);
  const sectionTitleRef = useRef(null);
  const [scrollTarget, setScrollTarget] = useState(null);
  const jumpToField = guard((fieldKey) => {
    const target = sections.find((s) => (s.fields ?? []).some((f) => f.key === fieldKey));
    if (!target) return;
    setActiveKey(target.key);
    setScrollTarget(fieldKey);
  });
  useEffect(() => {
    if (!scrollTarget) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const fieldEl = formRef.current?.querySelector(`[data-field="${CSS.escape(scrollTarget)}"]`);
      (fieldEl ?? sectionTitleRef.current)?.scrollIntoView({ behavior: "smooth", block: fieldEl ? "center" : "start" });
      if (fieldEl) {
        fieldEl.querySelector("input:not([disabled]), button:not([disabled])")?.focus({ preventScroll: true });
        fieldEl.classList.remove("field-flash");
        void fieldEl.offsetWidth;
        fieldEl.classList.add("field-flash");
      }
      setScrollTarget(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [scrollTarget, activeKey]);

  const persistSection = async () => {
    if (!section) return;
    setSaving(true);
    setProblems([]);
    const keys = new Set((section.fields ?? []).map((f) => f.key));
    const data = Array.isArray(effectiveDraft) ? effectiveDraft.map((row) => cleanRow(row, keys)).filter((row) => Object.keys(row).length) : cleanRow(effectiveDraft, keys);
    try {
      const w = first(
        await api.edit({
          reference_id: wizard.onboarding.reference_id,
          section_key: section.key,
          data,
          expected_updated_time: wizard.onboarding.updated_time,
        }),
      );
      applyWizard(w);
      notifications.success(t("customer:saved", { defaultValue: "Saved" }));
      onChanged?.();
      const next = w?.progress?.next_section;
      if (next && next !== section.key && (w.sections ?? []).some((s) => s.key === next)) setActiveKey(next);
    } catch (error) {
      notifications.error(error.message);
      if (Array.isArray(error.problems)) setProblems(error.problems);
      if (error.conflict) {
        const fresh = first(await api.get(wizard.onboarding.reference_id).catch(() => null));
        if (fresh) applyWizard(fresh);
      }
    } finally {
      setSaving(false);
    }
  };

  const submitForApproval = async () => {
    setSubmitting(true);
    setProblems([]);
    try {
      const w = first(
        await api.submit({
          reference_id: wizard.onboarding.reference_id,
          ...(!corporate && wizard.kyc && submitLevel ? { level_no: Number(submitLevel) } : {}),
        }),
      );
      if (w) applyWizard(w);
      else {
        const fresh = first(await api.get(wizard.onboarding.reference_id).catch(() => null));
        if (fresh) applyWizard(fresh);
      }
      notifications.success(t("customer:submittedForApproval", { defaultValue: "Submitted for approval" }));
      onChanged?.();
    } catch (error) {
      notifications.error(error.message);
      if (Array.isArray(error.problems)) setProblems(error.problems);
    } finally {
      setSubmitting(false);
    }
  };

  // A list narrowed by another field shows the choices whose parent is that
  // field's current answer (the row's, in a repeatable section).
  const choicesFor = (field, row) => {
    if (!field.parent_field) return field.choices ?? [];
    const parentValue = row?.[field.parent_field];
    if (isBlank(parentValue)) return [];
    return (field.choices ?? []).filter((c) => String(c.parent) === String(parentValue));
  };
  const fileFor = (field) =>
    field.field_type === "FILE"
      ? {
          upload: (file, side) => api.upload({ reference_id: wizard.onboarding.reference_id, field: field.key, ...(side ? { side } : {}), file }),
          download: (path) => api.file({ reference_id: wizard.onboarding.reference_id, path }),
        }
      : undefined;
  const levelNote = (field) => {
    if (!field.kyc_level_no) return null;
    const level = wizard?.kyc?.levels?.find((l) => l.level_no === field.kyc_level_no);
    return t("customer:neededFor", { level: level?.kyc_level_name ?? t("onboarding:levelN", { n: field.kyc_level_no }) });
  };

  const renderRow = (row, rowIndex) => (
    <div key={rowIndex ?? "single"} className={rowIndex === undefined ? "grid gap-4 sm:grid-cols-2" : "grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2"}>
      {(section.fields ?? []).map((field) => (
        <FieldPreview
          key={field.key}
          field={field}
          value={row?.[field.key]}
          choices={choicesFor(field, row)}
          disabled={!editable}
          issue={issueFor(field.key, rowIndex)}
          note={levelNote(field)}
          file={fileFor(field)}
          onChange={(v) => {
            setValue(rowIndex, field.key, v);
            // A child list's answer no longer fits once its parent changes.
            for (const child of section.fields ?? []) if (child.parent_field === field.key) setValue(rowIndex, child.key, "");
          }}
        />
      ))}
      {rowIndex !== undefined && editable && (
        <div className="sm:col-span-2">
          <button type="button" onClick={() => removeRow(rowIndex)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50">
            <Trash2 size={13} /> {t("onboarding:remove")}
          </button>
        </div>
      )}
    </div>
  );

  const body = () => {
    if (!referenceId && !wizard) {
      return (
        <div className="grid gap-4">
          <label className="text-sm font-semibold text-slate-700">
            {corporate ? t("onboarding:companyType") : t("onboarding:subType")} <span className="text-red-500">*</span>
            {options && !typeOptions.length ? (
              <p className="mt-1.5 rounded-xl border border-dashed p-3 text-xs font-normal text-muted-foreground">{t("onboarding:noPublishedDefinition")}</p>
            ) : (
              <FilterSelect className="mt-1.5" value={chosenType ?? ""} onChange={(v) => setPick({ ...pick, type: v })} options={typeOptions.length ? typeOptions : [{ value: "", label: "…" }]} />
            )}
          </label>
          {products.length > 1 && (
            <label className="text-sm font-semibold text-slate-700">
              {t("accounts:digitalProduct")} <span className="text-red-500">*</span>
              <FilterSelect className="mt-1.5" value={chosenProduct} onChange={(v) => setPick({ ...pick, digital_product: v })} options={[{ value: "", label: t("accounts:chooseDigitalProduct") }, ...products]} />
              <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("accounts:digitalProductHint")}</span>
            </label>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              {t("customer:email")}
              <input type="email" className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm" value={pick.email} onChange={(e) => setPick({ ...pick, email: e.target.value })} />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              {t("customer:phoneNumber")}
              <input type="tel" className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm" value={pick.phone_number} onChange={(e) => setPick({ ...pick, phone_number: e.target.value })} />
            </label>
          </div>
          <p className="text-[11px] text-muted-foreground">{t("customer:atLeastOneOfEmailOrPhone")}</p>
        </div>
      );
    }
    if (loading || !wizard) return <div className="flex justify-center py-10"><Spinner size={22} /></div>;
    if (!section) return <p className="py-6 text-center text-sm text-muted-foreground">{t("customer:thisCustomerTypeHasNoConfiguredSections")}</p>;

    const rows = Array.isArray(effectiveDraft) ? effectiveDraft : [];
    const canAddRow = editable && (!section.max_rows || rows.length < section.max_rows);
    return (
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {t("customer:requiredSectionsProgress", { done: wizard.progress?.sections_done ?? 0, required: wizard.progress?.sections_required ?? 0, percent: wizard.progress?.percent ?? 0 })}
          </div>
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-primary" style={{ width: `${wizard.progress?.percent ?? 0}%` }} />
          </div>
        </div>
        {!corporate && <KycLevelPanel kyc={wizard.kyc} onJump={jumpToField} />}
        <CustomerAccounts accounts={wizard.accounts} />
        <OwnerHistoryButton owner={owner} />
        <OwnerDeposits owner={owner} />
        <OwnerLimitUsage owner={owner} />
        <CustomerRiskPanel kind={kind} instProfileId={wizard.onboarding?.inst_profile_id} risk={wizard.risk} saved={wizard.risk_saved} />
        <CustomerAmlBadge aml={wizard.aml} customerKind={corporate ? "CORPORATE" : "INDIVIDUAL"} referenceId={wizard.onboarding?.reference_id} />
        <HorizontalStepper
          className="mb-4"
          steps={sections.map((s) => ({ id: s.key, label: s.heading ?? s.key }))}
          activeIndex={activeIndex}
          onStepClick={guard((index) => setActiveKey(sections[index]?.key))}
          isStepCompleted={(_, i) => sections[i]?.state === "complete"}
        />
        <div ref={sectionTitleRef} className="mb-3 scroll-mt-4">
          <h2 className="text-sm font-bold text-slate-700">
            {section.heading}
            {section.required === false && <span className="ml-2 text-[11px] font-normal text-muted-foreground">({t("formBuilder:optional")})</span>}
          </h2>
          {section.subheading && <p className="mt-0.5 text-xs text-muted-foreground">{section.subheading}</p>}
        </div>
        {!editable && !portalDraft && <p className="mb-3 rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">{notEditableReason}</p>}
        <div ref={formRef}>
          {section.multi_row ? (
            <div className="grid gap-3">
              {rows.map((row, i) => renderRow(row, i))}
              {canAddRow && (
                <button type="button" onClick={addRow} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-primary px-3 py-1.5 text-xs font-bold text-primary">
                  <Plus size={13} /> {t("formBuilder:addAnotherRow")}
                </button>
              )}
            </div>
          ) : (
            renderRow(effectiveDraft ?? {}, undefined)
          )}
        </div>
        {problems.length > 0 && (
          <ul className="mt-4 list-disc rounded-lg bg-red-50 p-3 pl-7 text-xs text-red-700">
            {problems.map((p, i) => (
              <li key={i}>{typeof p === "string" ? p : (p.message ?? JSON.stringify(p))}</li>
            ))}
          </ul>
        )}
        <StatusNotice onboarding={wizard.onboarding} />
        {portalDraft && <PortalDraftBanner />}
        {editable && wizard.progress?.ready_to_submit && (
          <div className="mt-4 rounded-lg bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-700">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <Check size={14} />
                {!corporate && wizard.kyc ? t("customer:requiredKycLevelReached") : t("customer:allRequiredSectionsAreComplete")}
              </span>
              <div className="flex items-center gap-2">
                {!corporate && wizard.kyc && (
                  <FilterSelect
                    className="w-40"
                    value={submitLevel}
                    onChange={setSubmitLevel}
                    options={(wizard.kyc.levels ?? []).filter((l) => l.achieved).map((l) => ({ value: String(l.level_no), label: t("customer:levelNamed", { n: l.level_no, name: l.kyc_level_name }) }))}
                  />
                )}
                <button type="button" disabled={submitting} onClick={() => void submitForApproval()} className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                  {submitting ? <Spinner size={12} /> : <Send size={13} />}
                  {t("customer:submitForApproval")}
                </button>
              </div>
            </div>
          </div>
        )}
        {editable && !corporate && wizard.kyc && !wizard.progress?.ready_to_submit && <div className="mt-4 rounded-lg bg-amber-50 p-2.5 text-xs font-semibold text-amber-700">{t("customer:theRequiredKycLevelHasnTBeen")}</div>}
      </div>
    );
  };

  const footer = () => {
    if (!referenceId && !wizard) {
      return (
        <>
          <Button variant="ghost" onClick={guard(onClose)}>{t("common:cancel")}</Button>
          <Button disabled={starting} onClick={() => void beginOnboarding()} loading={starting}>
            {t("customer:startOnboarding")}
          </Button>
        </>
      );
    }
    if (!wizard) return <Button variant="ghost" onClick={guard(onClose)}>{t("common:close")}</Button>;
    return (
      <>
        <Button variant="ghost" disabled={activeIndex === 0} onClick={guard(() => setActiveKey(sections[activeIndex - 1]?.key))}>
          <ArrowLeft size={14} /> {t("customer:previous")}
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" onClick={guard(onClose)}>{t("common:close")}</Button>
        {editable && (
          <Button disabled={saving} onClick={() => void persistSection()} loading={saving}>
            {t("customer:saveSection")}
          </Button>
        )}
        <button type="button" disabled={activeIndex >= sections.length - 1} onClick={guard(() => setActiveKey(sections[activeIndex + 1]?.key))} className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold text-primary disabled:opacity-40">
          {t("common:next")} <ArrowRight size={14} />
        </button>
      </>
    );
  };

  const customerType = wizard?.customer_type ?? {};
  const contact = wizard?.onboarding?.email || wizard?.onboarding?.phone_number || "";
  return (
    <Modal
      open
      onClose={guard(onClose)}
      title={
        wizard
          ? `${customerType.name ?? customerType.onboarding_definition_name ?? ""} — ${contact}${wizard.onboarding?.inst_profile_name && canChooseInstitution() ? ` · ${wizard.onboarding.inst_profile_name}` : ""}`
          : corporate
            ? t("customer:startCorporateOnboarding")
            : t("customer:startCustomerOnboarding")
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
