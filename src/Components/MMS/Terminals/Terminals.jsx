import { ListTable } from "@/Components/Common/ListView";
import { useServerList } from "@/Hooks/useServerList";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Ban, CheckCircle2, KeyRound, Link2, Pencil, Plus, Power, RotateCcw, Smartphone, Timer, Unlink, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { CopyButton } from "@/Components/Common/CopyButton";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { useAuth } from "@/Hooks/useAuth";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { usePagePermission } from "@/Hooks/usePermission";
import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
import { InstitutionField } from "@/Components/GlobalSettings/Notifications/notificationShared";
import { terminalsApi } from "@/Services/Merchant/mms.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { ActionButtons, NarrationDialog, inputClass, labelClass } from "../../Finance/Deposits/depositShared";
import { MmsStatus, mmsDate, pageOf, partyKey, partyRef } from "../mmsShared";

// "POS terminal · PAX A920" (no make or model: just the type).
const typeLabel = (x) => [x.terminal_type_name ?? x.terminal_type, [x.make, x.model].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
// TID: 4 to 16 of A-Z and 0-9.
const tidOf = (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);

// MMS › Terminals (menu 209): POS terminals the bank registers, approves and
// gives to merchants; the merchant places each in one of its stores.
export function Terminals() {
  const { t } = useTranslation(["mms", "common"]);
  const can = usePagePermission();
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [policy, setPolicy] = useState(false);
  // TID, serial number or name.

  const list = useServerList({ api: terminalsApi.listPath, call: terminalsApi.list });

  const load = list.reload;
  useLiveChannel(terminalsApi.listPath, () => load());

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
    { key: "terminal_type", label: t("terminalType"), render: (r) => <span className="text-xs">{typeLabel(r)}</span> },
    {
      key: "merchant",
      label: t("merchant"),
      render: (r) => (
        <div>
          <p className="text-xs">{r.merchant?.name ?? t("notAssigned")}</p>
          <p className="text-[10px] text-muted-foreground">{r.inst_profile_name}</p>
        </div>
      ),
    },
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

  const listActions = (
    <>
      <Button size="sm" variant="secondary" icon={Timer} onClick={() => setPolicy(true)}>
        {t("posIdleTimeout")}
      </Button>
      {can("Add") && (
        <Button size="sm" icon={Plus} onClick={() => setEditing({})}>
          {t("addTerminal")}
        </Button>
      )}
    </>
  );

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <Smartphone size={22} className="text-primary" /> {t("terminalsTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("terminalsSubtitle")}</p>
        </div>
      </div>

      <ListTable list={list} actions={listActions} columns={columns} rowKey={(r) => r.id} title={t("terminalsTitle")} emptyTitle={t("noTerminals")} />
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
      {policy && <PosPolicyDialog canEdit={can("Edit")} onClose={() => setPolicy(false)} />}
    </div>
  );
}

// The longest a terminal session may stay idle at an institution's merchants
// (a merchant may set a shorter one). Platform users pick the institution.
function PosPolicyDialog({ canEdit, onClose }) {
  const { t } = useTranslation(["mms", "common"]);
  const isPlatform = useCanChooseInstitution();
  const [instId, setInstId] = useState("");
  const [policy, setPolicy] = useState(null);
  const [seconds, setSeconds] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = !isPlatform || Boolean(instId);

  useEffect(() => {
    if (!ready) return;
    setPolicy(null);
    terminalsApi
      .posPolicy(isPlatform ? { inst_profile_id: Number(instId) } : {})
      .then((r) => {
        const row = rowsOf(r)[0] ?? null;
        setPolicy(row);
        setSeconds(String(row?.idle_seconds ?? row?.default_seconds ?? ""));
      })
      .catch((error) => notifications.error(error.message));
  }, [ready, isPlatform, instId]);

  const value = Number(seconds);
  const bad = !(Number.isInteger(value) && value >= 60 && value <= 86400);
  const save = async () => {
    setBusy(true);
    try {
      const r = await terminalsApi.setPosPolicy({ inst_profile_id: isPlatform ? Number(instId) : policy.inst_profile_id, idle_seconds: value });
      if (r?.message) notifications.success(r.message);
      onClose();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("posIdleTimeout")}
      subtitle={t("posIdleHint")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("common:cancel")}
          </Button>
          {canEdit && (
            <Button loading={busy} disabled={!policy || bad} onClick={() => void save()}>
              {t("save")}
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-3">
        <InstitutionField value={instId} onChange={setInstId} />
        {ready && (
          <label className={labelClass}>
            {t("posIdleSeconds")} <span className="text-red-500">*</span>
            <input className={`${inputClass} mt-1.5`} inputMode="numeric" disabled={!policy || !canEdit} value={seconds} onChange={(e) => setSeconds(e.target.value.replace(/\D/g, ""))} />
            <span className={`mt-1 block text-[11px] font-normal ${seconds && bad ? "text-red-600" : "text-muted-foreground"}`}>
              {seconds && !bad ? t("posIdleMinutes", { minutes: Math.round((value / 60) * 10) / 10 }) : t("posIdleRange")}
              {policy && ` · ${t("posIdleDefault", { seconds: policy.default_seconds })}`}
            </span>
          </label>
        )}
        {policy?.updated_by && <p className="text-[11px] text-muted-foreground">{t("posIdleUpdated", { by: policy.updated_by, at: mmsDate(policy.updated_at) })}</p>}
      </div>
    </Modal>
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
  // Platform users pick the institution first; bank users are in their own.
  const isPlatform = useCanChooseInstitution();
  const [instId, setInstId] = useState("");
  const [saving, setSaving] = useState(false);
  const tidLocked = Boolean(terminal) && !["PENDING", "REJECTED"].includes(terminal.status);

  useEffect(() => {
    terminalsApi
      .types()
      // data is [[...types]].
      .then((r) => setTypes(rowsOf(r).flat()))
      .catch(() => setTypes([]));
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: key === "tid" ? tidOf(e.target.value) : e.target.value }));
  const valid = form.tid.length >= 4 && form.serial_number.trim() && form.terminal_type && (terminal || !isPlatform || instId);
  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, serial_number: form.serial_number.trim(), make: form.make.trim(), model: form.model.trim() };
      const response = terminal ? await terminalsApi.edit({ id: terminal.id, ...body }) : await terminalsApi.add({ ...body, ...(isPlatform ? { inst_profile_id: Number(instId) } : {}), ...(merchant ? { merchant: partyRef(merchant) } : {}) });
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
        {!terminal && (
          <div className="sm:col-span-2">
            <InstitutionField
              value={instId}
              onChange={(v) => {
                setInstId(v);
                setMerchant(null);
              }}
            />
          </div>
        )}
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
            {(!isPlatform || instId) && <MerchantPicker value={merchant} onChange={setMerchant} instProfileId={isPlatform ? Number(instId) : undefined} optional />}
          </div>
        )}
      </div>
    </Modal>
  );
}

// Search the merchants a terminal can be assigned to (Terminals' own call).
// Platform users search the terminal's institution.
function MerchantPicker({ value, onChange, instProfileId, optional = false }) {
  const { t } = useTranslation("mms");
  const [term, setTerm] = useState("");
  const [found, setFound] = useState([]);

  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      terminalsApi
        .merchants({ search: q, page: 1, limit: 20, ...(instProfileId ? { inst_profile_id: instProfileId } : {}) })
        .then((r) => !cancelled && setFound(pageOf(r).items))
        .catch((error) => !cancelled && notifications.error(error.message));
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [term, instProfileId]);

  return (
    <div>
      <p className={labelClass}>
        {t("merchant")} {optional && <span className="font-normal text-muted-foreground">({t("optional")})</span>}
      </p>
      {value ? (
        <>
          <div className="mt-1.5 flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm">
            <span className="font-semibold">{value.name}</span>
            <button type="button" className="text-xs font-bold text-primary hover:underline" onClick={() => onChange(null)}>
              {t("change")}
            </button>
          </div>
          <MerchantAcceptor merchant={value} instProfileId={instProfileId} />
        </>
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

// Load the terminal master key (TMK): two key custodians, each signed in as
// themselves, enter one 32-hex component; the second (another user, within 15
// minutes of the first) completes it. Only check values come back: the
// custodian compares them with their key form. The component is never kept:
// the field is cleared after every call.
function LoadMasterKey({ terminal, onLoaded }) {
  const { t } = useTranslation("mms");
  const me = useAuth((state) => state.user?.username ?? state.user?.user_name);
  const [component, setComponent] = useState("");
  const [answer, setAnswer] = useState(null);
  const [busy, setBusy] = useState(false);
  // A first component waiting for the second (who, its check value, until when).
  const pending = terminal.keys?.tmk_pending ?? null;
  const left = useSecondsLeft(pending?.expires_at);
  const waiting = pending && left > 0 ? pending : null;
  const mineWaiting = waiting && waiting.entered_by === me;
  const submit = async () => {
    setBusy(true);
    // Sent as the second: if it comes back incomplete, the first was lost
    // (expired, or the key service restarted) and this one is the new first.
    const asSecond = Boolean(waiting && !mineWaiting);
    try {
      const row = rowsOf(await terminalsApi.tmkComponent({ id: terminal.id, component }))[0] ?? {};
      setAnswer({ ...row, nowFirst: asSecond && !row.complete });
      onLoaded();
    } catch (error) {
      setAnswer(null);
      notifications.error(error.message);
    } finally {
      setComponent("");
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-2 rounded-xl border border-border p-3">
      <p className="text-xs font-bold">{t("loadMasterKey")}</p>
      <p className="text-[11px] text-muted-foreground">{t("loadMasterKeyHint")}</p>
      {waiting && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          {t("tmkWaiting", { by: waiting.entered_by, at: mmsDate(waiting.entered_at), kcv: waiting.component_kcv, left: `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` })}
          {mineWaiting && <span className="mt-1 block">{t("tmkWaitingMine")}</span>}
        </p>
      )}
      {!mineWaiting && (
      <div className="flex flex-wrap items-end gap-2">
        <label className={`${labelClass} min-w-72 flex-1`}>
          {t("keyComponent")}
          <input
            type="password"
            autoComplete="new-password"
            spellCheck={false}
            className={`${inputClass} mt-1 font-mono`}
            maxLength={32}
            value={component}
            onChange={(e) => setComponent(e.target.value.toUpperCase().replace(/[^0-9A-F]/g, ""))}
            placeholder="32 hex"
          />
        </label>
        <Button size="sm" loading={busy} disabled={component.length !== 32} onClick={() => void submit()}>
          {t("enterComponent")}
        </Button>
      </div>
      )}
      {answer && (
        <p className={`rounded-lg px-3 py-2 text-xs font-semibold ${answer.complete ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
          {answer.complete
            ? t("tmkComplete", { kcv: answer.component_kcv, tmk: answer.terminal?.keys?.tmk_kcv ?? answer.terminal?.tmk_kcv ?? "—" })
            : t(answer.nowFirst ? "tmkNowFirst" : "tmkFirstDone", { kcv: answer.component_kcv })}
        </p>
      )}
    </div>
  );
}

// Seconds until `until` (an ISO time), ticking each second; 0 once past.
function useSecondsLeft(until) {
  const end = until ? Date.parse(until) : 0;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!end) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [end]);
  return end ? Math.max(0, Math.round((end - now) / 1000)) : 0;
}

// A merchant's card acceptor details: its MID and MCC (4 digits, ISO 18245).
// It needs an MCC before it is given terminals; Edit sets it.
function MerchantAcceptor({ merchant, instProfileId }) {
  const { t } = useTranslation("mms");
  const can = usePagePermission();
  const [acceptor, setAcceptor] = useState(null);
  const [mcc, setMcc] = useState("");
  const [busy, setBusy] = useState(false);
  const scope = instProfileId ? { inst_profile_id: instProfileId } : {};
  const key = partyKey(merchant);
  useEffect(() => {
    let cancelled = false;
    terminalsApi
      .acceptor({ merchant: partyRef(merchant), ...(instProfileId ? { inst_profile_id: instProfileId } : {}) })
      .then((r) => {
        if (cancelled) return;
        const row = rowsOf(r)[0] ?? {};
        setAcceptor(row);
        setMcc(row.mcc ?? "");
      })
      .catch((error) => !cancelled && notifications.error(error.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, instProfileId]);
  const save = async () => {
    setBusy(true);
    try {
      const response = await terminalsApi.setMcc({ merchant: partyRef(merchant), mcc, ...scope });
      if (response?.message) notifications.success(response.message);
      setAcceptor((a) => ({ ...a, mcc }));
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  if (!acceptor) return null;
  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 rounded-xl border border-border px-3 py-2 text-xs">
      <span className="pb-2">
        {t("mid")}: <b className="font-mono">{acceptor.mid || "—"}</b>
      </span>
      <label className={labelClass}>
        {t("mcc")}
        <input className={`${inputClass} mt-1 w-24 font-mono`} inputMode="numeric" maxLength={4} disabled={!can("Edit")} value={mcc} onChange={(e) => setMcc(e.target.value.replace(/\D/g, ""))} placeholder="5499" />
      </label>
      {can("Edit") && mcc !== (acceptor.mcc ?? "") && (
        <Button size="sm" variant="secondary" loading={busy} disabled={mcc.length !== 4} onClick={() => void save()}>
          {t("setMcc")}
        </Button>
      )}
      {!acceptor.mcc && <span className="basis-full text-[11px] font-semibold text-amber-700">{t("mccNeeded")}</span>}
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
    ["terminalType", typeLabel(x)],
    ["institution", x.inst_profile_name],
    ["merchant", x.merchant?.name ?? t("notAssigned")],
    ["store", x.store ? `${x.store.name} (${x.store.code})${x.name ? ` · ${x.name}` : ""}` : "—"],
    ["lastSeen", mmsDate(x.last_seen_at)],
    ["appVersion", x.app_version],
    ["added", `${x.created_by ?? ""} · ${mmsDate(x.created_at)}`],
    ["decisionNote", x.decision_note],
    // The master key two custodians load, and the PIN key the terminal downloads.
    ["tmkKey", x.keys?.tmk_kcv ? t("keyLoaded", { kcv: x.keys.tmk_kcv, by: x.keys.tmk_loaded_by ?? "—", at: mmsDate(x.keys.tmk_loaded_at) }) : t("keyNotLoaded")],
    ["tpkKey", x.keys?.tpk_kcv ? t("keyIssued", { kcv: x.keys.tpk_kcv, at: mmsDate(x.keys.tpk_issued_at) }) : t("keyNotIssued")],
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
        {x.merchant && <MerchantAcceptor merchant={x.merchant} instProfileId={x.inst_profile_id} />}
        {can("Authorise") && !["RETIRED", "REJECTED"].includes(x.status) && <LoadMasterKey terminal={x} onLoaded={() => setVersion((n) => n + 1)} />}
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
      <MerchantPicker value={merchant} onChange={setMerchant} instProfileId={terminal.inst_profile_id} />
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
