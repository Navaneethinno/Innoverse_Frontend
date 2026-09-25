import { useState } from "react";
import { AlertCircle, Plus } from "lucide-react";
import { RowActions } from "@/Components/Common/RowActions";
import { DataTable } from "@/Components/Common/DataTable";
import { Modal } from "@/Components/Common/Modal";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { notifications } from "@/Utils/Lib/notifications";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { AuditModal } from "@/Components/Common/AuditModal";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { StatusFilterTabs } from "@/Components/Common/StatusFilterTabs";
import { institutionLegalApi } from "@/Services/Institution/institutionLegal.api";
import {
  useInstitutionLegalMutation,
  useInstitutionLegalsQuery,
} from "@/Hooks/Institution/institutionLegalHooks";
import {
  useActiveInstitutionsQuery,
  useHasInstitutionAction,
} from "@/Hooks/Institution/institutionHooks";
import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";

const FIELDS = [
  ["legal_name", "Legal Name"],
  ["short_name", "Short Name"],
  ["registered_name", "Registered Name"],
  ["registration_number", "Registration Number"],
  ["tax_identifier", "Tax Identifier"],
  ["incorporation_date", "Incorporation Date"],
  ["regulator_name", "Regulator Name"],
  ["license_number", "License Number"],
  ["license_type", "License Type"],
  ["license_category", "License Category"],
  ["license_start_date", "License Start Date"],
  ["license_expiry_date", "License Expiry Date"],
  ["registered_address", "Registered Address"],
  ["business_address", "Business Address"],
  ["contact_email", "Contact Email"],
  ["contact_phone", "Contact Phone"],
  ["website", "Website"],
];
const value = (row, key) => row?.[key] ?? "—";

function LegalActions({ row, onRefresh, onEdit }) {
  const tr = useConfigLabel();
  const canAdd = useHasInstitutionAction("Add");
  const canEdit = useHasInstitutionAction("Edit");
  const canAuthorize = useHasInstitutionAction("Authorize");
  const canDelete = useHasInstitutionAction("Delete");
  const canChangeStatus = useHasInstitutionAction("Change Status");
  const [action, setAction] = useState(null);
  const [details, setDetails] = useState(null);
  const [audit, setAudit] = useState(false);
  const [narration, setNarration] = useState("");
  const mutation = useInstitutionLegalMutation(action?.method ?? "submit");
  const pendingInfo = usePendingChanges(
    institutionLegalApi.pending,
    row.id,
    !!action && ["auth", "deauth", "deleteAuth"].includes(action.method),
  );
  // Single shared status-based visibility engine — see buttonVisibility.js
  // for the full status_name/process_status_name matrix this is built from.
  const buttons = getMakerCheckerButtons(row, { canAdd, canEdit, canAuthorize, canChangeStatus, canDelete });
  const execute = async () => {
    try {
      await mutation.mutateAsync({ id: row.id, narration: narration.trim() });
      await onRefresh();
      setAction(null);
      setNarration("");
    } catch {
      /* mutation hook already shows the error toast */
    }
  };
  const pendingType = buttons.isPendingDelete ? "deleteAuth" : "auth";
  return (
    <>
      <RowActions
        buttons={buttons}
        onView={() => setDetails(row)}
        onEdit={onEdit}
        onAudit={() => setAudit(true)}
        onSubmit={() => setAction({ method: "submit", label: "Submit" })}
        onAuthorize={() => setAction({ method: pendingType, label: "Authorize" })}
        onDeauthorize={() => setAction({ method: "deauth", label: "Deauthorize" })}
        onDeactivate={() => setAction({ method: "deactivate", label: "Deactivate" })}
        onReactivate={() => setAction({ method: "reactivate", label: "Activate" })}
        onDelete={() => setAction({ method: "delete", label: "Delete" })}
      />
      <ConfirmDialog
        open={!!action}
        title={`${action?.label ?? "Action"} institution legal`}
        confirmLabel={action?.label}
        destructive={["deauth", "delete", "deleteAuth"].includes(action?.method)}
        pending={mutation.isPending}
        confirmDisabled={action?.method === "deauth" && !narration.trim()}
        onClose={() => setAction(null)}
        onConfirm={() => void execute()}
      >
        {["auth", "deauth", "deleteAuth"].includes(action?.method) && <PendingChangesDiff {...pendingInfo} />}
        {action?.method !== "pending" && (
          <textarea
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder="Narration"
            className="mt-3 min-h-20 w-full rounded-xl border border-border p-3 text-sm"
          />
        )}
      </ConfirmDialog>
      <Modal
        open={!!details}
        onClose={() => setDetails(null)}
        title={tr("View institution legal")}
        size="md"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {FIELDS.map(([key, label]) => (
            <div key={key} className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs font-semibold text-muted-foreground">{label}</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{value(details, key)}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <StatusBadge
            status={String(details?.status_name ?? details?.auth_status ?? details?.status ?? "")}
          />
        </div>
      </Modal>
      {audit && (
        <AuditModal
          title={row.legal_name ?? `Legal #${row.id}`}
          fields={FIELDS}
          onClose={() => setAudit(false)}
          fetchAudit={(page, limit) =>
            institutionLegalApi.audit({ id: row.id, page, limit }).then((r) => ({
              entries: Array.isArray(r?.data) ? r.data : [],
              totalPages: r?.pagination?.totalPages ?? 1,
            }))
          }
        />
      )}
    </>
  );
}

export function InstitutionLegal() {
  const tr = useConfigLabel();
  const canAdd = useHasInstitutionAction("Add");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("desc");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const query = useInstitutionLegalsQuery({ filter: statusFilter, sort_by: sortBy });
  const institutions = useActiveInstitutionsQuery();
  const add = useInstitutionLegalMutation("add");
  const edit = useInstitutionLegalMutation("edit");
  const filteredRows =
    !search.trim() && statusFilter === "all"
      ? query.data
      : query.data.filter(
          (row) =>
            JSON.stringify(row).toLowerCase().includes(search.trim().toLowerCase()),
        );
  const columns = [
    {
      key: "legal_name",
      label: tr("Legal Name"),
      render: (r) => (
        <span className="font-semibold text-foreground">{value(r, "legal_name")}</span>
      ),
    },
    {
      key: "inst_profile_name",
      label: tr("Institution"),
      render: (r) => value(r, "inst_profile_name"),
    },
    {
      key: "registration_number",
      label: tr("Registration"),
      render: (r) => value(r, "registration_number"),
    },
    { key: "license_number", label: tr("License"), render: (r) => value(r, "license_number") },
    {
      key: "status",
      label: tr("Status"),
      sortValue: (r) => r.status_name ?? r.status ?? "",
      render: (r) =>
        r.status_name != null || r.status != null ? (
          <StatusBadge status={String(r.status_name ?? (r.status === 1 ? "ACTIVE" : "INACTIVE"))} />
        ) : (
          "—"
        ),
    },
    {
      key: "process_status_name",
      label: tr("Process Status"),
      sortValue: (r) => r.process_status_name ?? "",
      render: (r) => (r.process_status_name ? <StatusBadge status={String(r.process_status_name)} variant="subtle" /> : "—"),
    },
    {
      key: "auth_status",
      label: tr("Authorization Status"),
      sortValue: (r) => r.auth_status ?? "",
      render: (r) => (r.auth_status ? <StatusBadge status={String(r.auth_status)} variant="subtle" /> : "—"),
    },
    {
      key: "actions",
      label: tr("Actions"),
      sortable: false,
      render: (r) => (
        <LegalActions
          row={r}
          onRefresh={query.refetch}
          onEdit={() => {
            setEditing(r);
            setFormOpen(true);
          }}
        />
      ),
    },
  ];
  const submit = async (values) => {
    try {
      if (editing)
        await edit.mutateAsync({
          id: editing.id,
          ...values,
          ...(editing.updated_time ? { expected_updated_time: editing.updated_time } : {}),
        });
      else await add.mutateAsync(values);
      setFormOpen(false);
      await query.refetch();
    } catch {
      /* mutation hook already shows the error toast */
    }
  };
  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-foreground">{tr("Institution Legal")}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {tr("Manage institution legal and regulatory profiles.")}
          </p>
        </div>
        
      </div>
      {query.error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle size={14} /> {query.error.message}
        </div>
      )}
      <div className="overflow-hidden rounded-2xl" style={{ background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" }}><StatusFilterTabs serverFiltered sortBy={sortBy} onSortChange={setSortBy}
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
            <Plus size={14} /> {tr("Add")} {tr("legal profile")}
          </button>
        )}
      bare /><DataTable serverSorted
        columns={columns}
        rows={filteredRows}
        rowKey={(r) => r.id}
        isLoading={query.isLoading}
        title={tr("Institution Legal")}
        searchableKeys={["legal_name", "inst_profile_name", "registration_number"]}
        emptyTitle={tr("No legal profiles found")}
        emptyDescription={tr("Legal profiles will appear here when available.")}
      bare /></div><Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? tr("Edit institution legal") : tr("Add institution legal")}
        size="lg"
      >
        <LegalForm
          editing={editing}
          institutions={institutions.data}
          pending={add.isPending || edit.isPending}
          onCancel={() => setFormOpen(false)}
          onSubmit={submit}
        />
      </Modal>
    </div>
  );
}

function LegalForm({ editing, institutions = [], pending, onCancel, onSubmit }) {
  const tr = useConfigLabel();
  const initial = Object.fromEntries(FIELDS.map(([key]) => [key, editing?.[key] ?? ""]));
  const [form, setForm] = useState({
    inst_profile_id: editing?.inst_profile_id ?? "",
    ...initial,
    narration: "",
    is_draft: false,
  });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        // FilterSelect has no native form control, so re-check "required"
        // (previously free from the bare <select> it replaced) by hand.
        if (!editing && !form.inst_profile_id) {
          notifications.error("Please select an institution");
          return;
        }
        const { inst_profile_id, ...legal } = form;
        void onSubmit(editing ? legal : { inst_profile_id: Number(inst_profile_id), ...legal });
      }}
    >
      {!editing && (
        <label className="text-sm font-medium sm:col-span-2">
          Institution
          <FilterSelect
            className="mt-1.5"
            value={form.inst_profile_id}
            onChange={(next) => set("inst_profile_id")({ target: { value: next } })}
            options={[
              { value: "", label: tr("Select institution") },
              ...institutions.map((i) => ({
                value: i.id ?? i.inst_profile_id,
                label: i.name ?? i.inst_profile_name ?? i.code,
              })),
            ]}
          />
        </label>
      )}
      {FIELDS.map(([key, label]) => (
        <label key={key} className="text-sm font-medium">
          {label}
          <input
            required={key === "legal_name"}
            type={key.includes("date") ? "date" : key === "contact_email" ? "email" : "text"}
            value={form[key]}
            onChange={set(key)}
            className="mt-1.5 w-full rounded-xl border border-border p-3"
          />
        </label>
      ))}
      <label className="text-sm font-medium sm:col-span-2">
        Narration
        <textarea
          value={form.narration}
          onChange={set("narration")}
          className="mt-1.5 min-h-20 w-full rounded-xl border border-border p-3"
        />
      </label>
      <div className="flex items-center justify-end gap-2 sm:col-span-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-sm">
          Cancel
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            void onSubmit(
              editing
                ? { ...form, is_draft: true }
                : {
                    inst_profile_id: Number(form.inst_profile_id),
                    ...Object.fromEntries(FIELDS.map(([key]) => [key, form[key]])),
                    narration: form.narration,
                    is_draft: true,
                  },
            )
          }
          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-slate-600"
        >
          Save as draft
        </button>
        <button
          disabled={pending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          {pending ? "Saving..." : editing ? "Save changes" : "Add legal profile"}
        </button>
      </div>
    </form>
  );
}
