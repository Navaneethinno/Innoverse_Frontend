import { useState } from "react";
import {
  AlertCircle,
  Edit3,
  Eye,
  History,
  Plus,
  Power,
  PowerOff,
  Send,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from "lucide-react";
import { DataTable } from "@/Components/Common/DataTable";
import { Modal } from "@/Components/Common/Modal";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { AuditModal } from "@/Components/Common/AuditModal";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { institutionLegalApi } from "@/Services/Institutions/institutionLegal.api";
import {
  useInstitutionLegalMutation,
  useInstitutionLegalsQuery,
} from "@/Hooks/Institutions/institutionLegalHooks";
import {
  useActiveInstitutionsQuery,
  useHasInstitutionAction,
} from "@/Hooks/Institutions/institutionHooks";

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
    !!action && ["auth", "deauth"].includes(action.method),
  );
  const status = String(row.status_name ?? row.auth_status ?? "").toLowerCase();
  const process = String(row.process_status_name ?? "").toLowerCase();
  const draft = row.status === 9 || status === "draft" || process === "draft";
  const pending = process.includes("pending");
  const pendingDelete = process.includes("pending delete");
  const active = row.status === 1 || status === "active";
  const inactive = row.status === 13 || status === "inactive";
  const rejectedDelete = process.includes("rejected delete") || status.includes("rejected delete");
  const actions = [
    ...(draft ? [["submit", "Submit", Send]] : []),
    ...(pending && canAuthorize
      ? [
          ["pending", "Pending", History],
          ["auth", "Authorize", ShieldCheck],
          ["deauth", "Reject", ShieldOff],
        ]
      : []),
    ...((active || rejectedDelete) && !pending && canDelete ? [["delete", "Delete", Trash2]] : []),
    ...(pendingDelete && canAuthorize ? [["deleteAuth", "Delete Auth", Trash2]] : []),
    ...(active && !pending && canChangeStatus ? [["deactivate", "Deactivate", PowerOff]] : []),
    ...(inactive && !pending && canChangeStatus ? [["reactivate", "Reactivate", Power]] : []),
  ];
  const execute = async () => {
    try {
      await mutation.mutateAsync({ id: row.id, narration });
      await onRefresh();
      setAction(null);
      setNarration("");
    } catch {
      /* mutation hook already shows the error toast */
    }
  };
  return (
    <>
      <div className="flex flex-wrap justify-center gap-1">
        <UiTooltip label="View">
          <button
            type="button"
            onClick={() => setDetails(row)}
            className="rounded-lg p-1.5 text-primary hover:bg-primary/10"
          >
            <Eye size={14} />
          </button>
        </UiTooltip>
        {canEdit && !pending && !pendingDelete && !rejectedDelete && (
          <UiTooltip label="Edit">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg p-1.5 text-primary hover:bg-primary/10"
            >
              <Edit3 size={14} />
            </button>
          </UiTooltip>
        )}
        <UiTooltip label="Audit">
          <button
            type="button"
            onClick={() => setAudit(true)}
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
          >
            <History size={14} />
          </button>
        </UiTooltip>
        {actions.map(([method, label, Icon]) => (
          <UiTooltip key={method} label={label}>
            <button
              type="button"
              onClick={() => setAction({ method, label })}
              className="rounded-lg p-1.5 text-primary hover:bg-primary/10"
            >
              <Icon size={14} />
            </button>
          </UiTooltip>
        ))}
      </div>
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
        {["auth", "deauth"].includes(action?.method) && <PendingChangesDiff {...pendingInfo} />}
        {action?.method !== "pending" && (
          <textarea
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder="Narration"
            className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm"
          />
        )}
      </ConfirmDialog>
      <Modal
        open={!!details}
        onClose={() => setDetails(null)}
        title="View institution legal"
        size="md"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {FIELDS.map(([key, label]) => (
            <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
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

export function InstitutionLegalPage() {
  const canAdd = useHasInstitutionAction("Add");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const query = useInstitutionLegalsQuery({ page, limit: 10 });
  const institutions = useActiveInstitutionsQuery();
  const add = useInstitutionLegalMutation("add");
  const edit = useInstitutionLegalMutation("edit");
  const columns = [
    {
      key: "legal_name",
      label: "Legal Name",
      render: (r) => (
        <span className="font-semibold text-foreground">{value(r, "legal_name")}</span>
      ),
    },
    {
      key: "inst_profile_name",
      label: "Institution",
      render: (r) => value(r, "inst_profile_name"),
    },
    {
      key: "registration_number",
      label: "Registration",
      render: (r) => value(r, "registration_number"),
    },
    { key: "license_number", label: "License", render: (r) => value(r, "license_number") },
    {
      key: "status",
      label: "Status",
      sortValue: (r) => r.status_name ?? r.auth_status ?? r.status ?? "",
      render: (r) => (
        <StatusBadge status={String(r.status_name ?? r.auth_status ?? r.status ?? "")} />
      ),
    },
    {
      key: "actions",
      label: "Actions",
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
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
            Institution
          </p>
          <h1 className="text-xl font-black tracking-tight text-foreground">Institution Legal</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage institution legal and regulatory profiles.
          </p>
        </div>
        {canAdd && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-bold text-primary-foreground"
          >
            <Plus size={14} /> Add legal profile
          </button>
        )}
      </div>
      {query.error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle size={14} /> {query.error.message}
        </div>
      )}
      <DataTable
        columns={columns}
        rows={query.data}
        rowKey={(r) => r.id}
        isLoading={query.isLoading}
        title="Institution Legal"
        searchableKeys={["legal_name", "inst_profile_name", "registration_number"]}
        emptyTitle="No legal profiles found"
        emptyDescription="Legal profiles will appear here when available."
        serverPagination={{
          page: query.pagination.currentPage ?? page,
          totalPages: query.pagination.totalPages ?? 1,
          totalRecords: query.pagination.totalRecords ?? query.data.length,
          onPageChange: setPage,
        }}
      />
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit institution legal" : "Add institution legal"}
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
        const { inst_profile_id, ...legal } = form;
        void onSubmit(editing ? legal : { inst_profile_id: Number(inst_profile_id), ...legal });
      }}
    >
      {!editing && (
        <label className="text-sm font-medium sm:col-span-2">
          Institution
          <select
            required
            value={form.inst_profile_id}
            onChange={set("inst_profile_id")}
            className="mt-1.5 w-full rounded-xl border border-slate-200 p-3"
          >
            <option value="">Select institution</option>
            {institutions.map((i) => (
              <option key={i.id ?? i.inst_profile_id} value={i.id ?? i.inst_profile_id}>
                {i.name ?? i.inst_profile_name ?? i.code}
              </option>
            ))}
          </select>
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
            className="mt-1.5 w-full rounded-xl border border-slate-200 p-3"
          />
        </label>
      ))}
      <label className="text-sm font-medium sm:col-span-2">
        Narration
        <textarea
          value={form.narration}
          onChange={set("narration")}
          className="mt-1.5 min-h-20 w-full rounded-xl border border-slate-200 p-3"
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
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
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
