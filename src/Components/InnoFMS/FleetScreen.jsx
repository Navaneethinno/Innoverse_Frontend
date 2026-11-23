import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Pencil, Plus, Power, PowerOff, Save, Trash2, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { Modal } from "@/Components/Common/Modal";
import { PageTitle } from "@/Components/Common/PageTitle";
import { RequiredMark } from "@/Components/Common/RequiredMark";
import { RowActions } from "@/Components/Common/RowActions";
import { SearchBox } from "@/Components/Common/SearchBox";
import { PartyPick, useL, words } from "@/Components/InnoCBS/cbsOps";
import { ActionButtons, Facts, NarrationDialog, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { Field } from "@/Components/InnoCBS/Loans/loanShared";
import { accountDate } from "@/Components/InnoCBS/Accounts/accountShared";
import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { usePagePermission } from "@/Hooks/usePermission";
import { fleetOptions } from "@/Services/Fms/fms.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";

// A fleet screen (Admin_42: Vehicles, Drivers, Card Bindings, Cost Centres,
// Fuel Limits). Customers keep their own fleet in the portal; staff look after
// it here under maker-checker: an add waits as PENDING, an edit / deactivate /
// reactivate / delete waits in `pending_action` until a different user
// approves it. The list is every customer's, or one customer's when picked.
//
// fields: [{ key, label, type (Field types, "textarea", "custom"), required,
//           options(fleetOptions), showIf(form), hint, render(value, set, form, choices) }]
// toBody(form): the save body; fromRecord(row): the form of an edit.

const TONE = { ACTIVE: "bg-emerald-50 text-emerald-700", PENDING: "bg-amber-50 text-amber-900", INACTIVE: "bg-muted text-muted-foreground", REJECTED: "bg-red-50 text-red-700", DELETED: "bg-red-50 text-red-700" };
export function FleetStatus({ row }) {
  const L = useL();
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold", TONE[row.status] ?? "bg-muted text-muted-foreground")}>{words(row.status)}</span>
      {row.pending_action && <span className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">{L("Waiting for approval")}: {words(row.pending_action)}</span>}
    </span>
  );
}
const listOf = (r) => {
  const rows = Array.isArray(r?.data) ? r.data : [];
  const p = r?.pagination ?? {};
  return { rows, total: Number(p.totalRecords ?? p.total_records ?? rows.length) || 0 };
};
export const ownerOf = (v) => {
  const [owner_type, id] = String(v ?? "").split(":");
  return owner_type && id ? { owner_type, owner_id: Number(id) } : null;
};

export function FleetScreen({ api, title, subtitle, columns, fields, toBody, fromRecord, factsOf, detailExtra, pageActions, filter }) {
  const { t } = useTranslation("common");
  const L = useL();
  const can = usePagePermission();
  const canChoose = useCanChooseInstitution();
  const [tab, setTab] = useState("all");
  const [owner, setOwner] = useState("");
  const [typed, setTyped] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [result, setResult] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(typed.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(id);
  }, [typed]);

  const seq = useRef(0);
  const load = useCallback(
    async (silent = false) => {
      const id = ++seq.current;
      if (!silent) setLoading(true);
      try {
        const reply = await api[tab === "pending" ? "pending" : "list"]({ ...(ownerOf(owner) ?? {}), ...(filter ?? {}), ...(search ? { search } : {}), page, limit });
        if (id === seq.current) setResult(listOf(reply));
      } catch (e) {
        if (id === seq.current) notifications.error(e.message);
      } finally {
        if (id === seq.current) setLoading(false);
      }
    },
    // filter is a fixed object per screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [api, tab, owner, search, page, limit],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel(api.listPath, () => load(true));

  const cols = [
    ...columns,
    { key: "owner_name", label: L("Customer"), align: "left", render: (r) => <span className="text-xs">{r.owner_name ?? "—"}</span> },
    ...(canChoose ? [{ key: "inst_profile_name", label: t("institution"), render: (r) => <span className="text-xs">{r.inst_profile_name ?? "—"}</span> }] : []),
    { key: "status", label: t("status"), render: (r) => <FleetStatus row={r} /> },
    { key: "actions", label: t("actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setViewing(r)} /> },
  ];

  return (
    <div className="pt-1 pb-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle>{title}</PageTitle>
          {subtitle && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {pageActions}
          {can("Add") && (
            <Button icon={Plus} onClick={() => setEditing({})}>
              {L("Add")}
            </Button>
          )}
        </div>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
          {["all", "pending"].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setTab(k);
                setPage(1);
              }}
              className={cn("shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold", tab === k ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {k === "all" ? L("All") : L("Waiting for approval")}
            </button>
          ))}
        </div>
        <div className="w-64">
          <PartyPick party="CUSTOMER"
            value={owner}
            onChange={(v) => {
              setOwner(v);
              setPage(1);
            }}
          />
        </div>
        <SearchBox className="min-w-48 flex-1" search={typed} onSearch={setTyped} placeholder={L("Search")} />
      </div>
      <DataTable
        columns={cols}
        rows={result.rows}
        rowKey={(r) => r.id}
        isLoading={loading}
        title={title}
        emptyTitle={L("Nothing here yet")}
        serverSorted
        serverPagination={{
          page,
          totalPages: Math.max(1, Math.ceil(result.total / limit)),
          totalRecords: result.total,
          onPageChange: setPage,
          limit,
          onLimitChange: (x) => {
            setLimit(Math.min(x, 100));
            setPage(1);
          },
        }}
      />
      {viewing && (
        <FleetDetail
          api={api}
          first={viewing}
          title={title}
          factsOf={factsOf}
          detailExtra={detailExtra}
          onClose={() => setViewing(null)}
          onEdit={(r) => {
            setViewing(null);
            setEditing(r);
          }}
          onChanged={() => load(true)}
        />
      )}
      {editing && (
        <FleetForm
          api={api}
          record={editing.id ? editing : null}
          fields={fields}
          toBody={toBody}
          fromRecord={fromRecord}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load(true);
          }}
        />
      )}
    </div>
  );
}

// One record: its facts, the proposal waiting (beside the current values),
// its history, and the buttons its status and the user's rights allow.
function FleetDetail({ api, first, title, factsOf, detailExtra, onClose, onEdit, onChanged }) {
  const L = useL();
  const can = usePagePermission();
  const [r, setR] = useState(first);
  const [audit, setAudit] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const fresh = rowsOf(await api.get({ id: first.id }))[0];
      if (fresh) setR(fresh);
      setAudit(rowsOf(await api.audit({ id: first.id })));
    } catch (e) {
      notifications.error(e.message);
      setAudit((a) => a ?? []);
    }
  }, [api, first.id]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (verb, narration) => {
    setBusy(true);
    try {
      const response = await api[verb]({ id: r.id, ...(narration ? { narration } : {}) });
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      onChanged();
      await refresh();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Admin_43: each row says what the signed-in user may do (`actions`);
  // menu rights apply on top.
  const a = r.actions ?? {};
  const waiting = Boolean(r.pending_action);
  const buttons = [
    a.edit && can("Edit") && { key: "edit", label: L("Edit"), icon: Pencil, run: () => onEdit(r) },
    a.deactivate && can("Edit") && { key: "deactivate", label: L("Deactivate"), icon: PowerOff, run: () => setDialog("deactivate") },
    a.reactivate && can("Edit") && { key: "reactivate", label: L("Reactivate"), icon: Power, run: () => setDialog("reactivate") },
    a.delete && can("Delete") && { key: "delete", label: L("Delete"), icon: Trash2, variant: "danger", run: () => setDialog("delete") },
    a.deauth && can("Authorize") && { key: "deauth", label: L("Reject"), icon: XCircle, variant: "danger", run: () => setDialog("deauth") },
    a.auth && can("Authorize") && { key: "auth", label: L("Approve"), icon: CheckCircle2, variant: "primary", run: () => setDialog("auth") },
  ];
  const proposal = r.pending && typeof r.pending === "object" ? Object.entries(r.pending) : [];
  const current = (k) => r[k] ?? r.details?.[k];

  return (
    <>
      <Modal open onClose={onClose} size="lg" title={`${title}: ${r.plate ?? r.name ?? r.code ?? r.card?.pan_masked ?? `#${r.id}`}`} subtitle={r.owner_name} footer={<ActionButtons busy={busy} buttons={buttons} />}>
        <div className="mb-3">
          <FleetStatus row={r} />
          {waiting && (
            <p className="mt-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {L("Proposed by")} {r.pending_by ?? "—"} · {accountDate(r.pending_time)}
            </p>
          )}
        </div>
        <Facts className="mb-4" rows={factsOf(r)} />
        {proposal.length > 0 && (
          <>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{L("Proposed change")}</p>
            <div className="mb-4 overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-left text-[11px] font-bold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5">{L("Field")}</th>
                    <th className="px-2 py-1.5">{L("Now")}</th>
                    <th className="px-2 py-1.5">{L("Proposed")}</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.map(([k, val]) => {
                    const now = current(k);
                    const changed = String(now ?? "") !== String(val ?? "");
                    return (
                      <tr key={k} className={cn("border-t border-border", changed && "bg-amber-50")}>
                        <td className="px-2 py-1.5 font-semibold">{L(k)}</td>
                        <td className="px-2 py-1.5">{show(now)}</td>
                        <td className="px-2 py-1.5">{show(val)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        {detailExtra?.(r)}
        <p className="mb-1.5 mt-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{L("History")}</p>
        {!audit ? (
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
        ) : !audit.length ? (
          <p className="text-xs text-muted-foreground">—</p>
        ) : (
          <ol className="space-y-1.5">
            {audit.map((a, i) => (
              <li key={i} className="rounded-xl border border-border px-3 py-2 text-xs">
                <span className="font-semibold">{words(a.action)}</span> · {a.actor} {a.actor_portal === "CUSTOMER" && <span className="text-muted-foreground">({L("customer")})</span>} · <span className="text-muted-foreground">{accountDate(a.at)}</span>
                {a.narration && <p className="mt-0.5 italic text-muted-foreground">“{a.narration}”</p>}
              </li>
            ))}
          </ol>
        )}
      </Modal>
      {dialog && (
        <NarrationDialog
          title={L(dialog === "auth" ? "Approve the change" : dialog === "deauth" ? "Reject the change" : words(dialog))}
          hint={L(dialog === "auth" ? "It takes effect now. You must not be the user who proposed it." : dialog === "deauth" ? "Nothing changes; the maker sees your reason." : "A checker must approve it before it takes effect.")}
          required={dialog === "deauth"}
          variant={["deauth", "delete", "deactivate"].includes(dialog) ? "danger" : "primary"}
          confirmLabel={L(dialog === "auth" ? "Approve" : dialog === "deauth" ? "Reject" : words(dialog))}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(narration) => run(dialog, narration)}
        />
      )}
    </>
  );
}
const show = (v) => (v === "" || v == null ? "—" : typeof v === "boolean" ? (v ? "✓" : "—") : Array.isArray(v) ? v.join(", ") || "—" : typeof v === "object" ? JSON.stringify(v) : String(v));

// Add (pick the customer first; their fleet fills the selects) or edit.
function FleetForm({ api, record, fields, toBody, fromRecord, onClose, onSaved }) {
  const { t } = useTranslation("common");
  const L = useL();
  const [owner, setOwner] = useState(record ? `${record.owner_type}:${record.owner_id}` : "");
  const [choices, setChoices] = useState(null);
  const [form, setForm] = useState(() => (record ? fromRecord(record) : {}));
  const [problems, setProblems] = useState([]);
  const [busy, setBusy] = useState(false);
  const o = ownerOf(owner);

  useEffect(() => {
    setChoices(null);
    if (!o) return undefined;
    let gone = false;
    fleetOptions(o)
      .then((r) => !gone && setChoices(rowsOf(r)[0] ?? r?.data ?? {}))
      .catch((e) => {
        if (gone) return;
        notifications.error(e.message);
        setChoices({});
      });
    return () => {
      gone = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner]);

  const shown = fields.filter((f) => !f.showIf || f.showIf(form));
  const missing = shown.some((f) => f.required && (form[f.key] == null || form[f.key] === "" || (Array.isArray(form[f.key]) && !form[f.key].length)));
  const save = async () => {
    setBusy(true);
    setProblems([]);
    try {
      const body = toBody(form);
      const response = record ? await api.edit({ ...body, id: record.id }) : await api.add({ ...o, ...body });
      notifications.success(response?.message ?? L("Saved"));
      onSaved();
    } catch (e) {
      const list = e?.data?.problems ?? [];
      setProblems(list.length ? list : [e.message]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={record ? L("Propose a change") : L("Add")}
      subtitle={record?.owner_name}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button icon={Save} loading={busy} disabled={!o || !choices || missing} disabledReason={!o ? L("Pick the customer first.") : !choices ? L("Loading the customer's fleet…") : t("blockedFillRequired")} onClick={save}>
            {L("Send for approval")}
          </Button>
        </>
      }
    >
      {!record && (
        <label className={cn(labelClass, "mb-3 block")}>
          {L("Customer")}
          <RequiredMark />
          <PartyPick party="CUSTOMER" value={owner} onChange={setOwner} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{L("An individual or corporate customer; their cost centres, vehicles, drivers and cards fill the lists.")}</span>
        </label>
      )}
      {o && !choices && <div className="h-24 animate-pulse rounded-xl bg-muted" />}
      {o && choices && (
        <div className="grid gap-3 sm:grid-cols-2">
          {shown.map((f) => {
            const set = (v) => setForm((x) => ({ ...x, [f.key]: v }));
            if (f.type === "custom")
              return (
                <div key={f.key} className={cn(labelClass, "sm:col-span-2")}>
                  {f.label}
                  {f.render(form[f.key], set, form, choices, setForm)}
                </div>
              );
            if (f.type === "bool")
              return (
                <div key={f.key} className="sm:col-span-2">
                  <Field field={{ ...f }} value={form[f.key]} onChange={set} />
                  {f.hint && <span className="mt-1 block text-[11px] text-muted-foreground">{f.hint}</span>}
                </div>
              );
            const wide = f.wide || f.type === "textarea" || f.type === "multi";
            return (
              <label key={f.key} className={cn(labelClass, wide && "sm:col-span-2")}>
                {f.label}
                {f.required && <RequiredMark />}
                {f.type === "textarea" ? (
                  <textarea className="mt-1 min-h-16 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" maxLength={500} value={form[f.key] ?? ""} onChange={(e) => set(e.target.value)} />
                ) : (
                  <Field field={{ ...f, blank: f.type === "select" ? (f.blank ?? L("Choose")) : undefined, options: typeof f.options === "function" ? f.options(choices, form) : (f.options ?? []) }} value={form[f.key] ?? (f.type === "multi" ? [] : "")} onChange={set} />
                )}
                {f.hint && <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{f.hint}</span>}
              </label>
            );
          })}
        </div>
      )}
      {problems.length > 0 && (
        <ul className="mt-3 list-disc rounded-xl border border-red-200 bg-red-50 px-3 py-2 pl-7 text-xs font-semibold text-red-700">
          {problems.map((p) => (
            <li key={String(p)}>{typeof p === "string" ? p : (p?.message ?? JSON.stringify(p))}</li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
