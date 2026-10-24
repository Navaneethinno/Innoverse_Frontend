import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Ban, CheckCircle2, Landmark, Pencil, Play, Plus, Power, RefreshCw, Send, Square, Trash2, Unlock, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { ListTable } from "@/Components/Common/ListView";
import { Modal } from "@/Components/Common/Modal";
import { Pager } from "@/Components/Common/Pager";
import { RowActions } from "@/Components/Common/RowActions";
import { Spinner } from "@/Components/Common/Spinner";
import { Toggle } from "@/Components/Common/Toggle";
import { InstitutionField } from "@/Components/GlobalSettings/Notifications/notificationShared";
import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { atmBatchesApi, atmsApi } from "@/Services/Cards/atm.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { ActionButtons, NarrationDialog, Section, inputClass, labelClass } from "../Finance/Deposits/depositShared";
import { MiniTable, Tabs } from "../Finance/Loans/loanShared";
import { LoadMasterKey } from "../MMS/LoadMasterKey";
import { MmsStatus, mmsDate } from "../MMS/mmsShared";

// InnoCMS › ATMs (menu 187): the bank's ATMs, each listening on its own
// switch port; their keys, commands and events; the ports as they are now;
// and downloads to every ATM at once.
export function Atms() {
  const { t } = useTranslation("atm");
  const [tab, setTab] = useState("atms");
  return (
    <div className="pb-8 pt-4">
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
          <Landmark size={22} className="text-primary" /> {t("title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Tabs tabs={[{ key: "atms" }, { key: "ports" }, { key: "batches" }]} value={tab} onChange={setTab} labelOf={(k) => t(`tab_${k}`)} />
      {tab === "atms" && <AtmList />}
      {tab === "ports" && <PortBoard />}
      {tab === "batches" && <Batches />}
    </div>
  );
}

const Live = ({ atm }) => {
  const { t } = useTranslation("atm");
  return (
    <span className="inline-flex flex-wrap gap-1">
      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", atm.connected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>{t(atm.connected ? "connected" : "notConnected")}</span>
      {atm.connected && <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", atm.in_service ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{t(atm.in_service ? "inService" : "outOfService")}</span>}
    </span>
  );
};

function AtmList() {
  const { t } = useTranslation(["atm", "common"]);
  const can = usePagePermission();
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const list = useServerList({ api: atmsApi.listPath, call: atmsApi.list });
  const columns = [
    { key: "atm_id", label: t("atmId"), render: (a) => <span className="font-mono text-xs font-bold">{a.atm_id}</span> },
    { key: "name", label: t("name"), render: (a) => <span className="text-xs font-semibold">{a.name}<span className="block text-[10px] font-normal text-muted-foreground">{a.location}</span></span> },
    { key: "address", label: t("address"), render: (a) => <span className="font-mono text-xs">{`${a.ip_address} → :${a.listen_port}`}</span> },
    { key: "profile", label: t("profile"), render: (a) => <span className="text-xs">{a.download_profile_code ?? "—"}</span> },
    { key: "status", label: t("status"), render: (a) => <MmsStatus value={a.status} /> },
    { key: "live", label: t("live"), render: (a) => <Live atm={a} /> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (a) => <RowActions buttons={{ view: true }} onView={() => setViewing(a)} /> },
  ];
  const actions = can("Add") && (
    <Button size="sm" icon={Plus} onClick={() => setEditing({})}>
      {t("addAtm")}
    </Button>
  );
  return (
    <>
      <ListTable list={list} actions={actions} columns={columns} rowKey={(a) => a.id} title={t("tab_atms")} emptyTitle={t("noAtms")} emptyDescription={t("noAtmsHint")} />
      {viewing && (
        <AtmDetail
          atm={viewing}
          onClose={() => setViewing(null)}
          onEdit={(a) => {
            setViewing(null);
            setEditing(a);
          }}
          onChanged={list.reload}
        />
      )}
      {editing && <AtmForm atm={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={list.reload} />}
    </>
  );
}

const blankAtm = { atm_id: "", name: "", location: "", luno: "", ip_address: "", listen_port: "", length_header: "binary2", download_profile_id: "", chip_enabled: true, supply_counters: false };

function AtmForm({ atm, onClose, onSaved }) {
  const { t } = useTranslation("atm");
  const isPlatform = useCanChooseInstitution();
  const [instId, setInstId] = useState("");
  const [profiles, setProfiles] = useState(null);
  const [form, setForm] = useState(() => (atm ? Object.fromEntries(Object.keys(blankAtm).map((k) => [k, atm[k] ?? blankAtm[k]])) : blankAtm));
  const [saving, setSaving] = useState(false);
  const scopeId = atm?.inst_profile_id ?? (isPlatform ? Number(instId) || null : null);
  useEffect(() => {
    let cancelled = false;
    atmsApi
      .profiles(scopeId ? { inst_profile_id: scopeId } : {})
      .then((r) => !cancelled && setProfiles(rowsOf(r)))
      .catch((error) => notifications.error(error.message));
    return () => {
      cancelled = true;
    };
  }, [scopeId]);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const text = (key) => (e) => set(key)(e.target.value);
  const bad = {
    atm_id: !/^[A-Z0-9]{4,16}$/.test(form.atm_id),
    luno: !/^(\d{3}|\d{9})$/.test(form.luno),
    ip_address: !/^(\d{1,3}\.){3}\d{1,3}$/.test(form.ip_address),
    listen_port: !(Number(form.listen_port) >= 1024 && Number(form.listen_port) <= 65535),
  };
  const valid = !Object.values(bad).some(Boolean) && form.name.trim() && form.download_profile_id && (!isPlatform || atm || instId);
  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, name: form.name.trim(), location: form.location.trim(), listen_port: Number(form.listen_port), download_profile_id: Number(form.download_profile_id) };
      const response = atm ? await atmsApi.edit({ id: atm.id, ...body }) : await atmsApi.add({ ...body, ...(isPlatform ? { inst_profile_id: Number(instId) } : {}) });
      if (response?.message) notifications.success(response.message);
      onClose();
      onSaved();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setSaving(false);
    }
  };
  const field = (key, label, input, hint) => (
    <label className={labelClass}>
      {label} <span className="text-red-500">*</span>
      <div className="mt-1.5">{input}</div>
      {hint && <span className={cn("mt-1 block text-[11px] font-normal", form[key] && bad[key] ? "text-red-600" : "text-muted-foreground")}>{hint}</span>}
    </label>
  );
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={atm ? t("editAtm", { id: atm.atm_id }) : t("addAtm")}
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
      <div className="grid gap-3 sm:grid-cols-2">
        {!atm && (
          <div className="sm:col-span-2">
            <InstitutionField value={instId} onChange={setInstId} />
          </div>
        )}
        {field("atm_id", t("atmId"), <input className={`${inputClass} font-mono`} maxLength={16} value={form.atm_id} onChange={(e) => set("atm_id")(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="ATM0001" />, t("atmIdHint"))}
        {field("name", t("name"), <input className={inputClass} maxLength={100} value={form.name} onChange={text("name")} placeholder="Main branch lobby" />)}
        <label className={`${labelClass} sm:col-span-2`}>
          {t("location")}
          <input className={`${inputClass} mt-1.5`} maxLength={200} value={form.location} onChange={text("location")} />
        </label>
        {field("luno", t("luno"), <input className={`${inputClass} font-mono`} inputMode="numeric" maxLength={9} value={form.luno} onChange={(e) => set("luno")(e.target.value.replace(/\D/g, ""))} placeholder="001" />, t("lunoHint"))}
        {field("ip_address", t("ipAddress"), <input className={`${inputClass} font-mono`} value={form.ip_address} onChange={(e) => set("ip_address")(e.target.value.replace(/[^\d.]/g, ""))} placeholder="10.20.0.15" />, t("ipHint"))}
        {field("listen_port", t("listenPort"), <input className={`${inputClass} font-mono`} inputMode="numeric" maxLength={5} value={form.listen_port} onChange={(e) => set("listen_port")(e.target.value.replace(/\D/g, ""))} placeholder="19001" />, t("portHint"))}
        {field(
          "length_header",
          t("lengthHeader"),
          <FilterSelect value={form.length_header} onChange={set("length_header")} options={["binary2", "ascii4"].map((v) => ({ value: v, label: t(`header_${v}`) }))} />,
        )}
        <div className="sm:col-span-2">
          {field(
            "download_profile_id",
            t("downloadProfile"),
            <FilterSelect
              value={String(form.download_profile_id ?? "")}
              onChange={set("download_profile_id")}
              disabled={!profiles?.length}
              options={[{ value: "", label: profiles?.length ? t("chooseProfile") : t("noProfiles") }, ...(profiles ?? []).map((p) => ({ value: String(p.id), label: [p.code, p.name, p.protocol].filter(Boolean).join(" · ") }))]}
            />,
            profiles && !profiles.length ? t("noProfilesHint") : null,
          )}
        </div>
        <div className="flex flex-wrap gap-4 sm:col-span-2">
          <Toggle checked={form.chip_enabled} onChange={set("chip_enabled")} label={t("chipEnabled")} showLabel />
          <Toggle checked={form.supply_counters} onChange={set("supply_counters")} label={t("supplyCounters")} showLabel />
        </div>
        {atm && <p className="text-xs text-muted-foreground sm:col-span-2">{t("editGoesPending")}</p>}
      </div>
    </Modal>
  );
}

const COMMANDS = ["DOWNLOAD", "IN_SERVICE", "OUT_OF_SERVICE", "SUPPLY_COUNTERS", "CONFIG_INFO", "CONFIG_ID", "CANCEL"];
const PARTS = ["FULL", "KEY", "MISC", "STATES", "SCREENS", "FIT", "EMV"];
// Each decision: the permission it needs, the statuses that offer it, and
// whether a narration is required.
const DECISIONS = {
  auth: { icon: CheckCircle2, variant: "primary", perm: "Authorise", when: ["PENDING"] },
  deauth: { icon: XCircle, variant: "danger", perm: "Authorise", when: ["PENDING"], required: true },
  block: { icon: Ban, variant: "danger", perm: "Change Status", when: ["ACTIVE"], required: true },
  unblock: { icon: Unlock, perm: "Change Status", when: ["BLOCKED"], required: true },
  retire: { icon: Trash2, variant: "danger", perm: "Delete", when: ["PENDING", "ACTIVE", "BLOCKED", "REJECTED"], required: true },
};

function AtmDetail({ atm, onClose, onEdit, onChanged }) {
  const { t } = useTranslation("atm");
  const can = usePagePermission();
  const [a, setA] = useState(atm);
  const [version, setVersion] = useState(0);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    atmsApi
      .get({ id: atm.id })
      .then((r) => !cancelled && setA(rowsOf(r)[0] ?? atm))
      .catch((error) => notifications.error(error.message));
    return () => {
      cancelled = true;
    };
  }, [atm, version]);
  const reload = () => {
    setVersion((n) => n + 1);
    onChanged();
  };
  const run = async (call) => {
    setBusy(true);
    try {
      const response = await call();
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      reload();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  const active = a.status === "ACTIVE";
  const buttons = [
    can("Edit") && !["RETIRED"].includes(a.status) && { key: "edit", label: t("edit"), icon: Pencil, run: () => onEdit(a) },
    ...Object.entries(DECISIONS).map(([key, d]) => d.when.includes(a.status) && can(d.perm) && { key, label: t(`do_${key}`), icon: d.icon, variant: d.variant, run: () => setDialog(key) }),
    active && can("Change Status") && a.connected && { key: "command", label: t("sendCommand"), icon: Send, run: () => setDialog("command") },
    active && can("Change Status") && !a.listener_enabled && { key: "port_start", label: t("portStart"), icon: Play, run: () => void run(() => atmsApi.port_start({ id: a.id })) },
    active && can("Change Status") && a.listener_enabled && { key: "port_stop", label: t("portStop"), icon: Square, variant: "danger", run: () => setDialog("port_stop") },
  ];
  const k = a.keys ?? {};
  const rows = [
    ["institution", a.inst_profile_name],
    ["location", a.location],
    ["luno", a.luno],
    ["address", `${a.ip_address} → :${a.listen_port} (${t(`header_${a.length_header}`)})`],
    ["downloadProfile", [a.download_profile_code, a.protocol].filter(Boolean).join(" · ")],
    ["chipAndCounters", [a.chip_enabled && t("chipEnabled"), a.supply_counters && t("supplyCounters")].filter(Boolean).join(" · ") || "—"],
    ["configId", a.config_id],
    ["listener", t(a.listener_enabled ? "listenerOn" : "listenerOff")],
    ["lastMessage", mmsDate(a.last_message_at)],
    ["download", a.download ? t("downloadUnderWay", { part: a.download.part, step: a.download.step, by: a.download.by, at: mmsDate(a.download.at) }) : "—"],
    ["tmkKey", k.tmk_kcv ? t("keyLoaded", { kcv: k.tmk_kcv, by: k.tmk_loaded_by ?? "—", at: mmsDate(k.tmk_loaded_at) }) : t("keyNotLoaded")],
    ["tpkKey", k.tpk_kcv ? t("keyAccepted", { kcv: k.tpk_kcv, at: mmsDate(k.tpk_loaded_at) }) : t("keyNotAccepted")],
    ["added", `${a.created_by ?? ""} · ${mmsDate(a.created_at)}`],
    ["decisionNote", a.decision_note],
  ];
  return (
    <Modal open onClose={onClose} size="xl" title={`${a.name} (${a.atm_id})`}>
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <MmsStatus value={a.status} />
          <Live atm={a} />
          <Button size="sm" variant="ghost" icon={RefreshCw} onClick={reload}>
            {t("refresh")}
          </Button>
        </div>
        <ActionButtons busy={busy} buttons={buttons} />
        <dl className="grid gap-3 sm:grid-cols-2">
          {rows.map(([key, value]) => (
            <div key={key} className="rounded-xl border border-border bg-card p-3">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t(key)}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-foreground">{value || "—"}</dd>
            </div>
          ))}
        </dl>
        {can("Authorise") && !["RETIRED", "REJECTED"].includes(a.status) && <LoadMasterKey device={a} load={(component) => atmsApi.tmkComponent({ id: a.id, component })} onLoaded={() => setVersion((n) => n + 1)} />}
        <Events atmId={a.id} version={version} />
      </div>
      {dialog && DECISIONS[dialog] && (
        <NarrationDialog
          title={t(`do_${dialog}Title`, { id: a.atm_id })}
          hint={t(`do_${dialog}Hint`, { defaultValue: "" })}
          confirmLabel={t(`do_${dialog}`)}
          variant={DECISIONS[dialog].variant === "danger" ? "danger" : "primary"}
          required={DECISIONS[dialog].required}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(narration) => run(() => atmsApi[dialog]({ id: a.id, ...(narration ? { narration } : {}) }))}
        />
      )}
      {dialog === "command" && <CommandDialog atm={a} busy={busy} onClose={() => setDialog(null)} onSend={(body) => run(() => atmsApi.command({ id: a.id, ...body }))} />}
      {dialog === "port_stop" && <PortStopDialog atm={a} busy={busy} onClose={() => setDialog(null)} onStop={(mode) => run(() => atmsApi.port_stop({ id: a.id, mode }))} />}
    </Modal>
  );
}

function CommandDialog({ atm, busy, onClose, onSend }) {
  const { t } = useTranslation("atm");
  const [command, setCommand] = useState("DOWNLOAD");
  const [part, setPart] = useState("FULL");
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={t("commandTitle", { id: atm.atm_id })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button icon={Send} loading={busy} onClick={() => onSend({ command, ...(command === "DOWNLOAD" ? { part } : {}) })}>
            {t("send")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <label className={labelClass}>
          {t("command")}
          <FilterSelect className="mt-1.5" value={command} onChange={setCommand} options={COMMANDS.map((c) => ({ value: c, label: t(`cmd_${c}`) }))} />
        </label>
        {command === "DOWNLOAD" && (
          <label className={labelClass}>
            {t("part")}
            <FilterSelect className="mt-1.5" value={part} onChange={setPart} options={PARTS.map((p) => ({ value: p, label: t(`part_${p}`) }))} />
          </label>
        )}
        <p className="text-[11px] text-muted-foreground">{t("commandHint")}</p>
      </div>
    </Modal>
  );
}

function PortStopDialog({ atm, busy, onClose, onStop }) {
  const { t } = useTranslation("atm");
  const [mode, setMode] = useState("DRAIN");
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={t("portStopTitle", { id: atm.atm_id, port: atm.listen_port })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button variant="danger" icon={Square} loading={busy} onClick={() => onStop(mode)}>
            {t("portStop")}
          </Button>
        </>
      }
    >
      <div className="grid gap-2">
        {["DRAIN", "FORCE"].map((m) => (
          <label key={m} className={cn("flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm", mode === m ? "border-primary" : "border-border")}>
            <input type="radio" className="mt-1" checked={mode === m} onChange={() => setMode(m)} />
            <span>
              <b>{t(`stop_${m}`)}</b>
              <span className="block text-xs text-muted-foreground">{t(`stop_${m}Hint`)}</span>
            </span>
          </label>
        ))}
      </div>
    </Modal>
  );
}

const EVENTS = ["", "CHANGED", "KEY", "LISTENER", "CONNECTED", "DISCONNECTED", "REFUSED", "COMMAND", "DOWNLOAD", "STATUS", "DEVICE", "POWER_UP", "TRANSACTION"];

// The ATM's events, newest first; `version` reloads them after an action.
function Events({ atmId, version }) {
  const { t } = useTranslation("atm");
  const [event, setEvent] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [data, setData] = useState(null);
  useEffect(() => {
    let cancelled = false;
    atmsApi
      .events({ id: atmId, page, limit, ...(event ? { event } : {}) })
      .then((r) => !cancelled && setData({ rows: rowsOf(r), total: r?.pagination?.totalRecords ?? rowsOf(r).length }))
      .catch((error) => notifications.error(error.message));
    return () => {
      cancelled = true;
    };
  }, [atmId, page, limit, event, version]);
  return (
    <Section title={t("events")} action={<FilterSelect className="w-48" value={event} onChange={(v) => (setEvent(v), setPage(1))} options={EVENTS.map((e) => ({ value: e, label: e ? t(`event_${e}`) : t("allEvents") }))} />}>
      {!data ? (
        <Spinner size={14} />
      ) : (
        <>
          <MiniTable
            rows={data.rows}
            empty={t("noEvents")}
            columns={[
              { key: "at", label: t("time"), render: (e) => <span className="whitespace-nowrap">{mmsDate(e.at)}</span> },
              { key: "event", label: t("event"), render: (e) => t(`event_${e.event}`, { defaultValue: e.event }) },
              { key: "detail", label: t("detail"), wrap: true },
              { key: "actor", label: t("by") },
            ]}
          />
          {data.total > limit && <Pager page={page} pageSize={limit} total={data.total} onPageChange={setPage} onPageSizeChange={(n) => (setLimit(n), setPage(1))} className="mt-2 rounded-xl" />}
        </>
      )}
    </Section>
  );
}

const PORT_TONES = { LISTENING: "bg-sky-50 text-sky-700", CONNECTED: "bg-emerald-50 text-emerald-700", FAILED: "bg-red-50 text-red-700", STOPPED: "bg-slate-100 text-slate-600" };

// Every ATM's port as it is now, refreshed every 15 seconds.
function PortBoard() {
  const { t } = useTranslation("atm");
  const [rows, setRows] = useState(null);
  const load = useCallback(() => {
    atmsApi
      .ports()
      .then((r) => setRows(rowsOf(r)))
      .catch((error) => notifications.error(error.message));
  }, []);
  useEffect(() => {
    load();
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, [load]);
  if (!rows) return <Spinner size={16} />;
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{t("portsHint")}</p>
        <Button size="sm" variant="ghost" icon={RefreshCw} onClick={load}>
          {t("refresh")}
        </Button>
      </div>
      <MiniTable
        rows={rows}
        rowKey={(p) => p.atm ?? p.port}
        empty={t("noPorts")}
        columns={[
          { key: "atm_id", label: t("atmId"), render: (p) => <span className="font-mono font-bold">{p.atm_id}</span> },
          { key: "port", label: t("listenPort"), render: (p) => <span className="font-mono">{`:${p.port} (${t(`header_${p.length_header}`, { defaultValue: p.length_header })})`}</span> },
          { key: "state", label: t("state"), render: (p) => <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", PORT_TONES[p.state] ?? "bg-muted")}>{t(`port_${p.state}`, { defaultValue: p.state })}</span> },
          { key: "since", label: t("since"), render: (p) => mmsDate(p.since) },
          { key: "remote", label: t("remote"), render: (p) => <span className="font-mono">{p.remote ?? "—"}</span> },
          { key: "download_step", label: t("download"), render: (p) => p.download_step ?? "—" },
          { key: "error", label: t("error"), wrap: true, render: (p) => <span className="text-red-700">{p.error ?? ""}</span> },
        ]}
      />
    </div>
  );
}

// Downloads to every ACTIVE ATM at once: start one, and follow it.
function Batches() {
  const { t } = useTranslation(["atm", "common"]);
  const can = usePagePermission();
  const [starting, setStarting] = useState(false);
  const [viewing, setViewing] = useState(null);
  const list = useServerList({ api: atmBatchesApi.listPath, call: atmBatchesApi.list, prefix: "batch_" });
  const columns = [
    { key: "id", label: "#", render: (b) => <span className="font-mono text-xs">{b.id}</span> },
    { key: "part", label: t("part"), render: (b) => <span className="text-xs">{t(`part_${b.part}`, { defaultValue: b.part })}</span> },
    { key: "status", label: t("status"), render: (b) => <BatchStatus value={b.status} /> },
    { key: "counts", label: t("counts"), render: (b) => <span className="text-xs">{countsText(t, b.counts)}</span> },
    { key: "started", label: t("started"), render: (b) => <span className="whitespace-nowrap text-xs">{`${b.started_by ?? b.created_by ?? ""} · ${mmsDate(b.started_at ?? b.created_at)}`}</span> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (b) => <RowActions buttons={{ view: true }} onView={() => setViewing(b)} /> },
  ];
  const actions = can("Change Status") && (
    <Button size="sm" icon={Power} onClick={() => setStarting(true)}>
      {t("downloadAll")}
    </Button>
  );
  return (
    <>
      <ListTable list={list} actions={actions} columns={columns} rowKey={(b) => b.id} title={t("tab_batches")} emptyTitle={t("noBatches")} />
      {starting && (
        <StartBatch
          onClose={() => setStarting(false)}
          onStarted={(batch) => {
            setStarting(false);
            list.reload();
            setViewing(batch);
          }}
        />
      )}
      {viewing && <BatchDetail batch={viewing} onClose={() => setViewing(null)} onChanged={list.reload} />}
    </>
  );
}

const BatchStatus = ({ value }) => {
  const { t } = useTranslation("atm");
  const tone = { RUNNING: "bg-sky-50 text-sky-700", DONE: "bg-emerald-50 text-emerald-700", INTERRUPTED: "bg-red-50 text-red-700" }[value] ?? "bg-muted";
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", tone)}>{t(`batch_${value}`, { defaultValue: value })}</span>;
};
const countsText = (t, counts) =>
  Object.entries(counts ?? {})
    .map(([k, v]) => `${t(`count_${k}`, { defaultValue: k })} ${v}`)
    .join(" · ") || "—";

function StartBatch({ onClose, onStarted }) {
  const { t } = useTranslation("atm");
  const isPlatform = useCanChooseInstitution();
  const [instId, setInstId] = useState("");
  const [part, setPart] = useState("FULL");
  const [parallel, setParallel] = useState("4");
  const [busy, setBusy] = useState(false);
  const start = async () => {
    setBusy(true);
    try {
      const response = await atmBatchesApi.download({ part, parallel: Number(parallel), ...(isPlatform && instId ? { inst_profile_id: Number(instId) } : {}) });
      if (response?.message) notifications.success(response.message);
      onStarted(rowsOf(response)[0]);
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
      size="sm"
      title={t("downloadAll")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button icon={Power} loading={busy} disabled={!(Number(parallel) >= 1 && Number(parallel) <= 8)} onClick={() => void start()}>
            {t("start")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <p className="text-xs text-muted-foreground">{t("downloadAllHint")}</p>
        {isPlatform && <InstitutionField value={instId} onChange={setInstId} />}
        <label className={labelClass}>
          {t("part")}
          <FilterSelect className="mt-1.5" value={part} onChange={setPart} options={PARTS.map((p) => ({ value: p, label: t(`part_${p}`) }))} />
        </label>
        <label className={labelClass}>
          {t("parallel")}
          <input className={`${inputClass} mt-1.5`} inputMode="numeric" maxLength={1} value={parallel} onChange={(e) => setParallel(e.target.value.replace(/\D/g, ""))} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("parallelHint")}</span>
        </label>
      </div>
    </Modal>
  );
}

// A batch, polled every 2 seconds while it runs.
function BatchDetail({ batch, onClose, onChanged }) {
  const { t } = useTranslation("atm");
  const [b, setB] = useState(batch);
  useEffect(() => {
    let cancelled = false;
    let timer = null;
    const poll = () =>
      atmBatchesApi
        .get({ id: batch.id })
        .then((r) => {
          if (cancelled) return;
          const next = rowsOf(r)[0] ?? batch;
          setB(next);
          if (next.status === "RUNNING") timer = window.setTimeout(poll, 2000);
          else onChanged();
        })
        .catch((error) => notifications.error(error.message));
    poll();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch.id]);
  return (
    <Modal open onClose={onClose} size="xl" title={t("batchTitle", { id: b.id })}>
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <BatchStatus value={b.status} /> {countsText(t, b.counts)}
        </div>
        <MiniTable
          rows={b.items ?? []}
          rowKey={(i) => i.atm}
          empty={t("noItems")}
          columns={[
            { key: "atm_id", label: t("atmId"), render: (i) => <span className="font-mono">{i.atm_id}</span> },
            { key: "status", label: t("status"), render: (i) => t(`item_${i.status}`, { defaultValue: i.status }) },
            { key: "detail", label: t("detail"), wrap: true },
            { key: "started_at", label: t("started"), render: (i) => mmsDate(i.started_at) },
            { key: "finished_at", label: t("finished"), render: (i) => mmsDate(i.finished_at) },
          ]}
        />
      </div>
    </Modal>
  );
}
