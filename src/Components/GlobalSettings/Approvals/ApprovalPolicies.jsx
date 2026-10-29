import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, BarChart3, Plus, Trash2 } from "lucide-react";
import { ListTable } from "@/Components/Common/ListView";
import { useServerList } from "@/Hooks/useServerList";
import { PageTitle } from "@/Components/Common/PageTitle";
import { Modal } from "@/Components/Common/Modal";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { RowActions } from "@/Components/Common/RowActions";
import { NoAccess } from "@/Components/Common/NoAccess";
import { DateInput } from "@/Components/Common/DateInput";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { MultiPick } from "@/Components/Finance/Loans/loanShared";
import { SearchBox } from "@/Components/Common/SearchBox";
import { Section } from "@/Components/Finance/Deposits/depositShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { approvalApi, policyApi } from "@/Services/GlobalSettings/approval.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { ApprovalSteps } from "./approvalShared";

const inputClass = "mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary disabled:bg-muted";
const labelClass = "text-xs font-semibold text-slate-700";

const EMPTY_STEP = { name: "", who: "ANY", users: [], profiles: [], required: 1, ordered: false, per_profile: false, scope: "ANY", min_amount: "", max_amount: "", escalate_after_hours: "", escalate_users: [], escalate_profiles: [] };
const EMPTY = { menu_id: "", action: "", name: "", steps: [EMPTY_STEP], options: { narration_on_approve: false, expiry_days: "", allow_same_user_twice: false }, narration: "" };

// The policy's options lists: menus, users, profiles, who, scopes, actions.
function usePolicyOptions() {
  const [options, setOptions] = useState(null);
  useEffect(() => {
    policyApi
      .options({})
      .then((r) => setOptions(rowsOf(r)[0] ?? {}))
      .catch((e) => {
        setOptions({});
        notifications.error(e.message);
      });
  }, []);
  return options;
}

const numberOrNull = (v) => (v === "" || v == null ? undefined : Number(v));

// A step as the server takes it: only what applies to its `who`.
function stepBody(s) {
  const out = { name: s.name.trim(), who: s.who, required: Number(s.required) || 0, scope: s.scope || "ANY" };
  if (s.who === "USERS") {
    out.users = s.users.map(Number);
    if (s.ordered) out.ordered = true;
  }
  if (s.who === "PROFILES") {
    out.profiles = s.profiles.map(Number);
    if (s.per_profile) out.per_profile = true;
  }
  for (const k of ["min_amount", "max_amount", "escalate_after_hours"]) if (numberOrNull(s[k]) !== undefined) out[k] = Number(s[k]);
  if (out.escalate_after_hours) {
    out.escalate_users = s.escalate_users.map(Number);
    out.escalate_profiles = s.escalate_profiles.map(Number);
  }
  return out;
}

const stepFrom = (s) => ({
  ...EMPTY_STEP,
  ...s,
  name: s.name ?? "",
  users: s.users ?? [],
  profiles: s.profiles ?? [],
  min_amount: s.min_amount ?? "",
  max_amount: s.max_amount ?? "",
  escalate_after_hours: s.escalate_after_hours ?? "",
  escalate_users: s.escalate_users ?? [],
  escalate_profiles: s.escalate_profiles ?? [],
});

// Users for the pickers, searched on the server (user_search, 50 at a
// time). Users already picked stay listed whatever the search.
function useUserSearch(initial) {
  const [known, setKnown] = useState(() => new Map((initial ?? []).map((u) => [String(u.id), u])));
  const [found, setFound] = useState(() => (initial ?? []).map((u) => String(u.id)));
  const [term, setTerm] = useState("");
  useEffect(() => {
    const text = term.trim();
    let live = true;
    const timer = window.setTimeout(
      () =>
        policyApi
          .options({ user_search: text, user_limit: 50 })
          .then((r) => {
            if (!live) return;
            const users = rowsOf(r)[0]?.users ?? [];
            setKnown((all) => new Map([...all, ...users.map((u) => [String(u.id), u])]));
            setFound(users.map((u) => String(u.id)));
          })
          .catch(() => {}),
      text ? 300 : 0,
    );
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [term]);
  const optionsFor = (picked) => {
    const ids = [...new Set([...(picked ?? []).map(String), ...found])];
    return ids.map((id) => known.get(id)).filter(Boolean).map((u) => ({ value: u.id, label: u.profile ? `${u.name} · ${u.profile}` : u.name }));
  };
  return { term, setTerm, optionsFor };
}

// Users of one picker: a server search above the pills.
function UserPick({ search, value, onChange, disabled }) {
  const { t } = useTranslation("approvals");
  return (
    <>
      {!disabled && <SearchBox className="mt-1.5" search={search.term} onSearch={search.setTerm} placeholder={t("searchUsers")} />}
      <MultiPick options={search.optionsFor(value)} value={value} onChange={onChange} disabled={disabled} />
    </>
  );
}

// One level of the policy.
function StepEditor({ step, index, count, options, userSearch, readOnly, onChange, onMove, onRemove }) {
  const { t } = useTranslation("approvals");
  const set = (patch) => onChange({ ...step, ...patch });
  const profiles = (options?.profiles ?? []).map((p) => ({ value: p.id, label: p.name }));
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-800">{t("levelN", { n: index + 1 })}</p>
        {!readOnly && (
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" disabled={index === 0} onClick={() => onMove(-1)} aria-label={t("moveUp")}>
              <ArrowUp size={14} />
            </Button>
            <Button size="icon" variant="ghost" disabled={index === count - 1} onClick={() => onMove(1)} aria-label={t("moveDown")}>
              <ArrowDown size={14} />
            </Button>
            <Button size="icon" variant="ghost" disabled={count === 1} onClick={onRemove} aria-label={t("removeLevel")}>
              <Trash2 size={14} className="text-red-600" />
            </Button>
          </div>
        )}
      </div>
      <div className="grid gap-x-5 gap-y-3 md:grid-cols-2">
        <label className={labelClass}>
          {t("levelName")}
          <input className={inputClass} disabled={readOnly} value={step.name} placeholder={t("levelNamePlaceholder")} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <div className={labelClass}>
          {t("who")}
          <SegmentedSwitch className="mt-1.5" value={step.who} onChange={(who) => !readOnly && set({ who, required: who === "USERS" ? 0 : Math.max(1, Number(step.required) || 1) })} options={(options?.who ?? ["ANY", "USERS", "PROFILES"]).map((w) => ({ value: w, label: t(`who_${w}`) }))} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t(`whoHint_${step.who}`)}</span>
        </div>
        {step.who === "USERS" && (
          <div className={`${labelClass} md:col-span-2`}>
            {t("approvers")}
            <UserPick search={userSearch} value={step.users} onChange={(v) => set({ users: v })} disabled={readOnly} />
          </div>
        )}
        {step.who === "PROFILES" && (
          <div className={`${labelClass} md:col-span-2`}>
            {t("profiles")}
            <MultiPick options={profiles} value={step.profiles} onChange={(v) => set({ profiles: v })} disabled={readOnly} />
          </div>
        )}
        <label className={labelClass}>
          {t("required")}
          <input type="number" min={0} className={inputClass} disabled={readOnly} value={step.required} onChange={(e) => set({ required: e.target.value.replace(/\D/g, "") })} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{step.who === "USERS" ? t("requiredHintUsers") : step.who === "PROFILES" && step.per_profile ? t("requiredHintPerProfile") : t("requiredHint")}</span>
        </label>
        <label className={labelClass}>
          {t("scope")}
          <FilterSelect className="mt-1.5" disabled={readOnly} value={step.scope} onChange={(scope) => set({ scope })} options={(options?.scopes ?? ["ANY", "BRANCH", "SUPERVISOR"]).map((s) => ({ value: s, label: t(`scope_${s}`) }))} />
        </label>
        <div className="flex flex-wrap items-end gap-2 md:col-span-2">
          {step.who === "USERS" && <CheckboxPill checked={Boolean(step.ordered)} disabled={readOnly} onChange={(ordered) => set({ ordered })} label={t("ordered")} />}
          {step.who === "PROFILES" && <CheckboxPill checked={Boolean(step.per_profile)} disabled={readOnly} onChange={(per_profile) => set({ per_profile })} label={t("perProfile")} />}
        </div>
        <label className={labelClass}>
          {t("minAmount")}
          <input inputMode="decimal" className={inputClass} disabled={readOnly} value={step.min_amount} onChange={(e) => set({ min_amount: e.target.value.replace(/[^\d.]/g, "") })} />
        </label>
        <label className={labelClass}>
          {t("maxAmount")}
          <input inputMode="decimal" className={inputClass} disabled={readOnly} value={step.max_amount} onChange={(e) => set({ max_amount: e.target.value.replace(/[^\d.]/g, "") })} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("amountHint")}</span>
        </label>
        <label className={labelClass}>
          {t("escalateAfter")}
          <input type="number" min={0} className={inputClass} disabled={readOnly} value={step.escalate_after_hours} onChange={(e) => set({ escalate_after_hours: e.target.value.replace(/\D/g, "") })} />
        </label>
        {Number(step.escalate_after_hours) > 0 && (
          <>
            <div className={`${labelClass} md:col-span-2`}>
              {t("escalateUsers")}
              <UserPick search={userSearch} value={step.escalate_users} onChange={(v) => set({ escalate_users: v })} disabled={readOnly} />
            </div>
            <div className={`${labelClass} md:col-span-2`}>
              {t("escalateProfiles")}
              <MultiPick options={profiles} value={step.escalate_profiles} onChange={(v) => set({ escalate_profiles: v })} disabled={readOnly} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Add / edit / view a policy. Saving proposes it: another user approves it,
// and it applies to records submitted after that.
function PolicyForm({ record, options, readOnly, onClose, onSaved }) {
  const { t } = useTranslation(["approvals", "common"]);
  const editing = Boolean(record?.id);
  const [form, setForm] = useState(() =>
    record
      ? {
          ...EMPTY,
          menu_id: record.menu_id ? String(record.menu_id) : "",
          action: record.action ?? "",
          name: record.name ?? "",
          steps: (record.pending?.steps ?? record.steps ?? [EMPTY_STEP]).map(stepFrom),
          options: { ...EMPTY.options, ...(record.pending?.options ?? record.options ?? {}), expiry_days: (record.pending?.options ?? record.options)?.expiry_days || "" },
        }
      : EMPTY,
  );
  const [busy, setBusy] = useState(false);
  const userSearch = useUserSearch(options?.users);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setStep = (i, step) => set({ steps: form.steps.map((s, n) => (n === i ? step : s)) });
  const moveStep = (i, by) => {
    const steps = [...form.steps];
    [steps[i], steps[i + by]] = [steps[i + by], steps[i]];
    set({ steps });
  };

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        name: form.name.trim(),
        steps: form.steps.map(stepBody),
        options: { narration_on_approve: Boolean(form.options.narration_on_approve), expiry_days: Number(form.options.expiry_days) || 0, allow_same_user_twice: Boolean(form.options.allow_same_user_twice) },
        ...(form.narration.trim() ? { narration: form.narration.trim() } : {}),
      };
      const response = editing
        ? await policyApi.edit({ id: record.id, ...body })
        : await policyApi.add({ ...(form.menu_id ? { menu_id: Number(form.menu_id) } : {}), action: form.action, ...body });
      notifications.success(apiMessage(response, t("policySaved")));
      onSaved();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const menus = options?.menus ?? [];
  const canSave = !readOnly && form.name.trim() && form.steps.length > 0;
  return (
    <Modal
      open
      size="xl"
      onClose={onClose}
      title={readOnly ? t("viewPolicy") : editing ? t("editPolicy") : t("addPolicy")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {readOnly ? t("common:close") : t("common:cancel")}
          </Button>
          {!readOnly && (
            <Button disabled={!canSave || busy} loading={busy} onClick={() => void save()}>
              {t("submitPolicy")}
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-5">
        <div className="grid gap-x-5 gap-y-3 md:grid-cols-3">
          <label className={labelClass}>
            {t("menu")}
            <FilterSelect
              className="mt-1.5"
              disabled={readOnly || editing}
              value={form.menu_id}
              onChange={(menu_id) => set({ menu_id, ...(!form.name.trim() || form.name === menus.find((m) => String(m.id) === form.menu_id)?.name ? { name: menus.find((m) => String(m.id) === menu_id)?.name ?? "" } : {}) })}
              options={[{ value: "", label: t("institutionDefault") }, ...menus.map((m) => ({ value: String(m.id), label: m.module ? `${m.name} · ${m.module}` : m.name }))]}
            />
          </label>
          <label className={labelClass}>
            {t("action")}
            <FilterSelect className="mt-1.5" disabled={readOnly || editing} value={form.action} onChange={(action) => set({ action })} options={[{ value: "", label: t("anyAction") }, ...(options?.actions ?? []).map((a) => ({ value: a, label: t(`action_${a}`, { defaultValue: a }) }))]} />
          </label>
          <label className={labelClass}>
            {t("name")} <span className="text-red-500">*</span>
            <input className={inputClass} disabled={readOnly} value={form.name} onChange={(e) => set({ name: e.target.value })} />
          </label>
        </div>
        <p className="-mt-2 text-[11px] text-muted-foreground">{t("whichPolicyHint")}</p>

        <div className="grid gap-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("levels")}</p>
          {form.steps.map((s, i) => (
            <StepEditor
              key={i}
              step={s}
              index={i}
              count={form.steps.length}
              options={options}
              userSearch={userSearch}
              readOnly={readOnly}
              onChange={(step) => setStep(i, step)}
              onMove={(by) => moveStep(i, by)}
              onRemove={() => set({ steps: form.steps.filter((_, n) => n !== i) })}
            />
          ))}
          {!readOnly && (
            <Button variant="outline" size="sm" icon={Plus} className="w-fit" onClick={() => set({ steps: [...form.steps, EMPTY_STEP] })}>
              {t("addLevel")}
            </Button>
          )}
        </div>

        <div className="grid gap-x-5 gap-y-3 md:grid-cols-3">
          <label className={labelClass}>
            {t("expiryDays")}
            <input type="number" min={0} className={inputClass} disabled={readOnly} value={form.options.expiry_days} onChange={(e) => set({ options: { ...form.options, expiry_days: e.target.value.replace(/\D/g, "") } })} />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("expiryHint")}</span>
          </label>
          <div className="flex flex-wrap items-center gap-2 md:col-span-2">
            <CheckboxPill checked={Boolean(form.options.narration_on_approve)} disabled={readOnly} onChange={(on) => set({ options: { ...form.options, narration_on_approve: on } })} label={t("narrationOnApprove")} />
            <CheckboxPill checked={Boolean(form.options.allow_same_user_twice)} disabled={readOnly} onChange={(on) => set({ options: { ...form.options, allow_same_user_twice: on } })} label={t("allowSameUserTwice")} />
          </div>
        </div>
        {!readOnly && (
          <label className={labelClass}>
            {t("common:narration", { defaultValue: "Narration" })}
            <textarea className={`${inputClass} min-h-16`} value={form.narration} onChange={(e) => set({ narration: e.target.value })} />
          </label>
        )}
      </div>
    </Modal>
  );
}

// How long approvals take, by menu, level and user, for a period.
function ReportModal({ onClose }) {
  const { t } = useTranslation(["approvals", "common"]);
  const today = new Date().toISOString().slice(0, 10);
  const [range, setRange] = useState({ date_from: `${today.slice(0, 8)}01`, date_to: today });
  const [report, setReport] = useState(null);
  useEffect(() => {
    setReport(null);
    approvalApi
      .report(range)
      .then((r) => setReport(rowsOf(r)[0] ?? {}))
      .catch((e) => {
        setReport({});
        notifications.error(e.message);
      });
  }, [range]);
  const hours = (v) => (v == null ? "—" : Number(v).toFixed(1));
  const table = (rows, cols) =>
    rows?.length ? (
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted text-[11px] uppercase text-muted-foreground">
            <tr>
              {cols.map(([k, label]) => (
                <th key={k} className="whitespace-nowrap px-3 py-2">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                {cols.map(([k, , fmt]) => (
                  <td key={k} className="whitespace-nowrap px-3 py-2 tabular-nums">
                    {fmt ? fmt(r[k]) : (r[k] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <p className="text-xs text-muted-foreground">{t("reportNothing")}</p>
    );
  return (
    <Modal open size="xl" onClose={onClose} title={t("report")}>
      <div className="mb-4 grid max-w-md grid-cols-2 gap-3">
        <label className={labelClass}>
          {t("common:from", { defaultValue: "From" })}
          <DateInput className={inputClass} value={range.date_from} max={range.date_to} onChange={(e) => setRange((r) => ({ ...r, date_from: e.target.value }))} />
        </label>
        <label className={labelClass}>
          {t("common:to", { defaultValue: "To" })}
          <DateInput className={inputClass} value={range.date_to} min={range.date_from} onChange={(e) => setRange((r) => ({ ...r, date_to: e.target.value }))} />
        </label>
      </div>
      {!report ? (
        <p className="text-sm text-muted-foreground">{t("common:loading")}</p>
      ) : (
        <div className="grid gap-4">
          <Section title={t("byMenu")}>
            {table(report.by_menu, [["menu_label", t("menu"), (v) => v ?? "—"], ["submitted", t("submitted")], ["approved", t("approved")], ["rejected", t("rejected")], ["expired", t("expired")], ["restarted", t("restarted")], ["open", t("open")], ["avg_hours_to_approve", t("avgHoursToApprove"), hours]])}
          </Section>
          <Section title={t("byLevel")}>{table(report.by_level, [["menu_label", t("menu"), (v) => v ?? "—"], ["level", t("level")], ["opened", t("opened")], ["completed", t("completed")], ["avg_hours_open", t("avgHoursOpen"), hours]])}</Section>
          <Section title={t("byUser")}>{table(report.by_user, [["user", t("user")], ["approvals", t("approvals")], ["rejections", t("rejections")], ["avg_hours_to_act", t("avgHoursToAct"), hours]])}</Section>
          <Section title={t("escalations")}>{table(report.escalations, [["menu_label", t("menu"), (v) => v ?? "—"], ["record_id", t("record")], ["level", t("level")], ["at", t("when")]])}</Section>
        </div>
      )}
    </Modal>
  );
}

const actionLabel = (t, a) => (a ? t(`action_${a}`, { defaultValue: a }) : t("anyAction"));

// GLOBAL SETTINGS > Approval Policies (menu 202): who approves each menu's
// changes, how many, in which levels. A policy is itself maker-checker.
export function ApprovalPolicies() {
  const { t } = useTranslation(["approvals", "common"]);
  const can = usePagePermission("Approval Policies");
  const options = usePolicyOptions();
  const list = useServerList({ api: policyApi.listPath, call: policyApi.list });
  const [form, setForm] = useState(null);
  const [action, setAction] = useState(null);
  const [narration, setNarration] = useState("");
  const [working, setWorking] = useState(false);
  const [report, setReport] = useState(false);
  if (!can("View")) return <NoAccess />;

  const run = async () => {
    if (action.method !== "auth" && !narration.trim()) {
      notifications.error(t("narrationRequired"));
      return;
    }
    setWorking(true);
    try {
      const response = await policyApi[action.method]({ id: action.row.id, narration: narration.trim() });
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
    { key: "name", label: t("name"), align: "left", render: (r) => <span className="font-semibold text-slate-800">{r.name}</span> },
    { key: "menu_name", label: t("menu"), align: "left", render: (r) => (r.menu_id ? r.menu_name ?? `#${r.menu_id}` : <span className="font-semibold text-primary">{t("institutionDefault")}</span>) },
    { key: "action", label: t("action"), render: (r) => actionLabel(t, r.action) },
    { key: "steps", label: t("levels"), sortable: false, render: (r) => <span className="text-xs">{t("levelsCount", { count: (r.pending?.steps ?? r.steps ?? []).length })}</span> },
    { key: "version", label: t("version"), render: (r) => r.version ?? "—" },
    { key: "status", label: t("common:status"), render: (r) => <StatusBadge status={String(r.process_status_name ?? r.status_name ?? "")} variant="subtle" /> },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (r) => {
        const buttons = getMakerCheckerButtons(r, { canAdd: can("Add"), canEdit: can("Edit"), canAuthorize: can("Authorise") || can("Authorize"), canDelete: can("Delete") });
        return (
          <RowActions
            buttons={buttons}
            onView={() => setForm({ record: r, readOnly: true })}
            onEdit={() => setForm({ record: r })}
            onAuthorize={() => setAction({ method: "auth", row: r, label: t("common:authorize") })}
            onDeauthorize={() => setAction({ method: "deauth", row: r, label: t("reject") })}
            onDelete={() => setAction({ method: "delete", row: r, label: t("common:delete") })}
          />
        );
      },
    },
  ];

  return (
    <div>
      <div className="mb-4">
        <PageTitle>{t("policiesTitle")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("policiesSubtitle")}</p>
      </div>
      <ListTable
        list={list}
        rowKey={(r) => r.id}
        columns={columns}
        title={t("policiesTitle")}
        emptyTitle={t("noPolicies")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" icon={BarChart3} onClick={() => setReport(true)}>
              {t("report")}
            </Button>
            {can("Add") && (
              <Button size="sm" icon={Plus} onClick={() => setForm({ record: null })}>
                {t("addPolicy")}
              </Button>
            )}
          </div>
        }
      />
      {form && (
        <PolicyForm
          record={form.record}
          readOnly={Boolean(form.readOnly)}
          options={options}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            list.reload();
          }}
        />
      )}
      {report && <ReportModal onClose={() => setReport(false)} />}
      {action && (
        <ConfirmDialog
          open
          title={`${action.label} · ${action.row.name}`}
          confirmLabel={action.label}
          destructive={action.method !== "auth"}
          pending={working}
          onClose={() => setAction(null)}
          onConfirm={() => void run()}
        >
          {(action.row.pending?.steps ?? action.row.steps)?.length > 0 && (
            <div className="mb-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">{t("proposedLevels")}</p>
              <ApprovalSteps steps={(action.row.pending?.steps ?? action.row.steps).map((s, i) => ({ ...s, level: i + 1, state: "WAITING", approvers: [t(`who_${s.who}`)] }))} />
            </div>
          )}
          <textarea value={narration} onChange={(e) => setNarration(e.target.value)} placeholder={action.method === "auth" ? t("common:narration", { defaultValue: "Narration" }) : t("narrationRequired")} className="min-h-20 w-full rounded-xl border border-border p-3 text-sm" />
        </ConfirmDialog>
      )}
    </div>
  );
}
