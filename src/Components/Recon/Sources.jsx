import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CloudDownload, Database, Plug, Plus } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { ListTable } from "@/Components/Common/ListView";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { Toggle } from "@/Components/Common/Toggle";
import { InstitutionField } from "@/Components/GlobalSettings/Notifications/notificationShared";
import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { reconCurrencyApi, reconLayoutsApi, reconSftpApi, reconSourcesApi } from "@/Services/Recon/recon.api";
import { notifications } from "@/Utils/Lib/notifications";
import { inputClass, Section } from "../Finance/Deposits/depositShared";
import { MiniTable, Tabs } from "../Finance/Loans/loanShared";
import { EventsSection, FactGrid, Field, MakerChecker, PageHeading, ReconStatus, label, reconDate, useChoices, useRecord } from "./reconShared";

// Recon Sources (menu 188): where reconciliation files come from (a source
// and its file layout, name pattern, SFTP pick-up), the SFTP servers, and
// each currency's decimals.
export function ReconSources() {
  const { t } = useTranslation("recon");
  const [tab, setTab] = useState("sources");
  return (
    <div className="pb-8 pt-4">
      <PageHeading icon={Database} title={t("sourcesTitle")} subtitle={t("sourcesSubtitle")} />
      <Tabs tabs={[{ key: "sources" }, { key: "sftp" }, { key: "currency" }]} value={tab} onChange={setTab} labelOf={(k) => t(`tab_${k}`)} />
      {tab === "sources" && <SourceList />}
      {tab === "sftp" && <SftpList />}
      {tab === "currency" && <CurrencyList />}
    </div>
  );
}

// ---- Sources ----

function SourceList() {
  const { t } = useTranslation("recon");
  const can = usePagePermission();
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const list = useServerList({ api: reconSourcesApi.listPath, call: reconSourcesApi.list });
  const columns = [
    { key: "code", label: t("code"), render: (r) => <span className="font-mono text-xs font-bold">{r.code}</span> },
    { key: "name", label: t("name"), render: (r) => <span className="text-xs font-semibold">{r.name}</span> },
    { key: "kind", label: t("kind"), render: (r) => <span className="text-xs">{label(t, "kind", r.kind)}</span> },
    { key: "layout", label: t("layout"), render: (r) => <span className="text-xs">{r.layout_name ?? "—"}</span> },
    { key: "files", label: t("files"), render: (r) => <span className="text-xs tabular-nums">{r.files ?? 0}</span> },
    { key: "status", label: t("status"), render: (r) => <ReconStatus value={r.status} /> },
    { key: "actions", label: t("actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setViewing(r)} /> },
  ];
  const actions = can("Add") && (
    <Button size="sm" icon={Plus} onClick={() => setEditing({})}>
      {t("addSource")}
    </Button>
  );
  return (
    <>
      <ListTable list={list} actions={actions} columns={columns} rowKey={(r) => r.id} title={t("tab_sources")} emptyTitle={t("noSources")} />
      {viewing && (
        <SourceDetail
          source={viewing}
          onClose={() => setViewing(null)}
          onEdit={(s) => {
            setViewing(null);
            setEditing(s);
          }}
          onChanged={list.reload}
        />
      )}
      {editing && <SourceForm source={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={list.reload} />}
    </>
  );
}

const SFTP_AFTER = ["KEEP", "DELETE", "MOVE"];
const blankSource = { code: "", name: "", kind: "CBS", description: "", file_name_pattern: "", max_file_mb: 50, layout_id: 0, auto_read: true, generated_from: "", cutoff_time: "", sftp_profile_id: 0, sftp_dir: "", sftp_poll_minutes: 15, sftp_after: "KEEP", sftp_move_dir: "" };

function SourceForm({ source, onClose, onSaved }) {
  const { t } = useTranslation("recon");
  const isPlatform = useCanChooseInstitution();
  const [instId, setInstId] = useState("");
  const [options, setOptions] = useState(null);
  const [form, setForm] = useState(() => (source ? Object.fromEntries(Object.keys(blankSource).map((k) => [k, source[k] ?? blankSource[k]])) : blankSource));
  const [saving, setSaving] = useState(false);
  const layouts = useChoices(reconLayoutsApi.list);
  const profiles = useChoices(reconSftpApi.list);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const text = (key) => (e) => set(key)(e.target.value);
  // The code is fixed once the source is approved or has files.
  const codeLocked = Boolean(source) && (source.status !== "PENDING" || source.files > 0);
  const generated = form.kind === "SWITCH" && form.generated_from === "LEDGER";
  const sftp = !generated && Number(form.sftp_profile_id) > 0;

  useEffect(() => {
    reconSourcesApi
      .options()
      .then((r) => setOptions(rowsOf(r)[0] ?? {}))
      .catch((error) => notifications.error(error.message));
  }, []);

  const valid = form.code.trim() && form.name.trim() && (!generated || /^\d{2}:\d{2}$/.test(form.cutoff_time)) && (!sftp || (form.sftp_dir.startsWith("/") && (form.sftp_after !== "MOVE" || form.sftp_move_dir.trim()))) && (!isPlatform || source || instId);
  const save = async () => {
    setSaving(true);
    try {
      const body = {
        ...form,
        code: form.code.trim(),
        name: form.name.trim(),
        max_file_mb: Number(form.max_file_mb) || 0,
        layout_id: Number(form.layout_id) || 0,
        generated_from: form.kind === "SWITCH" ? form.generated_from : "",
        cutoff_time: generated ? form.cutoff_time : "",
        ...(sftp ? { sftp_profile_id: Number(form.sftp_profile_id), sftp_poll_minutes: Number(form.sftp_poll_minutes) || 15 } : { sftp_profile_id: 0, sftp_dir: "", sftp_move_dir: "" }),
      };
      const response = source ? await reconSourcesApi.edit({ id: source.id, ...body }) : await reconSourcesApi.add({ ...body, ...(isPlatform ? { inst_profile_id: Number(instId) } : {}) });
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
      size="lg"
      title={source ? t("editSource", { code: source.code }) : t("addSource")}
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
        {!source && (
          <div className="sm:col-span-2">
            <InstitutionField value={instId} onChange={setInstId} />
          </div>
        )}
        <Field label={t("code")} required hint={codeLocked ? t("codeLocked") : null}>
          <input className={`${inputClass} font-mono`} disabled={codeLocked} value={form.code} maxLength={32} onChange={(e) => set("code")(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))} />
        </Field>
        <Field label={t("name")} required>
          <input className={inputClass} value={form.name} maxLength={100} onChange={text("name")} />
        </Field>
        <Field label={t("kind")} required>
          <FilterSelect value={form.kind} onChange={set("kind")} options={(options?.kinds ?? [{ value: form.kind, label: form.kind }]).map((k) => ({ value: k.value, label: k.label }))} />
        </Field>
        <Field label={t("layout")} hint={t("layoutHint")}>
          <FilterSelect
            value={String(form.layout_id ?? 0)}
            onChange={(v) => set("layout_id")(Number(v))}
            options={[{ value: "0", label: t("noLayoutYet") }, ...layouts.filter((l) => ["ACTIVE", "PENDING"].includes(l.status)).map((l) => ({ value: String(l.id), label: `${l.name} (${l.code})` }))]}
          />
        </Field>
        <Field label={t("description")} className="sm:col-span-2">
          <input className={inputClass} value={form.description} maxLength={255} onChange={text("description")} />
        </Field>
        {form.kind === "SWITCH" && (
          <>
            <Field label={t("generatedFrom")}>
              <FilterSelect value={form.generated_from ?? ""} onChange={set("generated_from")} options={(options?.generated_from ?? [{ value: "", label: t("filesAreSent") }]).map((o) => ({ value: o.value, label: o.label }))} />
            </Field>
            {generated && (
              <Field label={t("cutoffTime")} required hint={t("cutoffHint")}>
                <input type="time" className={inputClass} value={form.cutoff_time ?? ""} onChange={text("cutoff_time")} />
              </Field>
            )}
          </>
        )}
        {generated ? (
          <p className="text-xs text-muted-foreground sm:col-span-2">{t("generatedPattern", { pattern: options?.switch_file_pattern ?? "" })}</p>
        ) : (
          <div className="sm:col-span-2">
            <PatternField value={form.file_name_pattern} onChange={set("file_name_pattern")} tokens={options?.file_name_tokens ?? []} />
          </div>
        )}
        <Field label={t("maxFileMb")} hint={options?.max_file_mb ? t("maxFileMbHint", { max: options.max_file_mb }) : null}>
          <input className={inputClass} inputMode="numeric" value={form.max_file_mb} onChange={(e) => set("max_file_mb")(e.target.value.replace(/\D/g, ""))} />
        </Field>
        <div className="flex items-end pb-2">
          <Toggle checked={form.auto_read} onChange={set("auto_read")} label={t("autoRead")} showLabel />
        </div>
        {!generated && (
          <div className="grid gap-3 rounded-xl border border-border p-3 sm:col-span-2 sm:grid-cols-2">
            <p className="text-xs font-bold sm:col-span-2">{t("sftpPickUp")}</p>
            <Field label={t("sftpProfile")}>
              <FilterSelect value={String(form.sftp_profile_id ?? 0)} onChange={(v) => set("sftp_profile_id")(Number(v))} options={[{ value: "0", label: t("noSftp") }, ...profiles.filter((p) => ["ACTIVE", "PENDING"].includes(p.status)).map((p) => ({ value: String(p.id), label: `${p.name} (${p.code})` }))]} />
            </Field>
            {sftp && (
              <>
                <Field label={t("sftpDir")} required hint={t("sftpDirHint")}>
                  <input className={`${inputClass} font-mono`} value={form.sftp_dir ?? ""} onChange={text("sftp_dir")} placeholder="/outgoing" />
                </Field>
                <Field label={t("sftpPoll")} hint={t("sftpPollHint")}>
                  <input className={inputClass} inputMode="numeric" value={form.sftp_poll_minutes ?? ""} onChange={(e) => set("sftp_poll_minutes")(Math.min(1440, Number(e.target.value.replace(/\D/g, "")) || ""))} />
                </Field>
                <Field label={t("sftpAfter")}>
                  <FilterSelect value={form.sftp_after ?? "KEEP"} onChange={set("sftp_after")} options={SFTP_AFTER.map((v) => ({ value: v, label: label(t, "after", v) }))} />
                </Field>
                {form.sftp_after === "MOVE" && (
                  <Field label={t("sftpMoveDir")} required>
                    <input className={`${inputClass} font-mono`} value={form.sftp_move_dir ?? ""} onChange={text("sftp_move_dir")} placeholder="/done" />
                  </Field>
                )}
              </>
            )}
          </div>
        )}
        {source && <p className="text-xs text-muted-foreground sm:col-span-2">{t("editGoesPending")}</p>}
      </div>
    </Modal>
  );
}

// The file-name pattern with its tokens, and a box to try a name against it.
function PatternField({ value, onChange, tokens }) {
  const { t } = useTranslation("recon");
  const [name, setName] = useState("");
  const [check, setCheck] = useState(null);
  useEffect(() => {
    if (!value || !name.trim()) {
      setCheck(null);
      return undefined;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      reconSourcesApi
        .check_pattern({ file_name_pattern: value, file_name: name.trim() })
        .then((r) => !cancelled && setCheck(rowsOf(r)[0] ?? null))
        .catch((error) => !cancelled && setCheck({ error: error.message }));
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value, name]);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Field label={t("fileNamePattern")} hint={tokens.map((x) => `${x.token} ${x.meaning}`).join(" · ")}>
        <input className={`${inputClass} font-mono`} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="AZWK{DD}{MM}{YY}.txt" />
      </Field>
      <Field label={t("tryAName")}>
        <input className={`${inputClass} font-mono`} value={name} onChange={(e) => setName(e.target.value)} placeholder="AZWK241026.txt" />
        {check && (
          <span className={`mt-1 block text-[11px] font-semibold ${check.matches ? "text-emerald-700" : "text-red-600"}`}>
            {check.error ?? (check.matches ? [t("patternMatches"), check.gives_date && t("businessDateIs", { date: check.business_date }), check.sequence_no != null && t("sequenceIs", { n: check.sequence_no })].filter(Boolean).join(" · ") : t("patternNoMatch"))}
          </span>
        )}
      </Field>
    </div>
  );
}

function SourceDetail({ source, onClose, onEdit, onChanged }) {
  const { t } = useTranslation("recon");
  const can = usePagePermission();
  const [s, reload] = useRecord(reconSourcesApi.get, source.id, source);
  const [collected, setCollected] = useState(null);
  const [busy, setBusy] = useState(false);
  const changed = () => {
    reload();
    onChanged();
  };
  const collect = async () => {
    setBusy(true);
    try {
      setCollected(rowsOf(await reconSourcesApi.collect({ source_id: s.id }))[0] ?? {});
      changed();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} size="xl" title={`${s.name} (${s.code})`}>
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ReconStatus value={s.status} />
          <MakerChecker
            api={reconSourcesApi}
            record={s}
            onEdit={() => onEdit(s)}
            onChanged={changed}
            extra={[s.sftp_profile_id && s.status === "ACTIVE" && can("Edit") && { key: "collect", label: busy ? t("collecting") : t("collectNow"), icon: CloudDownload, run: () => void collect() }]}
          />
        </div>
        {s.sftp_error && (
          <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {t("sftpLastError", { error: s.sftp_error })}
          </p>
        )}
        <FactGrid
          rows={[
            ["kind", label(t, "kind", s.kind)],
            ["layout", s.layout_name ? `${s.layout_name} (${s.layout_code})` : t("noLayoutYet")],
            ["autoRead", t(s.auto_read ? "yes" : "no")],
            ["fileNamePattern", s.file_name_pattern && <span className="font-mono">{s.file_name_pattern}</span>],
            ["nameGivesDate", t(s.name_gives_date ? "yes" : "no")],
            ["maxFileMb", s.max_file_mb],
            s.generated_from && ["generatedFrom", `${label(t, "generated", s.generated_from)} · ${t("cutoffAt", { time: s.cutoff_time })}`],
            s.sftp_profile_id && ["sftpProfile", s.sftp_profile_name],
            s.sftp_profile_id && ["sftpDir", `${s.sftp_dir} · ${t("everyMinutes", { n: s.sftp_poll_minutes })} · ${label(t, "after", s.sftp_after)}${s.sftp_move_dir ? ` ${s.sftp_move_dir}` : ""}`],
            s.sftp_profile_id && ["sftpPolledAt", reconDate(s.sftp_polled_at)],
            ["files", s.files],
            ["description", s.description],
            ["decision", s.decided_at ? `${s.decided_by} · ${reconDate(s.decided_at)}${s.decision_note ? ` · ${s.decision_note}` : ""}` : null],
          ]}
        />
        {collected && (
          <Section title={t("collectResult")}>
            <p className="text-xs">{t("collectSummary", { listed: collected.listed ?? 0, taken: collected.taken?.length ?? 0, refused: collected.refused?.length ?? 0 })}</p>
            {collected.refused?.map((line) => (
              <p key={line} className="mt-1 text-xs text-red-700">
                {line}
              </p>
            ))}
          </Section>
        )}
        <EventsSection api={reconSourcesApi} id={s.id} />
      </div>
    </Modal>
  );
}

// ---- SFTP profiles ----

function SftpList() {
  const { t } = useTranslation("recon");
  const can = usePagePermission();
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const list = useServerList({ api: reconSftpApi.listPath, call: reconSftpApi.list, prefix: "sftp_" });
  const columns = [
    { key: "code", label: t("code"), render: (r) => <span className="font-mono text-xs font-bold">{r.code}</span> },
    { key: "name", label: t("name"), render: (r) => <span className="text-xs font-semibold">{r.name}</span> },
    { key: "host", label: t("host"), render: (r) => <span className="font-mono text-xs">{`${r.username}@${r.host}:${r.port}`}</span> },
    { key: "sources", label: t("sources"), render: (r) => <span className="text-xs tabular-nums">{r.sources ?? 0}</span> },
    { key: "last_ok_at", label: t("lastOk"), render: (r) => <span className="text-xs">{r.last_error ? <span className="text-red-600">{t("lastFailed")}</span> : reconDate(r.last_ok_at)}</span> },
    { key: "status", label: t("status"), render: (r) => <ReconStatus value={r.status} /> },
    { key: "actions", label: t("actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setViewing(r)} /> },
  ];
  const actions = can("Add") && (
    <Button size="sm" icon={Plus} onClick={() => setEditing({})}>
      {t("addSftp")}
    </Button>
  );
  return (
    <>
      <ListTable list={list} actions={actions} columns={columns} rowKey={(r) => r.id} title={t("tab_sftp")} emptyTitle={t("noSftpProfiles")} />
      {viewing && (
        <SftpDetail
          profile={viewing}
          onClose={() => setViewing(null)}
          onEdit={(p) => {
            setViewing(null);
            setEditing(p);
          }}
          onChanged={list.reload}
        />
      )}
      {editing && <SftpForm profile={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={list.reload} />}
    </>
  );
}

const blankSftp = { code: "", name: "", host: "", port: 22, username: "", host_key: "", key_file: "" };

function SftpForm({ profile, onClose, onSaved }) {
  const { t } = useTranslation("recon");
  const isPlatform = useCanChooseInstitution();
  const [instId, setInstId] = useState("");
  const [form, setForm] = useState(() => (profile ? Object.fromEntries(Object.keys(blankSftp).map((k) => [k, profile[k] ?? blankSftp[k]])) : blankSftp));
  const [saving, setSaving] = useState(false);
  const text = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const valid = ["code", "name", "host", "username", "host_key", "key_file"].every((k) => String(form[k]).trim()) && Number(form.port) > 0 && (!isPlatform || profile || instId);
  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, port: Number(form.port) };
      const response = profile ? await reconSftpApi.edit({ id: profile.id, ...body }) : await reconSftpApi.add({ ...body, ...(isPlatform ? { inst_profile_id: Number(instId) } : {}) });
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
      title={profile ? t("editSftp", { code: profile.code }) : t("addSftp")}
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
        {!profile && (
          <div className="sm:col-span-2">
            <InstitutionField value={instId} onChange={setInstId} />
          </div>
        )}
        <Field label={t("code")} required>
          <input className={`${inputClass} font-mono`} disabled={Boolean(profile)} value={form.code} maxLength={32} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") }))} />
        </Field>
        <Field label={t("name")} required>
          <input className={inputClass} value={form.name} maxLength={100} onChange={text("name")} />
        </Field>
        <Field label={t("host")} required>
          <input className={`${inputClass} font-mono`} value={form.host} onChange={text("host")} placeholder="10.0.0.5" />
        </Field>
        <Field label={t("port")} required>
          <input className={inputClass} inputMode="numeric" value={form.port} onChange={(e) => setForm((f) => ({ ...f, port: e.target.value.replace(/\D/g, "") }))} />
        </Field>
        <Field label={t("username")} required>
          <input className={`${inputClass} font-mono`} value={form.username} onChange={text("username")} />
        </Field>
        <Field label={t("keyFile")} required hint={t("keyFileHint")}>
          <input className={`${inputClass} font-mono`} value={form.key_file} onChange={text("key_file")} placeholder="visa.key" />
        </Field>
        <Field label={t("hostKey")} required hint={t("hostKeyHint")} className="sm:col-span-2">
          <textarea className={`${inputClass} min-h-20 font-mono text-xs`} value={form.host_key} onChange={text("host_key")} placeholder="ssh-ed25519 AAAAC3Nza..." />
        </Field>
        {profile && <p className="text-xs text-muted-foreground sm:col-span-2">{t("editGoesPending")}</p>}
      </div>
    </Modal>
  );
}

function SftpDetail({ profile, onClose, onEdit, onChanged }) {
  const { t } = useTranslation("recon");
  const can = usePagePermission();
  const [p, reload] = useRecord(reconSftpApi.get, profile.id, profile);
  const [dir, setDir] = useState("/");
  const [test, setTest] = useState(null);
  const [testing, setTesting] = useState(false);
  const runTest = async () => {
    setTesting(true);
    try {
      setTest(rowsOf(await reconSftpApi.test({ id: p.id, dir }))[0] ?? null);
      reload();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setTesting(false);
    }
  };
  return (
    <Modal open onClose={onClose} size="xl" title={`${p.name} (${p.code})`}>
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ReconStatus value={p.status} />
          <MakerChecker
            api={reconSftpApi}
            record={p}
            onEdit={() => onEdit(p)}
            onChanged={() => {
              reload();
              onChanged();
            }}
          />
        </div>
        {p.key_file_present === false && (
          <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {t("keyFileMissing", { file: p.key_file })}
          </p>
        )}
        {p.last_error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">{t("sftpLastError", { error: p.last_error })}</p>}
        <FactGrid
          rows={[
            ["host", <span key="h" className="font-mono">{`${p.username}@${p.host}:${p.port}`}</span>],
            ["keyFile", p.key_file],
            ["hostKey", <span key="k" className="break-all font-mono text-[11px]">{p.host_key}</span>],
            ["lastOk", reconDate(p.last_ok_at)],
            ["sources", p.sources ?? 0],
            ["decision", p.decided_at ? `${p.decided_by} · ${reconDate(p.decided_at)}${p.decision_note ? ` · ${p.decision_note}` : ""}` : null],
          ]}
        />
        {can("View") && (
          <Section title={t("testConnection")}>
            <div className="flex flex-wrap items-end gap-2">
              <Field label={t("folder")} className="w-64">
                <input className={`${inputClass} font-mono`} value={dir} onChange={(e) => setDir(e.target.value)} />
              </Field>
              <Button size="sm" variant="secondary" icon={Plug} loading={testing} disabled={!dir.startsWith("/")} onClick={() => void runTest()}>
                {t("test")}
              </Button>
            </div>
            {test && (
              <div className="mt-3">
                <p className={`text-xs font-bold ${test.ok ? "text-emerald-700" : "text-red-700"}`}>{test.ok ? t("connected", { count: test.files?.length ?? 0 }) : test.error}</p>
                {test.files?.length > 0 && (
                  <div className="mt-2">
                    <MiniTable
                      rows={test.files}
                      rowKey={(f) => f.name}
                      columns={[
                        { key: "name", label: t("fileName"), render: (f) => <span className="font-mono">{f.name}</span> },
                        { key: "size_bytes", label: t("size"), align: "right" },
                        { key: "modified_at", label: t("modified"), render: (f) => reconDate(f.modified_at) },
                      ]}
                    />
                  </div>
                )}
              </div>
            )}
          </Section>
        )}
        <EventsSection api={reconSftpApi} id={p.id} />
      </div>
    </Modal>
  );
}

// ---- Currency decimals ----

function CurrencyList() {
  const { t } = useTranslation("recon");
  const can = usePagePermission();
  const [editing, setEditing] = useState(null);
  const [deciding, setDeciding] = useState(null);
  const list = useServerList({ api: reconCurrencyApi.listPath, call: reconCurrencyApi.list, prefix: "cur_" });
  const columns = [
    { key: "alpha_code", label: t("currency"), render: (r) => <span className="text-xs font-semibold">{`${r.alpha_code} · ${r.currency_name}`}</span> },
    { key: "iso_decimal_places", label: t("isoDecimals"), render: (r) => <span className="text-xs tabular-nums">{r.iso_decimal_places}</span> },
    { key: "effective_decimal_places", label: t("inUse"), render: (r) => <span className="text-xs font-bold tabular-nums">{r.effective_decimal_places}</span> },
    { key: "pending", label: t("pendingChange"), render: (r) => (r.pending_decimal_places != null ? <span className="text-xs text-amber-700">{t("pendingDecimals", { n: r.pending_decimal_places, by: r.pending_by })}</span> : <span className="text-xs">—</span>) },
    {
      key: "actions",
      label: t("actions"),
      sortable: false,
      render: (r) => (
        <div className="flex justify-center gap-1">
          {can("Edit") && r.pending_decimal_places == null && (
            <Button size="sm" variant="secondary" onClick={() => setEditing(r)}>
              {t("change")}
            </Button>
          )}
          {can("Authorise") && r.pending_decimal_places != null && (
            <Button size="sm" variant="secondary" onClick={() => setDeciding(r)}>
              {t("review")}
            </Button>
          )}
        </div>
      ),
    },
  ];
  return (
    <>
      <ListTable list={list} columns={columns} rowKey={(r) => r.currency_id} title={t("tab_currency")} emptyTitle={t("noCurrencies")} />
      {editing && <DecimalsDialog currency={editing} onClose={() => setEditing(null)} onSaved={list.reload} />}
      {deciding && (
        <Modal open onClose={() => setDeciding(null)} size="sm" title={t("reviewDecimals", { code: deciding.alpha_code })}>
          <p className="mb-3 text-sm">{t("decimalsChange", { from: deciding.effective_decimal_places, to: deciding.pending_decimal_places, by: deciding.pending_by })}</p>
          <MakerChecker
            api={reconCurrencyApi}
            idKey="currency_id"
            record={{ ...deciding, status: "PENDING", name: deciding.alpha_code }}
            onChanged={() => {
              setDeciding(null);
              list.reload();
            }}
          />
        </Modal>
      )}
    </>
  );
}

function DecimalsDialog({ currency, onClose, onSaved }) {
  const { t } = useTranslation("recon");
  const [value, setValue] = useState(String(currency.effective_decimal_places ?? ""));
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      const response = await reconCurrencyApi.set({ currency_id: currency.currency_id, decimal_places: Number(value) });
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
      size="sm"
      title={t("changeDecimals", { code: currency.alpha_code })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button loading={saving} disabled={value === "" || Number(value) > 6} onClick={() => void save()}>
            {t("save")}
          </Button>
        </>
      }
    >
      <Field label={t("decimalPlaces")} required hint={t("decimalsHint", { iso: currency.iso_decimal_places })}>
        <input className={inputClass} inputMode="numeric" maxLength={1} value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))} />
      </Field>
    </Modal>
  );
}
