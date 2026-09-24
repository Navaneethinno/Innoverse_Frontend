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
import { institutionChannelApi } from "@/Services/Institution/institutionChannel.api";
import {
  useInstitutionChannelMutation,
  useInstitutionChannelsQuery,
  useMasterChannels,
} from "@/Hooks/Institution/institutionChannelHooks";
import {
  useActiveInstitutionsQuery,
  useHasInstitutionAction,
} from "@/Hooks/Institution/institutionHooks";
import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";

// Admin Panel handoff §4 (2026-09): an institution's WEB / APP channels now
// also switch customer self-onboarding on the customer portal on and off
// (web portal / mobile app), taking effect once the channel is Active.
const PORTAL_CHANNEL_HINTS = {
  WEB: "Enables customer self-onboarding on the web portal",
  APP: "Enables customer self-onboarding in the mobile app",
};
const portalHintFor = (channel) =>
  PORTAL_CHANNEL_HINTS[String(channel?.channel_code ?? channel?.code ?? channel?.channel_name ?? channel?.name ?? "").trim().toUpperCase()];

const display = (row, key) => row?.[key] ?? "—";
function ChannelActions({ row, onRefresh, onEdit }) {
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
  const mutation = useInstitutionChannelMutation(action?.method ?? "submit");
  const pendingInfo = usePendingChanges(
    institutionChannelApi.pending,
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
        title={`${action?.label ?? "Action"} institution channel`}
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
        title={tr("View institution channel")}
        size="md"
      >
        <div className="space-y-3">
          {[
            ["Channel", row.channel_name ?? row.channel_id],
            ["Institution", row.inst_profile_name ?? row.inst_profile_id],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-xs font-semibold text-muted-foreground">{label}</p>
              <div className="mt-1.5 rounded-xl border border-border bg-card p-3 text-sm font-semibold">
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

export function InstitutionChannel() {
  const tr = useConfigLabel();
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
      label: tr("Channel"),
      render: (r) => (
        <span className="inline-flex flex-col">
          <span className="font-semibold text-foreground">{display(r, "channel_name")}</span>
          {portalHintFor(r) && <span className="text-[11px] text-muted-foreground">{tr(portalHintFor(r))}</span>}
        </span>
      ),
    },
    {
      key: "inst_profile_name",
      label: tr("Institution"),
      render: (r) => display(r, "inst_profile_name"),
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
          <h1 className="text-xl font-black tracking-tight text-foreground">{tr("Institution Channel")}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {tr("Manage institution channel assignments.")}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {tr("An Active WEB or APP channel also lets that institution's customers onboard themselves on the web portal or mobile app.")}
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
            <Plus size={14} /> {tr("Add")} {tr("channel")}
          </button>
        )}
      bare /><DataTable
        columns={columns}
        rows={filteredRows}
        rowKey={(r) => r.id}
        isLoading={query.isLoading}
        title={tr("Institution Channel")}
        searchableKeys={["channel_name", "inst_profile_name"]}
        emptyTitle={tr("No channels found")}
        emptyDescription={tr("Channel assignments will appear here when available.")}
      bare /></div><Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? tr("Edit institution channel") : tr("Add institution channel")}
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
  const tr = useConfigLabel();
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
        // FilterSelect has no native form control, so re-check "required"
        // (previously free from the bare <select>s these replaced) by hand.
        if (!editing && !form.inst_profile_id) {
          notifications.error("Please select an institution");
          return;
        }
        if (!form.channel_id) {
          notifications.error("Please select a channel");
          return;
        }
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
          </>
        )}
      </label>
      <label className="block text-sm font-medium">
        Channel
        <FilterSelect
          className="mt-1.5"
          value={form.channel_id}
          onChange={(next) => set("channel_id")({ target: { value: next } })}
          options={[
            { value: "", label: tr("Select channel") },
            ...channels.map((c) => ({
              value: c.channel_id ?? c.id,
              label: c.channel_name ?? c.name,
            })),
          ]}
        />
        {(() => {
          const hint = portalHintFor(channels.find((c) => String(c.channel_id ?? c.id) === String(form.channel_id)));
          return hint ? <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{tr(hint)}</span> : null;
        })()}
      </label>
      <label className="block text-sm font-medium">
        Narration
        <textarea
          value={form.narration}
          onChange={set("narration")}
          className="mt-1.5 min-h-20 w-full rounded-xl border border-border p-3"
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
          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-slate-600"
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
