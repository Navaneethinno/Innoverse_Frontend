import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Layers, Plus } from "lucide-react";
import { Modal } from "@/Components/Common/Modal";
import { LoadingAnimation } from "@/Components/Common/LoadingAnimation";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { notifications, apiMessage } from "@/Utils/Lib/notifications";
import { kycSchemeApi, kycSchemeOps, rowsOf } from "@/Services/Epurse/onboarding.api";
import { LifecycleList } from "../../../Onboarding/OnboardingConfiguration/LifecycleList";
import { ListEditor, cleanConfig } from "../../../Onboarding/OnboardingConfiguration/ListEditor";
import { useOnboardingCatalog, useOnboardingMasters } from "../../../Onboarding/OnboardingConfiguration/onboardingHooks";
import { useFieldLibrary } from "../../../Onboarding/FormBuilder/formBuilderHooks";

import { Button } from "@/Components/Common/Button";
// KYC scheme wizard (guide §7): a scheme is a ladder of levels; save_config
// replaces ALL levels atomically, validate is a dry run of the submit checks.
// An approved scheme's levels are edited like any maker-checker record
// (handoff 7 Oct 2026): save_config keeps the edit in pending_config, the
// levels in force stay until a checker approves. Clone only starts a new
// scheme from an existing one.
// Draft, Rejected and Active (with or without a rejected edit) can be edited;
// only a never-approved one can be deleted.
const EDITABLE = [9, 5, 1, 6, 7, 12, 15];
const DELETABLE = [9, 5];
const isEditable = (row) => EDITABLE.includes(Number(row.process_status));
const isDeletable = (row) => DELETABLE.includes(Number(row.process_status)) && Number(row.status) !== 1;
const asOptions = (list, valueKey = "code", labelOf = (x) => `${x.name} (${x.code})`) =>
  (list ?? []).map((x) => ({ value: x[valueKey], label: labelOf(x) }));

// " · 3 customers, 1 merchant" for a level anyone holds.
function holdersText(holders, levelNo, t) {
  const h = holders.find((x) => Number(x.level_no) === Number(levelNo));
  if (!h || (!h.customers && !h.merchants)) return "";
  return ` · ${t("onboarding:holdersCount", { customers: h.customers ?? 0, merchants: h.merchants ?? 0 })}`;
}

// One level as the checker reads it.
function levelSummary(level, fieldName, t) {
  if (!level) return null;
  return [
    level.name,
    level.is_entry_level ? t("onboarding:entryLevel") : null,
    level.next_level_no ? t("onboarding:nextLevelN", { n: level.next_level_no }) : null,
    t("onboarding:fieldsList", { list: (level.fields ?? []).map((f) => fieldName(f.field_key)).join(", ") || "—" }),
    t("onboarding:docsChecksCaps", { docs: (level.documents ?? []).length, checks: (level.processes ?? []).length, caps: (level.capabilities ?? []).length }),
  ].filter(Boolean);
}

// The edit waiting for approval, level by level, next to the levels in force,
// with who holds each level (so the checker sees whom a change affects).
function PendingLevels({ inForce, proposed, holders, fieldName }) {
  const { t } = useTranslation(["onboarding", "common"]);
  const [open, setOpen] = useState(true);
  const numbers = [...new Set([...inForce, ...proposed].map((l) => Number(l.level_no)))].sort((a, b) => a - b);
  const byNo = (list, n) => list.find((l) => Number(l.level_no) === n);
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50/60">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
        <span className="text-sm font-bold text-amber-800">{t("onboarding:pendingLevelChanges")}</span>
        <span className="text-xs font-semibold text-amber-700">{open ? t("onboarding:hideCompare") : t("onboarding:showCompare")}</span>
      </button>
      {open && (
        <div className="overflow-x-auto border-t border-amber-200 p-3">
          <table className="w-full min-w-[36rem] text-xs">
            <thead className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-28 px-2 py-1.5">{t("onboarding:level")}</th>
                <th className="px-2 py-1.5">{t("onboarding:inForce")}</th>
                <th className="px-2 py-1.5">{t("onboarding:proposed")}</th>
              </tr>
            </thead>
            <tbody>
              {numbers.map((n) => {
                const before = levelSummary(byNo(inForce, n), fieldName, t);
                const after = levelSummary(byNo(proposed, n), fieldName, t);
                const changed = JSON.stringify(before) !== JSON.stringify(after);
                return (
                  <tr key={n} className={changed ? "bg-amber-100/60" : undefined}>
                    <td className="border-t border-amber-200 px-2 py-2 align-top">
                      <p className="font-bold">{t("onboarding:levelN", { n })}</p>
                      <p className="text-[10px] text-muted-foreground">{holdersText(holders, n, t).replace(/^ · /, "") || t("onboarding:noHolders")}</p>
                    </td>
                    {[before, after].map((lines, i) => (
                      <td key={i} className="border-t border-amber-200 px-2 py-2 align-top">
                        {lines ? (
                          lines.map((line, j) => (
                            <p key={j} className={j === 0 ? "font-semibold" : "text-slate-600"}>
                              {line}
                            </p>
                          ))
                        ) : (
                          <span className="italic text-muted-foreground">{t(i === 0 ? "onboarding:levelAdded" : "onboarding:levelRemoved")}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LevelsEditor({ scheme, onClose, onSaved, forceReadOnly = false }) {
  const { t } = useTranslation(["onboarding", "common"]);
  const catalog = useOnboardingCatalog();
  const { masters, loading: mastersLoading } = useOnboardingMasters();
  // A level asks for fields of the institution's form library, by key
  // (onboarding form builder handoff §6).
  const library = useFieldLibrary();
  const [levels, setLevels] = useState([]);
  const [inForce, setInForce] = useState(null);
  const [pending, setPending] = useState(null);
  const [holders, setHolders] = useState([]);
  const [saveError, setSaveError] = useState("");
  const [record, setRecord] = useState(scheme);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [problems, setProblems] = useState(null);
  // The row's own edit-ability (Draft/Rejected only) decides whether Save/
  // Validate exist at all — but clicking View (as opposed to the Levels
  // shortcut or Edit) must always land here read-only regardless of status,
  // same as every other maker-checker list's View action.
  const readOnly = forceReadOnly || !isEditable(record);
  const readOnlyReason =
    forceReadOnly && isEditable(record)
      ? t("onboarding:viewingOnly")
      : t("onboarding:schemeFrozenReason", { status: record.process_status_name ?? t("onboarding:frozen") });

  useEffect(() => {
    let cancelled = false;
    kycSchemeOps
      .get({ id: scheme.id })
      .then((response) => {
        if (cancelled) return;
        const data = rowsOf(response)[0] ?? {};
        setRecord(data.kyc_group ?? scheme);
        setInForce(data.config?.levels ?? []);
        setPending(data.pending_config?.levels ?? null);
        setHolders(Array.isArray(data.holders) ? data.holders : []);
        // The maker carries on with the edit waiting for approval.
        setLevels(data.pending_config?.levels ?? data.config?.levels ?? []);
      })
      .catch((error) => notifications.error(error.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [scheme]);

  const spec = useMemo(
    () => [
      { key: "level_no", label: t("onboarding:levelNumber"), type: "number", required: true },
      { key: "name", label: t("onboarding:name"), type: "text", required: true },
      { key: "description", label: t("common:description"), type: "text", wide: true },
      { key: "is_entry_level", label: t("onboarding:entryLevelExactlyOne"), type: "bool" },
      { key: "next_level_no", label: t("onboarding:nextLevelNumber"), type: "number", hint: t("onboarding:mustBeHigherThanThisLevelS") },
      { key: "upgrade_trigger_code", label: t("onboarding:upgradeTrigger"), type: catalog?.kyc_upgrade_triggers?.length ? "select" : "text", options: asOptions(catalog?.kyc_upgrade_triggers) },
      {
        key: "fields",
        label: t("onboarding:dataToCollect"),
        type: "list",
        addLabel: t("onboarding:addField"),
        itemTitle: (f) => library.rows.find((x) => x.key === f.field_key)?.name ?? (f.field_key || t("onboarding:newField")),
        spec: [
          { key: "field_key", label: t("onboarding:field"), type: "select", required: true, options: asOptions(library.rows, "key", (x) => `${x.name} (${x.key})`) },
          { key: "mandatory", label: t("onboarding:mandatory"), type: "bool" },
          { key: "sequence_no", label: t("onboarding:order"), type: "number" },
        ],
      },
      {
        key: "documents",
        label: t("onboarding:documentsRequired"),
        type: "list",
        addLabel: t("onboarding:addDocument"),
        itemTitle: (d) => d.document_type_code || t("onboarding:newDocument"),
        spec: [
          { key: "document_type_code", label: t("onboarding:documentType"), type: "select", required: true, options: asOptions(masters.document_type) },
          { key: "mandatory", label: t("onboarding:mandatory"), type: "bool" },
          { key: "back_required", label: t("onboarding:backRequired"), type: "bool" },
          { key: "verification_required", label: t("onboarding:verificationRequired"), type: "bool" },
          { key: "verification_method_code", label: t("onboarding:verificationMethod"), type: "select", showIf: (d) => d.verification_required, options: asOptions(masters.verification_method) },
        ],
      },
      {
        key: "processes",
        label: t("onboarding:checksThatMustPass"),
        type: "list",
        addLabel: t("onboarding:addCheck"),
        itemTitle: (p) => (catalog?.kyc_processes ?? []).find((x) => x.id === p.kyc_process_id)?.name ?? t("onboarding:newCheck"),
        spec: [
          { key: "kyc_process_id", label: t("onboarding:check"), type: "select", required: true, options: asOptions(catalog?.kyc_processes, "id", (x) => x.name ?? x.code) },
          { key: "mandatory", label: t("onboarding:mandatory"), type: "bool" },
          { key: "sequence_no", label: t("onboarding:order"), type: "number" },
        ],
      },
      {
        key: "capabilities",
        label: t("onboarding:whatTheCustomerMayDo"),
        type: "list",
        addLabel: t("onboarding:addCapability"),
        itemTitle: (c) => (catalog?.transactions ?? []).find((x) => x.id === c.transaction_id)?.name ?? t("onboarding:newCapability"),
        spec: [
          { key: "transaction_id", label: t("onboarding:transaction"), type: "select", required: true, options: asOptions(catalog?.transactions, "id", (x) => x.name ?? x.code) },
          { key: "allowed", label: t("onboarding:allowed"), type: "bool", defaultValue: true },
        ],
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalog, masters, library.rows],
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
  // Limits moved to Global Settings > Limit (a rule with a KYC_LEVEL
  // condition): a level no longer carries them, so none are sent.
  const payloadLevels = () => cleanConfig(levels.map(({ limits: _limits, ...level }) => level));

  // A refusal (e.g. removing a level customers hold) also shows next to Save.
  const save = () =>
    run("save", async () => {
      setSaveError("");
      try {
        const response = await kycSchemeOps.saveConfig({ id: record.id, config: { levels: payloadLevels() } });
        const saved = rowsOf(response)[0] ?? {};
        if (saved.pending_config) setPending(saved.pending_config.levels ?? []);
        notifications.success(apiMessage(response, t("onboarding:levelsSaved")));
        onSaved?.();
      } catch (error) {
        setSaveError(error.message);
        throw error;
      }
    });
  const validate = () =>
    run("validate", async () => {
      await kycSchemeOps.saveConfig({ id: record.id, config: { levels: payloadLevels() } });
      const result = rowsOf(await kycSchemeOps.validate({ id: record.id }))[0] ?? {};
      setProblems(result.problems ?? []);
      if (result.valid) notifications.success("Scheme is valid");
    });

  const fieldName = (key) => library.rows.find((x) => x.key === key)?.name ?? key;
  const ready = !loading && catalog && !mastersLoading && !library.loading;
  return (
    <Modal
      open
      onClose={onClose}
      title={t(readOnly ? "onboarding:viewKycLevelsTitle" : "onboarding:editKycLevelsTitle", { name: record.name ?? record.code })}
      size="xl"
      growWithContent
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common:close")}
          </Button>
          {!readOnly && (
            <>
              {saveError && <span className="mr-auto max-w-md text-xs font-semibold text-red-600">{saveError}</span>}
              <Button variant="secondary" disabled={Boolean(busy)} onClick={() => void validate()} loading={Boolean(busy === "validate")}>
                {t("onboarding:validate")}
              </Button>
              <Button disabled={Boolean(busy)} onClick={() => void save()} loading={Boolean(busy === "save")}>
                {t("onboarding:saveLevels")}
              </Button>
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
            <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">{readOnlyReason}</p>
          )}
          {pending && <PendingLevels inForce={inForce ?? []} proposed={pending} holders={holders} fieldName={fieldName} />}
          <ListEditor
            items={levels}
            onChange={setLevels}
            spec={spec}
            addLabel={t("onboarding:addLevel")}
            readOnly={readOnly}
            readOnlyReason={readOnlyReason}
            itemTitle={(l) => `${t("onboarding:levelN", { n: l.level_no ?? "?" })}${l.name ? ` — ${l.name}` : ""}${holdersText(holders, l.level_no, t)}`}
            emptyText={t("onboarding:noLevelsYetASchemeNeedsAt")}
          />
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

export function KycSchemes() {
  const { t } = useTranslation(["onboarding", "common"]);
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
      notifications.success(apiMessage(response, t("onboarding:schemeCloned")));
      setClone(null);
      reload();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: "code", label: t("onboarding:code"), render: (r) => <span className="font-semibold">{r.code}</span> },
    { key: "name", label: t("onboarding:name") },
    { key: "description", label: t("common:description"), render: (r) => r.description || "-" },
  ];
  const fieldClass = "mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm";

  return (
    <>
      <LifecycleList
        title={t("onboarding:kycSchemes")}
        subtitle={t("onboarding:aSchemeIsAnOrderedLadderOf")}
        api={kycSchemeApi}
        menuName="KYC Schemes"
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
        canDeleteRow={isDeletable}
        addButton={
          <Button size="sm" onClick={() => setForm({ code: "", name: "", description: "" })}>
            <Plus size={14} /> Add KYC scheme
          </Button>
        }
        renderExtra={(row) => (
          <>
            <UiTooltip label={t("onboarding:levels")}>
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
              <UiTooltip label={t("onboarding:clone")}>
                <button type="button" onClick={() => setClone({ source: row, code: "", name: `${row.name} (copy)` })} className="rounded-lg p-1.5 text-violet-700 hover:bg-violet-50">
                  <Copy size={14} />
                </button>
              </UiTooltip>
            )}
          </>
        )}
        emptyTitle={t("onboarding:noKycSchemesYet")}
      />

      {form && (
        <Modal
          open
          onClose={() => setForm(null)}
          title={t("onboarding:addKycScheme")}
          footer={
            <>
              <Button variant="ghost" onClick={() => setForm(null)}>
                {t("common:cancel")}
              </Button>
              <Button disabled={saving} onClick={() => void create()} loading={saving}>
                {t("onboarding:createAndDefineLevels")}
              </Button>
            </>
          }
        >
          <div className="grid gap-4">
            <label className="text-sm font-semibold text-slate-700">
              {t("onboarding:code")}
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") })} className={`${fieldClass} font-mono`} placeholder="STANDARD_KYC" />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              {t("onboarding:name")}
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              {t("common:description")}
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5 min-h-20 w-full rounded-xl border p-3 text-sm" />
            </label>
          </div>
        </Modal>
      )}
      {clone && (
        <Modal
          open
          onClose={() => setClone(null)}
          title={t("onboarding:cloneTitle", { name: clone.source.name })}
          footer={
            <>
              <Button variant="ghost" onClick={() => setClone(null)}>
                {t("common:cancel")}
              </Button>
              <Button disabled={saving} onClick={() => void doClone()} loading={saving}>
                {t("onboarding:clone")}
              </Button>
            </>
          }
        >
          <p className="mb-3 text-xs text-muted-foreground">{t("onboarding:copiesTheSchemeAndAllItsLevels")}</p>
          <div className="grid gap-4">
            <label className="text-sm font-semibold text-slate-700">
              {t("onboarding:newCode")}
              <input value={clone.code} onChange={(e) => setClone({ ...clone, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") })} className={`${fieldClass} font-mono`} />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              {t("onboarding:newName")}
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
