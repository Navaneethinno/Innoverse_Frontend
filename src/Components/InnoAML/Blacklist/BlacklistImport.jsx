import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ListChecks } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DateInput } from "@/Components/Common/DateInput";
import { FileUploadField } from "@/Components/Common/FileUploadField";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { InstitutionField, inputClass, labelClass } from "@/Components/GlobalSettings/Notifications/notificationShared";
import { useAuth } from "@/Hooks/useAuth";
import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
import { amlBlacklistApi } from "@/Services/InnoAML/aml.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";
import { notifications } from "@/Utils/Lib/notifications";
import { useInstitutionScope } from "../Shared/amlShared";
import { ColumnSetup, LIST_FILE_ACCEPT, LIST_FILE_MAX_BYTES, columnsFromForm, columnsToForm, formatOf, splitList } from "../Settings/InternalWatchlists/ColumnSetup";
import { ValidationResult } from "../Settings/InternalWatchlists/ValidationResult";
import { REASONS } from "./blacklistShared";

const ENTITY_TYPES = ["ANY", "PERSON", "ORGANIZATION"];
const MAX_ROWS = 5000;
const tomorrow = () => new Date(Date.now() + 864e5).toISOString().slice(0, 10);

// Bulk import, as Internal Watchlists: upload the CSV/XLSX, describe its
// columns, validate (nothing stored), then import. Every row becomes an
// entry waiting in one batch, which the checker approves or rejects whole.
export function BlacklistImport({ onClose, onImported }) {
  const { t } = useTranslation(["aml", "common"]);
  const tr = useConfigLabel();
  const scope = useInstitutionScope();
  const canChoose = useCanChooseInstitution();
  const myInstitution = useAuth((state) => state.user?.inst_profile_id);
  const [form, setForm] = useState({
    inst_profile_id: canChoose ? "" : (myInstitution ?? ""),
    file_path: "",
    file_name: "",
    file_format: "CSV",
    default_entity_type: "ANY",
    reason: "",
    expires_on: "",
    comment: "",
  });
  const [columns, setColumns] = useState(() => columnsToForm());
  const [check, setCheck] = useState(null);
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState(null);
  // A change to the file or its columns needs a new validate.
  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    if (["inst_profile_id", "file_path", "default_entity_type"].some((k) => k in patch)) setCheck(null);
  };
  const setColumn = (key) => (value) => {
    setColumns((c) => ({ ...c, [key]: value }));
    setCheck(null);
  };
  const fileBody = () => ({
    ...scope(form.inst_profile_id),
    file_path: form.file_path,
    default_entity_type: form.default_entity_type,
    columns: columnsFromForm(columns, form.file_format),
  });

  const upload = async (file) => {
    const data = await amlBlacklistApi.upload({ ...scope(form.inst_profile_id), file });
    set({ file_name: data.file_name, file_format: formatOf(data) });
    return data;
  };

  const validate = async () => {
    if (!form.file_path || !splitList(columns.name).length) {
      notifications.error(t("aml:fileAndNameNeeded"));
      return;
    }
    setBusy("validate");
    try {
      setCheck(rowsOf(await amlBlacklistApi.validate({ ...fileBody(), inst_profile_id: Number(form.inst_profile_id), code: "BLACKLIST" }))[0] ?? null);
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy("");
    }
  };

  const runImport = async () => {
    if (!form.reason) {
      notifications.error(t("aml:reasonRequiredField"));
      return;
    }
    setBusy("import");
    try {
      const response = await amlBlacklistApi.import({ ...fileBody(), reason: form.reason, expires_on: form.expires_on || null, comment: form.comment.trim() });
      setResult(rowsOf(response)[0] ?? response?.data ?? {});
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy("");
    }
  };

  const tooMany = (check?.rows ?? 0) > MAX_ROWS;
  const ready = check && (check.valid ?? 0) > 0 && !tooMany;

  if (result) {
    return (
      <Modal
        open
        onClose={() => onImported(null)}
        size="md"
        title={t("aml:importDone")}
        footer={
          <>
            <Button variant="ghost" onClick={() => onImported(null)}>
              {t("common:close")}
            </Button>
            {result.batch_id && <Button onClick={() => onImported(result.batch_id, result.applied)}>{t(result.applied ? "aml:showBatchEntries" : "aml:reviewBatch")}</Button>}
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <p className="flex items-center gap-2 font-bold text-success">
            <CheckCircle2 size={16} /> {t("aml:importAdded", { added: result.added ?? 0, rows: result.rows ?? 0 })}
          </p>
          <p className="text-muted-foreground">{result.applied ? t("aml:importApplied") : t("aml:importWaiting")}</p>
          {result.batch_id && (
            <p className="text-xs">
              {t("aml:importBatch")}: <span className="font-mono">{result.batch_id}</span>
            </p>
          )}
          {result.skipped?.length > 0 && (
            <div className="rounded-lg bg-muted p-2 text-xs">
              <p className="mb-1 font-bold">{t("aml:importSkipped", { count: result.skipped.length })}</p>
              <ul className="max-h-32 overflow-y-auto">
                {result.skipped.map((s, i) => (
                  <li key={i} dir="auto">
                    {s.name ?? s.blacklist_name}
                    {s.entity_type && <span className="text-muted-foreground"> · {t(`aml:entity_${s.entity_type}`, { defaultValue: s.entity_type })}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {[...(result.errors ?? []), ...(result.problems ?? [])].length > 0 && (
            <div className="max-h-32 overflow-y-auto rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
              {[...(result.errors ?? []), ...(result.problems ?? [])].map((e, i) => (
                <p key={i} dir="auto">
                  <b>{e.row ? t("aml:rowN", { row: e.row }) : e.name}</b>: {e.problem}
                </p>
              ))}
            </div>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={t("aml:importBlacklist")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common:cancel")}
          </Button>
          <Button loading={busy === "import"} disabled={!ready || Boolean(busy)} onClick={() => void runImport()}>
            {t("aml:importRows", { count: check?.valid ?? 0 })}
          </Button>
        </>
      }
    >
      <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
        <p className="text-xs text-muted-foreground md:col-span-2">{t("aml:importHint", { max: MAX_ROWS })}</p>
        <InstitutionField value={form.inst_profile_id} onChange={(v) => set({ inst_profile_id: v, file_path: "", file_name: "" })} />
        <label className={labelClass}>
          {t("aml:defaultEntityType")}
          <FilterSelect className="mt-1.5" value={form.default_entity_type} onChange={(v) => set({ default_entity_type: v })} options={ENTITY_TYPES.map((v) => ({ value: v, label: t(`aml:entity_${v}`) }))} />
        </label>
        <div className={`${labelClass} md:col-span-2`}>
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
        <ColumnSetup columns={columns} format={form.file_format} onChange={setColumn} />
        <div className="space-y-3 md:col-span-2">
          <button
            type="button"
            disabled={Boolean(busy) || !form.file_path}
            onClick={() => void validate()}
            className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold text-primary disabled:opacity-50"
          >
            {busy === "validate" ? <Spinner size={13} /> : <ListChecks size={14} />} {t("aml:validate")}
          </button>
          <ValidationResult result={check} />
          {tooMany && <p className="text-xs font-semibold text-red-600">{t("aml:importTooMany", { max: MAX_ROWS })}</p>}
        </div>
        <label className={labelClass}>
          {t("aml:blReason")} <span className="text-red-500">*</span>
          <FilterSelect className="mt-1.5" value={form.reason} onChange={(v) => set({ reason: v })} options={[{ value: "", label: t("aml:selectReason") }, ...REASONS.map((r) => ({ value: r, label: t(`aml:blReason_${r}`) }))]} />
        </label>
        <label className={labelClass}>
          {t("aml:blExpiresOn")}
          <DateInput className={inputClass} value={form.expires_on} min={tomorrow()} onChange={(e) => set({ expires_on: e.target.value })} placeholder={t("aml:neverExpires")} />
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          {t("aml:commentForChecker")}
          <textarea value={form.comment} maxLength={2000} onChange={(e) => set({ comment: e.target.value })} className={`${inputClass} min-h-16`} />
        </label>
      </div>
    </Modal>
  );
}
