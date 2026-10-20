import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ListChecks } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { FileUploadField } from "@/Components/Common/FileUploadField";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { InstitutionField, inputClass, labelClass } from "@/Components/GlobalSettings/Notifications/notificationShared";
import { useAuth } from "@/Hooks/useAuth";
import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
import { amlWhitelistApi } from "@/Services/InnoAML/aml.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";
import { notifications } from "@/Utils/Lib/notifications";
import { useInstitutionScope } from "../Shared/amlShared";
import { LIST_FILE_ACCEPT, LIST_FILE_MAX_BYTES, formatOf } from "../Settings/InternalWatchlists/ColumnSetup";

const COLUMNS = ["customer", "listed_name", "entity_id", "evidence", "expires_on"];
const TONE = { OK: "bg-emerald-50 text-emerald-700", SKIPPED: "bg-muted text-muted-foreground", PROBLEM: "bg-amber-50 text-amber-800" };

// Every row of a check or an import: OK (a false positive will be proposed),
// SKIPPED (already whitelisted or a repeat) or PROBLEM, with the reason.
function RowResults({ result }) {
  const { t } = useTranslation("aml");
  if (!result) return null;
  return (
    <div className="space-y-2 rounded-xl border p-3">
      <p className="flex flex-wrap gap-3 text-sm font-bold">
        <span className="text-success">{t("wlRowsOk", { count: result.ok ?? 0 })}</span>
        <span className="text-muted-foreground">{t("wlRowsSkipped", { count: result.skipped ?? 0 })}</span>
        <span className="text-amber-700">{t("wlRowsProblems", { count: result.problems ?? 0 })}</span>
        <span className="ms-auto font-semibold text-muted-foreground">{t("wlRowsTotal", { count: result.rows ?? 0 })}</span>
      </p>
      <div className="max-h-72 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card">
            <tr className="text-start text-muted-foreground">
              <th className="py-1 pe-2 font-semibold">{t("rowShort")}</th>
              <th className="py-1 pe-2 font-semibold">{t("wlCol_customer")}</th>
              <th className="py-1 pe-2 font-semibold">{t("wlMatch")}</th>
              <th className="py-1 font-semibold">{t("common:status")}</th>
            </tr>
          </thead>
          <tbody>
            {(result.results ?? []).map((r) => (
              <tr key={r.row} className="border-t align-top">
                <td className="py-1.5 pe-2 tabular-nums">{r.row}</td>
                <td className="py-1.5 pe-2">
                  <span className="block break-all font-semibold">{r.customer}</span>
                  {r.reference_id && r.reference_id !== r.customer && <span className="block break-all text-[10px] text-muted-foreground">{r.reference_id}</span>}
                </td>
                <td className="py-1.5 pe-2">
                  <span dir="auto" className="block font-semibold">{r.match_name ?? r.matched_entity_name ?? (r.listed_name || r.entity_id || "-")}</span>
                  {(r.list || r.entity_id) && <span className="block break-all font-mono text-[10px] text-muted-foreground">{r.list ?? r.entity_id}</span>}
                </td>
                <td className="py-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TONE[r.status] ?? TONE.SKIPPED}`}>{t(`wlRow_${r.status}`, { defaultValue: r.status })}</span>
                  {r.problem && <span className="mt-0.5 block text-[11px] text-muted-foreground">{r.problem}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Whitelist upload: each row names a customer (reference id, phone, email or
// account number) and the record that matched them (listed name or entity
// id). Check, then import with a comment; the OK rows wait as one batch.
export function WhitelistImport({ onClose, onImported }) {
  const { t } = useTranslation(["aml", "common"]);
  const tr = useConfigLabel();
  const scope = useInstitutionScope();
  const canChoose = useCanChooseInstitution();
  const myInstitution = useAuth((state) => state.user?.inst_profile_id);
  const [form, setForm] = useState({ inst_profile_id: canChoose ? "" : (myInstitution ?? ""), file_path: "", file_name: "", file_format: "CSV", comment: "" });
  const [columns, setColumns] = useState({ has_header: true, sheet: "", delimiter: "", customer: "customer", listed_name: "listed_name", entity_id: "entity_id", evidence: "evidence", expires_on: "expires_on" });
  const [check, setCheck] = useState(null);
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState("");
  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    if ("file_path" in patch || "inst_profile_id" in patch) setCheck(null);
  };
  const setColumn = (key) => (value) => {
    setColumns((c) => ({ ...c, [key]: value }));
    setCheck(null);
  };
  const body = () => {
    const cols = { has_header: columns.has_header };
    if (form.file_format === "XLSX" && columns.sheet.trim()) cols.sheet = columns.sheet.trim();
    if (form.file_format === "CSV" && columns.delimiter) cols.delimiter = columns.delimiter;
    COLUMNS.forEach((k) => {
      if (columns[k].trim()) cols[k] = columns[k].trim();
    });
    return { ...scope(form.inst_profile_id), file_path: form.file_path, columns: cols };
  };
  const upload = async (file) => {
    const data = await amlWhitelistApi.upload({ ...scope(form.inst_profile_id), file });
    set({ file_name: data.file_name, file_format: formatOf(data) });
    return data;
  };
  const run = async (kind) => {
    if (!columns.customer.trim() || !(columns.listed_name.trim() || columns.entity_id.trim())) {
      notifications.error(t("aml:wlColumnsNeeded"));
      return;
    }
    if (kind === "import" && !form.comment.trim()) {
      notifications.error(t("aml:commentRequired"));
      return;
    }
    setBusy(kind);
    try {
      const response = kind === "validate" ? await amlWhitelistApi.validate(body()) : await amlWhitelistApi.import({ ...body(), comment: form.comment.trim() });
      const result = rowsOf(response)[0] ?? null;
      if (kind === "validate") setCheck(result);
      else setDone(result);
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy("");
    }
  };

  if (done) {
    return (
      <Modal
        open
        onClose={() => onImported(null)}
        size="lg"
        title={t("aml:importDone")}
        footer={
          <>
            <Button variant="ghost" onClick={() => onImported(null)}>
              {t("common:close")}
            </Button>
            {done.batch_id && (done.ok ?? 0) > 0 && <Button onClick={() => onImported(done.batch_id, done.applied)}>{t(done.applied ? "aml:showBatchEntries" : "aml:reviewBatch")}</Button>}
          </>
        }
      >
        <p className="mb-3 text-sm text-muted-foreground">{done.applied ? t("aml:wlImportApplied") : t("aml:importWaiting")}</p>
        <RowResults result={done} />
      </Modal>
    );
  }

  const colInput = (key, required) => (
    <label key={key} className={labelClass}>
      {t(`aml:wlCol_${key}`)}
      {required && <span className="text-red-500"> *</span>}
      <input value={columns[key]} onChange={(e) => setColumn(key)(e.target.value)} className={inputClass} placeholder={columns.has_header ? key : ""} />
    </label>
  );
  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={t("aml:wlImportTitle")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common:cancel")}
          </Button>
          <Button loading={busy === "import"} disabled={!check || !(check.ok > 0) || !form.comment.trim() || Boolean(busy)} onClick={() => void run("import")}>
            {t("aml:importRows", { count: check?.ok ?? 0 })}
          </Button>
        </>
      }
    >
      <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
        <p className="text-xs text-muted-foreground md:col-span-2">{t("aml:wlImportHint")}</p>
        <InstitutionField value={form.inst_profile_id} onChange={(v) => set({ inst_profile_id: v, file_path: "", file_name: "" })} />
        <div className={labelClass}>
          {t("aml:listFile")} <span className="text-red-500">*</span>
          <FileUploadField
            tr={tr}
            value={form.file_path}
            onChange={(path) => set(path ? { file_path: path } : { file_path: "", file_name: "" })}
            upload={upload}
            disabled={!form.inst_profile_id}
            accept={LIST_FILE_ACCEPT}
            maxBytes={LIST_FILE_MAX_BYTES}
            uploadLabel={form.inst_profile_id ? "Upload file" : "Select an institution first"}
            hint={form.file_name ? `${form.file_name} · ${form.file_format}` : t("aml:listFileHint")}
          />
        </div>
        <fieldset className="grid gap-4 rounded-xl border p-3 md:col-span-2 md:grid-cols-3">
          <legend className="px-1 text-sm font-semibold text-slate-700">{t("aml:columnSetup")}</legend>
          <p className="text-[11px] text-muted-foreground md:col-span-3">{t("aml:wlColumnsHint")}</p>
          <div className="md:col-span-3">
            <CheckboxPill checked={columns.has_header} onChange={setColumn("has_header")} label={t("aml:hasHeader")} />
          </div>
          {colInput("customer", true)}
          {colInput("listed_name")}
          {colInput("entity_id")}
          {colInput("evidence")}
          {colInput("expires_on")}
          <label className={labelClass}>
            {form.file_format === "XLSX" ? t("aml:col_sheet") : t("aml:col_delimiter")}
            <input
              value={form.file_format === "XLSX" ? columns.sheet : columns.delimiter}
              onChange={(e) => setColumn(form.file_format === "XLSX" ? "sheet" : "delimiter")(e.target.value)}
              placeholder={form.file_format === "XLSX" ? t("aml:firstSheet") : ","}
              className={inputClass}
            />
          </label>
        </fieldset>
        <div className="space-y-3 md:col-span-2">
          <button type="button" disabled={Boolean(busy) || !form.file_path} onClick={() => void run("validate")} className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold text-primary disabled:opacity-50">
            {busy === "validate" ? <Spinner size={13} /> : <ListChecks size={14} />} {t("aml:validate")}
          </button>
          <RowResults result={check} />
        </div>
        <label className={`${labelClass} md:col-span-2`}>
          {t("aml:commentRequiredLabel")} <span className="text-red-500">*</span>
          <textarea value={form.comment} maxLength={2000} onChange={(e) => set({ comment: e.target.value })} className={`${inputClass} min-h-16`} placeholder={t("aml:wlCommentHint")} />
        </label>
      </div>
    </Modal>
  );
}
