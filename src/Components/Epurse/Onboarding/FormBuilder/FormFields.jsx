import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useAudienceTranslation } from "@/Hooks/useAudienceTranslation";
import { usePagePermission } from "@/Hooks/usePermission";
import { DataTable } from "@/Components/Common/DataTable";
import { Modal } from "@/Components/Common/Modal";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { NoAccess } from "@/Components/Common/NoAccess";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { formFieldApi, rowsOf } from "@/Services/Epurse/onboarding.api";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { FieldOptionsEditor, inputClass } from "./FieldOptionsEditor";
import { KEY_PATTERN, keyFromName, useFieldLibrary, useFieldTypes } from "./formBuilderHooks";

import { Button } from "@/Components/Common/Button";
const EMPTY = { key: "", name: "", field_type: "TEXT", label: "", hint: "", help_text: "", required: false, read_only: false, default_value: "", options: {} };
const glass = { background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" };

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
  const setType = (field_type) => set({ field_type, options: {} });

  const keyValid = KEY_PATTERN.test(form.key);
  const canSave = !readOnly && keyValid && form.name.trim() && form.label.trim() && form.field_type;

  const save = async () => {
    setBusy(true);
    try {
      const common = {
        name: form.name.trim(),
        field_type: form.field_type,
        label: form.label.trim(),
        hint: form.hint,
        help_text: form.help_text,
        required: Boolean(form.required),
        read_only: Boolean(form.read_only),
        default_value: form.default_value,
        options: form.options ?? {},
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
          <label className="text-sm font-semibold text-slate-700">
            {t("formBuilder:placeholder")}
            <input className={inputClass} disabled={readOnly} value={form.hint ?? ""} onChange={(e) => set({ hint: e.target.value })} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            {t("formBuilder:helpText")}
            <input className={inputClass} disabled={readOnly} value={form.help_text ?? ""} onChange={(e) => set({ help_text: e.target.value })} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            {t("formBuilder:defaultValue")}
            <input className={inputClass} disabled={readOnly} value={form.default_value ?? ""} onChange={(e) => set({ default_value: e.target.value })} />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("formBuilder:defaultValueHint")}</span>
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <CheckboxPill checked={Boolean(form.required)} disabled={readOnly} onChange={(on) => set({ required: on })} label={t("formBuilder:required")} />
            <CheckboxPill checked={Boolean(form.read_only)} disabled={readOnly} onChange={(on) => set({ read_only: on })} label={t("formBuilder:readOnly")} />
          </div>
        </div>
        {typeDef?.options?.length > 0 && (
          <div className="rounded-2xl border bg-muted/40 p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("formBuilder:typeOptions", { type: typeDef.name ?? typeDef.type })}</h3>
            <FieldOptionsEditor typeDef={typeDef} value={form.options} onChange={(options) => set({ options })} vocabulary={vocabulary} libraryFields={libraryFields} selfKey={form.key} disabled={readOnly} />
          </div>
        )}
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
  const can = usePagePermission("Form Fields");
  const vocabulary = useFieldTypes();
  const library = useFieldLibrary();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await formFieldApi.list({ page, limit, ...(search.trim() ? { search: search.trim() } : {}), ...(typeFilter ? { field_type: typeFilter } : {}) });
      setRows(rowsOf(response));
      const p = response?.pagination ?? {};
      setPagination({ total: p.total ?? p.totalRecords ?? 0, pages: p.totalPages ?? Math.max(1, Math.ceil((p.total ?? p.totalRecords ?? 0) / limit)) });
    } catch (error) {
      notifications.error(error.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, typeFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  if (!can("View")) return <NoAccess />;

  const typeName = (type) => vocabulary?.types?.find((x) => x.type === type)?.name ?? type;
  const remove = async () => {
    setDeleteBusy(true);
    try {
      const response = await formFieldApi.delete({ id: deleting.id });
      notifications.success(apiMessage(response, t("formBuilder:fieldDeleted")));
      setDeleting(null);
      void load();
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
        <h1 className="text-xl font-black text-slate-800">{t("formBuilder:formFieldsTitle")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{t("formBuilder:formFieldsSubtitle")}</p>
      </div>
      <div className="mb-4 overflow-hidden rounded-2xl" style={glass}>
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t("formBuilder:searchFields")}
              className="w-full rounded-lg border bg-white/70 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <FilterSelect
            size="sm"
            className="w-44"
            value={typeFilter}
            onChange={(next) => {
              setTypeFilter(next);
              setPage(1);
            }}
            options={[{ value: "", label: t("formBuilder:allTypes") }, ...(vocabulary?.types ?? []).map((x) => ({ value: x.type, label: x.name ?? x.type }))]}
          />
          {can("Add") && (
            <Button size="sm" onClick={() => setEditing({ record: null })}>
              <Plus size={14} /> {t("formBuilder:addField")}
            </Button>
          )}
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          isLoading={loading}
          serverSorted
          title={t("formBuilder:formFieldsTitle")}
          serverPagination={{
            page,
            totalPages: pagination.pages ?? 1,
            totalRecords: pagination.total ?? rows.length,
            onPageChange: setPage,
            limit,
            onLimitChange: (next) => {
              setLimit(next);
              setPage(1);
            },
          }}
          bare
        />
      </div>
      {editing && (
        <FieldFormModal
          record={editing.record}
          readOnly={Boolean(editing.readOnly)}
          vocabulary={vocabulary}
          libraryFields={library.rows}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
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
