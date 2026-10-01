import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useAudienceTranslation } from "@/Hooks/useAudienceTranslation";
import { usePagePermission } from "@/Hooks/usePermission";
import { useOpenMenu } from "@/Pages/Sidebar/menuContext";
import { DataTable } from "@/Components/Common/DataTable";
import { Modal } from "@/Components/Common/Modal";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { NoAccess } from "@/Components/Common/NoAccess";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { actionButtonClass } from "@/Components/Common/actionStyles";
import { formSectionApi, rowsOf } from "@/Services/Epurse/onboarding.api";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/cn";
import { inputClass } from "./FieldOptionsEditor";
import { KEY_PATTERN, keyFromName, useFieldLibrary, useFieldTypes } from "./formBuilderHooks";
import { FieldPreview } from "./FieldPreview";

import { Button } from "@/Components/Common/Button";
const EMPTY = { key: "", name: "", heading: "", subheading: "", multi_row: false, max_rows: "", fields: [] };
const OVERRIDES = ["label", "hint", "help_text", "default_value"];
const glass = { background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" };

// A placement with its empty overrides dropped: only what differs from the
// library goes to the server.
function cleanPlacement(p) {
  const out = { field_key: p.field_key };
  for (const key of OVERRIDES) if (p[key] !== undefined && p[key] !== "") out[key] = p[key];
  for (const key of ["required", "read_only"]) if (typeof p[key] === "boolean") out[key] = p[key];
  return out;
}

// What the customer is asked: library values with the placement's
// overrides on top (the server's resolved_fields, computed live here).
const resolvePlacement = (placement, libraryField) => ({ ...(libraryField ?? { key: placement.field_key, label: placement.field_key }), ...cleanPlacement(placement), key: placement.field_key });

function PlacementRow({ placement, index, count, libraryField, typeName, disabled, onChange, onMove, onRemove }) {
  const { t } = useAudienceTranslation(["formBuilder", "common"]);
  const [open, setOpen] = useState(false);
  const set = (patch) => onChange({ ...placement, ...patch });
  const triState = (key) => (typeof placement[key] === "boolean" ? String(placement[key]) : "");
  const overridden = OVERRIDES.some((k) => placement[k]) || ["required", "read_only"].some((k) => typeof placement[k] === "boolean");
  return (
    <div className="rounded-xl border bg-white/70">
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="w-6 text-center text-xs font-bold text-muted-foreground">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">
            {placement.label || libraryField?.label || placement.field_key}
            {!libraryField && <span className="ml-2 text-xs font-normal text-red-600">{t("formBuilder:notInLibrary")}</span>}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            <code>{placement.field_key}</code> · {typeName(libraryField?.field_type)}
            {overridden && <span className="ml-1.5 rounded bg-amber-100 px-1.5 text-amber-700">{t("formBuilder:overridden")}</span>}
          </p>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-lg p-1.5 text-slate-500 hover:bg-muted" aria-label={t("formBuilder:overrides")}>
          <ChevronDown size={15} className={cn("transition-transform", open && "rotate-180")} />
        </button>
        {!disabled && (
          <>
            <button type="button" disabled={index === 0} onClick={() => onMove(-1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-muted disabled:opacity-30" aria-label={t("formBuilder:moveUp")}>
              <ArrowUp size={14} />
            </button>
            <button type="button" disabled={index === count - 1} onClick={() => onMove(1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-muted disabled:opacity-30" aria-label={t("formBuilder:moveDown")}>
              <ArrowDown size={14} />
            </button>
            <button type="button" onClick={onRemove} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" aria-label={t("formBuilder:remove")}>
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
      {open && (
        <div className="grid gap-3 border-t bg-muted/40 p-3 md:grid-cols-2">
          <p className="text-[11px] text-muted-foreground md:col-span-2">{t("formBuilder:overridesHint")}</p>
          {[
            ["label", "question"],
            ["hint", "placeholder"],
            ["help_text", "helpText"],
            ["default_value", "defaultValue"],
          ].map(([key, labelKey]) => (
            <label key={key} className="text-xs font-semibold text-slate-700">
              {t(`formBuilder:${labelKey}`)}
              <input className={inputClass} disabled={disabled} placeholder={libraryField?.[key] ?? ""} value={placement[key] ?? ""} onChange={(e) => set({ [key]: e.target.value })} />
            </label>
          ))}
          {[
            ["required", "required"],
            ["read_only", "readOnly"],
          ].map(([key, labelKey]) => (
            <label key={key} className="text-xs font-semibold text-slate-700">
              {t(`formBuilder:${labelKey}`)}
              <FilterSelect
                className="mt-1.5"
                disabled={disabled}
                value={triState(key)}
                onChange={(v) => set({ [key]: v === "" ? undefined : v === "true" })}
                options={[
                  { value: "", label: t("formBuilder:asInLibrary", { value: libraryField?.[key] ? t("common:yes") : t("common:no") }) },
                  { value: "true", label: t("common:yes") },
                  { value: "false", label: t("common:no") },
                ]}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// Add / edit one section (§4.3): heading and subheading are what the
// customer sees; the ordered placements put library fields in it.
function SectionFormModal({ record, library, vocabulary, readOnly, onClose, onSaved }) {
  const { t } = useAudienceTranslation(["formBuilder", "common"]);
  const openMenu = useOpenMenu();
  const editing = Boolean(record?.id);
  const [form, setForm] = useState(() => (editing ? { ...EMPTY, ...record, max_rows: record.max_rows ?? "", fields: record.fields ?? [] } : EMPTY));
  const [keyTouched, setKeyTouched] = useState(editing);
  const [picking, setPicking] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) return;
    formSectionApi
      .get({ id: record.id })
      .then((response) => {
        const full = rowsOf(response)[0];
        if (full) setForm((current) => ({ ...current, ...full, max_rows: full.max_rows ?? "", fields: full.fields ?? [] }));
      })
      .catch((error) => notifications.error(error.message));
  }, [editing, record?.id]);

  const set = (patch) => setForm((current) => ({ ...current, ...patch }));
  const setName = (name) => set({ name, ...(keyTouched ? {} : { key: keyFromName(name) }) });
  const byKey = new Map(library.map((f) => [f.key, f]));
  const typeName = (type) => vocabulary?.types?.find((x) => x.type === type)?.name ?? type ?? "-";
  const placed = new Set(form.fields.map((p) => p.field_key));
  const setPlacements = (fields) => set({ fields });
  const move = (index, delta) => {
    const next = [...form.fields];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    setPlacements(next);
  };

  const keyValid = KEY_PATTERN.test(form.key);
  const canSave = !readOnly && keyValid && form.name.trim() && form.heading.trim();

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        name: form.name.trim(),
        heading: form.heading.trim(),
        subheading: form.subheading ?? "",
        multi_row: Boolean(form.multi_row),
        ...(form.multi_row && form.max_rows !== "" ? { max_rows: Number(form.max_rows) } : {}),
        fields: form.fields.map(cleanPlacement),
      };
      const response = editing ? await formSectionApi.edit({ id: record.id, ...body }) : await formSectionApi.add({ key: form.key, ...body });
      notifications.success(apiMessage(response, t("formBuilder:sectionSaved")));
      onSaved();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const preview = form.fields.map((p) => resolvePlacement(p, byKey.get(p.field_key)));
  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={readOnly ? t("formBuilder:viewSection") : editing ? t("formBuilder:editSection") : t("formBuilder:addSection")}
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
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
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
            <label className="text-sm font-semibold text-slate-700 md:col-span-2">
              {t("formBuilder:heading")} <span className="text-red-500">*</span>
              <input className={inputClass} disabled={readOnly} value={form.heading} onChange={(e) => set({ heading: e.target.value })} />
            </label>
            <label className="text-sm font-semibold text-slate-700 md:col-span-2">
              {t("formBuilder:subheading")}
              <input className={inputClass} disabled={readOnly} value={form.subheading ?? ""} onChange={(e) => set({ subheading: e.target.value })} />
            </label>
            <div className="flex items-end">
              <CheckboxPill checked={Boolean(form.multi_row)} disabled={readOnly} onChange={(on) => set({ multi_row: on, ...(on ? {} : { max_rows: "" }) })} label={t("formBuilder:repeatable")} />
            </div>
            {form.multi_row && (
              <label className="text-sm font-semibold text-slate-700">
                {t("formBuilder:maxRows")}
                <input type="number" min={1} className={inputClass} disabled={readOnly} value={form.max_rows} onChange={(e) => set({ max_rows: e.target.value })} />
              </label>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("formBuilder:fieldsInSection")}</h3>
            <div className="flex flex-col gap-2">
              {form.fields.length === 0 && <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">{t("formBuilder:noFieldsPlaced")}</p>}
              {form.fields.map((p, index) => (
                <PlacementRow
                  key={p.field_key}
                  placement={p}
                  index={index}
                  count={form.fields.length}
                  libraryField={byKey.get(p.field_key)}
                  typeName={typeName}
                  disabled={readOnly}
                  onChange={(next) => setPlacements(form.fields.map((x, i) => (i === index ? next : x)))}
                  onMove={(delta) => move(index, delta)}
                  onRemove={() => setPlacements(form.fields.filter((_, i) => i !== index))}
                />
              ))}
            </div>
            {!readOnly && (
              <div className="mt-3 flex items-center gap-2">
                <FilterSelect
                  className="flex-1"
                  value={picking}
                  onChange={(key) => {
                    if (!key) return;
                    setPlacements([...form.fields, { field_key: key }]);
                    setPicking("");
                  }}
                  addAction={{ label: t("formBuilder:newFieldInLibrary"), onClick: () => openMenu("formfields") }}
                  options={[
                    { value: "", label: t("formBuilder:addFieldFromLibrary") },
                    ...library.filter((f) => !placed.has(f.key)).map((f) => ({ value: f.key, label: `${f.name} (${f.key}) · ${typeName(f.field_type)}`, searchText: `${f.name} ${f.key} ${f.label}` })),
                  ]}
                />
              </div>
            )}
          </div>
        </div>
        <div className="rounded-2xl border bg-muted/30 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{t("formBuilder:livePreview")}</p>
          <h4 className="mt-2 text-lg font-bold text-slate-800">{form.heading || t("formBuilder:heading")}</h4>
          {form.subheading && <p className="mt-1 text-xs text-muted-foreground">{form.subheading}</p>}
          <div className="mt-4 flex flex-col gap-3">
            {preview.map((field) => (
              <FieldPreview key={field.key} field={field} />
            ))}
          </div>
          {form.multi_row && <p className="mt-3 text-xs font-semibold text-primary">+ {t("formBuilder:addAnotherRow")}</p>}
        </div>
      </div>
    </Modal>
  );
}

// Form Sections (§3, §7.2): headings and ordered library fields. Plain
// create / edit / delete, approved as part of the definition that uses them.
export function FormSections() {
  const { t } = useAudienceTranslation(["formBuilder", "common"]);
  const can = usePagePermission("Form Sections");
  const vocabulary = useFieldTypes();
  const library = useFieldLibrary();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await formSectionApi.list({ page, limit, ...(search.trim() ? { search: search.trim() } : {}) });
      setRows(rowsOf(response));
      const p = response?.pagination ?? {};
      setPagination({ total: p.total ?? p.totalRecords ?? 0, pages: p.totalPages ?? Math.max(1, Math.ceil((p.total ?? p.totalRecords ?? 0) / limit)) });
    } catch (error) {
      notifications.error(error.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  if (!can("View")) return <NoAccess />;

  const remove = async () => {
    setDeleteBusy(true);
    try {
      const response = await formSectionApi.delete({ id: deleting.id });
      notifications.success(apiMessage(response, t("formBuilder:sectionDeleted")));
      setDeleting(null);
      void load();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setDeleteBusy(false);
    }
  };

  const columns = [
    { key: "name", label: t("formBuilder:staffName"), render: (r) => <span className="font-semibold text-slate-800">{r.name}</span> },
    { key: "key", label: t("formBuilder:key"), render: (r) => <code className="text-xs">{r.key}</code> },
    { key: "heading", label: t("formBuilder:heading"), render: (r) => <span className="line-clamp-2 text-left">{r.heading}</span> },
    { key: "fields", label: t("formBuilder:fieldsCount"), render: (r) => (r.fields ?? []).length },
    { key: "multi_row", label: t("formBuilder:repeatable"), render: (r) => (r.multi_row ? (r.max_rows ? t("formBuilder:upToRows", { count: r.max_rows }) : t("common:yes")) : t("common:no")) },
    { key: "updated_by", label: t("formBuilder:updatedBy"), render: (r) => r.updated_by ?? r.created_by ?? "-" },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (r) => (
        <div className="flex items-center justify-center gap-1">
          <UiTooltip label={can("Edit") ? t("common:edit") : t("common:view")}>
            <button type="button" className={actionButtonClass("edit")} onClick={() => setEditing({ record: r, readOnly: !can("Edit") })}>
              <Pencil size={15} />
            </button>
          </UiTooltip>
          {can("Delete") && (
            <UiTooltip label={t("common:delete")}>
              <button type="button" className={actionButtonClass("delete")} onClick={() => setDeleting(r)}>
                <Trash2 size={15} />
              </button>
            </UiTooltip>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-black text-slate-800">{t("formBuilder:formSectionsTitle")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{t("formBuilder:formSectionsSubtitle")}</p>
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
              placeholder={t("formBuilder:searchSections")}
              className="w-full rounded-lg border bg-white/70 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          {can("Add") && (
            <Button size="sm" onClick={() => setEditing({ record: null })}>
              <Plus size={14} /> {t("formBuilder:addSection")}
            </Button>
          )}
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          isLoading={loading}
          serverSorted
          title={t("formBuilder:formSectionsTitle")}
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
        <SectionFormModal
          record={editing.record}
          readOnly={Boolean(editing.readOnly)}
          library={library.rows}
          vocabulary={vocabulary}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        destructive
        pending={deleteBusy}
        title={t("formBuilder:deleteSectionTitle")}
        description={t("formBuilder:deleteSectionBody", { name: deleting?.name ?? "" })}
        confirmLabel={t("common:delete")}
        onConfirm={() => void remove()}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
