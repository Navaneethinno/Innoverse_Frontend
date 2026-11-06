import { Button } from "@/Components/Common/Button";
import { mergeStatusColumns } from "@/Components/MakerChecker/statusColumns";
import { RequiredMark } from "@/Components/Common/RequiredMark";
import { API_ENDPOINTS } from "@/Utils/Constant";
import { ListTable } from "@/Components/Common/ListView";
import { asQuery, useServerList } from "@/Hooks/useServerList";
import { PageTitle } from "@/Components/Common/PageTitle";
import { canChooseInstitution } from "@/Utils/Lib/institutionScope";
import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
import { useAuth } from "@/Hooks/useAuth";
import { useEffect, useState } from "react";
import { AlertCircle, Plus } from "lucide-react";

import { Modal } from "@/Components/Common/Modal";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { notifications } from "@/Utils/Lib/notifications";

import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { institutionChannelApi } from "@/Services/Institution/institutionChannel.api";
import { useMasterChannels } from "@/Hooks/Institution/institutionChannelHooks";
import { useActiveInstitutionsQuery, useHasInstitutionAction } from "@/Hooks/Institution/institutionHooks";

import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";
import { useApiMutation } from "@/Hooks/useApiMutation";
import { InstitutionRowActions } from "@/Components/Institution/InstitutionRowActions";

const display = (row, key) => row?.[key] ?? "—";
function ChannelActions({ row, onRefresh, onEdit }) {
  const tr = useConfigLabel();
  return (
    <InstitutionRowActions
      row={row}
      api={institutionChannelApi}
      what={tr("Institution Channel")}
      facts={[
        [tr("Channel"), row.channel_name ?? row.channel_id],
        ...(canChooseInstitution() ? [[tr("Institution"), row.inst_profile_name ?? row.inst_profile_id]] : []),
      ]}
      auditTitle={row.channel_name ?? `#${row.id}`}
      auditFields={[["channel_name", tr("Channel")], ["inst_profile_name", tr("Institution")]]}
      onEdit={onEdit}
      onRefresh={onRefresh}
    />
  );
}

export function InstitutionChannel() {
  const tr = useConfigLabel();
  const canAdd = useHasInstitutionAction("Add");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const list = useServerList({ api: API_ENDPOINTS.INSTITUTION.INSTITUTION_CHANNEL.LIST, call: institutionChannelApi.list });
  const query = asQuery(list);
  const institutions = useActiveInstitutionsQuery();
  const { channels } = useMasterChannels();
  const add = useApiMutation(institutionChannelApi, "add");
  const edit = useApiMutation(institutionChannelApi, "edit");
  const columns = mergeStatusColumns([
    {
      key: "channel_name",
      label: tr("Channel"),
      render: (r) => (
        <span className="inline-flex flex-col">
          <span className="font-semibold text-foreground">{display(r, "channel_name")}</span>
          {r.channel_description && <span className="text-[11px] text-muted-foreground">{r.channel_description}</span>}
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
      key: "actions",
      label: tr("Actions"),
      sortable: false,
      render: (r) => (
        <ChannelActions
          row={r}
          onRefresh={query.refetch}
          onEdit={() => {
            setEditing(r);
            setFormError("");
            setFormOpen(true);
          }}
        />
      ),
    },
  ]);
  // A refusal (e.g. "Channel Already Exists") also shows on the form.
  const [formError, setFormError] = useState("");
  const submit = async (values) => {
    setFormError("");
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
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    }
  };
  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <PageTitle>{tr("Institution Channel")}</PageTitle>
          <p className="mt-1 text-sm text-muted-foreground">
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
      <ListTable list={list} actions={canAdd && (
          <Button
            size="xs"
            onClick={() => {
              setEditing(null);
              setFormError("");
            setFormOpen(true);
            }}>
            <Plus size={14} /> {tr("Add")} {tr("channel")}
          </Button>
        )} columns={columns} rowKey={(r) => r.id} title={tr("Institution Channel")} emptyTitle={tr("No channels found")} emptyDescription={tr("Channel assignments will appear here when available.")} /><Modal
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
          error={formError}
          onCancel={() => setFormOpen(false)}
          onSubmit={submit}
        />
      </Modal>
    </div>
  );
}
function ChannelForm({ editing, institutions = [], channels = [], pending, error, onCancel, onSubmit }) {
  const tr = useConfigLabel();
  // A bank / fintech user is always in its own institution: no picker.
  const canChoose = useCanChooseInstitution();
  const ownInstitution = useAuth((state) => state.user?.inst_profile_id);
  const [form, setForm] = useState({
    inst_profile_id: editing?.inst_profile_id ?? (canChoose ? "" : (ownInstitution ?? "")),
    channel_id: editing?.channel_id ?? "",
    narration: "",
    is_draft: false,
  });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  // Channels the chosen institution already has don't show again (the one
  // being edited stays).
  const [taken, setTaken] = useState([]);
  useEffect(() => {
    if (!form.inst_profile_id) return setTaken([]);
    let cancelled = false;
    institutionChannelApi
      .list({ inst_profile_id: Number(form.inst_profile_id), page: 1, limit: 100 })
      .then((r) => {
        if (cancelled) return;
        const rows = Array.isArray(r?.data) ? r.data : [];
        setTaken(
          rows
            .filter((row) => String(row.inst_profile_id) === String(form.inst_profile_id) && row.id !== editing?.id)
            .map((row) => String(row.channel_id)),
        );
      })
      .catch(() => !cancelled && setTaken([]));
    return () => {
      cancelled = true;
    };
  }, [form.inst_profile_id, editing?.id]);
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
        {!editing && canChoose && (
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
        <RequiredMark />
        <FilterSelect
          className="mt-1.5"
          value={form.channel_id}
          onChange={(next) => set("channel_id")({ target: { value: next } })}
          options={[
            { value: "", label: tr("Select channel") },
            ...channels.filter((c) => !taken.includes(String(c.channel_id ?? c.id))).map((c) => ({
              value: c.channel_id ?? c.id,
              label: c.channel_description ? (
                <span className="block">
                  {c.channel_name ?? c.name}
                  <span className="block text-[11px] font-normal text-muted-foreground">{c.channel_description}</span>
                </span>
              ) : (
                (c.channel_name ?? c.name)
              ),
              searchText: c.channel_name ?? c.name,
            })),
          ]}
        />
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
        <Button
          disabled={pending}
          onClick={() =>
            void onSubmit({
              ...form,
              inst_profile_id: Number(form.inst_profile_id),
              channel_id: Number(form.channel_id),
              is_draft: true,
            })
          }
          variant="secondary"
        >
          Save as draft
        </Button>
        <Button
          type="submit"
          disabled={pending}
        >
          {pending ? "Saving..." : editing ? "Save changes" : "Add channel"}
        </Button>
      </div>
      {error && <p className="text-right text-xs font-semibold text-red-600">{error}</p>}
    </form>
  );
}
