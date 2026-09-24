import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { useMemo, useState } from "react";
import { Clock, FileText, KeyRound, Plus, ShieldCheck } from "lucide-react";
import { RowActions } from "@/Components/Common/RowActions";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { DataTable } from "@/Components/Common/DataTable";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { StatusFilterTabs, statusBucket } from "@/Components/Common/StatusFilterTabs";
import { Modal } from "@/Components/Common/Modal";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { Switch } from "@/Components/UI/switch";
import { cn } from "@/Utils/Lib/cn";
import { useHasPasswordPolicyAction, usePasswordPoliciesQuery, usePasswordPolicyActions } from "@/Hooks/UserManagement/passwordPolicyHooks";
import { usersApi } from "@/Services/UserManagement/users.api";
import { notifications } from "@/Utils/Lib/notifications";
import { AuditPasswordPolicy } from "./AuditPasswordPolicy";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";

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
    icon: FileText,
    fields: ["policy_name", "description"],
  },
  {
    title: "Password composition",
    icon: KeyRound,
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
    icon: Clock,
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
    icon: ShieldCheck,
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
    const enabled = Boolean(form[field]);
    return (
      <div
        className={cn(
          "flex min-h-[68px] items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors",
          enabled ? "border-primary/20 bg-primary/5" : "border-border bg-muted/60",
        )}
      >
        <div>
          <p className="text-sm font-semibold text-slate-700">{label}</p>
          <p className={cn("mt-0.5 text-[11px] font-semibold", enabled ? "text-primary" : "text-muted-foreground")}>
            {enabled ? "Enabled" : "Disabled"}
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={(checked) => setForm({ ...form, [field]: checked })} />
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
        className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
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
          <button type="button" onClick={onClose} className="rounded-lg px-3.5 py-2 text-xs font-bold text-muted-foreground hover:bg-slate-100">
            Cancel
          </button>
          <button type="button" disabled={pending} onClick={() => onSave(true)} className="rounded-lg border border-border bg-white px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-50">
            Save as draft
          </button>
          <button type="button" disabled={pending} onClick={() => onSave(false)} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
            {editing ? "Submit changes" : "Add policy"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {FORM_SECTIONS.map((section) => (
          <section key={section.title} className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <section.icon size={14} strokeWidth={2} />
              </span>
              <h3 className="text-sm font-bold text-slate-800">{section.title}</h3>
            </div>
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
  const tr = useConfigLabel();
  return (
    <Modal open title={tr("View password policy")} onClose={onClose} size="xl">
      <div className="space-y-4">
        {FORM_SECTIONS.map((section) => (
          <section key={section.title} className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <section.icon size={14} strokeWidth={2} />
              </span>
              <h3 className="text-sm font-bold text-slate-800">{section.title}</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {section.fields.map((field) => (
                <div key={field} className="rounded-lg border border-border bg-muted/60 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{FIELD_LABELS[field]}</p>
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
  const tr = useConfigLabel();
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
    ["passwordPolicyAuth", "passwordPolicyDeauth", "passwordPolicyDeleteAuth"].includes(action?.method),
  );
  const visibility = getMakerCheckerButtons(row, { canAdd, canEdit, canAuthorize, canChangeStatus, canDelete, canSubmit });
  const pendingMethod = visibility.isPendingDelete ? "passwordPolicyDeleteAuth" : "passwordPolicyAuth";
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
      <RowActions
        buttons={visibility}
        onView={() => onView(row)}
        onEdit={() => onEdit(row)}
        onAudit={() => onAudit(row)}
        onSubmit={() => setAction({ method: "passwordPolicySubmit", label: tr("Submit Draft"), style: "submit" })}
        onAuthorize={() =>
          setAction({ method: pendingMethod, label: "Authorize", style: visibility.isPendingDelete ? "deleteAuth" : "auth" })
        }
        onDeauthorize={() => setAction({ method: "passwordPolicyDeauth", label: "Deauthorize", style: "deauth" })}
        onDeactivate={() => setAction({ method: "passwordPolicyDeactivate", label: "Deactivate", style: "deactivate" })}
        onReactivate={() => setAction({ method: "passwordPolicyReactivate", label: "Activate", style: "reactivate" })}
        onDelete={() => setAction({ method: "passwordPolicyDelete", label: "Delete", style: "delete" })}
      />

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
        <label className="mt-3 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Narration{action?.method === "passwordPolicyDeauth" ? " *" : ""}
          <textarea
            value={narration}
            onChange={(event) => setNarration(event.target.value)}
            placeholder={action?.method === "passwordPolicyDeauth" ? "Narration is required" : "Narration"}
            className="mt-1.5 min-h-24 w-full rounded-xl border border-border p-3 text-sm font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-[var(--primary)]"
          />
        </label>
      </ConfirmDialog>
    </>
  );
}

export function PasswordPolicy() {
  const tr = useConfigLabel();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [auditRow, setAuditRow] = useState(null);

  const query = usePasswordPoliciesQuery({ page, limit });
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
    { key: "policy_name", label: tr("Policy Name"), align: "left", render: (row) => row.policy_name ?? "-" },
    { key: "min_length", label: tr("Min Length"), render: (row) => row.min_length ?? "-" },
    { key: "max_retry_count", label: tr("Max Retries"), render: (row) => row.max_retry_count ?? "-" },
    { key: "session_timeout_minutes", label: tr("Session Timeout"), render: (row) => row.session_timeout_minutes ?? "-" },
    { key: "status", label: tr("Status"), render: (row) => (row.status_name != null || row.status != null ? <StatusBadge status={String(row.status_name ?? (row.status === 1 ? "ACTIVE" : "INACTIVE"))} /> : "—") }, { key: "process_status_name", label: tr("Process Status"), render: (row) => (row.process_status_name ? <StatusBadge status={String(row.process_status_name)} /> : "—") }, { key: "auth_status", label: tr("Authorization Status"), render: (row) => (row.auth_status ? <StatusBadge status={String(row.auth_status)} /> : "—") },
    {
      key: "actions",
      label: tr("Actions"),
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
    <div className="pt-1 pb-6">
      <div className="mb-3">
        <h1 className="text-xl font-black text-slate-800">Password Policy</h1>
        <p className="mt-1 text-xs font-medium text-muted-foreground">Manage password rules, lockout, and session security.</p>
      </div>

      <div className="mb-4 overflow-hidden rounded-2xl" style={{ background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" }}><StatusFilterTabs rows={rows} value={tab} onChange={setTab} search={search} onSearch={setSearch} searchPlaceholder="Search password policies..." actions={canAdd && (
          <button
            type="button"
            onClick={() => {
              setForm(empty());
              setEditing(null);
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white"
          >
            <Plus size={14} /> {tr("Add")} {tr("policy")}
          </button>
        )} bare /><DataTable
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
          limit,
          onLimitChange: (next) => {
            setLimit(next);
            setPage(1);
          },
        }}
        fetchMore={async (nextPage, limit) => {
          const result = await usersApi.passwordPolicyList({ page: nextPage, limit });
          return {
            rows: Array.isArray(result?.data) ? result.data : [],
            totalPages: result?.pagination?.totalPages ?? 1,
          };
        }}
      bare /></div>

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
