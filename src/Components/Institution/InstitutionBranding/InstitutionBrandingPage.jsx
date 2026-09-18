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
import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";

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
  const mutation = useInstitutionBrandingMutation(action?.method ?? "submit");
  const pendingInfo = usePendingChanges(
    institutionBrandingApi.pending,
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
        title={`${action?.label ?? "Action"} institution branding`}
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
            className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm"
          />
        )}
      </ConfirmDialog>
      <Modal
        open={!!details}
        onClose={() => setDetails(null)}
        title={tr("View institution branding")}
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
  const tr = useConfigLabel();
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
      label: tr("Display Name"),
      render: (r) => (
        <span className="font-semibold text-foreground">{value(r, "display_name")}</span>
      ),
    },
    {
      key: "inst_profile_name",
      label: tr("Institution"),
      render: (r) => value(r, "inst_profile_name"),
    },
    {
      key: "primary_color",
      label: tr("Primary Color"),
      render: (r) => <ColorValue color={r.primary_color} />,
    },
    {
      key: "secondary_color",
      label: tr("Secondary Color"),
      render: (r) => <ColorValue color={r.secondary_color} />,
    },
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
      render: (r) => (r.process_status_name ? <StatusBadge status={String(r.process_status_name)} /> : "—"),
    },
    {
      key: "auth_status",
      label: tr("Authorization Status"),
      sortValue: (r) => r.auth_status ?? "",
      render: (r) => (r.auth_status ? <StatusBadge status={String(r.auth_status)} /> : "—"),
    },
    {
      key: "actions",
      label: tr("Actions"),
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
          <h1 className="text-xl font-black tracking-tight text-foreground">
            {tr("Institution Branding")}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {tr("Manage institution branding and white-label configuration.")}
          </p>
        </div>
        
      </div>
      {query.error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle size={14} /> {query.error.message}
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
            <Plus size={14} /> {tr("Add")} {tr("branding")}
          </button>
        )}
      bare /><DataTable
        columns={columns}
        rows={filteredRows}
        rowKey={(r) => r.id}
        isLoading={query.isLoading}
        title={tr("Institution Branding")}
        searchableKeys={["display_name", "inst_profile_name", "primary_color"]}
        emptyTitle={tr("No branding profiles found")}
        emptyDescription={tr("Branding profiles will appear here when available.")}
      bare /></div><Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? tr("Edit institution branding") : tr("Add institution branding")}
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
  const tr = useConfigLabel();
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
        // FilterSelect has no native form control, so re-check "required"
        // (previously free from the bare <select> it replaced) by hand.
        if (!editing && !form.inst_profile_id) {
          notifications.error("Please select an institution");
          return;
        }
        const { inst_profile_id, ...branding } = form;
        void onSubmit(
          editing ? branding : { inst_profile_id: Number(inst_profile_id), ...branding },
        );
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
