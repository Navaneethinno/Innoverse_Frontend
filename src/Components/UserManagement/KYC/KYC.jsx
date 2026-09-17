import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { RowActions } from "@/Components/Common/RowActions";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { DataTable } from "@/Components/Common/DataTable";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { StatusFilterTabs, statusBucket } from "@/Components/Common/StatusFilterTabs";
import { Modal } from "@/Components/Common/Modal";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { useActiveUsersForKycQuery, useGenderOptionsQuery, useHasKycAction, useKycMutation, useKycQuery } from "@/Hooks/Users/kycHooks";
import { usersApi } from "@/Services/Users/users.api";
import { notifications } from "@/Utils/Lib/notifications";
import { AuditKyc } from "./AuditKyc";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";

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
  ["user_id", "User"],
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

const idOf = (row) => row?.user_id ?? row?.id;
const textOf = (row) =>
  `${row?.user_name ?? ""} ${row?.first_name ?? row?.user_fname ?? ""} ${row?.last_name ?? row?.user_lname ?? ""} ${row?.employee_id ?? ""} ${row?.email ?? ""} ${row?.mobile ?? ""}`;
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

function KycForm({ open, form, setForm, editing, onSave, onClose, pending, users, usersLoading, usersError, genders, gendersLoading, gendersError }) {
  const isValid = Number.isInteger(Number(form.user_id)) && Number(form.user_id) > 0 && form.user_fname.trim() && form.user_lname.trim();
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
          <button type="button" disabled={pending || !isValid} onClick={() => onSave(true)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-50">
            Save as draft
          </button>
          <button type="button" disabled={pending || !isValid} onClick={() => onSave(false)} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {editing ? "Submit changes" : "Submit"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {FORM_FIELDS.map(([key, label]) => (
          <label key={key} className={key === "address" ? "text-sm font-medium text-slate-700 md:col-span-2" : "text-sm font-medium text-slate-700"}>
            <span className="mb-1.5 block">{label}</span>
            {key === "user_id" ? (
              <FilterSelect
                className="w-full"
                disabled={Boolean(editing) || usersLoading}
                value={form.user_id ?? ""}
                onChange={(next) => setForm({ ...form, user_id: next })}
                options={[
                  { value: "", label: usersLoading ? "Loading users..." : "Select user" },
                  ...users.map((user) => {
                    const id = user?.user_id ?? user?.id;
                    const label = user?.user_name ?? user?.username ?? user?.name ?? `User #${id}`;
                    return { value: id, label };
                  }),
                ]}
              />
            ) : key === "gender" ? (
              <FilterSelect
                className="w-full"
                value={form.gender ?? ""}
                disabled={gendersLoading}
                onChange={(next) => setForm({ ...form, gender: next })}
                options={[
                  { value: "", label: gendersLoading ? "Loading genders..." : "Select gender" },
                  ...genders.map((gender) => {
                    const value = gender?.gender_code ?? gender?.code ?? gender?.id ?? gender?.gender_id;
                    const label = gender?.gender_name ?? gender?.name ?? gender?.description ?? value;
                    return { value, label };
                  }),
                ]}
              />
            ) : key === "address" ? (
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
            {key === "user_id" && usersError && (
              <p className="mt-1 text-xs font-medium text-red-600">{usersError.message}</p>
            )}
            {key === "gender" && gendersError && (
              <p className="mt-1 text-xs font-medium text-red-600">{gendersError.message}</p>
            )}
          </label>
        ))}
      </div>
    </Modal>
  );
}

function KycActions({ row, onEdit, onView, onAudit, onRefresh }) {
  const canAdd = useHasKycAction("Add");
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
    ["kycAuth", "kycDeauth", "kycDeleteAuth"].includes(action?.method),
  );

  const visibility = getMakerCheckerButtons(row, { canAdd, canEdit, canAuthorize, canChangeStatus, canDelete, canSubmit });
  const pendingMethod = visibility.isPendingDelete ? "kycDeleteAuth" : "kycAuth";

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
      <RowActions
        buttons={visibility}
        onView={() => onView(row)}
        onEdit={() => onEdit(row)}
        onAudit={() => onAudit(row)}
        onSubmit={() => setAction({ method: "kycSubmit", label: tr("Submit Draft") })}
        onAuthorize={() => setAction({ method: pendingMethod, label: "Authorize" })}
        onDeauthorize={() => setAction({ method: "kycDeauth", label: "Deauthorize" })}
        onDeactivate={() => setAction({ method: "kycDeactivate", label: "Deactivate" })}
        onReactivate={() => setAction({ method: "kycReactivate", label: "Activate" })}
        onDelete={() => setAction({ method: "kycDelete", label: "Delete" })}
      />

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
  const tr = useConfigLabel();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [auditRow, setAuditRow] = useState(null);

  const query = useKycQuery({ page, limit });
  const activeUsersQuery = useActiveUsersForKycQuery();
  const gendersQuery = useGenderOptionsQuery();
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
      label: tr("User"),
      align: "left",
      render: (row) => displayName(row) || "-",
    },
    { key: "employee_id", label: tr("Employee ID"), render: (row) => row.employee_id ?? "-" },
    { key: "email", label: tr("Email"), render: (row) => row.email ?? "-" },
    { key: "mobile", label: tr("Mobile"), render: (row) => row.mobile ?? "-" },
    { key: "status", label: tr("Status"), render: (row) => (row.status_name != null || row.status != null ? <StatusBadge status={String(row.status_name ?? (row.status === 1 ? "ACTIVE" : "INACTIVE"))} /> : "—") }, { key: "process_status_name", label: tr("Process Status"), render: (row) => (row.process_status_name ? <StatusBadge status={String(row.process_status_name)} /> : "—") }, { key: "auth_status", label: tr("Authorization Status"), render: (row) => (row.auth_status ? <StatusBadge status={String(row.auth_status)} /> : "—") },
    {
      key: "actions",
      label: tr("Actions"),
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
    <div className="pt-1 pb-6">
      <div className="mb-3">
        <h1 className="text-xl font-black text-slate-800">User KYC</h1>
        <p className="mt-1 text-xs font-medium text-slate-500">Manage user KYC and personal details.</p>
      </div>

      <div className="mb-4 overflow-hidden rounded-2xl" style={{ background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" }}><StatusFilterTabs rows={rows} value={tab} onChange={setTab} search={search} onSearch={setSearch} searchPlaceholder="Search KYC records..." actions={canAdd && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setForm(EMPTY);
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white"
          >
            <Plus size={14} /> {tr("Add")} KYC
          </button>
        )} bare /><DataTable
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
          limit,
          onLimitChange: (next) => {
            setLimit(next);
            setPage(1);
          },
        }}
        fetchMore={async (nextPage, limit) => {
          const result = await usersApi.kycList({ page: nextPage, limit });
          return {
            rows: Array.isArray(result?.data) ? result.data : [],
            totalPages: result?.pagination?.totalPages ?? 1,
          };
        }}
      bare /></div>

      <KycForm
        open={showForm}
        form={form}
        setForm={setForm}
        editing={editing}
        pending={add.isPending || edit.isPending}
        users={activeUsersQuery.users}
        usersLoading={activeUsersQuery.isLoading}
        usersError={activeUsersQuery.error}
        genders={gendersQuery.genders}
        gendersLoading={gendersQuery.isLoading}
        gendersError={gendersQuery.error}
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

      <AuditKyc kyc={auditRow} onClose={() => setAuditRow(null)} />
    </div>
  );
}
