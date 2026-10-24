import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Plus, Undo2, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { ListTable } from "@/Components/Common/ListView";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { InstitutionField } from "@/Components/GlobalSettings/Notifications/notificationShared";
import { useAuth } from "@/Hooks/useAuth";
import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { reconActionsApi, reconSetsApi } from "@/Services/Recon/recon.api";
import { notifications } from "@/Utils/Lib/notifications";
import { ActionButtons, NarrationDialog, inputClass, Section } from "../Finance/Deposits/depositShared";
import { MiniTable, Tabs } from "../Finance/Loans/loanShared";
import { SetBuilder } from "./SetBuilder";
import { GroupCard, SetAging, SetGroups, SetRuns, SetUnmatched } from "./SetResults";
import { PageTitle } from "@/Components/Common/PageTitle";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { DefinitionCompare, EventsSection, FactGrid, Field, JsonView, MakerChecker, ReconRowActions, ReconStatus, RecordStatus, label, reconDate, recordColumns, useDecision, useMe, useRecord } from "./reconShared";

// Recon Sets (menu 191): what is reconciled with what (the rules), their
// runs and results, and the approvals queue for changes to results.
export function ReconSets() {
  const { t } = useTranslation("recon");
  const [tab, setTab] = useState("sets");
  return (
    <div className="pb-8 pt-4">
      <div className="mb-5">
        <PageTitle>{t("setsTitle")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("setsSubtitle")}</p>
      </div>
      <Tabs tabs={[{ key: "sets" }, { key: "approvals" }]} value={tab} onChange={setTab} labelOf={(k) => t(`tab_${k}`)} />
      {tab === "sets" ? <SetList /> : <Approvals />}
    </div>
  );
}

function SetList() {
  const { t } = useTranslation("recon");
  const can = usePagePermission();
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const list = useServerList({ api: reconSetsApi.listPath, call: reconSetsApi.list });
  const columns = [
    { key: "code", label: t("code"), render: (r) => <span className="font-mono text-xs font-bold">{r.code}</span> },
    { key: "name", label: t("name"), render: (r) => <span className="text-xs font-semibold">{r.name}</span> },
    { key: "version", label: t("version"), render: (r) => <span className="text-xs tabular-nums">{r.version}</span> },
    {
      key: "last_run",
      label: t("lastRun"),
      render: (r) =>
        r.last_run ? (
          <span className="flex flex-col items-start gap-0.5 text-xs leading-tight">
            <span className="whitespace-nowrap tabular-nums">{r.last_run.business_date}</span>
            <ReconStatus value={r.last_run.status} />
          </span>
        ) : (
          <span className="text-xs">—</span>
        ),
    },
    { key: "status", label: t("status"), render: (r) => <RecordStatus record={r} /> },
    { key: "actions", label: t("actions"), sortable: false, render: (r) => <ReconRowActions api={reconSetsApi} row={r} onView={() => setViewing(r)} onEdit={() => setViewing({ ...r, startEdit: true })} onChanged={list.reload} /> },
  ];
  const actions = can("Add") && (
    <Button size="sm" icon={Plus} onClick={() => setEditing({})}>
      {t("addSet")}
    </Button>
  );
  return (
    <>
      <ListTable list={list} actions={actions} columns={columns} rowKey={(r) => r.id} title={t("tab_sets")} emptyTitle={t("noSets")} />
      {viewing && (
        <SetDetail
          set={viewing}
          onClose={() => setViewing(null)}
          onEdit={(s) => {
            setViewing(null);
            setEditing(s);
          }}
          onChanged={list.reload}
        />
      )}
      {editing && <SetForm set={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={list.reload} />}
    </>
  );
}

// A new set starts with two sources to pick and no passes yet.
const blankDefinition = { window_days: 3, sources: [], passes: [] };

function SetForm({ set, onClose, onSaved }) {
  const { t } = useTranslation("recon");
  const isPlatform = useCanChooseInstitution();
  const [instId, setInstId] = useState("");
  const [options, setOptions] = useState(null);
  const [form, setForm] = useState({ code: set?.code ?? "", name: set?.name ?? "", description: set?.description ?? "" });
  const [definition, setDefinition] = useState(() => set?.pending_definition ?? set?.definition ?? blankDefinition);
  const [problem, setProblem] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    reconSetsApi
      .options(isPlatform && instId ? { inst_profile_id: Number(instId) } : {})
      .then((r) => setOptions(rowsOf(r)[0] ?? {}))
      .catch((error) => notifications.error(error.message));
  }, [isPlatform, instId]);
  const valid = form.code.trim() && form.name.trim() && definition.sources?.length >= 2 && definition.passes?.length >= 1 && (!isPlatform || set || instId);
  const save = async () => {
    setSaving(true);
    setProblem("");
    try {
      const body = { code: form.code.trim(), name: form.name.trim(), description: form.description.trim(), definition };
      const response = set ? await reconSetsApi.edit({ id: set.id, ...body }) : await reconSetsApi.add({ ...body, ...(isPlatform ? { inst_profile_id: Number(instId) } : {}) });
      if (response?.message) notifications.success(response.message);
      onClose();
      onSaved();
    } catch (error) {
      // The message names the part of the definition at fault.
      setProblem(error.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      size="full"
      title={set ? t("editSet", { code: set.code }) : t("addSet")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button loading={saving} disabled={!valid} onClick={() => void save()}>
            {t("save")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          {!set && (
            <div className="sm:col-span-3">
              <InstitutionField value={instId} onChange={setInstId} />
            </div>
          )}
          <Field label={t("code")} required>
            <input className={`${inputClass} font-mono`} disabled={Boolean(set)} value={form.code} maxLength={32} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") }))} />
          </Field>
          <Field label={t("name")} required>
            <input className={inputClass} value={form.name} maxLength={100} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label={t("description")}>
            <input className={inputClass} value={form.description} maxLength={500} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </Field>
        </div>
        {set && <p className="text-xs text-muted-foreground">{t("editWaitsBeside")}</p>}
        {problem && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">{problem}</p>}
        <SetBuilder definition={definition} onChange={setDefinition} options={options} />
      </div>
    </Modal>
  );
}

const SET_TABS = ["overview", "runs", "groups", "unmatched", "aging"];

function SetDetail({ set, onClose, onEdit, onChanged }) {
  const { t } = useTranslation("recon");
  const [s, reload] = useRecord(reconSetsApi.get, set.id, set);
  const [tab, setTab] = useState("overview");
  const changed = useCallback(() => {
    reload();
    onChanged();
  }, [reload, onChanged]);
  const ready = Boolean(s.definition);
  // Opened by a row's Edit: straight to the form once the definition is in.
  useEffect(() => {
    if (set.startEdit && s.definition) onEdit(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.startEdit, s.definition]);
  return (
    <Modal open onClose={onClose} size="full" title={`${s.name} (${s.code})`}>
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <ReconStatus value={s.status} />
            {s.has_pending && <span className="text-xs text-amber-700">{t("changeBy", { by: s.pending_by })}</span>}
          </span>
          <MakerChecker
            api={reconSetsApi}
            record={s}
            onEdit={() => onEdit(s)}
            onChanged={changed}
            onDeleted={() => {
              onClose();
              onChanged();
            }}
          />
        </div>
        <Tabs tabs={SET_TABS.map((key) => ({ key }))} value={tab} onChange={setTab} labelOf={(k) => t(`setTab_${k}`)} />
        {tab === "overview" && (
          <>
            <FactGrid
              rows={[
                ["version", s.version],
                ["windowDays", s.definition?.window_days],
                ["schedule", s.definition?.schedule ? t("scheduleText", { time: s.definition.schedule.run_time, days: s.definition.schedule.lag_days }) : t("noSchedule")],
                ["glAccounts", s.definition?.gl ? t("glOn") : t("noGl")],
                ["lastRun", s.last_run ? `${s.last_run.business_date} · ${label(t, "status", s.last_run.status)}` : null],
                ["description", s.description],
                ["decision", s.decided_at ? `${s.decided_by} · ${reconDate(s.decided_at)}${s.decision_note ? ` · ${s.decision_note}` : ""}` : null],
              ]}
            />
            <Section title={t("definition")}>{s.has_pending && s.pending_definition ? <DefinitionCompare current={s.definition} pending={s.pending_definition} /> : <JsonView value={s.definition} />}</Section>
            <EventsSection api={reconSetsApi} id={s.id} />
          </>
        )}
        {ready && tab === "runs" && <SetRuns set={s} onChanged={changed} />}
        {ready && tab === "groups" && <SetGroups set={s} />}
        {ready && tab === "unmatched" && <SetUnmatched set={s} />}
        {ready && tab === "aging" && <SetAging set={s} />}
      </div>
    </Modal>
  );
}

// ---- Approvals: changes to results waiting for another user ----

function Approvals() {
  const { t } = useTranslation("recon");
  const can = usePagePermission();
  const me = useMe();
  const [viewing, setViewing] = useState(null);
  const list = useServerList({ api: reconActionsApi.listPath, call: reconActionsApi.list, prefix: "act_" });
  const decision = useDecision({ api: reconActionsApi, onDone: list.reload, hintOf: (verb) => (verb === "auth" ? t("approveActionHint") : null) });
  const named = (r) => ({ ...r, name: `${t(`kind_${r.kind}`)} #${r.id}` });
  const columns = [
    { key: "id", label: "#", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { key: "kind", label: t("kind"), render: (r) => <span className="text-xs font-semibold">{t(`kind_${r.kind}`)}</span> },
    { key: "set", label: t("set"), render: (r) => <span className="text-xs">{`${r.set_name} (${r.set_code})`}</span> },
    { key: "what", label: t("touches"), render: (r) => <span className="text-xs">{touches(t, r)}</span> },
    { key: "reason", label: t("reason"), render: (r) => <span className="text-xs">{[r.reason && label(t, "reason", r.reason), r.note].filter(Boolean).join(" · ") || "—"}</span> },
    { key: "requested_by", label: t("requested"), render: (r) => <span className="whitespace-nowrap text-xs">{`${r.requested_by} · ${reconDate(r.requested_at)}`}</span> },
    { key: "status", label: t("status"), render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      label: t("actions"),
      sortable: false,
      render: (r) => {
        const decide = r.status === "PENDING" && r.requested_by !== me && can("Authorise");
        return <RowActions buttons={{ view: true, authorize: decide, deauthorize: decide }} onView={() => setViewing(r)} onAuthorize={() => decision.ask("auth", named(r))} onDeauthorize={() => decision.ask("deauth", named(r))} />;
      },
    },
  ];
  return (
    <>
      <ListTable list={list} columns={columns} rowKey={(r) => r.id} title={t("tab_approvals")} emptyTitle={t("noActions")} />
      {decision.node}
      {viewing && <ActionDetail action={viewing} onClose={() => setViewing(null)} onChanged={list.reload} />}
    </>
  );
}

// "Group #44", "3 records", "Business date 2026-10-22".
const touches = (t, a) => [a.group_id && t("groupNo", { id: a.group_id }), a.record_ids?.length && t("recordCount", { count: a.record_ids.length }), a.business_date && t("businessDateIs", { date: a.business_date })].filter(Boolean).join(" · ") || "—";

function ActionDetail({ action, onClose, onChanged }) {
  const { t } = useTranslation("recon");
  const can = usePagePermission();
  const me = useAuth((state) => state.user?.username ?? state.user?.user_name);
  const [a, reload] = useRecord(reconActionsApi.get, action.id, action);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const pending = a.status === "PENDING";
  const run = async (verb, narration) => {
    setBusy(true);
    try {
      const response = await reconActionsApi[verb]({ id: a.id, ...(narration ? { narration } : {}) });
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      reload();
      onChanged();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  const mine = me && a.requested_by === me;
  const buttons = [
    pending && !mine && can("Authorise") && { key: "auth", label: t("approve"), icon: CheckCircle2, variant: "primary", run: () => setDialog("auth") },
    pending && !mine && can("Authorise") && { key: "deauth", label: t("reject"), icon: XCircle, variant: "danger", run: () => setDialog("deauth") },
    pending && mine && can("Add") && { key: "cancel", label: t("withdraw"), icon: Undo2, run: () => void run("cancel") },
  ];
  return (
    <Modal open onClose={onClose} size="lg" title={`${t(`kind_${a.kind}`)} #${a.id}`}>
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ReconStatus value={a.status} />
          <ActionButtons busy={busy} buttons={buttons} />
        </div>
        {pending && mine && <p className="text-xs text-muted-foreground">{t("ownRequest")}</p>}
        <FactGrid
          rows={[
            ["set", `${a.set_name} (${a.set_code})`],
            ["touches", touches(t, a)],
            a.record_ids?.length > 0 && ["recordIds", a.record_ids.join(", ")],
            ["reason", a.reason ? label(t, "reason", a.reason) : null],
            ["note", a.note],
            a.amount_diff != null && ["difference", a.amount_diff],
            a.gl_direction && ["glDirection", t(`gl_${a.gl_direction.toLowerCase()}`)],
            a.journal_ids?.length > 0 && ["journals", a.journal_ids.join(", ")],
            ["requested", `${a.requested_by} · ${reconDate(a.requested_at)}`],
            a.decided_at && ["decision", `${a.decided_by} · ${reconDate(a.decided_at)}${a.decision_note ? ` · ${a.decision_note}` : ""}`],
            a.result_group_id && ["resultGroup", `#${a.result_group_id}`],
          ]}
        />
        {a.group && (
          <Section title={t("groupNow")}>
            <GroupCard group={a.group} columns={a.group.source_ids?.length ? a.group.source_ids : [...new Set(a.group.records.map((r) => r.source_id))]} labelOf={(id) => a.group.records.find((r) => r.source_id === id)?.source_code ?? `#${id}`} />
          </Section>
        )}
        {a.records?.length > 0 && (
          <Section title={t("recordsNow")}>
            <MiniTable
              rows={a.records}
              rowKey={(r) => r.record_id}
              columns={[
                { key: "source_code", label: t("source") },
                ...recordColumns(t),
                { key: "item_status", label: t("state"), render: (r) => <ReconStatus value={r.item_status} /> },
              ]}
            />
          </Section>
        )}
      </div>
      {dialog && (
        <NarrationDialog
          title={t(dialog === "auth" ? "approveActionTitle" : "rejectActionTitle", { kind: t(`kind_${a.kind}`) })}
          hint={dialog === "auth" ? t("approveActionHint") : null}
          confirmLabel={t(dialog === "auth" ? "approve" : "reject")}
          variant={dialog === "auth" ? "primary" : "danger"}
          required={dialog === "deauth"}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(narration) => run(dialog, narration)}
        />
      )}
    </Modal>
  );
}
