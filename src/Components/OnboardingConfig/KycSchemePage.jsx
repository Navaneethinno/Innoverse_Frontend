import { useEffect, useMemo, useState } from "react";
import { Copy, Layers, Plus } from "lucide-react";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { LoadingAnimation } from "@/Components/Common/LoadingAnimation";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { notifications, apiMessage } from "@/Utils/Lib/notifications";
import { kycSchemeApi, kycSchemeOps, rowsOf } from "@/Services/Onboarding/onboarding.api";
import { LifecycleList } from "./LifecycleList";
import { ListEditor, cleanConfig } from "./ListEditor";
import { useOnboardingCatalog, useOnboardingMasters } from "./onboardingHooks";

// KYC scheme wizard (guide §7): a scheme is a ladder of levels; save_config
// replaces ALL levels atomically, validate is a dry run of the submit checks,
// clone copies an approved (frozen) scheme into a new Draft under a new code.
const EDITABLE = [9, 5];
const isEditable = (row) => EDITABLE.includes(Number(row.process_status));
const asOptions = (list, valueKey = "code", labelOf = (x) => `${x.name} (${x.code})`) =>
  (list ?? []).map((x) => ({ value: x[valueKey], label: labelOf(x) }));

function LevelsEditor({ scheme, onClose, onSaved, forceReadOnly = false }) {
  const catalog = useOnboardingCatalog();
  const { masters, loading: mastersLoading } = useOnboardingMasters();
  const [levels, setLevels] = useState([]);
  const [record, setRecord] = useState(scheme);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [problems, setProblems] = useState(null);
  // The row's own edit-ability (Draft/Rejected only) decides whether Save/
  // Validate exist at all — but clicking View (as opposed to the Levels
  // shortcut or Edit) must always land here read-only regardless of status,
  // same as every other maker-checker list's View action.
  const readOnly = forceReadOnly || !isEditable(record);

  useEffect(() => {
    let cancelled = false;
    kycSchemeOps
      .get({ id: scheme.id })
      .then((response) => {
        if (cancelled) return;
        const data = rowsOf(response)[0] ?? {};
        setRecord(data.kyc_group ?? scheme);
        setLevels(data.config?.levels ?? []);
      })
      .catch((error) => notifications.error(error.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [scheme]);

  const limitTypes = catalog?.limit_types ?? [];
  const limitType = (code) => limitTypes.find((t) => t.code === code);
  const spec = useMemo(
    () => [
      { key: "level_no", label: "Level number", type: "number", required: true },
      { key: "name", label: "Name", type: "text", required: true },
      { key: "description", label: "Description", type: "text", wide: true },
      { key: "is_entry_level", label: "Entry level (exactly one)", type: "bool" },
      { key: "next_level_no", label: "Next level number", type: "number", hint: "Must be higher than this level's own number." },
      { key: "upgrade_trigger_code", label: "Upgrade trigger", type: "select", options: asOptions(catalog?.kyc_upgrade_triggers) },
      {
        key: "fields",
        label: "Data to collect",
        type: "list",
        addLabel: "Add field",
        itemTitle: (f) => f.field_code || "New field",
        spec: [
          { key: "field_code", label: "Field", type: "select", required: true, options: asOptions(catalog?.fields) },
          { key: "mandatory", label: "Mandatory", type: "bool" },
          { key: "sequence_no", label: "Order", type: "number" },
        ],
      },
      {
        key: "documents",
        label: "Documents required",
        type: "list",
        addLabel: "Add document",
        itemTitle: (d) => d.document_type_code || "New document",
        spec: [
          { key: "document_type_code", label: "Document type", type: "select", required: true, options: asOptions(masters.document_type) },
          { key: "mandatory", label: "Mandatory", type: "bool" },
          { key: "back_required", label: "Back required", type: "bool" },
          { key: "verification_required", label: "Verification required", type: "bool" },
          { key: "verification_method_code", label: "Verification method", type: "select", showIf: (d) => d.verification_required, options: asOptions(masters.verification_method) },
        ],
      },
      {
        key: "processes",
        label: "Checks that must pass",
        type: "list",
        addLabel: "Add check",
        itemTitle: (p) => (catalog?.kyc_processes ?? []).find((x) => x.id === p.kyc_process_id)?.name ?? "New check",
        spec: [
          { key: "kyc_process_id", label: "Check", type: "select", required: true, options: asOptions(catalog?.kyc_processes, "id", (x) => x.name ?? x.code) },
          { key: "mandatory", label: "Mandatory", type: "bool" },
          { key: "sequence_no", label: "Order", type: "number" },
        ],
      },
      {
        key: "limits",
        label: "Limits",
        type: "list",
        addLabel: "Add limit",
        itemTitle: (l) => l.limit_type_code || "New limit",
        spec: [
          { key: "limit_type_code", label: "Limit type", type: "select", required: true, options: asOptions(limitTypes) },
          { key: "currency_code", label: "Currency (ISO code)", type: "text", showIf: (l) => limitType(l.limit_type_code)?.has_amount, hint: 'e.g. "INR"' },
          { key: "max_amount", label: "Max amount", type: "number", showIf: (l) => limitType(l.limit_type_code)?.has_amount },
          { key: "max_count", label: "Max count", type: "number", showIf: (l) => limitType(l.limit_type_code)?.has_count },
        ],
      },
      {
        key: "capabilities",
        label: "What the customer may do",
        type: "list",
        addLabel: "Add capability",
        itemTitle: (c) => (catalog?.transactions ?? []).find((x) => x.id === c.transaction_id)?.name ?? "New capability",
        spec: [
          { key: "transaction_id", label: "Transaction", type: "select", required: true, options: asOptions(catalog?.transactions, "id", (x) => x.name ?? x.code) },
          { key: "allowed", label: "Allowed", type: "bool", defaultValue: true },
        ],
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalog, masters],
  );

  const run = async (label, work) => {
    setBusy(label);
    try {
      return await work();
    } catch (error) {
      notifications.error(error.message);
      return undefined;
    } finally {
      setBusy(null);
    }
  };
  // Amount limits carry a currency and no count; count limits the reverse
  // (guide §7) — drop whichever the chosen type doesn't take.
  const payloadLevels = () =>
    cleanConfig(
      levels.map((level) => ({
        ...level,
        limits: (level.limits ?? []).map((l) => {
          const type = limitType(l.limit_type_code);
          return {
            limit_type_code: l.limit_type_code,
            ...(type?.has_amount ? { currency_code: l.currency_code, max_amount: l.max_amount } : {}),
            ...(type?.has_count ? { max_count: l.max_count } : {}),
          };
        }),
      })),
    );

  const save = () =>
    run("save", async () => {
      await kycSchemeOps.saveConfig({ id: record.id, config: { levels: payloadLevels() } });
      notifications.success("Levels saved");
      onSaved?.();
    });
  const validate = () =>
    run("validate", async () => {
      await kycSchemeOps.saveConfig({ id: record.id, config: { levels: payloadLevels() } });
      const result = rowsOf(await kycSchemeOps.validate({ id: record.id }))[0] ?? {};
      setProblems(result.problems ?? []);
      if (result.valid) notifications.success("Scheme is valid");
    });

  const ready = !loading && catalog && !mastersLoading;
  return (
    <Modal
      open
      onClose={onClose}
      title={`${readOnly ? "View" : "Edit"} KYC levels — ${record.name ?? record.code}`}
      size="xl"
      growWithContent
      footer={
        <>
          <button type="button" onClick={onClose} className="px-3 py-2 text-sm font-bold text-muted-foreground">
            Close
          </button>
          {!readOnly && (
            <>
              <button type="button" disabled={Boolean(busy)} onClick={() => void validate()} className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-50">
                {busy === "validate" && <Spinner size={13} />}
                Validate
              </button>
              <button type="button" disabled={Boolean(busy)} onClick={() => void save()} className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                {busy === "save" && <Spinner size={13} />}
                Save levels
              </button>
            </>
          )}
        </>
      }
    >
      {!ready ? (
        <div className="flex justify-center py-12">
          <LoadingAnimation className="h-16 w-48" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {readOnly && (
            <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
              {forceReadOnly && isEditable(record)
                ? "Viewing only."
                : `This scheme is ${record.process_status_name ?? "frozen"} and can't be changed. Clone it into a new Draft to make changes.`}
            </p>
          )}
          <ListEditor items={levels} onChange={setLevels} spec={spec} addLabel="Add level" readOnly={readOnly} itemTitle={(l) => `Level ${l.level_no ?? "?"}${l.name ? ` — ${l.name}` : ""}`} emptyText="No levels yet. A scheme needs at least one entry level." />
          {problems && (
            <div className={`rounded-xl border p-4 ${problems.length ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
              <p className={`text-sm font-bold ${problems.length ? "text-red-700" : "text-emerald-700"}`}>{problems.length ? `${problems.length} problem(s)` : "No problems found"}</p>
              {problems.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-sm text-red-700">
                  {problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export function KycSchemePage() {
  const [form, setForm] = useState(null);
  const [clone, setClone] = useState(null);
  const [editor, setEditor] = useState(null);
  const [editorReadOnly, setEditorReadOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  const create = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      notifications.error("Code and name are required");
      return;
    }
    setSaving(true);
    try {
      const response = await kycSchemeApi.add({ code: form.code.trim().toUpperCase(), name: form.name.trim(), description: form.description, is_draft: true });
      notifications.success(apiMessage(response, "KYC scheme created"));
      setForm(null);
      reload();
      // Straight on to step 2 — defining the levels.
      const created = rowsOf(response)[0];
      if (created) {
        setEditorReadOnly(false);
        setEditor(created);
      }
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setSaving(false);
    }
  };
  const doClone = async () => {
    if (!clone.code.trim() || !clone.name.trim()) {
      notifications.error("A new code and name are required");
      return;
    }
    setSaving(true);
    try {
      const response = await kycSchemeOps.clone({ id: clone.source.id, code: clone.code.trim().toUpperCase(), name: clone.name.trim() });
      notifications.success(apiMessage(response, "Scheme cloned into a new Draft"));
      setClone(null);
      reload();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: "code", label: "Code", render: (r) => <span className="font-semibold">{r.code}</span> },
    { key: "name", label: "Name" },
    { key: "description", label: "Description", render: (r) => r.description || "-" },
  ];
  const fieldClass = "mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm";

  return (
    <>
      <LifecycleList
        title="KYC Schemes"
        subtitle="A scheme is an ordered ladder of KYC levels. Approve a scheme before pointing a customer-type version at it."
        api={kycSchemeApi}
        menuName="KYC Scheme|Group"
        columns={columns}
        reloadKey={reloadKey}
        onEdit={(row) => {
          setEditorReadOnly(false);
          setEditor(row);
        }}
        onView={(row) => {
          setEditorReadOnly(true);
          setEditor(row);
        }}
        canEditRow={isEditable}
        canDeleteRow={isEditable}
        addButton={
          <button type="button" onClick={() => setForm({ code: "", name: "", description: "" })} className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white">
            <Plus size={14} /> Add KYC scheme
          </button>
        }
        renderExtra={(row) => (
          <>
            <UiTooltip label="Levels">
              <button
                type="button"
                onClick={() => {
                  setEditorReadOnly(!isEditable(row));
                  setEditor(row);
                }}
                className="rounded-lg p-1.5 text-cyan-700 hover:bg-cyan-50"
              >
                <Layers size={14} />
              </button>
            </UiTooltip>
            {Number(row.status) === 1 && (
              <UiTooltip label="Clone">
                <button type="button" onClick={() => setClone({ source: row, code: "", name: `${row.name} (copy)` })} className="rounded-lg p-1.5 text-violet-700 hover:bg-violet-50">
                  <Copy size={14} />
                </button>
              </UiTooltip>
            )}
          </>
        )}
        emptyTitle="No KYC schemes yet"
      />

      {form && (
        <Modal
          open
          onClose={() => setForm(null)}
          title="Add KYC scheme"
          footer={
            <>
              <button type="button" onClick={() => setForm(null)} className="px-3 py-2 text-sm font-bold text-muted-foreground">
                Cancel
              </button>
              <button type="button" disabled={saving} onClick={() => void create()} className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                {saving && <Spinner size={13} />}
                Create &amp; define levels
              </button>
            </>
          }
        >
          <div className="grid gap-4">
            <label className="text-sm font-semibold text-slate-700">
              Code
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") })} className={`${fieldClass} font-mono`} placeholder="STANDARD_KYC" />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Description
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5 min-h-20 w-full rounded-xl border p-3 text-sm" />
            </label>
          </div>
        </Modal>
      )}
      {clone && (
        <Modal
          open
          onClose={() => setClone(null)}
          title={`Clone ${clone.source.name}`}
          footer={
            <>
              <button type="button" onClick={() => setClone(null)} className="px-3 py-2 text-sm font-bold text-muted-foreground">
                Cancel
              </button>
              <button type="button" disabled={saving} onClick={() => void doClone()} className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                {saving && <Spinner size={13} />}
                Clone
              </button>
            </>
          }
        >
          <p className="mb-3 text-xs text-muted-foreground">Copies the scheme and all its levels into a new Draft under a new code.</p>
          <div className="grid gap-4">
            <label className="text-sm font-semibold text-slate-700">
              New code
              <input value={clone.code} onChange={(e) => setClone({ ...clone, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") })} className={`${fieldClass} font-mono`} />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              New name
              <input value={clone.name} onChange={(e) => setClone({ ...clone, name: e.target.value })} className={fieldClass} />
            </label>
          </div>
        </Modal>
      )}
      {editor && (
        <LevelsEditor scheme={editor} onClose={() => setEditor(null)} onSaved={reload} forceReadOnly={editorReadOnly} />
      )}
    </>
  );
}
