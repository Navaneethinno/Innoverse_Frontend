import { useCallback, useEffect, useState } from "react";
import { Toggle } from "@/Components/Common/Toggle";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CheckCircle2, Pencil, Plus, Power, RotateCcw, Save, Trash2, XCircle } from "lucide-react";
import { BackButton } from "@/Components/Common/TextButtons";
import { Button } from "@/Components/Common/Button";
import { ListTable } from "@/Components/Common/ListView";
import { Modal } from "@/Components/Common/Modal";
import { NoAccess } from "@/Components/Common/NoAccess";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { PageTitle } from "@/Components/Common/PageTitle";
import { RequiredMark } from "@/Components/Common/RequiredMark";
import { RowActions } from "@/Components/Common/RowActions";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { SimpleTable } from "@/Components/Common/SimpleTable";
import { VerbDialog, VersionSections } from "@/Components/MakerChecker/SetupDocument";
import { accountDate } from "@/Components/InnoCBS/Accounts/accountShared";
import { ActionButtons, AuditTimeline, Facts, Section, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { ProductStatus } from "@/Components/InnoCBS/Settings/DepositProducts/productShared";
import { Field, useInstitutionScope } from "@/Components/InnoCBS/Loans/loanShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";

// One maker-checker record screen over the common contract (Admin 18):
// records and pending tabs, a record's page (in force beside the proposed
// change, history, versions), and an add / edit form built from `fields`.
// Every button follows the record's `actions` and the menu's rights.
//
// fields: [{ key, label, type, required, options, fixedOnEdit, hint, wide,
//            placeholder, showIf(form) }]
//   type     text | code | int | amount | rate | percent | date | select |
//            multi | bool | textarea
//   options  a list, or (choices) => list, from the `options` reply
// columns: list columns (status and actions are added).
// nameOf(record): the record's title.  bodyOf(form): the save body (default:
//   the fields as typed).  factsOf(setup, choices): the record's facts
//   (default: the fields).  effectiveDated: show the versions tab.
// A user given as a name or { id, name }.
const nameOfUser = (u) => (u && typeof u === "object" ? (u.name ?? "") : (u ?? ""));
const optionsOf = (field, choices) => (typeof field.options === "function" ? field.options(choices ?? {}) : (field.options ?? []));

const blankOf = (field) => (field.type === "multi" ? [] : field.type === "bool" ? false : "");

function shownValue(t, field, value, choices) {
  if (value == null || value === "" || (Array.isArray(value) && !value.length)) return "—";
  if (field.type === "bool") return t(value ? "yes" : "no");
  if (field.type === "date") return accountDate(value);
  if (field.type === "select" || field.type === "multi") {
    const opts = optionsOf(field, choices);
    const label = (v) => opts.find((o) => String(o.value) === String(v))?.label ?? String(v);
    return Array.isArray(value) ? value.map(label).join(", ") : label(value);
  }
  return String(value);
}

// The problem texts of a refused save.
function problemsOf(e) {
  const texts = e?.data?.problems ?? [];
  const lines = texts.map((p) => (typeof p === "string" ? p : (p?.message ?? p?.key))).filter(Boolean);
  return lines.length ? lines : [e?.message].filter(Boolean);
}

export function RecordScreen({ api, title, subtitle, columns, fields, nameOf = (r) => r.name ?? r.code ?? `#${r.id}`, bodyOf, factsOf, effectiveDated = false, addLabel, emptyTitle, emptyDescription, extraTabs, headerFacts, pageActions }) {
  const { t } = useTranslation(["record", "common"]);
  const can = usePagePermission();
  const { chooser, institution, scope } = useInstitutionScope();
  const [view, setView] = useState("records");
  const [openId, setOpenId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [decision, setDecision] = useState(null);
  const [busy, setBusy] = useState(false);
  const records = useServerList({ api: api.listPath, call: api.list, enabled: !openId && view === "records" });
  const pending = useServerList({ api: api.pendingPath, call: api.pending, prefix: "p_", enabled: !openId && view === "pending" });
  if (!can("View")) return <NoAccess />;

  const reloadAll = () => {
    records.reload();
    pending.reload();
  };

  if (openId)
    return (
      <RecordView
        {...{ api, fields, nameOf, bodyOf, factsOf, effectiveDated, extraTabs, headerFacts, title }}
        id={openId}
        onBack={() => {
          setOpenId(null);
          reloadAll();
        }}
      />
    );

  const decide = async (narration) => {
    setBusy(true);
    try {
      const response = await api[decision.verb]({ id: decision.id, narration: narration ?? "" });
      if (response?.message) notifications.success(response.message);
      setDecision(null);
      reloadAll();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const nameColumn = {
    key: "name",
    label: t("name"),
    align: "left",
    render: (r) => (
      <button type="button" onClick={() => setOpenId(r.id)} className="text-left">
        <p className="text-xs font-bold text-primary hover:underline">{nameOf(r)}</p>
        {r.code && nameOf(r) !== r.code && <p className="font-mono text-[10px] text-muted-foreground">{r.code}</p>}
      </button>
    ),
  };
  const base = [nameColumn, ...(columns ?? []), { key: "status", label: t("status"), render: (r) => <ProductStatus product={r} /> }];
  const listColumns = [...base, { key: "actions", label: t("common:actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setOpenId(r.id)} /> }];
  const pendingColumns = [
    ...base,
    { key: "proposed_by", label: t("proposedBy"), render: (r) => <span className="text-xs">{nameOfUser(r.pending?.proposed_by ?? r.proposed_by) || "—"}</span> },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (r) => (
        <RowActions
          buttons={{ view: true, authorize: can("Authorize") && Boolean(r.actions?.auth), deauthorize: can("Authorize") && Boolean(r.actions?.deauth) }}
          onView={() => setOpenId(r.id)}
          onAuthorize={() => setDecision({ id: r.id, verb: "auth" })}
          onDeauthorize={() => setDecision({ id: r.id, verb: "deauth" })}
        />
      ),
    },
  ];
  const addButton = can("Add") && (
    <Button size="sm" icon={Plus} disabled={chooser && !institution} disabledReason={t("common:blockedNeedsInstitution")} onClick={() => setEditing({ record: null })}>
      {addLabel ?? t("add")}
    </Button>
  );

  return (
    <div className="pt-1 pb-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle>{title}</PageTitle>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {pageActions}
      </div>
      <SegmentedSwitch
        className="mb-3"
        value={view}
        onChange={setView}
        options={[
          { value: "records", label: t("records") },
          { value: "pending", label: t("pending") },
        ]}
      />
      {view === "records" && <ListTable list={records} actions={addButton} columns={listColumns} rowKey={(r) => r.id} title={title} emptyTitle={emptyTitle ?? t("none")} emptyDescription={emptyDescription ?? (can("Add") ? t("noneHint") : undefined)} />}
      {view === "pending" && <ListTable list={pending} columns={pendingColumns} rowKey={(r) => r.id} title={t("pending")} emptyTitle={t("nonePending")} emptyDescription={t("nonePendingHint")} />}
      <VerbDialog dialog={decision?.verb ?? null} t={t} busy={busy} onClose={() => setDecision(null)} onSave={decide} />
      {editing && (
        <RecordForm
          {...{ api, fields, bodyOf, nameOf, scope }}
          record={editing.record}
          onClose={() => setEditing(null)}
          onSaved={(id) => {
            setEditing(null);
            reloadAll();
            if (id) setOpenId(id);
          }}
        />
      )}
    </div>
  );
}

function SetupFacts({ setup, fields, factsOf, choices }) {
  const { t } = useTranslation("record");
  if (!setup) return null;
  const rows = factsOf ? factsOf(setup, choices) : fields.filter((f) => !f.showIf || f.showIf(setup)).map((f) => [f.label, shownValue(t, f, setup[f.key], choices)]);
  return <Facts rows={rows} />;
}

function Versions({ rows }) {
  const { t } = useTranslation("record");
  if (!rows.length) return <p className="text-xs text-muted-foreground">{t("noVersions")}</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <SimpleTable columns={[t("version"), t("effectiveFrom"), t("effectiveTo"), t("approvedBy"), t("approvedOn")]}>
        <tbody>
          {rows.map((v, i) => (
            <tr key={v.version ?? v.id ?? i} className="border-b border-border/50 last:border-0">
              <td className="px-3 py-1.5 font-semibold">{v.version ?? rows.length - i}</td>
              <td className="px-3 py-1.5 whitespace-nowrap">{v.effective_from ? accountDate(v.effective_from) : "—"}</td>
              <td className="px-3 py-1.5 whitespace-nowrap">{v.effective_to ? accountDate(v.effective_to) : t("open")}</td>
              <td className="px-3 py-1.5">{v.approved_by ?? v.authorized_by ?? "—"}</td>
              <td className="px-3 py-1.5 whitespace-nowrap">{v.approved_at ?? v.approved_time ? accountDate(v.approved_at ?? v.approved_time) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </SimpleTable>
    </div>
  );
}

function RecordView({ api, id, onBack, fields, nameOf, bodyOf, factsOf, effectiveDated, extraTabs, headerFacts, title }) {
  const { t } = useTranslation(["record", "common"]);
  const can = usePagePermission();
  const [r, setR] = useState(null);
  const [choices, setChoices] = useState(null);
  const [audit, setAudit] = useState([]);
  const [versions, setVersions] = useState([]);
  const [tab, setTab] = useState("history");
  const [dialog, setDialog] = useState(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [got, history, kept] = await Promise.all([api.get({ id }), api.audit({ id }).catch(() => null), effectiveDated ? api.versions({ id }).catch(() => null) : null]);
      setR(rowsOf(got)[0] ?? null);
      setAudit(history ? rowsOf(history) : []);
      setVersions(kept ? rowsOf(kept) : []);
    } catch (e) {
      notifications.error(e.message);
    }
  }, [api, id, effectiveDated]);
  useEffect(() => {
    void reload();
  }, [reload]);
  // The form's choices of the record's own institution (a super admin's own
  // would be the wrong one).
  const inst = r?.inst_profile_id;
  useEffect(() => {
    if (r === null) return;
    api
      .options(inst ? { inst_profile_id: inst } : {})
      .then((x) => setChoices(rowsOf(x)[0] ?? x?.data ?? {}))
      .catch(() => setChoices({}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, inst, r === null]);

  const act = async (verb, narration) => {
    setBusy(true);
    try {
      const response = await api[verb]({ id, narration: narration ?? "" });
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      if (verb === "delete" && !rowsOf(response)[0]) onBack();
      else await reload();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!r) return <PageSkeleton />;
  const a = r.actions ?? {};
  const ask = (verb) => () => setDialog(verb);
  const buttons = [
    a.edit && can("Edit") && { key: "edit", label: t("edit"), icon: Pencil, run: () => setEditing(true) },
    a.deactivate && can("Change Status") && { key: "deactivate", label: t("deactivate"), icon: Power, run: ask("deactivate") },
    a.reactivate && can("Change Status") && { key: "reactivate", label: t("reactivate"), icon: RotateCcw, run: ask("reactivate") },
    a.delete && can("Delete") && { key: "delete", label: t("delete"), icon: Trash2, variant: "danger", run: ask("delete") },
    a.deauth && can("Authorize") && { key: "deauth", label: t("reject"), icon: XCircle, variant: "danger", run: ask("deauth") },
    a.auth && can("Authorize") && { key: "auth", label: t("approve"), icon: CheckCircle2, variant: "primary", run: ask("auth") },
  ];
  const record = { config: r.setup, pending: r.pending ? { ...r.pending, config: r.pending.setup } : null };
  const render = (setup) => <SetupFacts setup={setup} fields={fields} factsOf={factsOf} choices={choices} />;
  const tabs = [{ value: "history", label: t("history") }, ...(effectiveDated ? [{ value: "versions", label: t("versions") }] : []), ...(extraTabs ?? []).map((x) => ({ value: x.key, label: x.label }))];
  const extra = (extraTabs ?? []).find((x) => x.key === tab);

  return (
    <div className="pt-1 pb-6">
      <BackButton onClick={onBack}>
        <ArrowLeft size={15} /> {t("backTo", { title })}
      </BackButton>
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black">{nameOf(r.setup ? { ...r, ...r.setup } : r)}</h1>
              <ProductStatus product={r} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {[r.code ?? r.setup?.code, r.pending?.proposed_by && t("proposedByX", { name: nameOfUser(r.pending.proposed_by) }), r.inst_profile_name].filter(Boolean).join(" · ")}
            </p>
          </div>
          <ActionButtons buttons={buttons} busy={busy} />
        </div>
        {headerFacts && <Facts className="mt-3" rows={headerFacts(r)} />}
      </div>
      {(record.config || record.pending) && <VersionSections side record={record} render={render} />}
      {tabs.length > 1 && <SegmentedSwitch className="mb-3" options={tabs} value={tab} onChange={setTab} />}
      {tab === "history" && (
        <Section title={t("history")}>
          <AuditTimeline audit={audit} />
        </Section>
      )}
      {tab === "versions" && (
        <Section title={t("versions")}>
          <Versions rows={versions} />
        </Section>
      )}
      {extra && extra.render(r, reload)}
      <VerbDialog dialog={dialog} t={t} busy={busy} onClose={() => setDialog(null)} onSave={(narration) => act(dialog, narration)} />
      {editing && (
        <RecordForm
          {...{ api, fields, bodyOf, nameOf }}
          scope={(b) => b}
          record={r}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            void reload();
          }}
        />
      )}
    </div>
  );
}

// Add or edit. An edit starts from the proposed change when one waits.
function RecordForm({ api, fields, bodyOf, nameOf, scope, record, onClose, onSaved }) {
  const { t } = useTranslation(["record", "common"]);
  const [choices, setChoices] = useState(null);
  const start = record?.pending?.setup ?? record?.setup ?? {};
  const [form, setForm] = useState(() => Object.fromEntries(fields.map((f) => [f.key, f.from ? f.from(start) : f.type === "select" && start[f.key] != null ? String(start[f.key]) : (start[f.key] ?? blankOf(f))])));
  const [problems, setProblems] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .options(record?.inst_profile_id ? { inst_profile_id: record.inst_profile_id } : scope({}))
      .then((x) => setChoices(rowsOf(x)[0] ?? x?.data ?? {}))
      .catch((e) => {
        notifications.error(e.message);
        setChoices({});
      });
  }, [api, record, scope]);

  const shown = fields.filter((f) => !f.showIf || f.showIf(form));
  const missing = shown.some((f) => f.required && (form[f.key] == null || form[f.key] === "" || (Array.isArray(form[f.key]) && !form[f.key].length)));
  const save = async () => {
    setBusy(true);
    setProblems([]);
    try {
      const typed = Object.fromEntries(shown.map((f) => [f.key, typeof form[f.key] === "string" ? form[f.key].trim() : form[f.key]]));
      const body = bodyOf ? bodyOf(typed, record) : typed;
      const response = record ? await api.edit({ ...body, id: record.id }) : await api.add(scope(body));
      notifications.success(response?.message ?? t("saved"));
      onSaved(rowsOf(response)[0]?.id ?? record?.id);
    } catch (e) {
      setProblems(problemsOf(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={record ? t("editX", { name: nameOf({ ...record, ...start }) }) : t("add")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common:cancel")}
          </Button>
          <Button icon={Save} loading={busy} disabled={missing || !choices} disabledReason={!choices ? t("loading") : t("common:blockedFillRequired")} onClick={save}>
            {t("submit")}
          </Button>
        </>
      }
    >
      {!choices ? (
        <PageSkeleton />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {shown.filter((f) => f.type !== "bool").map((f) => {
            const set = (v) => setForm((x) => ({ ...x, [f.key]: v }));
            const disabled = Boolean(record && f.fixedOnEdit);
            const wide = f.wide || f.type === "multi" || f.type === "textarea";
            if (f.type === "custom")
              return (
                <div key={f.key} className={cn(labelClass, "sm:col-span-2")}>
                  {f.label}
                  {f.render(form[f.key], set, form, choices)}
                </div>
              );
            const Wrap = f.type === "multi" ? "div" : "label";
            return (
              <Wrap key={f.key} className={cn(labelClass, wide && "sm:col-span-2")}>
                {f.label}
                {f.required && <RequiredMark />}
                {f.type === "textarea" ? (
                  <textarea className="mt-1 min-h-20 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary" maxLength={f.maxLength ?? 1000} disabled={disabled} value={form[f.key] ?? ""} onChange={(e) => set(e.target.value)} />
                ) : (
                  <Field field={{ ...f, blank: f.type === "select" ? (f.blank ?? t("choose")) : undefined, options: f.optionsFor ? f.optionsFor(choices, form) : optionsOf(f, choices) }} value={form[f.key]} disabled={disabled} onChange={set} />
                )}
                {f.hint && <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{f.hint}</span>}
              </Wrap>
            );
          })}
          {shown.some((f) => f.type === "bool") && (
            <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
              {shown.filter((f) => f.type === "bool").map((f) => (
                <div key={f.key}>
                  <Toggle showLabel label={f.label} checked={Boolean(form[f.key])} disabled={Boolean(record && f.fixedOnEdit)} onChange={(v) => setForm((x) => ({ ...x, [f.key]: v }))} />
                  {f.hint && <span className="mt-1 block text-[11px] text-muted-foreground">{f.hint}</span>}
                </div>
              ))}
            </div>
          )}
          {problems.length > 0 && (
            <ul className="list-disc rounded-xl border border-red-200 bg-red-50 px-3 py-2 pl-7 text-xs font-semibold text-red-700 sm:col-span-2">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
