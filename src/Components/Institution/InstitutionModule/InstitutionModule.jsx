import { useState } from "react";
import { AlertCircle, Plus, X } from "lucide-react";
import { RowActions } from "@/Components/Common/RowActions";
import { DataTable } from "@/Components/Common/DataTable";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { Modal } from "@/Components/Common/Modal";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { notifications } from "@/Utils/Lib/notifications";
import { AuditModal } from "@/Components/Common/AuditModal";
import { StatusFilterTabs, statusBucket } from "@/Components/Common/StatusFilterTabs";
import {
  useInstitutionModuleMutation,
  useInstitutionModulesQuery,
} from "@/Hooks/Institution/institutionModuleHooks";
import { institutionModuleApi } from "@/Services/Institution/institutionModule.api";
import {
  useActiveInstitutionsQuery,
  useHasInstitutionAction,
} from "@/Hooks/Institution/institutionHooks";
import { useMasterModules } from "@/Hooks/Sidebar/useMasterModules";
import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";

const displayValue = (value) => value ?? "—";

function ModuleActions({ row, onRefresh, onEdit }) {
  const tr = useConfigLabel();
  const canAdd = useHasInstitutionAction("Add");
  const canEdit = useHasInstitutionAction("Edit");
  const canAuthorize = useHasInstitutionAction("Authorize");
  const canDelete = useHasInstitutionAction("Delete");
  const canChangeStatus = useHasInstitutionAction("Change Status");
  const [action, setAction] = useState(null);
  const [narration, setNarration] = useState("");
  const [details, setDetails] = useState(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const mutation = useInstitutionModuleMutation(action?.method ?? "submit");
  const execute = async () => {
    try {
      if (action?.method === "pending") {
        setDetails(await mutation.mutateAsync({ id: row.id }));
      } else {
        await mutation.mutateAsync({ id: row.id, narration: narration.trim() });
        await onRefresh();
        setAction(null);
        setNarration("");
      }
    } catch {
      /* mutation hook already shows the error toast */
    }
  };
  // Single shared status-based visibility engine — see buttonVisibility.js
  // for the full status_name/process_status_name matrix this is built from.
  const visibility = getMakerCheckerButtons(row, { canAdd, canEdit, canAuthorize, canChangeStatus, canDelete });
  const pendingType = visibility.isPendingDelete ? "deleteAuth" : "auth";
  return (
    <>
      <RowActions
        buttons={visibility}
        onView={() => {
          setAction({ method: "view", label: "View" });
          setDetails(row);
        }}
        onEdit={onEdit}
        onAudit={() => setAuditOpen(true)}
        onSubmit={() => setAction({ method: "submit", label: "Submit" })}
        onAuthorize={() => setAction({ method: pendingType, label: "Authorize" })}
        onDeauthorize={() => setAction({ method: "deauth", label: "Deauthorize" })}
        onDeactivate={() => setAction({ method: "deactivate", label: "Deactivate" })}
        onReactivate={() => setAction({ method: "reactivate", label: "Activate" })}
        onDelete={() => setAction({ method: "delete", label: "Delete" })}
      />
      <ConfirmDialog
        open={!!action && !details}
        title={`${action?.label ?? "Action"} institution module`}
        confirmLabel={action?.label ?? "Confirm"}
        destructive={["deauth", "delete", "deleteAuth"].includes(action?.method)}
        pending={mutation.isPending}
        confirmDisabled={action?.method === "deauth" && !narration.trim()}
        onClose={() => setAction(null)}
        onConfirm={() => void execute()}
      >
        {!action?.method.includes("audit") && !action?.method.includes("pending") && (
          <textarea
            value={narration}
            onChange={(event) => setNarration(event.target.value)}
            placeholder="Narration"
            className="mt-3 min-h-20 w-full rounded-xl border border-border p-3 text-sm outline-none focus:border-primary"
          />
        )}
      </ConfirmDialog>
      <Modal
        open={!!details}
        onClose={() => {
          setDetails(null);
          setAction(null);
        }}
        title={tr("View institution module")}
        size="md"
      >
        <div className="space-y-4">
          {[
            ["Module", details?.module_name ?? details?.module_id],
            ["Institution", details?.inst_profile_name ?? details?.inst_profile_id],
            ["Effective from", details?.effective_from],
            ["Effective to", details?.effective_to],
          ].map(([label, value]) => (
            <label key={label} className="block text-sm font-medium text-slate-700">
              {label}
              <div className="mt-1.5 w-full rounded-xl border border-border bg-card p-3 text-sm text-slate-700">
                {displayValue(value)}
              </div>
            </label>
          ))}
          <div className="flex justify-end">
            <StatusBadge
              status={String(details?.status_name ?? details?.auth_status ?? details?.status ?? "")}
            />
          </div>
        </div>
      </Modal>
      {auditOpen && (
        <AuditModal
          title={row.module_name ?? `Module #${row.module_id}`}
          fields={[
            ["module_name", "Module"],
            ["inst_profile_name", "Institution"],
            ["effective_from", "Effective From"],
            ["effective_to", "Effective To"],
          ]}
          onClose={() => setAuditOpen(false)}
          fetchAudit={(page, limit) =>
            institutionModuleApi.audit({ id: row.id, page, limit }).then((response) => ({
              entries: Array.isArray(response?.data) ? response.data : [],
              totalPages: response?.pagination?.totalPages ?? 1,
            }))
          }
        />
      )}
    </>
  );
}

export function InstitutionModule() {
  const tr = useConfigLabel();
  const canAdd = useHasInstitutionAction("Add");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const query = useInstitutionModulesQuery();
  const institutions = useActiveInstitutionsQuery();
  const { masterModules } = useMasterModules();
  const addMutation = useInstitutionModuleMutation("add");
  const editMutation = useInstitutionModuleMutation("edit");
  const filteredRows =
    !search.trim() && statusFilter === "all"
      ? query.data
      : query.data.filter(
          (row) =>
            (statusFilter === "all" || statusBucket(row) === statusFilter) &&
            JSON.stringify(row).toLowerCase().includes(search.trim().toLowerCase()),
        );
  const columns = [
    {
      key: "module_name",
      label: tr("Module"),
      render: (row) => (
        <span className="font-semibold text-foreground">
          {displayValue(row.module_name ?? row.module_id)}
        </span>
      ),
    },
    {
      key: "inst_profile_name",
      label: tr("Institution"),
      render: (row) => displayValue(row.inst_profile_name ?? row.inst_profile_id),
    },
    {
      key: "effective_from",
      label: tr("Effective From"),
      render: (row) => displayValue(row.effective_from),
    },
    { key: "effective_to", label: tr("Effective To"), render: (row) => displayValue(row.effective_to) },
    {
      key: "status",
      label: tr("Status"),
      sortValue: (row) => row.status_name ?? row.status ?? "",
      render: (row) =>
        row.status_name != null || row.status != null ? (
          <StatusBadge status={String(row.status_name ?? (row.status === 1 ? "ACTIVE" : "INACTIVE"))} />
        ) : (
          "—"
        ),
    },
    {
      key: "process_status_name",
      label: tr("Process Status"),
      sortValue: (row) => row.process_status_name ?? "",
      render: (row) => (row.process_status_name ? <StatusBadge status={String(row.process_status_name)} /> : "—"),
    },
    {
      key: "auth_status",
      label: tr("Authorization Status"),
      sortValue: (row) => row.auth_status ?? "",
      render: (row) => (row.auth_status ? <StatusBadge status={String(row.auth_status)} /> : "—"),
    },
    {
      key: "actions",
      label: tr("Actions"),
      sortable: false,
      render: (row) => (
        <ModuleActions
          row={row}
          onRefresh={query.refetch}
          onEdit={() => {
            setEditing(row);
            setFormOpen(true);
          }}
        />
      ),
    },
  ];
  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black leading-tight tracking-tight text-foreground">
            {tr("Institution Module")}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {tr("Manage institution module assignments.")}
          </p>
        </div>
        
      </div>
      {query.error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle size={14} /> {query.error.message}
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="ml-auto text-xs font-bold underline"
          >
            {tr("Retry")}
          </button>
        </div>
      )}
      <div className="overflow-hidden rounded-2xl" style={{ background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" }}><StatusFilterTabs
        rows={query.data}
        value={statusFilter}
        search={search}
        onSearch={setSearch}
        onChange={setStatusFilter}
        actions={canAdd && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
          >
            <Plus size={14} /> {tr("Add")} {tr("module")}
          </button>
        )}
      bare /><DataTable
        columns={columns}
        rows={filteredRows}
        rowKey={(row) => row.id}
        isLoading={query.isLoading}
        title={tr("Institution Module")}
        searchableKeys={["module_name", "inst_profile_name"]}
        emptyTitle={tr("No institution modules found")}
        emptyDescription={tr("Module assignments will appear here when available.")}
      bare /></div><Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? tr("Edit institution module") : tr("Add institution module")}
        size="md"
      >
        <ModuleForm
          editing={editing}
          institutions={institutions.data}
          masterModules={masterModules}
          pending={addMutation.isPending || editMutation.isPending}
          onCancel={() => setFormOpen(false)}
          onSubmit={async (values) => {
            try {
              const result = editing
                ? await editMutation.mutateAsync({
                    id: values.id,
                    module_id: values.module_id,
                    effective_from: values.effective_from,
                    effective_to: values.effective_to,
                    narration: values.narration,
                    is_draft: values.is_draft,
                    ...(editing.updated_time ? { expected_updated_time: editing.updated_time } : {}),
                  })
                : await addMutation.mutateAsync({
                    inst_profile_id: values.inst_profile_id,
                    modules: values.modules,
                    narration: values.narration,
                    is_draft: values.is_draft,
                  });
              setFormOpen(false);
              // Reconcile the mutation's own response record(s) straight into
              // the list instead of calling refetch() again — a fresh
              // refetch() races the live push this same mutation already
              // triggers, and can win with a snapshot taken just before the
              // write was visible, silently erasing the row the live push
              // had already inserted correctly (see useEntityListQuery.js).
              const records = Array.isArray(result?.data) ? result.data : result?.data ? [result.data] : [];
              if (records.length) query.applyRecords(records);
              else await query.refetch();
            } catch {
              /* mutation hook already shows the error toast */
            }
          }}
        />
      </Modal>
    </div>
  );
}

const emptyModuleRow = () => ({ module_id: "", effective_from: "", effective_to: "" });

function ModuleForm({
  editing,
  institutions = [],
  masterModules = [],
  pending,
  onCancel,
  onSubmit,
}) {
  const tr = useConfigLabel();
  const [form, setForm] = useState({
    inst_profile_id: editing?.inst_profile_id ?? "",
    module_id: editing?.module_id ?? "",
    effective_from: editing?.effective_from ?? "",
    effective_to: editing?.effective_to ?? "",
    narration: "",
    is_draft: false,
  });
  // Only the Add flow supports assigning several modules in one request
  // (the backend's /add accepts a `modules` array) — Edit still targets one
  // existing row, so it keeps the single module_id/effective_* fields above.
  const [moduleRows, setModuleRows] = useState([emptyModuleRow()]);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const setModuleRow = (index, key) => (event) =>
    setModuleRows((rows) => rows.map((row, i) => (i === index ? { ...row, [key]: event.target.value } : row)));
  const addModuleRow = () => setModuleRows((rows) => [...rows, emptyModuleRow()]);
  const removeModuleRow = (index) => setModuleRows((rows) => rows.filter((_, i) => i !== index));

  const buildPayload = (isDraft) =>
    editing
      ? {
          ...form,
          module_id: Number(form.module_id),
          inst_profile_id: Number(form.inst_profile_id),
          is_draft: isDraft,
          id: editing.id,
        }
      : {
          inst_profile_id: Number(form.inst_profile_id),
          modules: moduleRows.map((row) => ({
            module_id: Number(row.module_id),
            effective_from: row.effective_from,
            effective_to: row.effective_to,
          })),
          narration: form.narration,
          is_draft: isDraft,
        };

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        // FilterSelect has no native form control, so the "required"
        // native validation these fields used to get for free (back when
        // they were bare <select>s) has to be re-checked by hand here.
        if (!editing && !form.inst_profile_id) {
          notifications.error("Please select an institution");
          return;
        }
        if (editing && !form.module_id) {
          notifications.error("Please select a module");
          return;
        }
        if (!editing && moduleRows.some((row) => !row.module_id)) {
          notifications.error("Please select a module for every row");
          return;
        }
        void onSubmit(buildPayload(form.is_draft));
      }}
    >
      {!editing && (
        <label className="block text-sm font-medium">
          Institution
          <FilterSelect
            className="mt-1.5"
            value={form.inst_profile_id}
            onChange={(next) => set("inst_profile_id")({ target: { value: next } })}
            options={[
              { value: "", label: tr("Select institution") },
              ...institutions.map((item) => ({
                value: item.id ?? item.inst_profile_id,
                label: item.name ?? item.inst_profile_name ?? item.code,
              })),
            ]}
          />
        </label>
      )}
      {editing ? (
        <>
          <label className="block text-sm font-medium">
            Module
            <FilterSelect
              className="mt-1.5"
              value={form.module_id}
              onChange={(next) => set("module_id")({ target: { value: next } })}
              options={[
                { value: "", label: tr("Select module") },
                ...masterModules.map((item) => ({
                  value: item.module_id ?? item.id,
                  label: item.module_name ?? item.name,
                })),
              ]}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium">
              Effective from
              <input
                required
                type="date"
                value={form.effective_from}
                onChange={set("effective_from")}
                className="mt-1.5 w-full rounded-xl border border-border p-3"
              />
            </label>
            <label className="text-sm font-medium">
              Effective to
              <input
                type="date"
                value={form.effective_to}
                onChange={set("effective_to")}
                className="mt-1.5 w-full rounded-xl border border-border p-3"
              />
            </label>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          {moduleRows.map((row, index) => (
            <div key={index} className="relative rounded-xl border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Module {index + 1}
                </p>
                {moduleRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeModuleRow(index)}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <label className="block text-sm font-medium">
                Module
                <FilterSelect
                  className="mt-1.5"
                  value={row.module_id}
                  onChange={(next) => setModuleRow(index, "module_id")({ target: { value: next } })}
                  options={[
                    { value: "", label: tr("Select module") },
                    ...masterModules.map((item) => ({
                      value: item.module_id ?? item.id,
                      label: item.module_name ?? item.name,
                    })),
                  ]}
                />
              </label>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="text-sm font-medium">
                  Effective from
                  <input
                    required
                    type="date"
                    value={row.effective_from}
                    onChange={setModuleRow(index, "effective_from")}
                    className="mt-1.5 w-full rounded-xl border border-border p-3"
                  />
                </label>
                <label className="text-sm font-medium">
                  Effective to
                  <input
                    type="date"
                    value={row.effective_to}
                    onChange={setModuleRow(index, "effective_to")}
                    className="mt-1.5 w-full rounded-xl border border-border p-3"
                  />
                </label>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addModuleRow}
            className="text-sm font-semibold text-primary hover:underline"
          >
            + Add another module
          </button>
        </div>
      )}
      <label className="block text-sm font-medium">
        Narration
        <textarea
          value={form.narration}
          onChange={set("narration")}
          className="mt-1.5 min-h-20 w-full rounded-xl border border-border p-3"
        />
      </label>
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-sm">
          Cancel
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void onSubmit(buildPayload(true))}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${form.is_draft ? "border-primary bg-primary/10 text-primary" : "border-border text-slate-600 hover:border-primary/40 hover:bg-primary/5"}`}
        >
          {editing ? "Save as draft" : form.is_draft ? "Draft selected" : "Save as draft"}
        </button>
        <button
          disabled={pending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          {pending ? "Saving..." : editing ? "Save changes" : "Assign Module"}
        </button>
      </div>
    </form>
  );
}
