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
import { actionButtonClass } from "@/Components/Common/actionStyles";
import { StatusFilterTabs, statusBucket } from "@/Components/Common/StatusFilterTabs";
import { institutionBrandingApi } from "@/Services/Institutions/institutionBranding.api";
import {
  useInstitutionBrandingMutation,
  useInstitutionBrandingsQuery,
} from "@/Hooks/Institutions/institutionBrandingHooks";
import {
  useActiveInstitutionsQuery,
  useHasInstitutionAction,
} from "@/Hooks/Institutions/institutionHooks";
import { INSTITUTION_DRAFT_STATUS_CODE } from "@/Utils/Constant";

const FIELDS = [
  ["display_name", "Display Name"],
  ["logo", "Logo URL"],
  ["favicon", "Favicon URL"],
  ["primary_color", "Primary Color"],
  ["secondary_color", "Secondary Color"],
  ["login_background", "Login Background"],
  ["email_header", "Email Header"],
  ["email_footer", "Email Footer"],
  ["receipt_header", "Receipt Header"],
  ["receipt_footer", "Receipt Footer"],
  ["statement_header", "Statement Header"],
  ["statement_footer", "Statement Footer"],
];
const value = (row, key) => row?.[key] ?? "—";
const COLOR_NAMES = {
  "#d82222": "Red",
  "#b90e0e": "Dark red",
  "#2563eb": "Blue",
  "#dbeafe": "Light blue",
  "#ffffff": "White",
  "#000000": "Black",
};
const colorName = (color) => COLOR_NAMES[String(color ?? "").toLowerCase()] ?? "Custom color";
function ColorValue({ color }) {
  if (!color) return <span>—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="h-5 w-5 shrink-0 rounded-md border border-slate-300 shadow-sm"
        style={{ backgroundColor: color }}
      />
      <span>{color}</span>
      <span className="text-xs font-medium text-muted-foreground">({colorName(color)})</span>
    </span>
  );
}
function BrandingActions({ row, onRefresh, onEdit }) {
  const canEdit = useHasInstitutionAction("Edit");
  const canAuthorize = useHasInstitutionAction("Authorize");
  const canDelete = useHasInstitutionAction("Delete");
  const canChangeStatus = useHasInstitutionAction("Change Status");
  const [action, setAction] = useState(null);
  const [details, setDetails] = useState(null);
  const [audit, setAudit] = useState(false);
  const [narration, setNarration] = useState("");
  const mutation = useInstitutionBrandingMutation(action?.method ?? "submit");
  const pendingInfo = usePendingChanges(
    institutionBrandingApi.pending,
    row.id,
    !!action && ["auth", "deauth"].includes(action.method),
  );
  const status = String(row.status_name ?? row.auth_status ?? "").toLowerCase();
  const process = String(row.process_status_name ?? "").toLowerCase();
  const draft = Number(row.status) === INSTITUTION_DRAFT_STATUS_CODE || status === "draft" || process === "draft";
  const pending = process.includes("pending");
  const pendingDelete = process.includes("pending delete");
  const active = row.status === 1 || status === "active";
  const inactive = row.status === 0 || status === "inactive";
  const actions = [
    ...(draft ? [["submit", "Submit", Send]] : []),
    ...(pending && canAuthorize
      ? [
          ["auth", "Authorize", ShieldCheck],
          ["deauth", "Reject", ShieldOff],
        ]
      : []),
    ...(canDelete ? [["delete", "Delete", Trash2]] : []),
    ...(active && canChangeStatus ? [["deactivate", "Deactivate", PowerOff]] : []),
    ...(pendingDelete && canAuthorize ? [["deleteAuth", "Delete Auth", Trash2]] : []),
    ...(inactive && canChangeStatus ? [["reactivate", "Reactivate", Power]] : []),
  ];
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
  return (
    <>
      <div className="flex flex-wrap justify-center gap-1">
        <UiTooltip label="View">
          <button
            type="button"
            onClick={() => setDetails(row)}
            className={actionButtonClass("view")}
          >
            <Eye size={14} />
          </button>
        </UiTooltip>
        {canEdit && (
          <UiTooltip label="Edit">
            <button type="button" onClick={onEdit} className={actionButtonClass("edit")}>
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
              className={actionButtonClass(method)}
            >
              <Icon size={14} />
            </button>
          </UiTooltip>
        ))}
      </div>
      <ConfirmDialog
        open={!!action}
        title={`${action?.label ?? "Action"} institution branding`}
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
        title="View institution branding"
        size="lg"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {FIELDS.map(([key, label]) => (
            <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-muted-foreground">{label}</p>
              <p className="mt-1 break-words text-sm font-semibold text-foreground">
                {key.includes("color") ? (
                  <ColorValue color={details?.[key]} />
                ) : (
                  value(details, key)
                )}
              </p>
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
          title={row.display_name ?? `Branding #${row.id}`}
          fields={FIELDS}
          onClose={() => setAudit(false)}
          fetchAudit={(page, limit) =>
            institutionBrandingApi.audit({ id: row.id, page, limit }).then((r) => ({
              entries: Array.isArray(r?.data) ? r.data : [],
              totalPages: r?.pagination?.totalPages ?? 1,
            }))
          }
        />
      )}
    </>
  );
}

export function InstitutionBrandingPage() {
  const canAdd = useHasInstitutionAction("Add");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const query = useInstitutionBrandingsQuery();
  const institutions = useActiveInstitutionsQuery();
  const add = useInstitutionBrandingMutation("add");
  const edit = useInstitutionBrandingMutation("edit");
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
      key: "display_name",
      label: "Display Name",
      render: (r) => (
        <span className="font-semibold text-foreground">{value(r, "display_name")}</span>
      ),
    },
    {
      key: "inst_profile_name",
      label: "Institution",
      render: (r) => value(r, "inst_profile_name"),
    },
    {
      key: "primary_color",
      label: "Primary Color",
      render: (r) => <ColorValue color={r.primary_color} />,
    },
    {
      key: "secondary_color",
      label: "Secondary Color",
      render: (r) => <ColorValue color={r.secondary_color} />,
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <StatusBadge status={String(r.status_name ?? r.auth_status ?? r.status ?? "")} />
      ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (r) => (
        <BrandingActions
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
          <h1 className="text-xl font-black tracking-tight text-foreground">
            Institution Branding
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage institution branding and white-label configuration.
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
            <Plus size={14} /> Add branding
          </button>
        )}
      </div>
      {query.error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle size={14} /> {query.error.message}
        </div>
      )}
      <StatusFilterTabs
        rows={query.data}
        value={statusFilter}
        search={search}
        onSearch={setSearch}
        onChange={setStatusFilter}
      />
      <DataTable
        columns={columns}
        rows={filteredRows}
        rowKey={(r) => r.id}
        isLoading={query.isLoading}
        title="Institution Branding"
        searchableKeys={["display_name", "inst_profile_name", "primary_color"]}
        emptyTitle="No branding profiles found"
        emptyDescription="Branding profiles will appear here when available."
      />
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit institution branding" : "Add institution branding"}
        size="lg"
      >
        <BrandingForm
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

function BrandingForm({ editing, institutions = [], pending, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    inst_profile_id: editing?.inst_profile_id ?? "",
    ...Object.fromEntries(FIELDS.map(([key]) => [key, editing?.[key] ?? ""])),
    narration: "",
    is_draft: false,
  });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const { inst_profile_id, ...branding } = form;
        void onSubmit(
          editing ? branding : { inst_profile_id: Number(inst_profile_id), ...branding },
        );
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
            required={key === "display_name"}
            type={key.includes("color") ? "color" : key.includes("email") ? "email" : "text"}
            value={
              key.includes("color") && !form[key]
                ? key === "primary_color"
                  ? "#2563eb"
                  : "#dbeafe"
                : form[key]
            }
            onChange={set(key)}
            className={
              key.includes("color")
                ? "mt-1.5 h-12 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white p-1 shadow-sm transition hover:border-primary/50 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
                : "mt-1.5 w-full rounded-xl border border-slate-200 p-3"
            }
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
          {pending ? "Saving..." : editing ? "Save changes" : "Add branding"}
        </button>
      </div>
    </form>
  );
}
