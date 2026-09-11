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
import { institutionChannelApi } from "@/Services/Institutions/institutionChannel.api";
import {
  useInstitutionChannelMutation,
  useInstitutionChannelsQuery,
  useMasterChannels,
} from "@/Hooks/Institutions/institutionChannelHooks";
import {
  useActiveInstitutionsQuery,
  useHasInstitutionAction,
} from "@/Hooks/Institutions/institutionHooks";
import { deriveStatusFlags } from "@/Components/MakerChecker/statusFlags";

const display = (row, key) => row?.[key] ?? "—";
function ChannelActions({ row, onRefresh, onEdit }) {
  const canEdit = useHasInstitutionAction("Edit");
  const canAuthorize = useHasInstitutionAction("Authorize");
  const canDelete = useHasInstitutionAction("Delete");
  const canChangeStatus = useHasInstitutionAction("Change Status");
  const [action, setAction] = useState(null);
  const [details, setDetails] = useState(null);
  const [audit, setAudit] = useState(false);
  const [narration, setNarration] = useState("");
  const mutation = useInstitutionChannelMutation(action?.method ?? "submit");
  const pendingInfo = usePendingChanges(
    institutionChannelApi.pending,
    row.id,
    !!action && ["auth", "deauth"].includes(action.method),
  );
  const { draft, pending, pendingDelete, active, inactive } = deriveStatusFlags(row);
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
        title={`${action?.label ?? "Action"} institution channel`}
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
        title="View institution channel"
        size="md"
      >
        <div className="space-y-3">
          {[
            ["Channel", row.channel_name ?? row.channel_id],
            ["Institution", row.inst_profile_name ?? row.inst_profile_id],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-xs font-semibold text-muted-foreground">{label}</p>
              <div className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold">
                {val ?? "—"}
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <StatusBadge status={String(row.status_name ?? row.auth_status ?? row.status ?? "")} />
          </div>
        </div>
      </Modal>
      {audit && (
        <AuditModal
          title={row.channel_name ?? `Channel #${row.id}`}
          fields={[
            ["channel_name", "Channel"],
            ["inst_profile_name", "Institution"],
          ]}
          onClose={() => setAudit(false)}
          fetchAudit={(page, limit) =>
            institutionChannelApi.audit({ id: row.id, page, limit }).then((r) => ({
              entries: Array.isArray(r?.data) ? r.data : [],
              totalPages: r?.pagination?.totalPages ?? 1,
            }))
          }
        />
      )}
    </>
  );
}

export function InstitutionChannelPage() {
  const canAdd = useHasInstitutionAction("Add");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const query = useInstitutionChannelsQuery();
  const institutions = useActiveInstitutionsQuery();
  const { channels } = useMasterChannels();
  const add = useInstitutionChannelMutation("add");
  const edit = useInstitutionChannelMutation("edit");
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
      key: "channel_name",
      label: "Channel",
      render: (r) => (
        <span className="font-semibold text-foreground">{display(r, "channel_name")}</span>
      ),
    },
    {
      key: "inst_profile_name",
      label: "Institution",
      render: (r) => display(r, "inst_profile_name"),
    },
    {
      key: "status",
      label: "Status",
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
      label: "Process Status",
      sortValue: (r) => r.process_status_name ?? "",
      render: (r) => (r.process_status_name ? <StatusBadge status={String(r.process_status_name)} /> : "—"),
    },
    {
      key: "auth_status",
      label: "Authorization Status",
      sortValue: (r) => r.auth_status ?? "",
      render: (r) => (r.auth_status ? <StatusBadge status={String(r.auth_status)} /> : "—"),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (r) => (
        <ChannelActions
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
          <h1 className="text-xl font-black tracking-tight text-foreground">Institution Channel</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage institution channel assignments.
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
            <Plus size={14} /> Add channel
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
        title="Institution Channel"
        searchableKeys={["channel_name", "inst_profile_name"]}
        emptyTitle="No channels found"
        emptyDescription="Channel assignments will appear here when available."
      />
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit institution channel" : "Add institution channel"}
        size="md"
      >
        <ChannelForm
          editing={editing}
          institutions={institutions.data}
          channels={channels}
          pending={add.isPending || edit.isPending}
          onCancel={() => setFormOpen(false)}
          onSubmit={submit}
        />
      </Modal>
    </div>
  );
}
function ChannelForm({ editing, institutions = [], channels = [], pending, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    inst_profile_id: editing?.inst_profile_id ?? "",
    channel_id: editing?.channel_id ?? "",
    narration: "",
    is_draft: false,
  });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const { inst_profile_id, ...rest } = form;
        void onSubmit(
          editing
            ? { ...rest, channel_id: Number(rest.channel_id), is_draft: false }
            : {
                inst_profile_id: Number(inst_profile_id),
                channel_id: Number(rest.channel_id),
                narration: rest.narration,
                is_draft: rest.is_draft,
              },
        );
      }}
    >
      <label className="block text-sm font-medium">
        {!editing && (
          <>
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
          </>
        )}
      </label>
      <label className="block text-sm font-medium">
        Channel
        <select
          required
          value={form.channel_id}
          onChange={set("channel_id")}
          className="mt-1.5 w-full rounded-xl border border-slate-200 p-3"
        >
          <option value="">Select channel</option>
          {channels.map((c) => (
            <option key={c.channel_id ?? c.id} value={c.channel_id ?? c.id}>
              {c.channel_name ?? c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium">
        Narration
        <textarea
          value={form.narration}
          onChange={set("narration")}
          className="mt-1.5 min-h-20 w-full rounded-xl border border-slate-200 p-3"
        />
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-sm">
          Cancel
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            void onSubmit({
              ...form,
              inst_profile_id: Number(form.inst_profile_id),
              channel_id: Number(form.channel_id),
              is_draft: true,
            })
          }
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
        >
          Save as draft
        </button>
        <button
          disabled={pending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          {pending ? "Saving..." : editing ? "Save changes" : "Add channel"}
        </button>
      </div>
    </form>
  );
}
