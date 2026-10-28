import { ListTable } from "@/Components/Common/ListView";
import { useServerList } from "@/Hooks/useServerList";
import { PageTitle } from "@/Components/Common/PageTitle";
import { useEffect, useState } from "react";
import { Languages, Pencil, Plus, Trash2 } from "lucide-react";
import { useAudienceTranslation } from "@/Hooks/useAudienceTranslation";
import { usePagePermission } from "@/Hooks/usePermission";
import { Modal } from "@/Components/Common/Modal";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { NoAccess } from "@/Components/Common/NoAccess";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { formFieldApi, rowsOf } from "@/Services/Epurse/onboarding.api";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { FieldOptionsEditor, inputClass } from "./FieldOptionsEditor";
import { TranslationFields, TranslationsModal, cleanTranslations, useTranslationLanguages } from "./Translations";
import { KEY_PATTERN, keyFromName, useFieldLibrary, useFieldTypes } from "./formBuilderHooks";

import { Button } from "@/Components/Common/Button";
const EMPTY = { key: "", name: "", field_type: "TEXT", label: "", hint: "", help_text: "", required: false, read_only: false, default_value: "", options: {} };

// PIN (Form Builder PIN handoff): digits only, 4 to 12 long, typed twice;
// any digits are accepted (3 Oct 2026). Only a hash is stored.
const PIN_DEFAULTS = { min_length: 4, max_length: 6, confirm: true };

// The options the server would refuse, caught before saving: a liveness
// capture is a single image, and a PIN is 4 to 12 digits with min <= max.
function optionProblem(type, options) {
  if (type === "FILE" && options.capture === "liveness" && options.sides === "front_back") return "livenessSingleSide";
  if (type === "PIN") {
    const min = Number(options.min_length ?? PIN_DEFAULTS.min_length);
    const max = Number(options.max_length ?? PIN_DEFAULTS.max_length);
    if (![min, max].every((n) => Number.isInteger(n) && n >= 4 && n <= 12)) return "pinLengthRange";
    if (min > max) return "pinMinAboveMax";
  }
  return null;
}

// Add / edit one library field (§4.2). The key is chosen once and never
// changes; the type's options are drawn from the vocabulary. On edit only
// what changed is sent.
function FieldFormModal({ record, vocabulary, libraryFields, readOnly, onClose, onSaved }) {
  const { t } = useAudienceTranslation(["formBuilder", "common"]);
  const editing = Boolean(record?.id);
  const [form, setForm] = useState(() => (editing ? { ...EMPTY, ...record, options: record.options ?? {} } : EMPTY));
  const [keyTouched, setKeyTouched] = useState(editing);
  const [usedBy, setUsedBy] = useState(null);
  const [busy, setBusy] = useState(false);
  const typeDef = vocabulary?.types?.find((x) => x.type === form.field_type);
  const { languages } = useTranslationLanguages();

  useEffect(() => {
    if (!editing) return;
    formFieldApi
      .get({ id: record.id })
      .then((response) => {
        const full = rowsOf(response)[0];
        if (!full) return;
        setForm((current) => ({ ...current, ...full, options: full.options ?? {} }));
        setUsedBy(full.used_by_sections ?? []);
      })
      .catch((error) => notifications.error(error.message));
  }, [editing, record?.id]);

  const set = (patch) => setForm((current) => ({ ...current, ...patch }));
  const setName = (name) => set({ name, ...(keyTouched ? {} : { key: keyFromName(name) }) });
  // A new type takes its own options: the old ones don't apply.
  // A PIN starts with the server's defaults and has no placeholder or
  // default value (it is a secret the customer chooses).
  const setType = (field_type) =>
    set(field_type === "PIN" ? { field_type, options: { ...PIN_DEFAULTS }, hint: "", default_value: "" } : { field_type, options: {} });
  const isPin = form.field_type === "PIN";
  const problem = optionProblem(form.field_type, form.options ?? {});

  const keyValid = KEY_PATTERN.test(form.key);
  const canSave = !readOnly && keyValid && form.name.trim() && form.label.trim() && form.field_type && !problem;

  const save = async () => {
    setBusy(true);
    try {
      const common = {
        name: form.name.trim(),
        field_type: form.field_type,
        label: form.label.trim(),
        hint: isPin ? "" : form.hint,
        help_text: form.help_text,
        required: Boolean(form.required),
        read_only: Boolean(form.read_only),
        default_value: isPin ? "" : form.default_value,
        options: form.options ?? {},
        // Every language's texts, replacing the saved ones.
        translations: cleanTranslations(form.translations),
      };
      let response;
      if (editing) {
        const changed = Object.fromEntries(Object.entries(common).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(record[k] ?? EMPTY[k])));
        if (changed.field_type && !changed.options) changed.options = common.options;
        response = await formFieldApi.edit({ id: record.id, ...changed });
      } else {
        response = await formFieldApi.add({ key: form.key, ...common });
      }
      notifications.success(apiMessage(response, t("formBuilder:fieldSaved")));
      onSaved();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const typeOptions = (vocabulary?.types ?? []).map((x) => ({ value: x.type, label: x.name ?? x.type }));
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={readOnly ? t("formBuilder:viewField") : editing ? t("formBuilder:editField") : t("formBuilder:addField")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {readOnly ? t("common:close") : t("common:cancel")}
          </Button>
          {!readOnly && (
            <Button disabled={!canSave || busy} onClick={() => void save()} loading={busy}>
              {t("common:save")}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            {t("formBuilder:staffName")} <span className="text-red-500">*</span>
            <input className={inputClass} disabled={readOnly} value={form.name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            {t("formBuilder:key")} <span className="text-red-500">*</span>
            <input
              className={`${inputClass} font-mono`}
              disabled={readOnly || editing}
              value={form.key}
              onChange={(e) => {
                setKeyTouched(true);
                set({ key: e.target.value.toLowerCase() });
              }}
            />
            <span className={`mt-1 block text-[11px] font-normal ${form.key && !keyValid ? "text-red-600" : "text-muted-foreground"}`}>
              {editing ? t("formBuilder:keyNeverChanges") : t("formBuilder:keyRule")}
            </span>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            {t("formBuilder:fieldType")} <span className="text-red-500">*</span>
            <FilterSelect className="mt-1.5" disabled={readOnly} value={form.field_type} onChange={setType} options={typeOptions.length ? typeOptions : [{ value: form.field_type, label: form.field_type }]} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            {t("formBuilder:question")} <span className="text-red-500">*</span>
            <input className={inputClass} disabled={readOnly} value={form.label} onChange={(e) => set({ label: e.target.value })} />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("formBuilder:questionHint")}</span>
          </label>
          {!isPin && (
          <label className="text-sm font-semibold text-slate-700">
            {t("formBuilder:placeholder")}
            <input className={inputClass} disabled={readOnly} value={form.hint ?? ""} onChange={(e) => set({ hint: e.target.value })} />
          </label>
          )}
          <label className="text-sm font-semibold text-slate-700">
            {t("formBuilder:helpText")}
            <input className={inputClass} disabled={readOnly} value={form.help_text ?? ""} onChange={(e) => set({ help_text: e.target.value })} />
          </label>
          {!isPin && (
          <label className="text-sm font-semibold text-slate-700">
            {t("formBuilder:defaultValue")}
            <input className={inputClass} disabled={readOnly} value={form.default_value ?? ""} onChange={(e) => set({ default_value: e.target.value })} />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("formBuilder:defaultValueHint")}</span>
          </label>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <CheckboxPill checked={Boolean(form.required)} disabled={readOnly} onChange={(on) => set({ required: on })} label={t("formBuilder:required")} />
            <CheckboxPill checked={Boolean(form.read_only)} disabled={readOnly} onChange={(on) => set({ read_only: on })} label={t("formBuilder:readOnly")} />
          </div>
        </div>
        {typeDef?.options?.length > 0 && (
          <div className="rounded-2xl border bg-muted/40 p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("formBuilder:typeOptions", { type: typeDef.name ?? typeDef.type })}</h3>
            <FieldOptionsEditor typeDef={typeDef} value={form.options} onChange={(options) => set({ options })} vocabulary={vocabulary} libraryFields={libraryFields} selfKey={form.key} disabled={readOnly} />
            {isPin && <p className="mt-3 text-[11px] text-muted-foreground">{t("formBuilder:pinSecretHint")}</p>}
            {problem && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{t(`formBuilder:${problem}`)}</p>}
          </div>
        )}
        <TranslationFields
          languages={languages}
          disabled={readOnly}
          value={form.translations ?? {}}
          onChange={(translations) => set({ translations })}
          texts={[
            { key: "label", label: t("formBuilder:question"), english: form.label },
            ...(isPin ? [] : [{ key: "hint", label: t("formBuilder:placeholder"), english: form.hint }]),
            { key: "help_text", label: t("formBuilder:helpText"), english: form.help_text },
          ]}
          choices={Array.isArray(form.options?.choices) ? form.options.choices : []}
        />
        {editing && usedBy && (
          <p className="text-xs text-muted-foreground">
            {usedBy.length
              ? t("formBuilder:usedBySections", { list: usedBy.map((s) => s.name ?? s.key ?? s).join(", ") })
              : t("formBuilder:notUsedYet")}
          </p>
        )}
      </div>
    </Modal>
  );
}

// Form Fields (§3, §7.1): the institution's field library. Plain create /
// edit / delete; they are approved as part of the definition that uses
// them.
export function FormFields() {
  const { t } = useAudienceTranslation(["formBuilder", "common"]);
  const can = usePagePermission("Form Builder");
  const vocabulary = useFieldTypes();
  const library = useFieldLibrary();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [translating, setTranslating] = useState(false);

  const list = useServerList({ api: formFieldApi.listPath, call: formFieldApi.list });

  const load = list.reload;

  if (!can("View")) return <NoAccess />;

  const typeName = (type) => vocabulary?.types?.find((x) => x.type === type)?.name ?? type;
  const remove = async () => {
    setDeleteBusy(true);
    try {
      const response = await formFieldApi.delete({ id: deleting.id });
      notifications.success(apiMessage(response, t("formBuilder:fieldDeleted")));
      setDeleting(null);
      load();
      void library.reload();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setDeleteBusy(false);
    }
  };

  const columns = [
    { key: "name", label: t("formBuilder:staffName"), render: (r) => <span className="font-semibold text-slate-800">{r.name}</span> },
    { key: "key", label: t("formBuilder:key"), render: (r) => <code className="text-xs">{r.key}</code> },
    { key: "field_type", label: t("formBuilder:fieldType"), render: (r) => typeName(r.field_type) },
    { key: "label", label: t("formBuilder:question"), render: (r) => r.label || "-" },
    { key: "required", label: t("formBuilder:required"), render: (r) => (r.required ? t("common:yes") : t("common:no")) },
    { key: "updated_by", label: t("formBuilder:updatedBy"), render: (r) => r.updated_by ?? r.created_by ?? "-" },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (r) => (
        <div className="flex items-center justify-center gap-1">
          <ActionIconButton label={can("Edit") ? t("common:edit") : t("common:view")} intent="edit" icon={Pencil} onClick={() => setEditing({ record: r, readOnly: !can("Edit") })} />
          {can("Delete") && (
            <ActionIconButton label={t("common:delete")} intent="delete" icon={Trash2} onClick={() => setDeleting(r)} />
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4">
        <PageTitle>{t("formBuilder:formFieldsTitle")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("formBuilder:formFieldsSubtitle")}</p>
      </div>
      <ListTable list={list} actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" icon={Languages} onClick={() => setTranslating(true)}>
              {t("formBuilder:translations")}
            </Button>
            {can("Add") && (
              <Button size="sm" icon={Plus} onClick={() => setEditing({ record: null })}>
                {t("formBuilder:addField")}
              </Button>
            )}
          </div>
        } columns={columns} title={t("formBuilder:formFieldsTitle")} />
      {translating && <TranslationsModal canEdit={can("Edit")} onClose={() => setTranslating(false)} />}
      {editing && (
        <FieldFormModal
          record={editing.record}
          readOnly={Boolean(editing.readOnly)}
          vocabulary={vocabulary}
          libraryFields={library.rows}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
            void library.reload();
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        destructive
        pending={deleteBusy}
        title={t("formBuilder:deleteFieldTitle")}
        description={t("formBuilder:deleteFieldBody", { name: deleting?.name ?? "" })}
        confirmLabel={t("common:delete")}
        onConfirm={() => void remove()}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
