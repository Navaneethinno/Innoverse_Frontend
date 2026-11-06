import { Button } from "@/Components/Common/Button";
import { mergeStatusColumns } from "@/Components/MakerChecker/statusColumns";
import { RequiredMark } from "@/Components/Common/RequiredMark";
import { API_ENDPOINTS } from "@/Utils/Constant";
import { ListTable } from "@/Components/Common/ListView";
import { asQuery, useServerList } from "@/Hooks/useServerList";
import { PageTitle } from "@/Components/Common/PageTitle";
import { DateInput } from "@/Components/Common/DateInput";
import { canChooseInstitution } from "@/Utils/Lib/institutionScope";
import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
import { useAuth } from "@/Hooks/useAuth";
import { useApiMutation } from "@/Hooks/useApiMutation";
import { useState } from "react";
import { AlertCircle, Plus, X } from "lucide-react";

import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";

import { Modal } from "@/Components/Common/Modal";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { notifications } from "@/Utils/Lib/notifications";

import { institutionModuleApi } from "@/Services/Institution/institutionModule.api";
import { useActiveInstitutionsQuery, useHasInstitutionAction } from "@/Hooks/Institution/institutionHooks";
import { useMasterModules } from "@/Hooks/Sidebar/useMasterModules";

import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";
import { LinkButton } from "@/Components/Common/TextButtons";
import { InstitutionRowActions } from "@/Components/Institution/InstitutionRowActions";

const displayValue = (value) => value ?? "—";

function ModuleActions({ row, onRefresh, onEdit }) {
  const tr = useConfigLabel();
  return (
    <InstitutionRowActions
      row={row}
      api={institutionModuleApi}
      what={tr("Institution Module")}
      facts={[
        [tr("Module"), displayValue(row.module_name ?? row.module_id)],
        ...(canChooseInstitution() ? [[tr("Institution"), row.inst_profile_name ?? row.inst_profile_id]] : []),
        [tr("Effective from"), displayValue(row.effective_from)],
        [tr("Effective to"), displayValue(row.effective_to)],
      ]}
      auditTitle={row.module_name ?? `#${row.module_id}`}
      auditFields={[["module_name", tr("Module")], ["inst_profile_name", tr("Institution")], ["effective_from", tr("Effective from")], ["effective_to", tr("Effective to")]]}
      onEdit={onEdit}
      onRefresh={onRefresh}
    />
  );
}

export function InstitutionModule() {
  const tr = useConfigLabel();
  const canAdd = useHasInstitutionAction("Add");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const list = useServerList({ api: API_ENDPOINTS.INSTITUTION.INSTITUTION_MODULE.LIST, call: institutionModuleApi.list });
  const query = asQuery(list);
  const institutions = useActiveInstitutionsQuery();
  const { masterModules } = useMasterModules();
  const addMutation = useApiMutation(institutionModuleApi, "add");
  const editMutation = useApiMutation(institutionModuleApi, "edit");
  const columns = mergeStatusColumns([
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
  ]);
  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <PageTitle>
            {tr("Institution Module")}
          </PageTitle>
          <p className="mt-1 text-sm text-muted-foreground">
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
      <ListTable list={list} actions={canAdd && (
          <Button
            size="xs"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}>
            <Plus size={14} /> {tr("Add")} {tr("module")}
          </Button>
        )} columns={columns} rowKey={(row) => row.id} title={tr("Institution Module")} emptyTitle={tr("No institution modules found")} emptyDescription={tr("Module assignments will appear here when available.")} /><Modal
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
  // A bank / fintech user is always in its own institution: no picker.
  const canChoose = useCanChooseInstitution();
  const ownInstitution = useAuth((state) => state.user?.inst_profile_id);
  const [form, setForm] = useState({
    inst_profile_id: editing?.inst_profile_id ?? (canChoose ? "" : (ownInstitution ?? "")),
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
      {!editing && canChoose && (
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
            <RequiredMark />
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
              <RequiredMark />
              <DateInput
                required
                value={form.effective_from}
                onChange={set("effective_from")}
                className="mt-1.5 w-full rounded-xl border border-border p-3"
              />
            </label>
            <label className="text-sm font-medium">
              Effective to
              <DateInput
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
                <RequiredMark />
                <FilterSelect
                  className="mt-1.5"
                  value={row.module_id}
                  onChange={(next) => setModuleRow(index, "module_id")({ target: { value: next } })}
                  options={[
                    { value: "", label: tr("Select module") },
                    // A module picked on another row is not offered again.
                    ...masterModules
                      .filter((item) => !moduleRows.some((other, j) => j !== index && String(other.module_id) === String(item.module_id ?? item.id)))
                      .map((item) => ({
                        value: item.module_id ?? item.id,
                        label: item.module_name ?? item.name,
                      })),
                  ]}
                />
              </label>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="text-sm font-medium">
                  Effective from
                  <DateInput
                    required
                    value={row.effective_from}
                    onChange={setModuleRow(index, "effective_from")}
                    className="mt-1.5 w-full rounded-xl border border-border p-3"
                  />
                </label>
                <label className="text-sm font-medium">
                  Effective to
                  <DateInput
                    value={row.effective_to}
                    onChange={setModuleRow(index, "effective_to")}
                    className="mt-1.5 w-full rounded-xl border border-border p-3"
                  />
                </label>
              </div>
            </div>
          ))}
          <LinkButton
            onClick={addModuleRow}
            className="text-sm font-semibold"
          >
            + Add another module
          </LinkButton>
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
        <Button
          type="submit"
          disabled={pending}
        >
          {pending ? "Saving..." : editing ? "Save changes" : "Assign Module"}
        </Button>
      </div>
    </form>
  );
}
