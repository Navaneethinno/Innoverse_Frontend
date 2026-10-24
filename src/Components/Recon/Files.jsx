import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Download, FileStack, FileUp, ShieldCheck, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DateInput } from "@/Components/Common/DateInput";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { ListTable } from "@/Components/Common/ListView";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { SearchBox } from "@/Components/Common/SearchBox";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { saveBlob } from "@/Services/api/fileTransfer";
import { reconFilesApi, reconSourcesApi } from "@/Services/Recon/recon.api";
import { notifications } from "@/Utils/Lib/notifications";
import { ActionButtons, NarrationDialog, inputClass } from "../Finance/Deposits/depositShared";
import { Tabs } from "../Finance/Loans/loanShared";
import { FactGrid, Field, PageHeading, PagedTable, ReadResult, ReconStatus, label, reconDate, recordColumns, useChoices, useDebounced, usePage, useRecord } from "./reconShared";

// Recon Files (menu 189): files received from each source (uploaded, picked
// up by SFTP or generated from the ledger), read with the source's layout.
export function ReconFiles() {
  const { t } = useTranslation("recon");
  const can = usePagePermission();
  const [viewing, setViewing] = useState(null);
  const [dialog, setDialog] = useState(null);
  const list = useServerList({ api: reconFilesApi.listPath, call: reconFilesApi.list });
  const columns = [
    {
      key: "file_name",
      label: t("fileName"),
      render: (r) => (
        <div>
          <p className="break-all font-mono text-xs font-bold">{r.file_name}</p>
          <p className="text-[10px] text-muted-foreground">{`${r.source_code} · ${label(t, "via", r.received_via)}`}</p>
        </div>
      ),
    },
    { key: "business_date", label: t("businessDate"), render: (r) => <span className="whitespace-nowrap text-xs">{r.business_date ?? "—"}</span> },
    { key: "status", label: t("status"), render: (r) => <ReconStatus value={r.status} /> },
    {
      key: "read_status",
      label: t("read"),
      render: (r) => (
        <span className="inline-flex flex-col items-center gap-0.5">
          <ReconStatus value={r.read_status} />
          {r.read_status === "READ" && <span className="text-[10px] text-muted-foreground">{t("readCounts", { records: r.read_records ?? 0, rejects: r.read_rejects ?? 0 })}</span>}
        </span>
      ),
    },
    { key: "received_at", label: t("received"), render: (r) => <span className="whitespace-nowrap text-xs">{reconDate(r.received_at)}</span> },
    { key: "actions", label: t("actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setViewing(r)} /> },
  ];
  const actions = (
    <>
      {can("Add") && (
        <Button size="sm" variant="secondary" icon={Wand2} onClick={() => setDialog("generate")}>
          {t("generateSwitchFile")}
        </Button>
      )}
      {can("Add") && (
        <Button size="sm" icon={FileUp} onClick={() => setDialog("upload")}>
          {t("uploadFile")}
        </Button>
      )}
    </>
  );
  const opened = (file) => {
    setDialog(null);
    list.reload();
    if (file?.id) setViewing(file);
  };
  return (
    <div className="pb-8 pt-4">
      <PageHeading icon={FileStack} title={t("filesTitle")} subtitle={t("filesSubtitle")} />
      <ListTable list={list} actions={actions} columns={columns} rowKey={(r) => r.id} title={t("filesTitle")} emptyTitle={t("noFiles")} />
      {viewing && <FileDetail file={viewing} onClose={() => setViewing(null)} onChanged={list.reload} />}
      {dialog === "upload" && <UploadDialog onClose={() => setDialog(null)} onDone={opened} />}
      {dialog === "generate" && <GenerateDialog onClose={() => setDialog(null)} onDone={opened} />}
    </div>
  );
}

function UploadDialog({ onClose, onDone }) {
  const { t } = useTranslation("recon");
  const sources = useChoices(reconSourcesApi.list);
  const [sourceId, setSourceId] = useState("");
  const [file, setFile] = useState(null);
  const [businessDate, setBusinessDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState(null);
  const source = sources.find((s) => String(s.id) === sourceId);
  const tooBig = source && file && file.size > source.max_file_mb * 1024 * 1024;
  const upload = async () => {
    setBusy(true);
    try {
      const response = await reconFilesApi.upload({ source_id: sourceId, file, business_date: businessDate });
      if (response?.message) notifications.success(response.message);
      setReply(rowsOf(response)[0] ?? {});
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  // After the upload: what reading it on receipt gave.
  if (reply) {
    const read = reply.read;
    return (
      <Modal
        open
        onClose={() => onDone(null)}
        size="xl"
        title={t("uploaded", { name: reply.file?.file_name ?? reply.file_name ?? file?.name })}
        footer={<Button onClick={() => onDone(reply.file ?? reply)}>{t("openFile")}</Button>}
      >
        {reply.read_error && <p className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">{reply.read_error}</p>}
        {read ? (
          <div className="grid gap-3">
            <p className="flex items-center gap-2 text-sm">
              <ReconStatus value={read.read_status} /> {t("readCounts", { records: read.records ?? 0, rejects: read.rejects ?? 0 })}
            </p>
            <ReadResult result={read.result} />
          </div>
        ) : (
          !reply.read_error && <p className="text-sm text-muted-foreground">{t("notReadYet")}</p>
        )}
      </Modal>
    );
  }
  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={t("uploadFile")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button icon={FileUp} loading={busy} disabled={!sourceId || !file || tooBig || (source && !source.name_gives_date && !businessDate)} onClick={() => void upload()}>
            {t("upload")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <Field label={t("source")} required>
          <FilterSelect value={sourceId} onChange={setSourceId} options={[{ value: "", label: t("chooseSource") }, ...sources.filter((s) => s.status === "ACTIVE" && !s.generated_from).map((s) => ({ value: String(s.id), label: `${s.name} (${s.code})` }))]} />
        </Field>
        <Field label={t("file")} required hint={source ? [source.file_name_pattern && t("expectedName", { pattern: source.file_name_pattern }), t("maxSize", { mb: source.max_file_mb })].filter(Boolean).join(" · ") : null}>
          <input type="file" className="text-xs" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Field>
        <Field label={source && !source.name_gives_date ? t("businessDate") : t("businessDateOptional")} required={Boolean(source && !source.name_gives_date)} hint={source?.name_gives_date ? t("dateFromNameHint") : t("dateNeededHint")}>
          <DateInput className={inputClass} value={businessDate} onChange={(e) => setBusinessDate(e.target.value)} />
        </Field>
        {tooBig && <p className="text-xs font-semibold text-red-600">{t("fileTooBig", { mb: source.max_file_mb })}</p>}
      </div>
    </Modal>
  );
}

// Make a date's switch file now, for a SWITCH source generated from the ledger.
function GenerateDialog({ onClose, onDone }) {
  const { t } = useTranslation("recon");
  const sources = useChoices(reconSourcesApi.list).filter((s) => s.generated_from === "LEDGER" && s.status === "ACTIVE");
  const [sourceId, setSourceId] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const generate = async () => {
    setBusy(true);
    try {
      const response = await reconFilesApi.generate({ source_id: Number(sourceId), business_date: date });
      const row = rowsOf(response)[0] ?? {};
      notifications.success(t("generated", { count: row.transactions ?? 0 }));
      onDone(row.file);
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
      title={t("generateSwitchFile")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button icon={Wand2} loading={busy} disabled={!sourceId || !date} onClick={() => void generate()}>
            {t("generate")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <p className="text-xs text-muted-foreground">{t("generateHint")}</p>
        <Field label={t("source")} required>
          <FilterSelect value={sourceId} onChange={setSourceId} options={[{ value: "", label: sources.length ? t("chooseSource") : t("noGeneratedSources") }, ...sources.map((s) => ({ value: String(s.id), label: `${s.name} (${s.code})` }))]} />
        </Field>
        <Field label={t("businessDate")} required>
          <DateInput className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function FileDetail({ file, onClose, onChanged }) {
  const { t } = useTranslation("recon");
  const can = usePagePermission();
  const [f, reload] = useRecord(reconFilesApi.get, file.id, file);
  const [tab, setTab] = useState("result");
  const [busy, setBusy] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const run = async (call, after) => {
    setBusy(true);
    try {
      const response = await call();
      if (response?.message) notifications.success(response.message);
      after?.(response);
      reload();
      onChanged();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  const download = () =>
    run(async () => {
      const { blob, fileName } = await reconFilesApi.download(f.id, f.file_name);
      saveBlob(blob, fileName || f.file_name);
    });
  const buttons = [
    can("Edit") && f.status !== "DISCARDED" && { key: "read", label: f.read_status === "NOT_READ" ? t("readFile") : t("readAgain"), icon: BookOpen, variant: "primary", run: () => void run(() => reconFilesApi.read({ id: f.id }), () => setTab("result")) },
    can("View") && { key: "verify", label: t("verify"), icon: ShieldCheck, run: () => void run(() => reconFilesApi.verify({ id: f.id })) },
    can("View") && { key: "download", label: t("download"), icon: Download, run: () => void download() },
    can("Change Status") && f.status !== "DISCARDED" && { key: "discard", label: t("discard"), icon: Trash2, variant: "danger", run: () => setDiscarding(true) },
  ];
  return (
    <Modal open onClose={onClose} size="full" title={f.file_name}>
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <ReconStatus value={f.status} />
            <ReconStatus value={f.read_status} />
          </span>
          <ActionButtons busy={busy} buttons={buttons} />
        </div>
        {f.status_note && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">{f.status_note}</p>}
        <FactGrid
          rows={[
            ["source", `${f.source_name} (${f.source_code})`],
            ["businessDate", f.business_date ? `${f.business_date} · ${label(t, "dateFrom", f.business_date_from)}` : null],
            ["sequence", f.sequence_no],
            ["received", `${label(t, "via", f.received_via)} · ${f.received_by ?? ""} · ${reconDate(f.received_at)}`],
            ["size", f.size_bytes],
            ["verified", reconDate(f.verified_at)],
            ["readWith", f.read_layout_name ? `${f.read_layout_name} v${f.read_layout_version}` : null],
            ["readAt", f.read_at ? `${f.read_by ?? ""} · ${reconDate(f.read_at)}` : null],
            ["sha256", <span key="sha" className="break-all font-mono text-[10px]">{f.sha256}</span>],
          ]}
        />
        <div>
          <Tabs
            tabs={[{ key: "result" }, { key: "records", count: f.read_records }, { key: "rejects", count: f.read_rejects }]}
            value={tab}
            onChange={setTab}
            labelOf={(k) => t(`fileTab_${k}`)}
          />
          {tab === "result" && (f.read_result ? <ReadResult result={f.read_result} /> : <p className="py-6 text-center text-sm text-muted-foreground">{t("notReadYet")}</p>)}
          {tab === "records" && <FileRecords fileId={f.id} />}
          {tab === "rejects" && <FileRejects fileId={f.id} />}
        </div>
      </div>
      {discarding && (
        <NarrationDialog
          title={t("discardTitle", { name: f.file_name })}
          hint={t("discardHint")}
          confirmLabel={t("discard")}
          variant="danger"
          required
          busy={busy}
          onClose={() => setDiscarding(false)}
          onSave={(narration) => run(() => reconFilesApi.discard({ id: f.id, narration }), () => setDiscarding(false))}
        />
      )}
    </Modal>
  );
}

const MATCH_STATUSES = ["", "UNMATCHED", "MATCHED", "PROPOSED", "MANUAL", "FORCE_MATCHED", "SELF_REVERSED", "WRITTEN_OFF", "EXCLUDED"];

function FileRecords({ fileId }) {
  const { t } = useTranslation("recon");
  const [status, setStatus] = useState("");
  const [typed, setTyped] = useState("");
  const search = useDebounced(typed);
  const [open, setOpen] = useState(null);
  const list = usePage(reconFilesApi.records, { id: fileId, ...(status ? { status } : {}), ...(search.trim() ? { search: search.trim() } : {}) });
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox className="min-w-64 flex-1" search={typed} onSearch={setTyped} placeholder={t("recordSearchHint")} />
        <FilterSelect className="w-48" value={status} onChange={setStatus} options={MATCH_STATUSES.map((s) => ({ value: s, label: s ? label(t, "status", s) : t("allMatchStatuses") }))} />
      </div>
      <PagedTable
        list={list}
        empty={t("noRecords")}
        columns={[
          { key: "line_no", label: t("line") },
          ...recordColumns(t),
          { key: "match_status", label: t("match"), render: (r) => <ReconStatus value={r.match_status} /> },
          {
            key: "raw",
            label: t("raw"),
            render: (r) =>
              open === r.id ? (
                <div className="max-w-md text-left">
                  <pre className="whitespace-pre-wrap break-all font-mono text-[10px]">{r.raw}</pre>
                  {r.extra && <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-[10px] text-muted-foreground">{JSON.stringify(r.extra)}</pre>}
                  {r.warnings?.length > 0 && <p className="mt-1 text-[10px] text-amber-700">{r.warnings.join(" · ")}</p>}
                </div>
              ) : (
                <button type="button" onClick={() => setOpen(r.id)} className="text-[11px] font-bold text-primary hover:underline">
                  {t("showRaw")}
                </button>
              ),
          },
        ]}
      />
    </div>
  );
}

function FileRejects({ fileId }) {
  const { t } = useTranslation("recon");
  const list = usePage(reconFilesApi.rejects, { id: fileId });
  return (
    <PagedTable
      list={list}
      empty={t("noRejects")}
      rowKey={(r, i) => `${r.line_no}-${i}`}
      columns={[
        { key: "line_no", label: t("line") },
        { key: "line_count", label: t("lines") },
        { key: "record_type", label: t("recordType") },
        { key: "problems", label: t("problems"), wrap: true, render: (r) => (r.problems ?? []).map((p, i) => <p key={i}>{[p.level, p.code, p.field, p.detail].filter(Boolean).join(" · ")}</p>) },
        { key: "raw", label: t("raw"), wrap: true, render: (r) => <span className="break-all font-mono text-[10px]">{r.raw}</span> },
      ]}
    />
  );
}
