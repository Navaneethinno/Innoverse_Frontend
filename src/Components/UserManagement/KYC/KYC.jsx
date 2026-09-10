import { useMemo, useState } from "react";
import {
  Eye,
  History,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Send,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from "lucide-react";
import { AuditModal } from "@/Components/Common/AuditModal";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { DataTable } from "@/Components/Common/DataTable";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { StatusFilterTabs, statusBucket } from "@/Components/Common/StatusFilterTabs";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { Modal } from "@/Components/Common/Modal";
import { actionButtonClass } from "@/Components/Common/actionStyles";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { useHasKycAction, useKycMutation, useKycQuery } from "@/Hooks/Users/kycHooks";
import { usersApi } from "@/Services/Users/users.api";
import { notifications } from "@/Utils/Lib/notifications";

const EMPTY = {
  user_id: "",
  user_fname: "",
  user_mname: "",
  user_lname: "",
  employee_id: "",
  email: "",
  mobile: "",
  gender: "",
  address: "",
  alternate_mob: "",
  alternate_email: "",
};

const FORM_FIELDS = [
  ["user_id", "User ID"],
  ["user_fname", "First name"],
  ["user_mname", "Middle name"],
  ["user_lname", "Last name"],
  ["employee_id", "Employee ID"],
  ["email", "Email"],
  ["mobile", "Mobile"],
  ["gender", "Gender"],
  ["address", "Address"],
  ["alternate_mob", "Alternate mobile"],
  ["alternate_email", "Alternate email"],
];

const AUDIT_FIELDS = [
  ["user_id", "User ID"],
  ["user_name", "Username"],
  ["first_name", "First name"],
  ["last_name", "Last name"],
  ["employee_id", "Employee ID"],
  ["email", "Email"],
  ["mobile", "Mobile"],
  ["gender", "Gender"],
];

const idOf = (row) => row?.user_id ?? row?.id;
const textOf = (row) =>
  `${row?.user_name ?? ""} ${row?.first_name ?? row?.user_fname ?? ""} ${row?.last_name ?? row?.user_lname ?? ""} ${row?.employee_id ?? ""} ${row?.email ?? ""} ${row?.mobile ?? ""}`;
const isPending = (row) => String(row?.process_status_name ?? row?.status_name ?? "").toLowerCase().includes("pending") ||
  String(row?.auth_status ?? "").toUpperCase() === "AUTH WAIT" ||
  Number(row?.status) === 9;
const isInactive = (row) => String(row?.status_name ?? "").toLowerCase().includes("inactive");
const isPendingDelete = (row) =>
  String(row?.process_status_name ?? "").toLowerCase().includes("pending delete");
const displayName = (row) =>
  row?.user_name || `${row?.first_name ?? row?.user_fname ?? ""} ${row?.last_name ?? row?.user_lname ?? ""}`.trim();

function normalizeForm(row) {
  return {
    ...EMPTY,
    ...row,
    user_fname: row?.user_fname ?? row?.first_name ?? "",
    user_mname: row?.user_mname ?? row?.middle_name ?? "",
    user_lname: row?.user_lname ?? row?.last_name ?? "",
  };
}

function KycForm({ open, form, setForm, editing, onSave, onClose, pending }) {
  return (
    <Modal
      open={open}
      title={editing ? "Edit user KYC" : "Add user KYC"}
      onClose={onClose}
      size="xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-lg px-3.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">
            Cancel
          </button>
          <button type="button" disabled={pending} onClick={() => onSave(true)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-50">
            Save as draft
          </button>
          <button type="button" disabled={pending} onClick={() => onSave(false)} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {editing ? "Submit changes" : "Submit"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {FORM_FIELDS.map(([key, label]) => (
          <label key={key} className={key === "address" ? "text-sm font-medium text-slate-700 md:col-span-2" : "text-sm font-medium text-slate-700"}>
            <span className="mb-1.5 block">{label}</span>
            {key === "address" ? (
              <textarea
                value={form[key] ?? ""}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                className="min-h-24 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 outline-none focus:border-blue-400"
              />
            ) : (
              <input
                required={["user_id", "user_fname", "user_lname"].includes(key)}
                disabled={editing && key === "user_id"}
                type={key.includes("email") ? "email" : "text"}
                value={form[key] ?? ""}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-500"
              />
            )}
          </label>
        ))}
      </div>
    </Modal>
  );
}

function KycActions({ row, onEdit, onView, onAudit, onRefresh }) {
  const canEdit = useHasKycAction("Edit");
  const canAuthorize = useHasKycAction("Authorize");
  const canDelete = useHasKycAction("Delete");
  const canChangeStatus = useHasKycAction("Change Status");
  const canSubmit = useHasKycAction("Submit");
  const [action, setAction] = useState(null);
  const [narration, setNarration] = useState("");
  const mutation = useKycMutation(action?.method || "kycSubmit");
  const pendingInfo = usePendingChanges(
    ({ id }) => usersApi.kycPending({ user_id: id }),
    idOf(row),
    ["kycAuth", "kycDeauth"].includes(action?.method),
  );

  const pending = isPending(row);
  const draft = Number(row?.status) === 9;
  const pendingDelete = isPendingDelete(row);
  const locked = pending && !draft;
  const inactive = isInactive(row);
  const actions = [
    ...(canSubmit && draft ? [["kycSubmit", "Submit Draft", Send, "submit"]] : []),
    ...(canAuthorize && locked && !pendingDelete ? [["kycAuth", "Authorize", ShieldCheck, "auth"], ["kycDeauth", "Deauthorize", ShieldOff, "deauth"]] : []),
    ...(canDelete && !pending ? [["kycDelete", "Delete", Trash2, "delete"]] : []),
    ...(canAuthorize && pendingDelete ? [["kycDeleteAuth", "Authorize Delete", ShieldCheck, "deleteAuth"]] : []),
    ...(canChangeStatus && !pending && !inactive ? [["kycDeactivate", "Deactivate", PowerOff, "deactivate"]] : []),
    ...(canChangeStatus && !pending && inactive ? [["kycReactivate", "Reactivate", Power, "reactivate"]] : []),
  ];

  const execute = async () => {
    if (!action) return;
    try {
      await mutation.mutateAsync({ user_id: idOf(row), narration });
      await onRefresh();
      setAction(null);
      setNarration("");
    } catch {
      // Toast already comes from the mutation hook.
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-1">
        <UiTooltip label="View">
          <button type="button" onClick={() => onView(row)} className={actionButtonClass("view")}>
            <Eye size={14} />
          </button>
        </UiTooltip>
        {canEdit && !locked && (
          <UiTooltip label="Edit">
            <button type="button" onClick={() => onEdit(row)} className={actionButtonClass("edit")}>
              <Pencil size={14} />
            </button>
          </UiTooltip>
        )}
        <UiTooltip label="Audit">
          <button type="button" onClick={() => onAudit(row)} className={actionButtonClass("view")}>
            <History size={14} />
          </button>
        </UiTooltip>
        {actions.map(([method, label, Icon, style]) => (
          <UiTooltip key={method} label={label}>
            <button type="button" onClick={() => setAction({ method, label, style })} className={actionButtonClass(style)}>
              <Icon size={14} />
            </button>
          </UiTooltip>
        ))}
      </div>

      <ConfirmDialog
        open={!!action}
        title={`${action?.label ?? "Action"} user KYC`}
        confirmLabel={action?.label ?? "Confirm"}
        destructive={["delete", "deleteAuth"].includes(action?.style)}
        pending={mutation.isPending}
        confirmDisabled={action?.method === "kycDeauth" && !narration.trim()}
        onClose={() => {
          setAction(null);
          setNarration("");
        }}
        onConfirm={() => void execute()}
      >
        {["kycAuth", "kycDeauth"].includes(action?.method) && <PendingChangesDiff {...pendingInfo} />}
        <label className="mt-3 block text-xs font-bold uppercase tracking-wider text-slate-500">
          Narration{action?.method === "kycDeauth" ? " *" : ""}
          <textarea
            value={narration}
            onChange={(event) => setNarration(event.target.value)}
            placeholder={action?.method === "kycDeauth" ? "Narration is required" : "Narration"}
            className="mt-1.5 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-blue-400"
          />
        </label>
      </ConfirmDialog>
    </>
  );
}

export function KYC() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [auditRow, setAuditRow] = useState(null);

  const query = useKycQuery({ page, limit: 10 });
  const add = useKycMutation("kycAdd");
  const edit = useKycMutation("kycEdit");
  const canAdd = useHasKycAction("Add");
  const rows = Array.isArray(query.data) ? query.data : [];

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesTab = tab === "all" || statusBucket(row) === tab;
      const matchesSearch = !q || textOf(row).toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [rows, search, tab]);

  const save = async (draft) => {
    const userId = Number(form.user_id);
    if (!Number.isInteger(userId) || userId <= 0 || !form.user_fname.trim() || !form.user_lname.trim()) {
      notifications.error("User ID, first name, and last name are required");
      return;
    }
    try {
      const payload = { ...form, user_id: userId, is_draft: draft };
      if (editing) await edit.mutateAsync(payload);
      else await add.mutateAsync(payload);
      setEditing(null);
      setForm(EMPTY);
      setShowForm(false);
      await query.refetch();
    } catch {
      // Toast already comes from the mutation hook.
    }
  };

  const columns = [
    {
      key: "user",
      label: "User",
      align: "left",
      render: (row) => displayName(row) || "-",
    },
    { key: "employee_id", label: "Employee ID", render: (row) => row.employee_id ?? "-" },
    { key: "email", label: "Email", render: (row) => row.email ?? "-" },
    { key: "mobile", label: "Mobile", render: (row) => row.mobile ?? "-" },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status_name ?? row.auth_status ?? row.status ?? "")} /> },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (row) => (
        <KycActions
          row={row}
          onRefresh={query.refetch}
          onEdit={(nextRow) => {
            setEditing(nextRow);
            setForm(normalizeForm(nextRow));
            setShowForm(true);
          }}
          onView={setViewRow}
          onAudit={setAuditRow}
        />
      ),
    },
  ];

  return (
    <div className="pt-3 pb-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-blue-500">User Management</p>
          <h1 className="text-xl font-black text-slate-800">User KYC</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">Manage user KYC and personal details.</p>
        </div>
        {canAdd && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setForm(EMPTY);
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-200/50"
          >
            <Plus size={14} /> Add KYC
          </button>
        )}
      </div>

      <div className="mb-4">
        <StatusFilterTabs rows={rows} value={tab} onChange={setTab} search={search} onSearch={setSearch} searchPlaceholder="Search KYC records..." />
      </div>

      <DataTable
        columns={columns}
        rows={visibleRows}
        isLoading={query.isLoading}
        rowKey={(row) => idOf(row)}
        title="User KYC"
        searchableKeys={["user_name", "first_name", "last_name", "employee_id", "email", "mobile"]}
        emptyTitle="No KYC records found"
        serverPagination={{
          page,
          totalPages: query.pagination?.totalPages ?? 1,
          totalRecords: query.pagination?.totalRecords ?? rows.length,
          onPageChange: setPage,
        }}
        fetchMore={async (nextPage, limit) => {
          const result = await usersApi.kycList({ page: nextPage, limit });
          return {
            rows: Array.isArray(result?.data) ? result.data : [],
            totalPages: result?.pagination?.totalPages ?? 1,
          };
        }}
      />

      <KycForm
        open={showForm}
        form={form}
        setForm={setForm}
        editing={editing}
        pending={add.isPending || edit.isPending}
        onSave={save}
        onClose={() => {
          setEditing(null);
          setForm(EMPTY);
          setShowForm(false);
        }}
      />

      {viewRow && (
        <Modal open title="View user KYC" onClose={() => setViewRow(null)} size="lg">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FORM_FIELDS.map(([key, label]) => (
              <div key={key} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{normalizeForm(viewRow)[key] || "-"}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <StatusBadge status={String(viewRow.status_name ?? viewRow.auth_status ?? "")} />
          </div>
        </Modal>
      )}

      {auditRow && (
        <AuditModal
          title={displayName(auditRow) || `KYC #${idOf(auditRow)}`}
          fields={AUDIT_FIELDS}
          onClose={() => setAuditRow(null)}
          fetchAudit={async (auditPage, limit) => {
            const result = await usersApi.kycAudit({ user_id: idOf(auditRow), page: auditPage, limit });
            return {
              entries: Array.isArray(result?.data) ? result.data : [],
              totalPages: result?.pagination?.totalPages ?? 1,
            };
          }}
        />
      )}
    </div>
  );
}
