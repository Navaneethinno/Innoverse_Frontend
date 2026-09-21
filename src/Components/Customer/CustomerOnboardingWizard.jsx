import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { HorizontalStepper } from "@/Components/Common/HorizontalStepper";
import { notifications } from "@/Utils/Lib/notifications";
import { customerOnboardingApi, startOnboarding, loadWizard, saveSection } from "@/Services/Onboarding/customerOnboarding.api";
import { OnboardingField } from "./OnboardingField";

// Runs a customer through the institution's published onboarding
// configuration, one section at a time, exactly as
// "Customer Onboarding (Individual) — Frontend Guide" describes it (§1).
// Nothing about the form is hard-coded: sections, fields, options and
// rules all come from `wizard.sections`, and every save re-renders from
// the server's recomputed reply rather than patching local state (§1, §5).
//
// `referenceId` (optional) resumes an existing onboarding straight into
// the section view; otherwise the picker (§2-3) runs first.
export function CustomerOnboardingWizard({ referenceId, onClose, onChanged }) {
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

  useEffect(() => {
    if (referenceId) return;
    customerOnboardingApi
      .options({})
      .then((r) => setOptions((Array.isArray(r?.data) ? r.data[0] : r?.data) ?? { party_types: [] }))
      .catch((error) => notifications.error(error.message));
  }, [referenceId]);

  useEffect(() => {
    if (!referenceId) return;
    setLoading(true);
    loadWizard(referenceId)
      .then((w) => setWizard(w))
      .catch((error) => notifications.error(error.message))
      .finally(() => setLoading(false));
  }, [referenceId]);

  const sections = wizard?.sections ?? [];
  const section = sections[activeSection];

  // Reseed the section draft whenever the active section or the wizard
  // itself changes (a fresh reply after save, or switching tabs).
  useEffect(() => {
    if (!section) return;
    setDraft(section.multi_row ? (section.values?.length ? section.values : [{}]) : (section.values ?? {}));
  }, [section?.code, wizard]);

  const partyTypes = options?.party_types ?? [];
  const chosenParty = partyTypes.find((p) => String(p.id) === String(pick.party_type_id));
  const ownerships = chosenParty?.ownerships ?? [];
  const chosenOwnership = ownerships.find((o) => String(o.id) === String(pick.ownership_id));
  const subTypes = chosenOwnership?.sub_types ?? [];

  const beginOnboarding = async () => {
    if (!pick.party_type_id || !pick.ownership_id || !pick.ownership_sub_type_id) {
      notifications.error("Choose the party type, ownership and sub type");
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
        ownership_sub_type_id: Number(pick.ownership_sub_type_id),
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
    setDraft((prev) => {
      if (!section?.multi_row) return { ...prev, [fieldKey]: value };
      return prev;
    });
  };
  const setRowValue = (rowIndex, fieldKey, value) => {
    setDraft((prev) => prev.map((row, i) => (i === rowIndex ? { ...row, [fieldKey]: value } : row)));
  };
  const addRow = () => setDraft((prev) => [...prev, {}]);
  const removeRow = (rowIndex) => setDraft((prev) => prev.filter((_, i) => i !== rowIndex));

  const issueFor = (fieldKey, rowIndex) =>
    section?.issues?.find((i) => i.field === fieldKey && (rowIndex === undefined || i.row === rowIndex))?.message;

  const persistSection = async () => {
    if (!section) return;
    setSaving(true);
    try {
      const w = await saveSection({
        reference_id: wizard.onboarding.reference_id,
        section_code: section.code,
        data: draft,
        expected_updated_time: wizard.onboarding.updated_time,
      });
      setWizard(w);
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
        if (fresh) setWizard(fresh);
      } else {
        notifications.error(error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const fieldOptionsFor = (field, row) => {
    if (!field.parent_key) return field.options;
    const parentValue = row ? row[field.parent_key] : draft?.[field.parent_key];
    return (field.options ?? []).filter((o) => String(o.parent_id) === String(parentValue));
  };

  const renderRow = (fields, row, rowIndex) => (
    <div key={rowIndex} className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
      {section.type_field && (
        <div className="sm:col-span-2">
          <label className="block text-sm font-semibold text-slate-700">
            {section.name} type
            <FilterSelect
              className="mt-1.5"
              value={row[section.type_field] ?? ""}
              onChange={(v) => setRowValue(rowIndex, section.type_field, Number(v))}
              options={[{ value: "", label: "Select type" }, ...(section.types ?? []).map((t) => ({ value: t.id, label: t.name }))]}
            />
          </label>
        </div>
      )}
      {fields.map((field) => (
        <OnboardingField
          key={field.key}
          field={field}
          value={row[field.key]}
          options={fieldOptionsFor(field, row)}
          error={issueFor(field.key, rowIndex)}
          onChange={(v) => setRowValue(rowIndex, field.key, v)}
        />
      ))}
      {section.multi_row && (
        <div className="sm:col-span-2">
          <button
            type="button"
            onClick={() => removeRow(rowIndex)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
          >
            <Trash2 size={13} /> Remove
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
            Party type
            <FilterSelect
              className="mt-1.5"
              value={pick.party_type_id}
              onChange={(v) => setPick({ ...pick, party_type_id: v, ownership_id: "", ownership_sub_type_id: "" })}
              options={[{ value: "", label: "Select party type" }, ...partyTypes.map((p) => ({ value: p.id, label: p.name }))]}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Ownership
            <FilterSelect
              className="mt-1.5"
              value={pick.ownership_id}
              onChange={(v) => setPick({ ...pick, ownership_id: v, ownership_sub_type_id: "" })}
              options={[{ value: "", label: "Select ownership" }, ...ownerships.map((o) => ({ value: o.id, label: o.name }))]}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Sub type
            <FilterSelect
              className="mt-1.5"
              value={pick.ownership_sub_type_id}
              onChange={(v) => setPick({ ...pick, ownership_sub_type_id: v })}
              options={[{ value: "", label: "Select sub type" }, ...subTypes.map((s) => ({ value: s.id, label: s.name }))]}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Email
              <input
                type="email"
                className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
                value={pick.email}
                onChange={(e) => setPick({ ...pick, email: e.target.value })}
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Phone number
              <input
                type="text"
                className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
                value={pick.phone_number}
                onChange={(e) => setPick({ ...pick, phone_number: e.target.value })}
              />
            </label>
          </div>
          <p className="text-[11px] text-slate-400">At least one of email or phone. An existing onboarding for that contact resumes automatically.</p>
        </div>
      );
    }
    if (loading || !wizard) return <div className="flex justify-center py-10"><Spinner size={22} /></div>;
    if (!section) return <p className="py-6 text-center text-sm text-slate-500">This customer type has no configured sections.</p>;

    return (
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {wizard.progress.sections_done}/{wizard.progress.sections_required} required sections · {wizard.progress.percent}%
          </div>
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-primary" style={{ width: `${wizard.progress.percent}%` }} />
          </div>
        </div>
        <HorizontalStepper
          className="mb-4"
          steps={sections.map((s) => ({ id: s.code, label: s.name }))}
          activeIndex={activeSection}
          onStepClick={(_, i) => setActiveSection(i)}
          isStepCompleted={(_, i) => sections[i]?.state === "complete"}
        />
        {section.document_groups?.length > 0 && (
          <div className="mb-3 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-500">
            {section.document_groups.map((g) => (
              <div key={g.code}>{g.name}: at least {g.min_required} of these required{g.max_allowed ? `, up to ${g.max_allowed}` : ""}.</div>
            ))}
          </div>
        )}
        {section.multi_row ? (
          <div className="grid gap-3">
            {(draft ?? []).map((row, i) => renderRow(section.fields, row, i))}
            <button
              type="button"
              onClick={addRow}
              className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-primary px-3 py-1.5 text-xs font-bold text-primary"
            >
              <Plus size={13} /> Add {section.name.toLowerCase()}
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {section.fields.map((field) => (
              <OnboardingField
                key={field.key}
                field={field}
                value={draft?.[field.key]}
                options={fieldOptionsFor(field)}
                error={issueFor(field.key)}
                onChange={(v) => setFieldValue(field.key, v)}
              />
            ))}
          </div>
        )}
        {wizard.progress.ready_to_submit && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-700">
            <Check size={14} /> All required sections are complete. Submitting for approval isn't available yet.
          </div>
        )}
      </div>
    );
  };

  const footer = () => {
    if (!referenceId && !wizard) {
      return (
        <>
          <button type="button" onClick={onClose} className="px-3 py-2 text-sm font-bold text-slate-500">Cancel</button>
          <button
            type="button"
            disabled={starting}
            onClick={() => void beginOnboarding()}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {starting && <Spinner size={13} />}
            Start onboarding
          </button>
        </>
      );
    }
    if (!wizard) return <button type="button" onClick={onClose} className="px-3 py-2 text-sm font-bold text-slate-500">Close</button>;
    return (
      <>
        <button
          type="button"
          disabled={activeSection === 0}
          onClick={() => setActiveSection((i) => i - 1)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-slate-500 disabled:opacity-40"
        >
          <ArrowLeft size={14} /> Previous
        </button>
        <div className="flex-1" />
        <button type="button" onClick={onClose} className="px-3 py-2 text-sm font-bold text-slate-500">Close</button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void persistSection()}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving && <Spinner size={13} />}
          Save section
        </button>
        <button
          type="button"
          disabled={activeSection >= sections.length - 1}
          onClick={() => setActiveSection((i) => i + 1)}
          className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold text-primary disabled:opacity-40"
        >
          Next <ArrowRight size={14} />
        </button>
      </>
    );
  };

  return (
    <Modal open onClose={onClose} title={wizard ? `${wizard.customer_type.name} — ${wizard.onboarding.email || wizard.onboarding.phone_number}` : "Start customer onboarding"} size="xl" fixedHeight footer={footer()}>
      {body()}
    </Modal>
  );
}
