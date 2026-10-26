import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { HandCoins, Plus, Trash2, UserPlus } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { AmountInput } from "@/Components/Common/AmountInput";
import { Button } from "@/Components/Common/Button";
import { ListTable } from "@/Components/Common/ListView";
import { Modal } from "@/Components/Common/Modal";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { PageTitle } from "@/Components/Common/PageTitle";
import { RowActions } from "@/Components/Common/RowActions";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { dayDate, money } from "@/Components/Finance/Accounts/accountShared";
import { useMenuPermission, usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { borrowerGroupsApi, recordOf } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import {
  ActionButtons,
  Facts,
  NarrationDialog,
  inputClass,
  labelClass,
} from "../../Deposits/depositShared";
import {
  AccountPick,
  branchOptions,
  officerOptions,
  useCoreBanking,
  useOpenTills,
} from "../../coreBankingShared";
import { Field, MiniTable, Tabs, Timeline, useInstitutionScope } from "../loanShared";

const FREQUENCIES = ["WEEKLY", "FORTNIGHTLY", "MONTHLY"];
const ROLES = ["LEADER", "SECRETARY", "TREASURER", "MEMBER"];
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

// "Every Tuesday" / "1st of the month" / …
const meetingLabel = (t, g) =>
  g.meeting_frequency === "MONTHLY"
    ? t("meetMonthly", { day: g.meeting_day })
    : t(`meet_${g.meeting_frequency}`, { day: t(`weekday_${g.meeting_day}`) });

// LOANS › Borrower Groups (menu 194): solidarity groups with a loan officer,
// a meeting rhythm and joint liability: while a member is
// `arrears_block_days` past due the group is blocked and nobody borrows.
export function BorrowerGroups() {
  const { t } = useTranslation(["corebank", "common"]);
  const can = usePagePermission();
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [closing, setClosing] = useState(null);
  const { scope } = useInstitutionScope();
  const list = useServerList({ api: borrowerGroupsApi.listPath, call: borrowerGroupsApi.list });
  const columns = [
    {
      key: "code",
      label: t("group"),
      render: (g) => (
        <span className="text-xs leading-tight">
          <b className="block font-mono">{g.code}</b>
          <span className="text-muted-foreground">{g.name}</span>
        </span>
      ),
    },
    {
      key: "branch_name",
      label: t("branch"),
      render: (g) => <span className="text-xs">{g.branch_name}</span>,
    },
    {
      key: "officer_name",
      label: t("loanOfficer"),
      render: (g) => <span className="text-xs">{g.officer_name ?? "—"}</span>,
    },
    {
      key: "meeting",
      label: t("meeting"),
      sortable: false,
      render: (g) => <span className="text-xs">{meetingLabel(t, g)}</span>,
    },
    {
      key: "members",
      label: t("members"),
      render: (g) => <span className="text-xs tabular-nums">{g.members}</span>,
    },
    {
      key: "outstanding",
      label: t("outstanding"),
      render: (g) => (
        <span className="text-xs leading-tight tabular-nums">
          <b className="block">{money(g.outstanding)}</b>
          <span className="text-[10px] text-muted-foreground">
            {t("activeLoans", { count: g.active_loans })}
          </span>
        </span>
      ),
    },
    {
      key: "status",
      label: t("status"),
      render: (g) => (
        <span className="flex flex-wrap gap-1">
          <StatusBadge status={g.status} />
          {g.blocked && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
              {t("blocked")}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (g) => (
        <RowActions
          buttons={{ view: true, edit: g.status === "ACTIVE", deactivate: g.status === "ACTIVE" }}
          onView={() => setViewing(g)}
          onEdit={() => setEditing(g)}
          onDeactivate={() => setClosing(g)}
        />
      ),
    },
  ];
  const close = async (narration) => {
    try {
      const r = await borrowerGroupsApi.deactivate(scope({ id: closing.id, narration }));
      if (r?.message) notifications.success(r.message);
      setClosing(null);
      list.reload();
    } catch (e) {
      notifications.error(e.message);
    }
  };
  return (
    <div className="pb-8 pt-4">
      <div className="mb-5">
        <PageTitle>{t("groupsTitle")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("groupsSubtitle")}</p>
      </div>
      <ListTable
        list={list}
        columns={columns}
        rowKey={(g) => g.id}
        title={t("groupsTitle")}
        emptyTitle={t("noGroups")}
        actions={
          can("Add") && (
            <Button size="sm" icon={Plus} onClick={() => setEditing({})}>
              {t("addGroup")}
            </Button>
          )
        }
      />
      {viewing && (
        <GroupDetail id={viewing.id} onClose={() => setViewing(null)} onChanged={list.reload} />
      )}
      {editing && (
        <GroupForm
          group={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={list.reload}
        />
      )}
      {closing && (
        <NarrationDialog
          title={t("closeGroup", { code: closing.code })}
          hint={t("closeGroupHint")}
          confirmLabel={t("closeGroupConfirm")}
          variant="danger"
          required
          onClose={() => setClosing(null)}
          onSave={close}
        />
      )}
    </div>
  );
}

const blankGroup = {
  code: "",
  name: "",
  branch_id: "",
  officer_user_id: "",
  meeting_frequency: "WEEKLY",
  meeting_day: "1",
  meeting_place: "",
  arrears_block_days: "1",
};

function GroupForm({ group, onClose, onSaved }) {
  const { t } = useTranslation("corebank");
  const { scope } = useInstitutionScope();
  const setup = useCoreBanking(scope);
  const [form, setForm] = useState(() =>
    group
      ? Object.fromEntries(
          Object.keys(blankGroup).map((k) => [k, group[k] == null ? "" : String(group[k])]),
        )
      : blankGroup,
  );
  const [saving, setSaving] = useState(false);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const monthly = form.meeting_frequency === "MONTHLY";
  const dayOk = monthly
    ? Number(form.meeting_day) >= 1 && Number(form.meeting_day) <= 31
    : WEEKDAYS.includes(Number(form.meeting_day));
  const ready = form.code && form.name.trim() && form.branch_id && form.officer_user_id && dayOk;
  const save = async () => {
    setSaving(true);
    try {
      const body = {
        ...(group ? { id: group.id } : { code: form.code }),
        name: form.name.trim(),
        branch_id: Number(form.branch_id),
        officer_user_id: Number(form.officer_user_id),
        meeting_frequency: form.meeting_frequency,
        meeting_day: Number(form.meeting_day),
        meeting_place: form.meeting_place.trim(),
        arrears_block_days: Number(form.arrears_block_days) || 0,
      };
      const r = await borrowerGroupsApi[group ? "edit" : "add"](scope(body));
      if (r?.message) notifications.success(r.message);
      onSaved();
      onClose();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title={group ? t("editGroup", { code: group.code }) : t("addGroup")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button loading={saving} disabled={!ready} onClick={() => void save()}>
            {t("save")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          {t("code")}
          <Field
            field={{ type: "code" }}
            disabled={Boolean(group)}
            value={form.code}
            onChange={set("code")}
          />
        </label>
        <label className={labelClass}>
          {t("name")}
          <Field field={{}} value={form.name} onChange={set("name")} />
        </label>
        <label className={labelClass}>
          {t("branch")}
          <Field
            field={{
              type: "select",
              blank: t("choose"),
              options: branchOptions(setup, { openOnly: true }),
            }}
            value={form.branch_id}
            onChange={set("branch_id")}
          />
        </label>
        <label className={labelClass}>
          {t("loanOfficer")}
          <Field
            field={{ type: "select", blank: t("choose"), options: officerOptions(setup) }}
            value={form.officer_user_id}
            onChange={set("officer_user_id")}
          />
        </label>
        <label className={labelClass}>
          {t("meetingFrequency")}
          <Field
            field={{
              type: "select",
              options: FREQUENCIES.map((f) => ({ value: f, label: t(`freq_${f}`) })),
            }}
            value={form.meeting_frequency}
            onChange={(v) => setForm((f) => ({ ...f, meeting_frequency: v, meeting_day: "1" }))}
          />
        </label>
        <label className={labelClass}>
          {t("meetingDay")}
          {monthly ? (
            <Field
              field={{ type: "int", placeholder: "1-31" }}
              value={form.meeting_day}
              onChange={set("meeting_day")}
            />
          ) : (
            <Field
              field={{
                type: "select",
                options: WEEKDAYS.map((d) => ({ value: String(d), label: t(`weekday_${d}`) })),
              }}
              value={form.meeting_day}
              onChange={set("meeting_day")}
            />
          )}
        </label>
        <label className={labelClass}>
          {t("meetingPlace")}
          <Field field={{}} value={form.meeting_place} onChange={set("meeting_place")} />
        </label>
        <label className={labelClass}>
          {t("arrearsBlockDays")}
          <Field
            field={{ type: "int" }}
            value={form.arrears_block_days}
            onChange={set("arrears_block_days")}
          />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
            {t("arrearsBlockDaysHint")}
          </span>
        </label>
      </div>
    </Modal>
  );
}

// A group: its facts, members (roles, add, remove), collection sheet and events.
function GroupDetail({ id, onClose, onChanged }) {
  const { t } = useTranslation("corebank");
  const can = usePagePermission();
  const { scope } = useInstitutionScope();
  const [group, setGroup] = useState(null);
  const [tab, setTab] = useState("members");
  const [dialog, setDialog] = useState(null);
  const load = useCallback(
    () =>
      borrowerGroupsApi
        .get(scope({ id }))
        .then((r) => setGroup(recordOf(r)))
        .catch((e) => notifications.error(e.message)),
    [id, scope],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const run = async (verb, body) => {
    try {
      const r = await borrowerGroupsApi[verb](scope({ id, ...body }));
      if (r?.message) notifications.success(r.message);
      setDialog(null);
      setGroup(recordOf(r) ?? group);
      await load();
      onChanged();
    } catch (e) {
      notifications.error(e.message);
    }
  };
  const active = group?.status === "ACTIVE";
  const members = (group?.member_list ?? []).filter((m) => m.status === "ACTIVE");
  return (
    <Modal
      open
      size="xl"
      onClose={onClose}
      title={group ? `${group.code} · ${group.name}` : t("group")}
    >
      {!group ? (
        <PageSkeleton />
      ) : (
        <div className="grid gap-4">
          {group.blocked && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
              {t("blockedHint", { days: group.max_days_past_due })}
            </p>
          )}
          <Facts
            rows={[
              [t("branch"), group.branch_name],
              [t("loanOfficer"), group.officer_name ?? "—"],
              [
                t("meeting"),
                `${meetingLabel(t, group)}${group.meeting_place ? ` · ${group.meeting_place}` : ""}`,
              ],
              [t("formedOn"), dayDate(group.formed_on)],
              [t("members"), group.members],
              [t("activeLoansLabel"), group.active_loans],
              [t("outstanding"), money(group.outstanding)],
              [
                t("maxDaysPastDue"),
                group.max_days_past_due,
                group.max_days_past_due ? "text-red-700" : undefined,
              ],
            ]}
          />
          <div>
            <Tabs
              tabs={[
                { key: "members", count: members.length },
                { key: "collection" },
                { key: "events" },
              ]}
              value={tab}
              onChange={setTab}
              labelOf={(k) => t(`groupTab_${k}`)}
            />
            {tab === "members" && (
              <div className="grid gap-3">
                {active && can("Edit") && (
                  <ActionButtons
                    buttons={[
                      {
                        key: "add",
                        label: t("addMember"),
                        icon: UserPlus,
                        run: () => setDialog({ kind: "add" }),
                      },
                    ]}
                  />
                )}
                <MiniTable
                  rows={members}
                  empty={t("noMembers")}
                  columns={[
                    {
                      key: "name",
                      label: t("member"),
                      render: (m) => <b className="text-xs">{m.name}</b>,
                    },
                    {
                      key: "role",
                      label: t("role"),
                      render: (m) =>
                        active && can("Edit") ? (
                          <div className="w-40">
                            <Field
                              field={{
                                type: "select",
                                options: ROLES.map((r) => ({ value: r, label: t(`role_${r}`) })),
                              }}
                              value={m.role}
                              onChange={(role) =>
                                void run("member_role", { member_id: m.id, role })
                              }
                            />
                          </div>
                        ) : (
                          <span className="text-xs">{t(`role_${m.role}`)}</span>
                        ),
                    },
                    {
                      key: "joined_on",
                      label: t("joinedOn"),
                      render: (m) => <span className="text-xs">{dayDate(m.joined_on)}</span>,
                    },
                    {
                      key: "actions",
                      label: "",
                      render: (m) =>
                        active &&
                        can("Edit") && (
                          <ActionIconButton
                            label={t("removeMember")}
                            intent="delete"
                            icon={Trash2}
                            onClick={() => setDialog({ kind: "remove", member: m })}
                          />
                        ),
                    },
                  ]}
                />
              </div>
            )}
            {tab === "collection" && <CollectionSheet group={group} onCollected={load} />}
            {tab === "events" && <Timeline events={group.events} />}
          </div>
        </div>
      )}
      {dialog?.kind === "add" && (
        <AddMember onClose={() => setDialog(null)} onSave={(body) => run("member_add", body)} />
      )}
      {dialog?.kind === "remove" && (
        <NarrationDialog
          title={t("removeMemberTitle", { name: dialog.member.name })}
          hint={t("removeMemberHint")}
          confirmLabel={t("removeMember")}
          variant="danger"
          required
          onClose={() => setDialog(null)}
          onSave={(narration) => run("member_remove", { member_id: dialog.member.id, narration })}
        />
      )}
    </Modal>
  );
}

// A customer joins through one of their accounts (its holder is the member).
function AddMember({ onClose, onSave }) {
  const { t } = useTranslation("corebank");
  const { scope } = useInstitutionScope();
  const [account, setAccount] = useState(null);
  const [role, setRole] = useState("MEMBER");
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open
      onClose={onClose}
      title={t("addMember")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            loading={busy}
            disabled={!account}
            onClick={async () => {
              setBusy(true);
              await onSave({ entity_type: account.owner.kind, entity_id: account.owner.id, role });
              setBusy(false);
            }}
          >
            {t("addMember")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <label className={labelClass}>
          {t("customer")}
          <div className="mt-1.5">
            <AccountPick
              value={account}
              onChange={setAccount}
              scope={scope}
              filter={(a) => /^CUST_(INDV|CORP)$/.test(a.owner?.kind ?? "")}
            />
          </div>
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
            {t("addMemberHint")}
          </span>
        </label>
        <label className={labelClass}>
          {t("role")}
          <Field
            field={{
              type: "select",
              options: ROLES.map((r) => ({ value: r, label: t(`role_${r}`) })),
            }}
            value={role}
            onChange={setRole}
          />
        </label>
      </div>
    </Modal>
  );
}

// The meeting's collection sheet: each member loan's due, overdue and
// outstanding, an amount to collect per loan, then one all-or-nothing
// collection in cash or through the teller's open till.
function CollectionSheet({ group, onCollected }) {
  const { t } = useTranslation("corebank");
  const { scope } = useInstitutionScope();
  const canCollect = useMenuPermission("Loan Facilities")("Add");
  const [date, setDate] = useState("");
  const [sheet, setSheet] = useState(null);
  const [amounts, setAmounts] = useState({});
  const [source, setSource] = useState("CASH");
  const tills = useOpenTills(scope, source === "TILL");
  const [tillId, setTillId] = useState("");
  const [narration, setNarration] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    setSheet(null);
    borrowerGroupsApi
      .collection_sheet(scope({ id: group.id, ...(date ? { date } : {}) }))
      .then((r) => {
        const s = recordOf(r);
        setSheet(s);
        setAmounts(
          Object.fromEntries(
            (s?.lines ?? []).map((l) => [
              l.facility_id,
              String(Number(l.due ?? 0) + Number(l.overdue ?? 0) || ""),
            ]),
          ),
        );
      })
      .catch((e) => notifications.error(e.message));
  }, [group.id, date, scope]);
  useEffect(() => {
    load();
  }, [load]);
  const payments = Object.entries(amounts)
    .filter(([, v]) => Number(v) > 0)
    .map(([facility_id, amount]) => ({ facility_id: Number(facility_id), amount }));
  const total = payments.reduce((s, p) => s + Number(p.amount), 0);
  const collect = async () => {
    setBusy(true);
    try {
      const r = await borrowerGroupsApi.collect(
        scope({
          id: group.id,
          source,
          ...(source === "TILL" ? { till_id: Number(tillId) } : {}),
          payments,
          narration: narration.trim(),
        }),
      );
      if (r?.message) notifications.success(r.message);
      setNarration("");
      load();
      onCollected();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-3">
      <label className={cn(labelClass, "block max-w-xs")}>
        {t("meetingDate")}
        <Field field={{ type: "date" }} value={date} onChange={setDate} />
      </label>
      {!sheet ? (
        <PageSkeleton />
      ) : (
        <>
          <MiniTable
            rows={sheet.lines ?? []}
            rowKey={(l) => l.facility_id}
            empty={t("noLoansDue")}
            columns={[
              {
                key: "member",
                label: t("member"),
                render: (l) => (
                  <span className="text-xs leading-tight">
                    <b className="block">{l.name}</b>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {l.facility_number} · {t(`role_${l.role}`, { defaultValue: l.role })}
                    </span>
                  </span>
                ),
              },
              { key: "due", label: t("due"), align: "right", render: (l) => money(l.due) },
              {
                key: "overdue",
                label: t("overdue"),
                align: "right",
                render: (l) => (
                  <span className={cn(Number(l.overdue) > 0 && "font-bold text-red-700")}>
                    {money(l.overdue)}
                  </span>
                ),
              },
              { key: "days_past_due", label: t("daysPastDue"), align: "right" },
              {
                key: "outstanding",
                label: t("outstanding"),
                align: "right",
                render: (l) => money(l.outstanding),
              },
              {
                key: "savings",
                label: t("savings"),
                align: "right",
                render: (l) => money(l.savings),
              },
              {
                key: "collect",
                label: t("collect"),
                render: (l) => (
                  <AmountInput
                    className={cn(inputClass, "w-32")}
                    value={amounts[l.facility_id] ?? ""}
                    onChange={(v) => setAmounts((a) => ({ ...a, [l.facility_id]: v }))}
                  />
                ),
              },
            ]}
          />
          <Facts
            rows={[
              [t("totalDue"), money(sheet.total_due)],
              [t("totalOverdue"), money(sheet.total_overdue)],
              [t("toCollect"), money(total)],
            ]}
          />
          {canCollect && (sheet.lines ?? []).length > 0 && (
            <div className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end">
              <label className={labelClass}>
                {t("source")}
                <Field
                  field={{
                    type: "select",
                    options: ["CASH", "TILL"].map((s) => ({ value: s, label: t(`source_${s}`) })),
                  }}
                  value={source}
                  onChange={setSource}
                />
              </label>
              {source === "TILL" ? (
                <label className={labelClass}>
                  {t("till")}
                  <Field
                    field={{
                      type: "select",
                      blank: t("choose"),
                      options: tills,
                    }}
                    value={tillId}
                    onChange={setTillId}
                  />
                </label>
              ) : (
                <span />
              )}
              <label className={labelClass}>
                {t("narration")}
                <input
                  className={cn(inputClass, "mt-1")}
                  value={narration}
                  maxLength={200}
                  onChange={(e) => setNarration(e.target.value)}
                />
              </label>
              <Button
                icon={HandCoins}
                loading={busy}
                disabled={!payments.length || (source === "TILL" && !tillId)}
                onClick={() => void collect()}
              >
                {t("collectAll")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
