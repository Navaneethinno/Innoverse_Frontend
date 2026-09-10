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
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { DataTable } from "@/Components/Common/DataTable";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { StatusFilterTabs, statusBucket } from "@/Components/Common/StatusFilterTabs";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { Modal } from "@/Components/Common/Modal";
import { actionButtonClass } from "@/Components/Common/actionStyles";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { Switch } from "@/Components/UI/switch";
import { useHasPasswordPolicyAction, usePasswordPoliciesQuery, usePasswordPolicyActions } from "@/Hooks/Users/passwordPolicyHooks";
import { usersApi } from "@/Services/Users/users.api";
import { notifications } from "@/Utils/Lib/notifications";
import { AuditPasswordPolicy } from "./AuditPasswordPolicy";

const TEXT_FIELDS = [
  "policy_name",
  "description",
  "allowed_special_chars",
  "allowed_ip_ranges",
  "password_blacklist",
];

const NUMBER_FIELDS = [
  "min_length",
  "max_length",
  "min_uppercase",
  "min_lowercase",
  "min_numbers",
  "min_special",
  "password_expiry_days",
  "min_password_age_days",
  "restrict_past_password",
  "max_retry_count",
  "lockout_duration_mins",
  "inactive_user_days",
  "password_similarity_pct",
  "max_repeated_chars",
  "session_timeout_minutes",
  "max_sessions_allowed",
];

const BOOLEAN_FIELDS = [
  "require_uppercase",
  "require_lowercase",
  "require_numbers",
  "require_special",
  "permanent_lock_flag",
  "ip_restriction_required",
  "force_pwd_first_login",
  "system_generated_flag",
  "require_2fa",
  "disallow_userid_in_pwd",
  "prevent_dictionary_words",
  "enforce_mfa_for_admins",
];

const ALL_FIELDS = [...TEXT_FIELDS, ...NUMBER_FIELDS, ...BOOLEAN_FIELDS];

const FIELD_LABELS = {
  policy_name: "Policy name",
  description: "Description",
  min_length: "Minimum length",
  max_length: "Maximum length",
  require_uppercase: "Require uppercase",
  min_uppercase: "Minimum uppercase",
  require_lowercase: "Require lowercase",
  min_lowercase: "Minimum lowercase",
  require_numbers: "Require numbers",
  min_numbers: "Minimum numbers",
  require_special: "Require special characters",
  min_special: "Minimum special characters",
  allowed_special_chars: "Allowed special characters",
  password_expiry_days: "Password expiry days",
  min_password_age_days: "Minimum password age days",
  restrict_past_password: "Restrict past passwords",
  max_retry_count: "Maximum retry count",
  lockout_duration_mins: "Lockout duration minutes",
  permanent_lock_flag: "Permanent lock",
  ip_restriction_required: "IP restriction required",
  allowed_ip_ranges: "Allowed IP ranges",
  inactive_user_days: "Inactive user days",
  force_pwd_first_login: "Force password change on first login",
  system_generated_flag: "System generated password",
  require_2fa: "Require 2FA",
  disallow_userid_in_pwd: "Disallow user ID in password",
  password_similarity_pct: "Password similarity percent",
  max_repeated_chars: "Maximum repeated characters",
  prevent_dictionary_words: "Prevent dictionary words",
  password_blacklist: "Password blacklist",
  enforce_mfa_for_admins: "Enforce MFA for admins",
  session_timeout_minutes: "Session timeout minutes",
  max_sessions_allowed: "Maximum sessions allowed",
};

const FORM_SECTIONS = [
  {
    title: "Basic details",
    fields: ["policy_name", "description"],
  },
  {
    title: "Password composition",
    fields: [
      "min_length",
      "max_length",
      "require_uppercase",
      "min_uppercase",
      "require_lowercase",
      "min_lowercase",
      "require_numbers",
      "min_numbers",
      "require_special",
      "min_special",
      "allowed_special_chars",
    ],
  },
  {
    title: "Expiry and lockout",
    fields: [
      "password_expiry_days",
      "min_password_age_days",
      "restrict_past_password",
      "max_retry_count",
      "lockout_duration_mins",
      "permanent_lock_flag",
      "inactive_user_days",
    ],
  },
  {
    title: "Security controls",
    fields: [
      "ip_restriction_required",
      "allowed_ip_ranges",
      "force_pwd_first_login",
      "system_generated_flag",
      "require_2fa",
      "disallow_userid_in_pwd",
      "password_similarity_pct",
      "max_repeated_chars",
      "prevent_dictionary_words",
      "password_blacklist",
      "enforce_mfa_for_admins",
      "session_timeout_minutes",
      "max_sessions_allowed",
    ],
  },
];

const empty = () => Object.fromEntries(ALL_FIELDS.map((field) => [field, BOOLEAN_FIELDS.includes(field) ? false : ""]));
const idOf = (row) => row?.policy_id ?? row?.id;
const isPending = (row) =>
  String(row?.process_status_name ?? row?.status_name ?? "").toLowerCase().includes("pending") ||
  String(row?.auth_status ?? "").toUpperCase() === "AUTH WAIT" ||
  Number(row?.status) === 9;
const isInactive = (row) => String(row?.status_name ?? "").toLowerCase().includes("inactive");
const isPendingDelete = (row) =>
  String(row?.process_status_name ?? "").toLowerCase().includes("pending delete");
const searchText = (row) =>
  `${row?.policy_name ?? ""} ${row?.description ?? ""} ${row?.status_name ?? ""} ${row?.auth_status ?? ""}`;

function toForm(row) {
  const next = empty();
  ALL_FIELDS.forEach((field) => {
    if (row?.[field] !== undefined && row?.[field] !== null) next[field] = row[field];
  });
  BOOLEAN_FIELDS.forEach((field) => {
    next[field] = Boolean(next[field]);
  });
  return next;
}

function numericPolicyValue(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0;
}

function toPayload(form) {
  return Object.fromEntries(
    Object.entries(form).map(([key, value]) => [
      key,
      // The backend's PasswordPolicyFields uses Go integers. Empty HTML
      // number inputs are strings, so send the documented zero/default
      // rather than an invalid JSON string such as "min_numbers": "".
      NUMBER_FIELDS.includes(key) ? numericPolicyValue(value) : value,
    ]),
  );
}

function PolicyField({ field, form, setForm }) {
  const label = FIELD_LABELS[field] ?? field.replaceAll("_", " ");
  const isBoolean = BOOLEAN_FIELDS.includes(field);
  const isNumber = NUMBER_FIELDS.includes(field);

  if (isBoolean) {
    return (
      <div className="flex min-h-[74px] items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
        <div>
          <p className="text-sm font-bold text-slate-700">{label}</p>
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">{form[field] ? "Enabled" : "Disabled"}</p>
        </div>
        <Switch checked={Boolean(form[field])} onCheckedChange={(checked) => setForm({ ...form, [field]: checked })} />
      </div>
    );
  }

  return (
    <label className="block text-sm font-medium text-slate-700">
      <span className="mb-1.5 block">{label}</span>
      <input
        required={field === "policy_name"}
        type={isNumber ? "number" : "text"}
        min={isNumber ? 0 : undefined}
        value={form[field] ?? ""}
        onChange={(event) => setForm({ ...form, [field]: event.target.value })}
        className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function PolicyForm({ open, form, setForm, editing, onSave, onClose, pending }) {
  return (
    <Modal
      open={open}
      title={editing ? "Edit password policy" : "Add password policy"}
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
            {editing ? "Submit changes" : "Add policy"}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {FORM_SECTIONS.map((section) => (
          <section key={section.title}>
            <h3 className="mb-3 text-[11px] font-black uppercase tracking-widest text-slate-400">{section.title}</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {section.fields.map((field) => (
                <PolicyField key={field} field={field} form={form} setForm={setForm} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  );
}

function PolicyView({ row, onClose }) {
  return (
    <Modal open title="View password policy" onClose={onClose} size="xl">
      <div className="space-y-5">
        {FORM_SECTIONS.map((section) => (
          <section key={section.title}>
            <h3 className="mb-3 text-[11px] font-black uppercase tracking-widest text-slate-400">{section.title}</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {section.fields.map((field) => (
                <div key={field} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{FIELD_LABELS[field]}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {typeof row?.[field] === "boolean" ? (row[field] ? "Yes" : "No") : row?.[field] || "-"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <StatusBadge status={String(row?.status_name ?? row?.auth_status ?? "")} />
      </div>
    </Modal>
  );
}

function PolicyActions({ row, onEdit, onView, onAudit, onRefresh }) {
  const canAdd = useHasPasswordPolicyAction("Add");
  const canEdit = useHasPasswordPolicyAction("Edit");
  const canAuthorize = useHasPasswordPolicyAction("Authorize");
  const canDelete = useHasPasswordPolicyAction("Delete");
  const canChangeStatus = useHasPasswordPolicyAction("Change Status");
  const canSubmit = useHasPasswordPolicyAction("Submit");
  const methods = usePasswordPolicyActions();
  const [action, setAction] = useState(null);
  const [narration, setNarration] = useState("");
  const pendingInfo = usePendingChanges(
    ({ id }) => usersApi.passwordPolicyPending({ policy_id: id }),
    idOf(row),
    ["passwordPolicyAuth", "passwordPolicyDeauth"].includes(action?.method),
  );
  const pending = isPending(row);
  const draft = Number(row?.status) === 9;
  const pendingDelete = isPendingDelete(row);
  const locked = pending && !draft;
  const inactive = isInactive(row);
  const actions = [
    ...((canSubmit || canAdd) && draft ? [["passwordPolicySubmit", "Submit Draft", Send, "submit"]] : []),
    ...(canAuthorize && locked && !pendingDelete ? [["passwordPolicyAuth", "Authorize", ShieldCheck, "auth"], ["passwordPolicyDeauth", "Deauthorize", ShieldOff, "deauth"]] : []),
    ...(canDelete && !pending ? [["passwordPolicyDelete", "Delete", Trash2, "delete"]] : []),
    ...(canAuthorize && pendingDelete ? [["passwordPolicyDeleteAuth", "Authorize Delete", ShieldCheck, "deleteAuth"]] : []),
    ...(canChangeStatus && !pending && !inactive ? [["passwordPolicyDeactivate", "Deactivate", PowerOff, "deactivate"]] : []),
    ...(canChangeStatus && !pending && inactive ? [["passwordPolicyReactivate", "Reactivate", Power, "reactivate"]] : []),
  ];
  const mutation = action ? methods[action.method] : null;

  const execute = async () => {
    if (!action || !mutation) return;
    try {
      await mutation.mutateAsync({ policy_id: idOf(row), narration });
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
        title={`${action?.label ?? "Action"} password policy`}
        confirmLabel={action?.label ?? "Confirm"}
        destructive={["delete", "deleteAuth"].includes(action?.style)}
        pending={mutation?.isPending}
        confirmDisabled={action?.method === "passwordPolicyDeauth" && !narration.trim()}
        onClose={() => {
          setAction(null);
          setNarration("");
        }}
        onConfirm={() => void execute()}
      >
        {["passwordPolicyAuth", "passwordPolicyDeauth"].includes(action?.method) && <PendingChangesDiff {...pendingInfo} />}
        <label className="mt-3 block text-xs font-bold uppercase tracking-wider text-slate-500">
          Narration{action?.method === "passwordPolicyDeauth" ? " *" : ""}
          <textarea
            value={narration}
            onChange={(event) => setNarration(event.target.value)}
            placeholder={action?.method === "passwordPolicyDeauth" ? "Narration is required" : "Narration"}
            className="mt-1.5 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-blue-400"
          />
        </label>
      </ConfirmDialog>
    </>
  );
}

export function PasswordPolicy() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [auditRow, setAuditRow] = useState(null);

  const query = usePasswordPoliciesQuery({ page, limit: 10 });
  const rows = Array.isArray(query.data) ? query.data : [];
  const canAdd = useHasPasswordPolicyAction("Add");
  const methods = usePasswordPolicyActions();

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesTab = tab === "all" || statusBucket(row) === tab;
      const matchesSearch = !q || searchText(row).toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [rows, search, tab]);

  const save = async (draft) => {
    if (!form.policy_name.trim()) {
      notifications.error("Policy name is required");
      return;
    }
    try {
      await methods[editing ? "passwordPolicyEdit" : "passwordPolicyAdd"].mutateAsync({
        ...toPayload(form),
        ...(editing ? { policy_id: idOf(editing) } : {}),
        is_draft: draft,
      });
      setShowForm(false);
      setEditing(null);
      setForm(empty());
      await query.refetch();
    } catch {
      // Toast already comes from the mutation hook.
    }
  };

  const columns = [
    { key: "policy_name", label: "Policy Name", align: "left", render: (row) => row.policy_name ?? "-" },
    { key: "min_length", label: "Min Length", render: (row) => row.min_length ?? "-" },
    { key: "max_retry_count", label: "Max Retries", render: (row) => row.max_retry_count ?? "-" },
    { key: "session_timeout_minutes", label: "Session Timeout", render: (row) => row.session_timeout_minutes ?? "-" },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status_name ?? row.auth_status ?? row.status ?? "")} /> },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (row) => (
        <PolicyActions
          row={row}
          onRefresh={query.refetch}
          onEdit={(nextRow) => {
            setEditing(nextRow);
            setForm(toForm(nextRow));
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
          <h1 className="text-xl font-black text-slate-800">Password Policy</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">Manage password rules, lockout, and session security.</p>
        </div>
        {canAdd && (
          <button
            type="button"
            onClick={() => {
              setForm(empty());
              setEditing(null);
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-200/50"
          >
            <Plus size={14} /> Add policy
          </button>
        )}
      </div>

      <div className="mb-4">
        <StatusFilterTabs rows={rows} value={tab} onChange={setTab} search={search} onSearch={setSearch} searchPlaceholder="Search password policies..." />
      </div>

      <DataTable
        columns={columns}
        rows={visibleRows}
        isLoading={query.isLoading}
        rowKey={(row) => idOf(row)}
        title="Password Policy"
        searchableKeys={["policy_name", "description", "status_name", "auth_status"]}
        emptyTitle="No password policies found"
        serverPagination={{
          page,
          totalPages: query.pagination?.totalPages ?? 1,
          totalRecords: query.pagination?.totalRecords ?? rows.length,
          onPageChange: setPage,
        }}
        fetchMore={async (nextPage, limit) => {
          const result = await usersApi.passwordPolicyList({ page: nextPage, limit });
          return {
            rows: Array.isArray(result?.data) ? result.data : [],
            totalPages: result?.pagination?.totalPages ?? 1,
          };
        }}
      />

      <PolicyForm
        open={showForm}
        form={form}
        setForm={setForm}
        editing={editing}
        pending={methods.passwordPolicyAdd.isPending || methods.passwordPolicyEdit.isPending}
        onSave={save}
        onClose={() => {
          setShowForm(false);
          setEditing(null);
          setForm(empty());
        }}
      />

      {viewRow && <PolicyView row={viewRow} onClose={() => setViewRow(null)} />}

      <AuditPasswordPolicy policy={auditRow} onClose={() => setAuditRow(null)} />
    </div>
  );
}
