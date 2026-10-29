import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, PowerOff, Trash2, UserCog } from "lucide-react";
import { ListTable, TabButton } from "@/Components/Common/ListView";
import { useServerList } from "@/Hooks/useServerList";
import { PageTitle } from "@/Components/Common/PageTitle";
import { Modal } from "@/Components/Common/Modal";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { RowActions } from "@/Components/Common/RowActions";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { NoAccess } from "@/Components/Common/NoAccess";
import { DateInput } from "@/Components/Common/DateInput";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { usePagePermission } from "@/Hooks/usePermission";
import { useAuth } from "@/Hooks/useAuth";
import { delegationApi, supervisorApi } from "@/Services/GlobalSettings/approval.api";
import { usersApi } from "@/Services/UserManagement/users.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";

const inputClass = "mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary";
const labelClass = "text-xs font-semibold text-slate-700";

// The institution's active users, for the pickers: [{ value, label }].
function useUserOptions() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    usersApi
      .getActive({ view: "dropdown" })
      .then((r) => setUsers(rowsOf(r).map((u) => ({ value: String(u.id ?? u.user_id), label: u.user_name ?? u.username ?? u.name ?? String(u.id) }))))
      .catch(() => setUsers([]));
  }, []);
  return users;
}

const day = (at) => (at ? new Date(at).toLocaleDateString() : "—");

// Hand one user's approvals to another for a period (from the start of the
// first day to the end of the last). A checker approves it.
function DelegationForm({ users, onClose, onSaved }) {
  const { t } = useTranslation(["approvals", "common"]);
  const me = useAuth((s) => s.user?.session_user_id ?? s.user?.id);
  const [form, setForm] = useState({ from_userid: me ? String(me) : "", to_userid: "", from: "", to: "", reason: "" });
  const [busy, setBusy] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const ok = form.to_userid && form.from && form.to && form.to >= form.from && form.to_userid !== form.from_userid;
  const save = async () => {
    setBusy(true);
    try {
      const response = await delegationApi.add({
        ...(form.from_userid ? { from_userid: Number(form.from_userid) } : {}),
        to_userid: Number(form.to_userid),
        from_time: new Date(`${form.from}T00:00:00`).toISOString(),
        to_time: new Date(`${form.to}T23:59:59`).toISOString(),
        reason: form.reason.trim(),
      });
      notifications.success(apiMessage(response, t("delegationSaved")));
      onSaved();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      size="md"
      onClose={onClose}
      title={t("addDelegation")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common:cancel")}
          </Button>
          <Button disabled={!ok || busy} loading={busy} onClick={() => void save()}>
            {t("submitPolicy")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        <label className={labelClass}>
          {t("delegateFrom")}
          <FilterSelect className="mt-1.5" value={form.from_userid} onChange={(v) => set({ from_userid: v })} options={[{ value: "", label: t("me") }, ...users]} />
        </label>
        <label className={labelClass}>
          {t("delegateTo")} <span className="text-red-500">*</span>
          <FilterSelect className="mt-1.5" value={form.to_userid} onChange={(v) => set({ to_userid: v })} options={[{ value: "", label: t("chooseUser") }, ...users.filter((u) => u.value !== form.from_userid)]} />
        </label>
        <label className={labelClass}>
          {t("firstDay")} <span className="text-red-500">*</span>
          <DateInput className={inputClass} value={form.from} max={form.to || undefined} onChange={(e) => set({ from: e.target.value })} />
        </label>
        <label className={labelClass}>
          {t("lastDay")} <span className="text-red-500">*</span>
          <DateInput className={inputClass} value={form.to} min={form.from || undefined} onChange={(e) => set({ to: e.target.value })} />
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          {t("reason")}
          <input className={inputClass} value={form.reason} placeholder={t("reasonPlaceholder")} onChange={(e) => set({ reason: e.target.value })} />
        </label>
      </div>
    </Modal>
  );
}

function DelegationsTab({ can, users }) {
  const { t } = useTranslation(["approvals", "common"]);
  const list = useServerList({ api: delegationApi.listPath, call: delegationApi.list });
  const [adding, setAdding] = useState(false);
  const [action, setAction] = useState(null);
  const [narration, setNarration] = useState("");
  const [working, setWorking] = useState(false);
  const run = async () => {
    if (action.method !== "auth" && !narration.trim()) {
      notifications.error(t("narrationRequired"));
      return;
    }
    setWorking(true);
    try {
      const response = await delegationApi[action.method]({ id: action.row.id, narration: narration.trim() });
      notifications.success(apiMessage(response, t("actionDone")));
      setAction(null);
      setNarration("");
      list.reload();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setWorking(false);
    }
  };
  const columns = [
    { key: "from_user", label: t("delegateFrom"), align: "left", render: (r) => <span className="font-semibold">{r.from_user ?? r.from_userid}</span> },
    { key: "to_user", label: t("delegateTo"), align: "left", render: (r) => r.to_user ?? r.to_userid },
    { key: "from_time", label: t("period"), render: (r) => `${day(r.from_time)} – ${day(r.to_time)}` },
    { key: "reason", label: t("reason"), align: "left", render: (r) => r.reason || "—" },
    { key: "status", label: t("common:status"), render: (r) => <StatusBadge status={String(r.process_status_name ?? r.status_name ?? r.state ?? "")} variant="subtle" /> },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (r) => {
        const buttons = getMakerCheckerButtons(r, { canAuthorize: can("Authorise") || can("Authorize") });
        const live = String(r.status_name ?? r.state ?? "").toUpperCase() === "ACTIVE";
        return (
          <div className="flex items-center justify-center gap-1">
            <RowActions buttons={{ ...buttons, view: false, audit: false }} onAuthorize={() => setAction({ method: "auth", row: r, label: t("common:authorize") })} onDeauthorize={() => setAction({ method: "deauth", row: r, label: t("reject") })} />
            {live && (can("Change Status") || can("Edit")) && <ActionIconButton label={t("endNow")} intent="deauth" icon={PowerOff} onClick={() => setAction({ method: "cancel", row: r, label: t("endNow") })} />}
          </div>
        );
      },
    },
  ];
  return (
    <>
      <ListTable
        list={list}
        rowKey={(r) => r.id}
        columns={columns}
        title={t("delegations")}
        emptyTitle={t("noDelegations")}
        actions={
          can("Add") && (
            <Button size="sm" icon={Plus} onClick={() => setAdding(true)}>
              {t("addDelegation")}
            </Button>
          )
        }
      />
      {adding && (
        <DelegationForm
          users={users}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            list.reload();
          }}
        />
      )}
      {action && (
        <ConfirmDialog open title={`${action.label} · ${action.row.from_user ?? ""} → ${action.row.to_user ?? ""}`} confirmLabel={action.label} destructive={action.method !== "auth"} pending={working} onClose={() => setAction(null)} onConfirm={() => void run()}>
          <textarea value={narration} onChange={(e) => setNarration(e.target.value)} placeholder={action.method === "auth" ? t("common:narration", { defaultValue: "Narration" }) : t("narrationRequired")} className="min-h-20 w-full rounded-xl border border-border p-3 text-sm" />
        </ConfirmDialog>
      )}
    </>
  );
}

// Each user's supervisor, for levels scoped to the maker's supervisor.
function SupervisorsTab({ can, users }) {
  const { t } = useTranslation(["approvals", "common"]);
  const list = useServerList({ api: supervisorApi.listPath, call: supervisorApi.list });
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const canEdit = can("Edit") || can("Add");
  const act = async (work, done) => {
    setBusy(true);
    try {
      notifications.success(apiMessage(await work(), t("actionDone")));
      done();
      list.reload();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const columns = [
    { key: "user", label: t("user"), align: "left", render: (r) => <span className="font-semibold">{r.user}</span> },
    { key: "supervisor", label: t("supervisor"), align: "left", render: (r) => r.supervisor },
    { key: "updated_by", label: t("updatedBy"), render: (r) => r.updated_by ?? "—" },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (r) =>
        canEdit && (
          <div className="flex items-center justify-center gap-1">
            <ActionIconButton label={t("common:edit")} intent="edit" icon={UserCog} onClick={() => setEditing({ userid: String(r.userid), supervisor_userid: String(r.supervisor_userid), fixed: true })} />
            <ActionIconButton label={t("removeSupervisor")} intent="delete" icon={Trash2} onClick={() => setRemoving(r)} />
          </div>
        ),
    },
  ];
  return (
    <>
      <ListTable
        list={list}
        rowKey={(r) => r.userid}
        columns={columns}
        title={t("supervisors")}
        emptyTitle={t("noSupervisors")}
        actions={
          canEdit && (
            <Button size="sm" icon={Plus} onClick={() => setEditing({ userid: "", supervisor_userid: "" })}>
              {t("setSupervisor")}
            </Button>
          )
        }
      />
      {editing && (
        <Modal
          open
          size="md"
          onClose={() => setEditing(null)}
          title={t("setSupervisor")}
          footer={
            <>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                {t("common:cancel")}
              </Button>
              <Button
                disabled={!editing.userid || !editing.supervisor_userid || editing.userid === editing.supervisor_userid || busy}
                loading={busy}
                onClick={() => void act(() => supervisorApi.set({ userid: Number(editing.userid), supervisor_userid: Number(editing.supervisor_userid) }), () => setEditing(null))}
              >
                {t("common:save")}
              </Button>
            </>
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            <label className={labelClass}>
              {t("user")}
              <FilterSelect className="mt-1.5" disabled={editing.fixed} value={editing.userid} onChange={(v) => setEditing({ ...editing, userid: v })} options={[{ value: "", label: t("chooseUser") }, ...users]} />
            </label>
            <label className={labelClass}>
              {t("supervisor")}
              <FilterSelect className="mt-1.5" value={editing.supervisor_userid} onChange={(v) => setEditing({ ...editing, supervisor_userid: v })} options={[{ value: "", label: t("chooseUser") }, ...users.filter((u) => u.value !== editing.userid)]} />
            </label>
          </div>
        </Modal>
      )}
      <ConfirmDialog
        open={Boolean(removing)}
        destructive
        pending={busy}
        title={t("removeSupervisor")}
        description={removing ? t("removeSupervisorBody", { user: removing.user, supervisor: removing.supervisor }) : ""}
        confirmLabel={t("removeSupervisor")}
        onClose={() => setRemoving(null)}
        onConfirm={() => void act(() => supervisorApi.remove({ userid: removing.userid }), () => setRemoving(null))}
      />
    </>
  );
}

// GLOBAL SETTINGS > Approval Delegations (menu 203): a user on leave hands
// their approvals to another for a period; and each user's supervisor.
export function ApprovalDelegations() {
  const { t } = useTranslation(["approvals", "common"]);
  const can = usePagePermission("Approval Delegations");
  const users = useUserOptions();
  const [tab, setTab] = useState("delegations");
  if (!can("View")) return <NoAccess />;
  return (
    <div>
      <div className="mb-4">
        <PageTitle>{t("delegationsTitle")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("delegationsSubtitle")}</p>
      </div>
      <div className="mb-4 flex gap-1.5">
        <TabButton active={tab === "delegations"} onClick={() => setTab("delegations")}>
          {t("delegations")}
        </TabButton>
        <TabButton active={tab === "supervisors"} onClick={() => setTab("supervisors")}>
          {t("supervisors")}
        </TabButton>
      </div>
      {tab === "delegations" ? <DelegationsTab can={can} users={users} /> : <SupervisorsTab can={can} users={users} />}
    </div>
  );
}
