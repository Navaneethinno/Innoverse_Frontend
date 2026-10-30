import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Circle, Download, Forward, Trash2, Upload, UserPlus } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { Button } from "@/Components/Common/Button";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { accountDate, money } from "@/Components/Finance/Accounts/accountShared";
import { OwnerFinder } from "@/Components/Finance/Deposits/TermDeposits/OpenDeposit";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { saveBlob } from "@/Services/api/fileTransfer";
import { downloadLoanDocument, loanApplicationsApi, recordOf, uploadLoanDocument } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { inputClass, labelClass } from "../../Deposits/depositShared";
import { Field } from "../loanShared";

// An application's co-borrowers and documents (`parts`), its forwarding to
// the next approval level, and the forwarding history. Co-borrowers and
// documents change only while the application is open.

export function useParts(id) {
  const [parts, setParts] = useState(null);
  const load = useCallback(() => {
    loanApplicationsApi
      .parts({ id })
      .then((r) => setParts(recordOf(r) ?? { co_borrowers: [], documents: [] }))
      .catch(() => setParts({ co_borrowers: [], documents: [] }));
  }, [id]);
  useEffect(() => load(), [load]);
  return [parts, setParts, load];
}

export function CoBorrowers({ app, parts, onParts, editable }) {
  const { t } = useTranslation("loans");
  const [adding, setAdding] = useState(null);
  const [relationship, setRelationship] = useState("");
  const [busy, setBusy] = useState(false);
  const rows = parts?.co_borrowers ?? [];
  const max = Number(app.eligibility_snapshot?.maximum_co_borrowers ?? 0);
  const run = async (verb, body) => {
    setBusy(true);
    try {
      const r = await loanApplicationsApi[verb]({ id: app.id, ...body });
      onParts(recordOf(r) ?? parts);
      setAdding(null);
      setRelationship("");
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-3 rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{t(max ? "coBorrowersHintMax" : "coBorrowersHint", { count: max })}</p>
      {!parts ? (
        <Spinner size={16} />
      ) : !rows.length ? (
        <p className="text-sm text-muted-foreground">{t("noCoBorrowers")}</p>
      ) : (
        <ul className="grid gap-1.5">
          {rows.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm">
              <span>
                <b>{c.name}</b> <span className="text-xs text-muted-foreground">· {c.relationship || "—"} · {t("addedBy", { name: c.added_by ?? "—" })}</span>
              </span>
              {editable && <ActionIconButton label={t("remove")} intent="delete" icon={Trash2} onClick={() => void run("co_borrower_remove", { item_id: c.id })} />}
            </li>
          ))}
        </ul>
      )}
      {editable &&
        (adding ? (
          <div className="grid gap-2 rounded-xl border border-border p-3">
            <p className="text-sm">
              <b>{adding.name}</b>
            </p>
            <label className={labelClass}>
              {t("relationship")}
              <input className={cn(inputClass, "mt-1")} value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder={t("relationshipPlaceholder")} />
            </label>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setAdding(null)}>
                {t("cancel")}
              </Button>
              <Button size="sm" loading={busy} onClick={() => void run("co_borrower_add", { entity_type: adding.entity_type, entity_id: adding.entity_id, relationship: relationship.trim() })}>
                {t("addCoBorrower")}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <p className={cn(labelClass, "mb-1 flex items-center gap-1")}>
              <UserPlus size={13} /> {t("addCoBorrower")}
            </p>
            <OwnerFinder onPick={(entity, account) => setAdding({ ...entity, name: account?.owner?.name ?? account?.owner_name ?? "" })} />
          </div>
        ))}
    </div>
  );
}

// The product's required documents as a checklist (ticked once one of that
// code is attached), the documents attached, and upload / download / remove.
export function Documents({ app, parts, onParts, editable }) {
  const { t } = useTranslation("loans");
  const [uploading, setUploading] = useState(null);
  const required = [...(app.eligibility_snapshot?.required_documents ?? [])];
  const missing = app.readiness?.missing_documents ?? [];
  // A board resolution is asked for at or above the board amount.
  if (app.readiness?.board_resolution_required && !required.some((d) => d.code === "BOARD_RESOLUTION")) required.push({ code: "BOARD_RESOLUTION", name: t("boardResolution"), mandatory: true });
  if (app.eligibility_snapshot?.insurance_required && !required.some((d) => d.code === "INSURANCE")) required.push({ code: "INSURANCE", name: t("insurance"), mandatory: true });
  const docs = parts?.documents ?? [];
  const has = (code) => docs.some((d) => d.document_code === code);
  const download = async (d) => {
    try {
      const blob = await downloadLoanDocument({ id: app.id, item_id: d.id });
      saveBlob(blob, d.file_name || `${d.document_code}.pdf`);
    } catch (e) {
      notifications.error(e.message);
    }
  };
  const remove = async (d) => {
    try {
      onParts(recordOf(await loanApplicationsApi.document_remove({ id: app.id, item_id: d.id })) ?? parts);
    } catch (e) {
      notifications.error(e.message);
    }
  };
  return (
    <div className="grid gap-3 rounded-2xl border border-border bg-card p-4">
      {required.length > 0 && (
        <ul className="grid gap-1 sm:grid-cols-2">
          {required.map((d) => {
            const ok = has(d.code);
            const Icon = ok ? CheckCircle2 : Circle;
            return (
              <li key={d.code} className={cn("flex items-center gap-2 text-sm", ok ? "text-emerald-700" : missing.includes(d.code) ? "text-amber-800" : "text-muted-foreground")}>
                <Icon size={14} /> {d.name || d.code}
                {!d.mandatory && <span className="text-[10px]">({t("optional")})</span>}
                {editable && !ok && (
                  <button type="button" className="text-xs font-bold text-primary hover:underline" onClick={() => setUploading({ code: d.code, name: d.name })}>
                    {t("upload")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {!parts ? (
        <Spinner size={16} />
      ) : !docs.length ? (
        <p className="text-sm text-muted-foreground">{t("noDocuments")}</p>
      ) : (
        <ul className="grid gap-1.5">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-xs">
              <span>
                <b>{d.document_name || d.document_code}</b> · {d.file_name}
                <span className="block text-[10px] text-muted-foreground">
                  {d.uploaded_by} · {accountDate(d.uploaded_at)}
                  {d.note ? ` · ${d.note}` : ""}
                </span>
              </span>
              <span className="flex gap-1">
                <ActionIconButton label={t("download")} intent="view" icon={Download} onClick={() => void download(d)} />
                {editable && <ActionIconButton label={t("remove")} intent="delete" icon={Trash2} onClick={() => void remove(d)} />}
              </span>
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <div>
          <Button size="sm" variant="outline" icon={Upload} onClick={() => setUploading({ code: "", name: "" })}>
            {t("uploadDocument")}
          </Button>
        </div>
      )}
      {uploading && (
        <UploadDocument
          app={app}
          preset={uploading}
          required={required}
          onClose={() => setUploading(null)}
          onDone={(next) => {
            setUploading(null);
            onParts(next);
          }}
        />
      )}
    </div>
  );
}

function UploadDocument({ app, preset, required, onClose, onDone }) {
  const { t } = useTranslation("loans");
  const [code, setCode] = useState(preset.code);
  const [name, setName] = useState(preset.name ?? "");
  const [note, setNote] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const known = required.some((d) => d.code === code);
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const stored = await uploadLoanDocument({ id: app.id, file });
      const path = stored?.path ?? rowsOf(stored)[0]?.path ?? stored?.data?.path;
      const fileName = stored?.file_name ?? rowsOf(stored)[0]?.file_name ?? file.name;
      const r = await loanApplicationsApi.document_add({ id: app.id, document_code: code, document_name: known ? "" : name.trim(), file_path: path, file_name: fileName, note: note.trim() });
      onDone(recordOf(r));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={t("uploadDocument")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button loading={busy} disabled={!file || !code || (!known && !name.trim())} onClick={() => void save()}>
            {t("upload")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <label className={labelClass}>
          {t("documentType")}
          <Field
            field={{ type: "select", blank: t("otherDocument"), options: required.map((d) => ({ value: d.code, label: d.name || d.code })) }}
            value={known ? code : ""}
            onChange={(v) => {
              setCode(v);
              if (!v) setName("");
            }}
          />
        </label>
        {!known && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              {t("documentCode")}
              <input className={cn(inputClass, "mt-1 font-mono")} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))} placeholder="BOARD_LETTER" />
            </label>
            <label className={labelClass}>
              {t("documentName")}
              <input className={cn(inputClass, "mt-1")} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          </div>
        )}
        <label className={labelClass}>
          {t("file")}
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="mt-1 block text-xs" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("fileHint")}</span>
        </label>
        <label className={labelClass}>
          {t("noteOptional")}
          <input className={cn(inputClass, "mt-1")} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
      </div>
    </Modal>
  );
}

// Forward the application to the next level: who (with their limit) and the
// case for the loan, as that person will read it.
export function ForwardDialog({ app, onClose, onDone }) {
  const { t } = useTranslation("loans");
  const [people, setPeople] = useState(null);
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    loanApplicationsApi
      .forward_options({ id: app.id })
      .then((r) => setPeople(rowsOf(r)))
      .catch((e) => {
        setError(e.message);
        setPeople([]);
      });
  }, [app.id]);
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await loanApplicationsApi.forward({ id: app.id, to_user_id: Number(to), note: note.trim() });
      notifications.success(r?.message ?? t("forwarded"));
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title={t("forward")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button icon={Forward} loading={busy} disabled={!to || !note.trim()} onClick={() => void save()}>
            {t("forward")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <p className="text-xs text-muted-foreground">{t("forwardHint")}</p>
        <label className={labelClass}>
          {t("forwardTo")}
          <Field
            field={{
              type: "select",
              blank: people === null ? t("loading") : people.length ? t("choose") : t("noOneToForward"),
              options: (people ?? []).map((p) => ({ value: String(p.user_id), label: `${p.user_name} · ${p.profile_name ?? ""}${p.approval_limit ? ` · ${t("limitShort")} ${money(p.approval_limit)}` : ""}` })),
            }}
            value={to}
            onChange={setTo}
          />
        </label>
        <label className={labelClass}>
          {t("forwardNote")}
          <textarea className={cn(inputClass, "mt-1 min-h-40")} maxLength={8000} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("forwardNotePlaceholder")} />
          <span className="mt-1 block text-right text-[10px] font-normal text-muted-foreground">{note.length} / 8000</span>
        </label>
        {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
      </div>
    </Modal>
  );
}

export function ForwardHistory({ rows }) {
  const { t } = useTranslation("loans");
  if (!rows?.length) return <p className="text-sm text-muted-foreground">{t("noForwards")}</p>;
  return (
    <ol className="grid gap-2">
      {rows.map((f) => (
        <li key={f.id} className="rounded-2xl border border-border bg-card p-3 text-sm">
          <p className="font-semibold">
            {f.from_user} → {f.to_user} <span className="text-xs font-normal text-muted-foreground">· {accountDate(f.at)}</span>
          </p>
          <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{f.note}</p>
        </li>
      ))}
    </ol>
  );
}
