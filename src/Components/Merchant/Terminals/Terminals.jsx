import { useListSearch } from "@/Hooks/useListSearch";
import { SearchBox } from "@/Components/Common/SearchBox";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Ban, CheckCircle2, KeyRound, Link2, Pencil, Plus, Power, RotateCcw, Smartphone, Unlink, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { CopyButton } from "@/Components/Common/CopyButton";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { usePagePermission } from "@/Hooks/usePermission";
import { agentsApi, terminalsApi } from "@/Services/Merchant/mms.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { ActionButtons, NarrationDialog, inputClass, labelClass } from "../../TermDeposits/depositShared";
import { MmsStatus, mmsDate, pageOf, partyKey, partyRef } from "../mmsShared";

const STATUSES = ["PENDING", "ACTIVE", "REJECTED", "BLOCKED", "RETIRED"];
// TID: 4 to 16 of A-Z and 0-9.
const tidOf = (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);

// MMS › Terminals (menu 209): POS terminals the bank registers, approves and
// gives to merchants; the merchant places each in one of its stores.
export function Terminals() {
  const { t } = useTranslation(["mms", "common"]);
  const can = usePagePermission();
  const [filters, setFilters] = useState({ status: "", block_requested: false });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [result, setResult] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  // TID, serial number or name.
  const { body: searchBody, latest: latestList, bind: searchBind } = useListSearch(() => setPage(1));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const body = { ...searchBody, page, limit, ...(filters.status ? { status: filters.status } : {}), ...(filters.block_requested ? { block_requested: true } : {}) };
      setResult(pageOf(await latestList(terminalsApi.list(body))));
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [searchBody, latestList, filters, page, limit]);
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel(terminalsApi.listPath, () => void load());
  const setFilter = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const columns = [
    {
      key: "tid",
      label: t("tid"),
      render: (r) => (
        <div>
          <p className="font-mono text-xs font-bold">{r.tid}</p>
          <p className="font-mono text-[10px] text-muted-foreground">{r.serial_number}</p>
        </div>
      ),
    },
    { key: "terminal_type", label: t("terminalType"), render: (r) => <span className="text-xs">{r.terminal_type_name ?? r.terminal_type} · {[r.make, r.model].filter(Boolean).join(" ")}</span> },
    { key: "merchant", label: t("merchant"), render: (r) => <span className="text-xs">{r.merchant?.name ?? t("notAssigned")}</span> },
    { key: "store", label: t("store"), render: (r) => <span className="text-xs">{r.store ? `${r.store.name}${r.name ? ` · ${r.name}` : ""}` : "—"}</span> },
    {
      key: "status",
      label: t("status"),
      render: (r) => (
        <span className="inline-flex flex-wrap justify-center gap-1">
          <MmsStatus value={r.status} />
          {r.block_requested_at && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">{t("blockRequested")}</span>}
        </span>
      ),
    },
    { key: "last_seen_at", label: t("lastSeen"), render: (r) => <span className="whitespace-nowrap text-xs">{mmsDate(r.last_seen_at)}</span> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setViewing(r)} /> },
  ];

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <Smartphone size={22} className="text-primary" /> {t("terminalsTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("terminalsSubtitle")}</p>
        </div>
        {can("Add") && (
          <Button icon={Plus} onClick={() => setEditing({})}>
            {t("addTerminal")}
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <SearchBox {...searchBind} className="min-w-[14rem] flex-1" placeholder={t("searchTerminals")} />
        <FilterSelect value={filters.status} onChange={(status) => setFilter({ status })} options={[{ value: "", label: t("allStatuses") }, ...STATUSES.map((s) => ({ value: s, label: t(`status_${s}`) }))]} />
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={filters.block_requested} onChange={(e) => setFilter({ block_requested: e.target.checked })} />
          {t("blockRequestedOnly")}
        </label>
      </div>

      <DataTable
        columns={columns}
        rows={result.items}
        rowKey={(r) => r.id}
        isLoading={loading}
        title={t("terminalsTitle")}
        emptyTitle={t("noTerminals")}
        serverSorted
        serverPagination={{
          page,
          totalPages: Math.max(1, Math.ceil(result.total / limit)),
          totalRecords: result.total,
          onPageChange: setPage,
          limit,
          onLimitChange: (n) => {
            setLimit(Math.min(n, 100));
            setPage(1);
          },
        }}
      />
      {viewing && (
        <TerminalDetail
          terminal={viewing}
          onClose={() => setViewing(null)}
          onEdit={(terminal) => {
            setViewing(null);
            setEditing(terminal);
          }}
          onChanged={load}
        />
      )}
      {editing && <TerminalForm terminal={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  );
}

// Add (as PENDING) or edit. The TID changes only while PENDING or REJECTED.
function TerminalForm({ terminal, onClose, onSaved }) {
  const { t } = useTranslation("mms");
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({
    tid: terminal?.tid ?? "",
    serial_number: terminal?.serial_number ?? "",
    terminal_type: terminal?.terminal_type ?? "POS",
    make: terminal?.make ?? "",
    model: terminal?.model ?? "",
  });
  const [merchant, setMerchant] = useState(null);
  const [saving, setSaving] = useState(false);
  const tidLocked = Boolean(terminal) && !["PENDING", "REJECTED"].includes(terminal.status);

  useEffect(() => {
    terminalsApi
      .types()
      .then((r) => setTypes(rowsOf(r)))
      .catch(() => setTypes([]));
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: key === "tid" ? tidOf(e.target.value) : e.target.value }));
  const valid = form.tid.length >= 4 && form.serial_number.trim() && form.terminal_type;
  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, serial_number: form.serial_number.trim(), make: form.make.trim(), model: form.model.trim() };
      const response = terminal ? await terminalsApi.edit({ id: terminal.id, ...body }) : await terminalsApi.add({ ...body, ...(merchant ? { merchant: partyRef(merchant) } : {}) });
      if (response?.message) notifications.success(response.message);
      onClose();
      onSaved();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={terminal ? t("editTerminal", { tid: terminal.tid }) : t("addTerminal")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button loading={saving} disabled={!valid} onClick={() => void save()}>
            {terminal ? t("save") : t("addTerminal")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          {t("tid")} <span className="text-red-500">*</span>
          <input className={`${inputClass} mt-1.5 font-mono`} disabled={tidLocked} value={form.tid} onChange={set("tid")} placeholder="ETK00001" />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{tidLocked ? t("tidLocked") : t("tidHint")}</span>
        </label>
        <label className={labelClass}>
          {t("serialNumber")} <span className="text-red-500">*</span>
          <input className={`${inputClass} mt-1.5 font-mono`} value={form.serial_number} onChange={set("serial_number")} />
        </label>
        <label className={labelClass}>
          {t("terminalType")}
          <FilterSelect className="mt-1.5" value={form.terminal_type} onChange={(v) => setForm((f) => ({ ...f, terminal_type: v }))} options={(types.length ? types : [{ code: "POS" }]).map((x) => ({ value: x.code ?? x.terminal_type, label: x.name ?? x.code ?? x.terminal_type }))} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>
            {t("make")}
            <input className={`${inputClass} mt-1.5`} value={form.make} onChange={set("make")} placeholder="PAX" />
          </label>
          <label className={labelClass}>
            {t("model")}
            <input className={`${inputClass} mt-1.5`} value={form.model} onChange={set("model")} placeholder="A920" />
          </label>
        </div>
        {!terminal && (
          <div className="sm:col-span-2">
            <MerchantPicker value={merchant} onChange={setMerchant} optional />
          </div>
        )}
      </div>
    </Modal>
  );
}

// Search the institution's merchants (parties with the MERCHANT role).
function MerchantPicker({ value, onChange, optional = false }) {
  const { t } = useTranslation("mms");
  const [term, setTerm] = useState("");
  const [found, setFound] = useState([]);

  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      agentsApi
        .list({ search: q, page: 1, limit: 20 })
        .then((r) => !cancelled && setFound(pageOf(r).items.filter((p) => (p.roles ?? []).includes("MERCHANT"))))
        .catch((error) => !cancelled && notifications.error(error.message));
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [term]);

  return (
    <div>
      <p className={labelClass}>
        {t("merchant")} {optional && <span className="font-normal text-muted-foreground">({t("optional")})</span>}
      </p>
      {value ? (
        <div className="mt-1.5 flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm">
          <span className="font-semibold">{value.name}</span>
          <button type="button" className="text-xs font-bold text-primary hover:underline" onClick={() => onChange(null)}>
            {t("change")}
          </button>
        </div>
      ) : (
        <>
          <input className={`${inputClass} mt-1.5`} value={term} maxLength={100} onChange={(e) => setTerm(e.target.value)} placeholder={t("searchMerchant")} />
          {term.trim().length >= 2 && (
            <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-border">
              {found.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">{t("noMerchantsFound")}</p>
              ) : (
                found.map((p) => (
                  <button key={partyKey(p)} type="button" onClick={() => onChange(p)} className="block w-full px-3 py-2 text-left text-sm hover:bg-muted">
                    {p.name} <span className="text-[11px] text-muted-foreground">{p.inst_profile_name}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Each action, the menu action it needs, and the statuses that offer it.
const ACTIONS = {
  auth: { icon: CheckCircle2, variant: "primary", perm: "Authorise", when: ["PENDING"] },
  deauth: { icon: XCircle, variant: "danger", perm: "Authorise", when: ["PENDING"], required: true },
  edit: { icon: Pencil, perm: "Edit", when: ["PENDING", "REJECTED", "ACTIVE", "BLOCKED"] },
  assign: { icon: Link2, perm: "Edit", when: ["PENDING", "ACTIVE", "BLOCKED"] },
  unassign: { icon: Unlink, perm: "Edit", when: ["PENDING", "ACTIVE", "BLOCKED"], needsMerchant: true },
  deactivate: { icon: Ban, variant: "danger", perm: "Change Status", when: ["ACTIVE"] },
  reactivate: { icon: Power, perm: "Change Status", when: ["BLOCKED"] },
  resetSecret: { icon: KeyRound, perm: "Authorise", when: ["ACTIVE", "BLOCKED"] },
  retire: { icon: RotateCcw, variant: "danger", perm: "Change Status", when: ["ACTIVE", "BLOCKED"] },
};

function TerminalDetail({ terminal, onClose, onEdit, onChanged }) {
  const { t } = useTranslation("mms");
  const can = usePagePermission();
  const [full, setFull] = useState(terminal);
  const [dialog, setDialog] = useState(null);
  const [secret, setSecret] = useState(null);
  const [busy, setBusy] = useState(false);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  // Bumped after each action to fetch the terminal again.
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    terminalsApi
      .get({ id: terminal.id })
      .then((r) => !cancelled && setFull(rowsOf(r)[0] ?? terminal))
      .catch((error) => {
        notifications.error(error.message);
        if (!cancelled) close.current();
      });
    return () => {
      cancelled = true;
    };
  }, [terminal, version]);

  const x = full;
  const run = async (call) => {
    setBusy(true);
    try {
      const response = await call();
      const row = rowsOf(response)[0];
      // auth and reset_secret carry the credential once.
      if (row?.terminal_secret) setSecret(row.terminal_secret);
      else if (response?.message) notifications.success(response.message);
      setDialog(null);
      setVersion((n) => n + 1);
      onChanged();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const buttons = Object.entries(ACTIONS).map(
    ([key, a]) =>
      a.when.includes(x.status) &&
      can(a.perm) &&
      (!a.needsMerchant || x.merchant) && {
        key,
        label: t(`terminal_${key}`),
        icon: a.icon,
        variant: a.variant,
        run: () => (key === "edit" ? onEdit(x) : key === "unassign" ? void run(() => terminalsApi.unassign({ id: x.id })) : setDialog(key)),
      },
  );
  const rows = [
    ["serialNumber", x.serial_number],
    ["terminalType", `${x.terminal_type_name ?? x.terminal_type} · ${[x.make, x.model].filter(Boolean).join(" ")}`],
    ["merchant", x.merchant?.name ?? t("notAssigned")],
    ["store", x.store ? `${x.store.name} (${x.store.code})${x.name ? ` · ${x.name}` : ""}` : "—"],
    ["lastSeen", mmsDate(x.last_seen_at)],
    ["appVersion", x.app_version],
    ["added", `${x.created_by ?? ""} · ${mmsDate(x.created_at)}`],
    ["decisionNote", x.decision_note],
  ];

  return (
    <Modal open onClose={onClose} size="xl" title={t("terminalTitle", { tid: x.tid })}>
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <MmsStatus value={x.status} />
        </div>
        {x.block_requested_at && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <p className="font-bold">{t("blockRequestedOn", { date: mmsDate(x.block_requested_at) })}</p>
            {x.block_request_note && <p className="mt-0.5">{x.block_request_note}</p>}
          </div>
        )}
        <ActionButtons busy={busy} buttons={buttons} />
        <dl className="grid gap-3 sm:grid-cols-2">
          {rows.map(([key, value]) => (
            <div key={key} className="rounded-xl border border-border bg-card p-3">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t(key)}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-foreground">{value || "—"}</dd>
            </div>
          ))}
        </dl>
      </div>

      {dialog === "assign" && <AssignDialog terminal={x} busy={busy} onClose={() => setDialog(null)} onSave={(merchant) => run(() => terminalsApi.assign({ id: x.id, merchant: partyRef(merchant) }))} />}
      {dialog === "resetSecret" && (
        <NarrationDialog title={t("resetSecretTitle", { tid: x.tid })} hint={t("resetSecretHint")} confirmLabel={t("terminal_resetSecret")} variant="danger" busy={busy} onClose={() => setDialog(null)} onSave={() => run(() => terminalsApi.resetSecret({ id: x.id }))} />
      )}
      {dialog && !["assign", "resetSecret"].includes(dialog) && (
        <NarrationDialog
          title={t(`terminal_${dialog}Title`, { tid: x.tid })}
          hint={t(`terminal_${dialog}Hint`, { defaultValue: "" })}
          confirmLabel={t(`terminal_${dialog}`)}
          variant={ACTIONS[dialog].variant === "danger" ? "danger" : "primary"}
          required={ACTIONS[dialog].required}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(narration) => run(() => terminalsApi[dialog]({ id: x.id, narration }))}
        />
      )}
      {secret && <SecretDialog tid={x.tid} secret={secret} onClose={() => setSecret(null)} />}
    </Modal>
  );
}

function AssignDialog({ terminal, busy, onClose, onSave }) {
  const { t } = useTranslation("mms");
  const [merchant, setMerchant] = useState(null);
  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={t("assignTitle", { tid: terminal.tid })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button loading={busy} disabled={!merchant} onClick={() => onSave(merchant)}>
            {t("terminal_assign")}
          </Button>
        </>
      }
    >
      {terminal.merchant && <p className="mb-3 text-sm text-muted-foreground">{t("assignHint", { name: terminal.merchant.name })}</p>}
      <MerchantPicker value={merchant} onChange={setMerchant} />
    </Modal>
  );
}

// The terminal's credential, shown once: only its hash is kept.
function SecretDialog({ tid, secret, onClose }) {
  const { t } = useTranslation("mms");
  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={t("secretTitle", { tid })}
      footer={
        <Button onClick={onClose}>
          {t("secretSaved")}
        </Button>
      }
    >
      <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">{t("secretWarning")}</p>
      <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3">
        <code className="flex-1 break-all font-mono text-xs">{secret}</code>
        <CopyButton value={secret} size={14} />
      </div>
    </Modal>
  );
}
