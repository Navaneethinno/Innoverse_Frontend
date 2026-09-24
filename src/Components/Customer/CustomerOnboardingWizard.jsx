import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, ArrowLeft, ArrowRight, Check, ChevronDown, Send, ShieldCheck, ShieldAlert } from "lucide-react";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { HorizontalStepper } from "@/Components/Common/HorizontalStepper";
import { notifications } from "@/Utils/Lib/notifications";
import { customerOnboardingApi, startOnboarding, loadWizard, saveSection } from "@/Services/Onboarding/customerOnboarding.api";
import { OnboardingField } from "./OnboardingField";
import { PORTAL_DRAFT_REASON, PortalDraftBanner, isPortalDraft } from "./customerPortal";
import { useUnsavedChangesGuard } from "@/Hooks/useUnsavedChangesGuard";

// State model per Customer_Onboarding_API.md §1.2: a plain "Draft"
// (status/process_status 9/9) needs no banner — the form itself makes that
// obvious. Everything else (pending, rejected, active, draft edit of an
// approved customer, inactive...) gets one, built from the row's own
// status_name/process_status_name rather than a hand-maintained code map,
// since the API now sends those labels translated.
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

// The KYC-level checklist (Customer_Onboarding_API.md §4.3 /
// Frontend_Changes §3): a customer type pointed at a KYC scheme can be
// onboarded level by level — the customer reaches the first level with
// only what it asks, and can come back later for a higher one.
// Requirements are cumulative (level 3 needs 1-3); limits/capabilities/
// processes are per level, shown as "what you can do" at the level
// currently reached.
function KycLevelPanel({ kyc, onJumpToSection }) {
  const { t } = useTranslation("customer");
  // Collapsed by default — each level card is just its own accordion
  // section (name + Met/Not yet met), expanding on click to reveal the
  // description and missing-requirements list. All that detail sitting
  // open by default (especially a long "Not yet met" reasons list) ate a
  // lot of vertical space above the actual step content for something the
  // user only needs to check occasionally.
  const [expanded, setExpanded] = useState(() => new Set());
  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  if (!kyc) return null;
  const levels = kyc.levels ?? [];
  return (
    <div className="mb-4 rounded-xl border border-border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-700">{kyc.kyc_group_name ?? t("customer:kycLevels")}</span>
        <span className="text-[11px] text-muted-foreground">
          {t("customer:kycReachedAchieved", { reached: kyc.current_level_no || 0, achieved: kyc.achieved_level_no || 0 })}
        </span>
      </div>
      <div className="grid gap-2">
        {levels.map((level) => {
          const isOpen = expanded.has(level.kyc_level_id);
          const hasDetail = Boolean(level.description) || level.missing?.length > 0;
          return (
            <div
              key={level.kyc_level_id}
              className={`rounded-lg border p-2.5 text-xs ${level.achieved ? "border-emerald-200 bg-emerald-50" : "border-border bg-card"}`}
            >
              <button
                type="button"
                onClick={() => hasDetail && toggle(level.kyc_level_id)}
                disabled={!hasDetail}
                className="flex w-full items-center justify-between gap-2 text-left disabled:cursor-default"
              >
                <span className="flex items-center gap-1.5 font-bold text-slate-700">
                  {level.achieved ? <ShieldCheck size={13} className="text-emerald-600" /> : <ShieldAlert size={13} className="text-muted-foreground" />}
                  {t("customer:levelNamed", { n: level.level_no, name: level.kyc_level_name })}
                  {level.is_entry_level && <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{t("customer:entry")}</span>}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={level.met ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"}>{level.met ? t("customer:met") : t("customer:notYetMet")}</span>
                  {hasDetail && (
                    <ChevronDown size={13} className={`text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  )}
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
                            onClick={() => m.section_code && onJumpToSection(m.section_code)}
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

// "needed for Basic" badge — kyc_level_no on a section/field/document type
// is the level that first requires it (guide §3.3); `mandatory` on the
// field itself still means required by the whole form regardless of level.
function KycLevelBadge({ levelNo, levels }) {
  const { t } = useTranslation("customer");
  if (!levelNo) return null;
  const level = levels?.find((l) => l.level_no === levelNo);
  return (
    <span className="ml-1.5 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600">
      {t("customer:neededFor", { level: level?.kyc_level_name ?? t("onboarding:levelN", { n: levelNo }) })}
    </span>
  );
}

// Runs a customer through the institution's published onboarding
// configuration, one section at a time, exactly as
// "Customer Onboarding (Individual) — Frontend Guide" describes it (§1).
// Nothing about the form is hard-coded: sections, fields, options and
// rules all come from `wizard.sections`, and every save re-renders from
// the server's recomputed reply rather than patching local state (§1, §5).
//
// `referenceId` (optional) resumes an existing onboarding straight into
// the section view; otherwise the picker (§2-3) runs first.
export function CustomerOnboardingWizard({ referenceId, forceReadOnly = false, onClose, onChanged }) {
  const { t } = useTranslation(["customer", "onboarding", "common"]);
  const [options, setOptions] = useState(null);
  const [pick, setPick] = useState({ party_type_id: "", ownership_id: "", ownership_sub_type_id: "", email: "", phone_number: "" });
  const [starting, setStarting] = useState(false);
  const [wizard, setWizard] = useState(null);
  const [loading, setLoading] = useState(Boolean(referenceId));
  const [activeSection, setActiveSection] = useState(0);
  // Local edits for the section on screen, seeded from `wizard.values` on
  // every load/save so a re-render from the server never loses what the
  // user just typed (this only ever holds THIS section's draft, replaced
  // wholesale each time the section changes).
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitLevel, setSubmitLevel] = useState("");

  useEffect(() => {
    if (referenceId) return;
    customerOnboardingApi
      .options({})
      .then((r) => setOptions((Array.isArray(r?.data) ? r.data[0] : r?.data) ?? { party_types: [] }))
      .catch((error) => notifications.error(error.message));
  }, [referenceId]);

  // Every reply that changes `progress` also re-suggests the level the
  // customer would be submitted at right now (submit_level_no) — keep the
  // picker in sync with it rather than a stale choice from before the edit.
  const applyWizard = (w) => {
    setWizard(w);
    if (w?.progress?.submit_level_no) setSubmitLevel(String(w.progress.submit_level_no));
  };

  useEffect(() => {
    if (!referenceId) return;
    setLoading(true);
    loadWizard(referenceId)
      .then(applyWizard)
      .catch((error) => notifications.error(error.message))
      .finally(() => setLoading(false));
  }, [referenceId]);

  const sections = wizard?.sections ?? [];
  const section = sections[activeSection];
  // Opened via the row's View action — no Save/Submit/Add-row controls at
  // all, regardless of what the onboarding's own editable flag allows.
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
  // itself changes (a fresh reply after save, or switching tabs) — done
  // synchronously during render, not in an effect. An effect only runs
  // AFTER the first render of the new section, so a single -> multi-row
  // step change (Contact -> Identification) would render once with
  // `draft` still holding the previous section's plain object, and
  // `draft.map(...)` on a non-array threw ("Oops! You're lost"). Deriving
  // it here means the very first render of a new section already has the
  // right shape.
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
  const ownerships = chosenParty?.ownerships ?? [];
  const chosenOwnership = ownerships.find((o) => String(o.id) === String(pick.ownership_id));
  const subTypes = chosenOwnership?.sub_types ?? [];

  const beginOnboarding = async () => {
    // Sub type is optional now (guide §4) — the backend refuses with "This
    // Ownership Has Sub Types: Choose One" when the ownership actually
    // requires picking one; the client no longer forces it up front.
    if (!pick.party_type_id || !pick.ownership_id) {
      notifications.error("Choose the party type and ownership");
      return;
    }
    if (!pick.email.trim() && !pick.phone_number.trim()) {
      notifications.error("Enter an email or a phone number");
      return;
    }
    setStarting(true);
    try {
      const w = await startOnboarding({
        party_type_id: Number(pick.party_type_id),
        ownership_id: Number(pick.ownership_id),
        ...(pick.ownership_sub_type_id ? { ownership_sub_type_id: Number(pick.ownership_sub_type_id) } : {}),
        ...(pick.email.trim() ? { email: pick.email.trim() } : {}),
        ...(pick.phone_number.trim() ? { phone_number: pick.phone_number.trim() } : {}),
      });
      if (w?.notice) notifications.info(w.notice);
      applyWizard(w);
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
  // Single-row sections update the one draft object; multi-row sections
  // update the row at `rowIndex`. Shared by renderRow so a section's type
  // picker and duplicate-field skip apply identically either way.
  const setValue = (rowIndex, fieldKey, value) =>
    rowIndex === undefined ? setFieldValue(fieldKey, value) : setRowValue(rowIndex, fieldKey, value);
  const addRow = () => setDraft((prev) => [...prev, {}]);
  const removeRow = (rowIndex) => setDraft((prev) => prev.filter((_, i) => i !== rowIndex));

  const issueFor = (fieldKey, rowIndex) =>
    section?.issues?.find((i) => i.field === fieldKey && (rowIndex === undefined || i.row === rowIndex))?.message;

  const jumpToSection = guard((code) => {
    const idx = sections.findIndex((s) => s.code === code);
    if (idx >= 0) setActiveSection(idx);
  });

  const persistSection = async () => {
    if (!section) return;
    setSaving(true);
    try {
      const w = await saveSection({
        reference_id: wizard.onboarding.reference_id,
        section_code: section.code,
        data: effectiveDraft,
        expected_updated_time: wizard.onboarding.updated_time,
      });
      applyWizard(w);
      notifications.success("Saved");
      onChanged?.();
      // Jump to wherever the server says to go next, when it isn't this one.
      const nextCode = w?.progress?.next_section;
      if (nextCode && nextCode !== section.code) {
        const idx = (w.sections ?? []).findIndex((s) => s.code === nextCode);
        if (idx >= 0) setActiveSection(idx);
      }
    } catch (error) {
      if (error.conflict) {
        notifications.error(error.message);
        const fresh = await loadWizard(wizard.onboarding.reference_id).catch(() => null);
        if (fresh) applyWizard(fresh);
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
      const response = await customerOnboardingApi.submit({
        reference_id: wizard.onboarding.reference_id,
        ...(wizard.kyc && submitLevel ? { level_no: Number(submitLevel) } : {}),
      });
      const w = Array.isArray(response?.data) ? response.data[0] : response?.data;
      if (w) applyWizard(w);
      else {
        const fresh = await loadWizard(wizard.onboarding.reference_id).catch(() => null);
        if (fresh) applyWizard(fresh);
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

  // The API sends the row's type both as `type_field`/`types` (the picker
  // below) and as an ordinary select inside `fields` with the same key —
  // rendering both asked for the same thing twice.
  const typeFieldCaption = (fields) => fields.find((f) => f.key === section.type_field)?.label ?? t("customer:type");
  const visibleFields = (fields) => (section.type_field ? fields.filter((f) => f.key !== section.type_field) : fields);

  // Address rows may carry "same_as" on their chosen type (Customer_
  // Onboarding_API.md §4.1/§5): instead of repeating an address's fields,
  // the row is marked same_as_address_type_id and takes that other
  // address's values at approval. Only offered when the current type's
  // own `same_as` list is non-empty (the configuration's allow_same_as).
  const sameAsTargets = (row) => {
    const currentType = section.types?.find((t) => t.id === row?.[section.type_field]);
    const eligible = currentType?.same_as ?? [];
    return (section.types ?? []).filter((t) => eligible.includes(t.id));
  };

  // Renders one row's fields — a multi-row section's row (with `rowIndex`)
  // or a single-row section's one-and-only "row" (`rowIndex` undefined).
  // Handles both the same way so the type picker and the skip-the-
  // duplicate-field rule (item 2) apply regardless of `multi_row`.
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
                ...(section.types ?? []).map((t) => ({
                  value: t.id,
                  label: (
                    <span className="flex items-center">
                      {t.name}
                      <KycLevelBadge levelNo={t.kyc_level_no} levels={wizard?.kyc?.levels} />
                    </span>
                  ),
                })),
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
            badge={<KycLevelBadge levelNo={field.kyc_level_no} levels={wizard?.kyc?.levels} />}
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
              onChange={(v) => setPick({ ...pick, party_type_id: v, ownership_id: "", ownership_sub_type_id: "" })}
              options={[{ value: "", label: t("onboarding:selectPartyType") }, ...partyTypes.map((p) => ({ value: p.id, label: p.name }))]}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            {t("onboarding:ownership")}
            <FilterSelect
              className="mt-1.5"
              value={pick.ownership_id}
              onChange={(v) => setPick({ ...pick, ownership_id: v, ownership_sub_type_id: "" })}
              options={[{ value: "", label: t("customer:selectOwnership") }, ...ownerships.map((o) => ({ value: o.id, label: o.name }))]}
            />
          </label>
          {subTypes.length > 0 && (
            <label className="text-sm font-semibold text-slate-700">
              {t("onboarding:subType")}
              <FilterSelect
                className="mt-1.5"
                value={pick.ownership_sub_type_id}
                onChange={(v) => setPick({ ...pick, ownership_sub_type_id: v })}
                options={[{ value: "", label: t("onboarding:noSubType") }, ...subTypes.map((s) => ({ value: s.id, label: s.name }))]}
              />
            </label>
          )}
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
        <KycLevelPanel kyc={wizard.kyc} onJumpToSection={jumpToSection} />
        <HorizontalStepper
          className="mb-4"
          steps={sections.map((s) => ({ id: s.code, label: s.label ?? s.name }))}
          activeIndex={activeSection}
          onStepClick={guard((index) => setActiveSection(index))}
          isStepCompleted={(_, i) => sections[i]?.state === "complete"}
        />
        <h2 className="mb-3 flex items-center text-sm font-bold text-slate-700">
          {section.label ?? section.name}
          <KycLevelBadge levelNo={section.kyc_level_no} levels={wizard?.kyc?.levels} />
        </h2>
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
        {/* With a KYC scheme, ready_to_submit means the level the customer
            must at least reach is met — not that the whole form is done
            (guide §3.4). complete=false then just means there's more the
            customer COULD fill in for a higher level, not that submitting
            now is blocked. */}
        {editable && wizard.progress.ready_to_submit && (
          <div className="mt-4 rounded-lg bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-700">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <Check size={14} />
                {wizard.kyc
                  ? wizard.progress.complete
                    ? t("customer:wholeFormComplete")
                    : t("customer:requiredKycLevelReached")
                  : t("customer:allRequiredSectionsAreComplete")}
              </span>
              <div className="flex items-center gap-2">
                {wizard.kyc && (
                  <FilterSelect
                    className="w-40"
                    value={submitLevel}
                    onChange={setSubmitLevel}
                    options={(wizard.kyc.levels ?? [])
                      .filter((l) => l.achieved)
                      .map((l) => ({ value: String(l.level_no), label: t("customer:levelNamed", { n: l.level_no, name: l.kyc_level_name }) }))}
                  />
                )}
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
          </div>
        )}
        {editable && wizard.kyc && !wizard.progress.ready_to_submit && (
          <div className="mt-4 rounded-lg bg-amber-50 p-2.5 text-xs font-semibold text-amber-700">
            {t("customer:theRequiredKycLevelHasnTBeen")}
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
