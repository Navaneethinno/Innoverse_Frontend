import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, FileCode2, Plus } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DateInput } from "@/Components/Common/DateInput";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { ListTable } from "@/Components/Common/ListView";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { InstitutionField } from "@/Components/GlobalSettings/Notifications/notificationShared";
import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { reconFilesApi, reconLayoutsApi } from "@/Services/Recon/recon.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { inputClass, Section } from "../Finance/Deposits/depositShared";
import { EventsSection, FactGrid, Field, JsonView, MakerChecker, PageHeading, ReadResult, ReconStatus, reconDate, useChoices, useRecord, DefinitionCompare, JsonEditor } from "./reconShared";

// Recon Layouts (menu 190): file formats as JSON. Users start from a
// built-in layout and edit it; an edit waits beside the version in force
// (files keep being read with the approved one) until another user approves.
export function ReconLayouts() {
  const { t } = useTranslation("recon");
  const can = usePagePermission();
  const [viewing, setViewing] = useState(null);
  const [adding, setAdding] = useState(false);
  const list = useServerList({ api: reconLayoutsApi.listPath, call: reconLayoutsApi.list });
  const columns = [
    { key: "code", label: t("code"), render: (r) => <span className="font-mono text-xs font-bold">{r.code}</span> },
    { key: "name", label: t("name"), render: (r) => <span className="text-xs font-semibold">{r.name}</span> },
    { key: "reader", label: t("reader"), render: (r) => <span className="text-xs">{r.reader}</span> },
    { key: "seed_code", label: t("startedFrom"), render: (r) => <span className="font-mono text-[11px]">{r.seed_code ?? "—"}</span> },
    { key: "version", label: t("version"), render: (r) => <span className="text-xs tabular-nums">{r.version}</span> },
    {
      key: "status",
      label: t("status"),
      render: (r) => (
        <span className="inline-flex flex-wrap justify-center gap-1">
          <ReconStatus value={r.status} />
          {r.has_pending && r.status !== "PENDING" && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">{t("changePending")}</span>}
        </span>
      ),
    },
    { key: "actions", label: t("actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setViewing(r)} /> },
  ];
  const actions = can("Add") && (
    <Button size="sm" icon={Plus} onClick={() => setAdding(true)}>
      {t("addLayout")}
    </Button>
  );
  return (
    <div className="pb-8 pt-4">
      <PageHeading icon={FileCode2} title={t("layoutsTitle")} subtitle={t("layoutsSubtitle")} />
      <ListTable list={list} actions={actions} columns={columns} rowKey={(r) => r.id} title={t("layoutsTitle")} emptyTitle={t("noLayouts")} />
      {viewing && <LayoutDetail layout={viewing} onClose={() => setViewing(null)} onChanged={list.reload} />}
      {adding && <LayoutAdd onClose={() => setAdding(false)} onSaved={list.reload} />}
    </div>
  );
}

// JSON typed in the editor, or why it isn't JSON.
const parseJson = (text) => {
  try {
    return { value: JSON.parse(text) };
  } catch (error) {
    return { error: error.message };
  }
};

function LayoutAdd({ onClose, onSaved }) {
  const { t } = useTranslation("recon");
  const isPlatform = useCanChooseInstitution();
  const [instId, setInstId] = useState("");
  const [mode, setMode] = useState("seed");
  const [seeds, setSeeds] = useState([]);
  const [form, setForm] = useState({ code: "", name: "", description: "", seed_code: "", definition: "{\n}" });
  const [problem, setProblem] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    reconLayoutsApi
      .seeds()
      .then((r) => setSeeds(rowsOf(r)))
      .catch((error) => notifications.error(error.message));
  }, []);
  const parsed = mode === "json" ? parseJson(form.definition) : null;
  const valid = form.code.trim() && (mode === "seed" ? form.seed_code : !parsed.error) && (!isPlatform || instId);
  const save = async () => {
    setSaving(true);
    setProblem("");
    try {
      const body = { code: form.code.trim(), name: form.name.trim(), description: form.description.trim(), ...(mode === "seed" ? { seed_code: form.seed_code } : { definition: parsed.value }), ...(isPlatform ? { inst_profile_id: Number(instId) } : {}) };
      const response = await reconLayoutsApi.add(body);
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
      size="lg"
      title={t("addLayout")}
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
        <div className="sm:col-span-2">
          <InstitutionField value={instId} onChange={setInstId} />
        </div>
        <Field label={t("code")} required>
          <input className={`${inputClass} font-mono`} value={form.code} maxLength={32} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") }))} />
        </Field>
        <Field label={t("name")} hint={mode === "seed" ? t("nameFromSeed") : null}>
          <input className={inputClass} value={form.name} maxLength={100} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label={t("description")} className="sm:col-span-2">
          <input className={inputClass} value={form.description} maxLength={500} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </Field>
        <div className="sm:col-span-2">
          <SegmentedSwitch
          className="w-fit"
            value={mode}
            onChange={setMode}
            options={[
              { value: "seed", label: t("startFromBuiltIn") },
              { value: "json", label: t("writeJson") },
            ]}
          />
        </div>
        {mode === "seed" ? (
          <div className="grid max-h-80 gap-2 overflow-y-auto sm:col-span-2">
            {seeds.map((s) => (
              <button
                key={s.code}
                type="button"
                onClick={() => setForm((f) => ({ ...f, seed_code: s.code }))}
                className={cn("rounded-xl border p-3 text-left transition-colors", form.seed_code === s.code ? "border-primary bg-[var(--primary-light)]" : "border-border hover:bg-muted/50")}
              >
                <p className="text-sm font-bold">
                  {s.name} <span className="font-mono text-[11px] font-normal text-muted-foreground">{s.code} · {s.reader}</span>
                </p>
                <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{s.description}</p>
              </button>
            ))}
          </div>
        ) : (
          <JsonEditor className="sm:col-span-2" value={form.definition} onChange={(definition) => setForm((f) => ({ ...f, definition }))} error={parsed?.error} />
        )}
        {problem && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800 sm:col-span-2">{problem}</p>}
      </div>
    </Modal>
  );
}

function LayoutDetail({ layout, onClose, onChanged }) {
  const { t } = useTranslation("recon");
  const [l, reload] = useRecord(reconLayoutsApi.get, layout.id, layout);
  const [editing, setEditing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const changed = () => {
    reload();
    onChanged();
  };
  return (
    <Modal open onClose={onClose} size="full" title={`${l.name} (${l.code})`}>
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <ReconStatus value={l.status} />
            {l.has_pending && <span className="text-xs text-amber-700">{t("changeBy", { by: l.pending_by })}</span>}
          </span>
          <MakerChecker
            api={reconLayoutsApi}
            record={l}
            onEdit={() => setEditing(true)}
            onChanged={changed}
            onDeleted={() => {
              onClose();
              onChanged();
            }}
            extra={[{ key: "preview", label: t("preview"), icon: Eye, run: () => setPreviewing(true) }]} />
        </div>
        <FactGrid
          rows={[
            ["reader", l.reader],
            ["startedFrom", l.seed_code],
            ["version", l.version],
            ["sources", l.sources ?? 0],
            ["description", l.description],
            ["decision", l.decided_at ? `${l.decided_by} · ${reconDate(l.decided_at)}${l.decision_note ? ` · ${l.decision_note}` : ""}` : null],
          ]}
        />
        <Section title={t("definition")}>{l.has_pending && l.pending_definition ? <DefinitionCompare current={l.definition} pending={l.pending_definition} /> : <JsonView value={l.definition} />}</Section>
        <EventsSection api={reconLayoutsApi} id={l.id} />
      </div>
      {editing && <LayoutEdit layout={l} onClose={() => setEditing(false)} onSaved={changed} />}
      {previewing && (
        <Modal open onClose={() => setPreviewing(false)} size="full" title={t("previewOf", { name: l.name })}>
          <Preview with={{ layout_id: l.id }} />
        </Modal>
      )}
    </Modal>
  );
}

function LayoutEdit({ layout, onClose, onSaved }) {
  const { t } = useTranslation("recon");
  const [form, setForm] = useState({ name: layout.name ?? "", description: layout.description ?? "", definition: JSON.stringify(layout.pending_definition ?? layout.definition ?? {}, null, 2) });
  const [problem, setProblem] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const parsed = parseJson(form.definition);
  const save = async () => {
    setSaving(true);
    setProblem("");
    try {
      const response = await reconLayoutsApi.edit({ id: layout.id, name: form.name.trim(), description: form.description.trim(), definition: parsed.value });
      if (response?.message) notifications.success(response.message);
      onClose();
      onSaved();
    } catch (error) {
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
      title={t("editLayout", { code: layout.code })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button variant="secondary" icon={Eye} disabled={Boolean(parsed.error)} onClick={() => setPreviewing((v) => !v)}>
            {previewing ? t("hidePreview") : t("preview")}
          </Button>
          <Button loading={saving} disabled={Boolean(parsed.error) || !form.name.trim()} onClick={() => void save()}>
            {t("save")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("name")} required>
            <input className={inputClass} value={form.name} maxLength={100} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label={t("description")}>
            <input className={inputClass} value={form.description} maxLength={500} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">{t("editWaitsBeside")}</p>
        {problem && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">{problem}</p>}
        <div className={cn("grid gap-3", previewing && "xl:grid-cols-2")}>
          <JsonEditor value={form.definition} onChange={(definition) => setForm((f) => ({ ...f, definition }))} error={parsed.error} rows={28} />
          {previewing && !parsed.error && (
            <div className="min-w-0">
              <Preview with={{ definition: parsed.value }} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// Read a file with a layout and save nothing: a file already received, or
// one from this computer (up to 20 MB). `with`: { layout_id } or { definition }.
export function Preview({ with: using }) {
  const { t } = useTranslation("recon");
  const [from, setFrom] = useState("received");
  const [fileId, setFileId] = useState("");
  const [local, setLocal] = useState(null);
  const [businessDate, setBusinessDate] = useState("");
  const [reply, setReply] = useState(null);
  const [busy, setBusy] = useState(false);
  const files = useChoices(reconFilesApi.list);
  const run = async () => {
    setBusy(true);
    setReply(null);
    try {
      const extra = businessDate ? { business_date: businessDate } : {};
      const response =
        from === "received"
          ? await reconLayoutsApi.preview({ file_id: Number(fileId), ...using, ...extra })
          : await reconLayoutsApi.previewUpload({ file: local, ...extra, ...(using.definition ? { definition: JSON.stringify(using.definition) } : { layout_id: using.layout_id }) });
      setReply(rowsOf(response)[0] ?? {});
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <SegmentedSwitch
          className="w-fit"
          value={from}
          onChange={setFrom}
          options={[
            { value: "received", label: t("receivedFile") },
            { value: "local", label: t("fileFromComputer") },
          ]}
        />
        {from === "received" ? (
          <Field label={t("file")} className="min-w-64 flex-1">
            <FilterSelect value={fileId} onChange={setFileId} options={[{ value: "", label: t("chooseFile") }, ...files.map((f) => ({ value: String(f.id), label: `${f.file_name} · ${f.source_code}` }))]} />
          </Field>
        ) : (
          <Field label={t("file")} hint={t("previewMax")} className="min-w-64 flex-1">
            <input type="file" className="text-xs" onChange={(e) => setLocal(e.target.files?.[0] ?? null)} />
          </Field>
        )}
        <Field label={t("businessDateOptional")}>
          <DateInput className={inputClass} value={businessDate} onChange={(e) => setBusinessDate(e.target.value)} />
        </Field>
        <Button icon={Eye} loading={busy} disabled={from === "received" ? !fileId : !local || local.size > 20 * 1024 * 1024} onClick={() => void run()}>
          {t("readIt")}
        </Button>
      </div>
      {reply && <ReadResult result={reply.result ? { result: reply.result, problem: reply.problem } : reply} records={reply.records ?? []} rejects={reply.rejects ?? []} />}
    </div>
  );
}
