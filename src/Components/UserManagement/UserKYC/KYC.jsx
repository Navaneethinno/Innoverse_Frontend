import { API_ENDPOINTS } from "@/Utils/Constant";
import { ListTable } from "@/Components/Common/ListView";
import { asQuery, useServerList } from "@/Hooks/useServerList";
import { usersApi } from "@/Services/UserManagement/users.api";
import { PageTitle } from "@/Components/Common/PageTitle";
import { useListSearch } from "@/Hooks/useListSearch";
import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { useState } from "react";
import { Plus } from "lucide-react";
import { RowActions } from "@/Components/Common/RowActions";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { Modal } from "@/Components/Common/Modal";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { SearchBox } from "@/Components/Common/SearchBox";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import {
  useGenderOptionsQuery,
  useHasKycAction,
  useKycMutation,
  useUsersWithoutKycQuery,
} from "@/Hooks/UserManagement/kycHooks";
import { useInstitutionsQuery } from "@/Hooks/Institution/institutionHooks";
import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
import { notifications } from "@/Utils/Lib/notifications";
import { AuditKyc } from "./AuditKyc";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";
import { phoneInput } from "@/Utils/Lib/phoneInput";

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

const REQUIRED = new Set(["user_id", "user_fname", "user_lname"]);

const idOf = (row) => row?.user_id ?? row?.id;
const displayName = (row) =>
  row?.user_name ||
  `${row?.first_name ?? row?.user_fname ?? ""} ${row?.last_name ?? row?.user_lname ?? ""}`.trim();

// Fields that hold a phone number: digits only (and a leading "+").
const PHONE_KEYS = ["mobile", "alternate_mob"];

function normalizeForm(row) {
  return {
    ...EMPTY,
    ...row,
    user_fname: row?.user_fname ?? row?.first_name ?? "",
    user_mname: row?.user_mname ?? row?.middle_name ?? "",
    user_lname: row?.user_lname ?? row?.last_name ?? "",
  };
}

function KycForm({
  open,
  form,
  setForm,
  editing,
  onSave,
  onClose,
  pending,
  users,
  usersLoading,
  usersError,
  genders,
  gendersLoading,
  gendersError,
  institution,
  setInstitution,
  userSearch,
}) {
  const canChoose = useCanChooseInstitution();
  const { data: institutions = [] } = useInstitutionsQuery({ limit: 100 });
  // The user being edited already has a KYC record, so the picker (users
  // without one) doesn't list them: keep their own name as the option.
  const userOptions =
    editing && !users.some((u) => String(u?.user_id ?? u?.id) === String(form.user_id))
      ? [{ user_id: form.user_id, username: displayName(editing) }, ...users]
      : users;
  const isValid =
    Number.isInteger(Number(form.user_id)) &&
    Number(form.user_id) > 0 &&
    form.user_fname.trim() &&
    form.user_lname.trim();
  return (
    <Modal
      open={open}
      title={editing ? "Edit user KYC" : "Add user KYC"}
      onClose={onClose}
      size="xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-xs font-bold text-muted-foreground hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending || !isValid}
            onClick={() => onSave(true)}
            className="rounded-lg border border-border bg-white px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-50"
          >
            Save as draft
          </button>
          <button
            type="button"
            disabled={pending || !isValid}
            onClick={() => onSave(false)}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {editing ? "Submit changes" : "Submit"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {canChoose && !editing && (
          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            <span className="mb-1.5 block">
              Institution<span className="text-destructive"> *</span>
            </span>
            <FilterSelect
              className="w-full"
              value={institution}
              onChange={(next) => {
                setInstitution(next);
                setForm({ ...form, user_id: "" });
              }}
              options={[
                { value: "", label: "Select institution" },
                ...institutions.map((i) => ({
                  value: String(i.id ?? i.inst_profile_id),
                  label: i.name ?? i.inst_profile_name ?? i.code,
                })),
              ]}
            />
          </label>
        )}
        {FORM_FIELDS.map(([key, label]) => (
          <label
            key={key}
            className={
              key === "address"
                ? "text-sm font-medium text-slate-700 md:col-span-2"
                : "text-sm font-medium text-slate-700"
            }
          >
            <span className="mb-1.5 block">
              {label}
              {REQUIRED.has(key) && <span className="text-destructive"> *</span>}
            </span>
            {key === "user_id" ? (
              <>
                {!editing && (
                  <SearchBox {...userSearch} placeholder="Search users" className="mb-2" />
                )}
                <FilterSelect
                  className="w-full"
                  disabled={
                    Boolean(editing) || usersLoading || (canChoose && !editing && !institution)
                  }
                  value={form.user_id ?? ""}
                  onChange={(next) => setForm({ ...form, user_id: next })}
                  options={[
                    {
                      value: "",
                      label:
                        canChoose && !editing && !institution
                          ? "Select the institution first"
                          : usersLoading
                            ? "Loading users..."
                            : "Select user",
                    },
                    ...userOptions.map((user) => {
                      const id = user?.user_id ?? user?.id;
                      const label =
                        user?.user_name ?? user?.username ?? user?.name ?? `User #${id}`;
                      return { value: id, label };
                    }),
                  ]}
                />
              </>
            ) : key === "gender" ? (
              <FilterSelect
                className="w-full"
                value={form.gender ?? ""}
                disabled={gendersLoading}
                onChange={(next) => setForm({ ...form, gender: next })}
                options={[
                  { value: "", label: gendersLoading ? "Loading genders..." : "Select gender" },
                  ...genders.map((gender) => {
                    const value = gender?.code;
                    const label = gender?.name ?? value;
                    return { value, label };
                  }),
                ]}
              />
            ) : key === "address" ? (
              <textarea
                value={form[key] ?? ""}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                className="min-h-24 w-full rounded-xl border border-border bg-white/80 px-3 py-2.5 outline-none focus:border-[var(--primary)]"
              />
            ) : (
              <input
                required={["user_id", "user_fname", "user_lname"].includes(key)}
                disabled={editing && key === "user_id"}
                type={key.includes("email") ? "email" : PHONE_KEYS.includes(key) ? "tel" : "text"}
                inputMode={PHONE_KEYS.includes(key) ? "tel" : undefined}
                value={form[key] ?? ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    [key]: PHONE_KEYS.includes(key)
                      ? phoneInput(event.target.value)
                      : event.target.value,
                  })
                }
                className="w-full rounded-xl border border-border bg-white/80 px-3 py-2.5 outline-none focus:border-[var(--primary)] disabled:bg-muted disabled:text-muted-foreground"
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
  const tr = useConfigLabel();
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

  const visibility = getMakerCheckerButtons(row, {
    canAdd,
    canEdit,
    canAuthorize,
    canChangeStatus,
    canDelete,
    canSubmit,
  });
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
        {["kycAuth", "kycDeauth"].includes(action?.method) && (
          <PendingChangesDiff {...pendingInfo} />
        )}
        <label className="mt-3 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Narration{action?.method === "kycDeauth" ? " *" : ""}
          <textarea
            value={narration}
            onChange={(event) => setNarration(event.target.value)}
            placeholder={action?.method === "kycDeauth" ? "Narration is required" : "Narration"}
            className="mt-1.5 min-h-24 w-full rounded-xl border border-border p-3 text-sm font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-[var(--primary)]"
          />
        </label>
      </ConfirmDialog>
    </>
  );
}

export function KYC() {
  const tr = useConfigLabel();
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [auditRow, setAuditRow] = useState(null);
  const list = useServerList({ api: API_ENDPOINTS.USER_MANAGEMENT.KYC.LIST, call: usersApi.kycList, reloadOn: "user-kyc:data-changed" });
  const query = asQuery(list);
  const [institution, setInstitution] = useState("");
  const userSearch = useListSearch();
  const activeUsersQuery = useUsersWithoutKycQuery(institution, userSearch.body);
  const gendersQuery = useGenderOptionsQuery();
  const add = useKycMutation("kycAdd");
  const edit = useKycMutation("kycEdit");
  const canAdd = useHasKycAction("Add");
  const save = async (draft) => {
    const userId = Number(form.user_id);
    if (
      !Number.isInteger(userId) ||
      userId <= 0 ||
      !form.user_fname.trim() ||
      !form.user_lname.trim()
    ) {
      notifications.error("User ID, first name, and last name are required");
      return;
    }
    try {
      const payload = {
        ...form,
        user_id: userId,
        is_draft: draft,
        gender: form.gender ? String(form.gender).toUpperCase() : form.gender,
      };
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
    {
      key: "status",
      label: tr("Status"),
      render: (row) =>
        row.status_name != null || row.status != null ? (
          <StatusBadge
            status={String(row.status_name ?? (row.status === 1 ? "ACTIVE" : "INACTIVE"))}
          />
        ) : (
          "—"
        ),
    },
    {
      key: "process_status_name",
      label: tr("Process Status"),
      render: (row) =>
        row.process_status_name ? (
          <StatusBadge status={String(row.process_status_name)} variant="subtle" />
        ) : (
          "—"
        ),
    },
    {
      key: "auth_status",
      label: tr("Authorization Status"),
      render: (row) =>
        row.auth_status ? <StatusBadge status={String(row.auth_status)} variant="subtle" /> : "—",
    },
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
        <PageTitle>{tr("User KYC")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          {tr("Manage user KYC and personal details.")}
        </p>
      </div>

      <ListTable list={list} actions={
            canAdd && (
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
            )
          } columns={columns} rowKey={(row) => idOf(row)} title={tr("User KYC")} emptyTitle={tr("No KYC records found")} />

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
        institution={institution}
        setInstitution={setInstitution}
        userSearch={userSearch.bind}
        onClose={() => {
          setEditing(null);
          setInstitution("");
          setForm(EMPTY);
          setShowForm(false);
        }}
      />

      {viewRow && (
        <Modal open title={tr("View user KYC")} onClose={() => setViewRow(null)} size="lg">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FORM_FIELDS.map(([key, label]) => (
              <div key={key} className="rounded-xl border border-border bg-muted/70 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {normalizeForm(viewRow)[key] || "-"}
                </p>
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
