import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, FileText, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { caseDate } from "./caseShared";

const KINDS = ["FIELDS", "SECTION", "DOCUMENT", "QUESTION"];
const REQUEST_TONE = {
  OPEN: "bg-blue-50 text-blue-700",
  RESPONDED: "bg-amber-50 text-amber-800",
  ACCEPTED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
  CANCELLED: "bg-muted text-muted-foreground",
};
const areaClass = "mt-1.5 min-h-20 w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary";
const labelClass = "text-sm font-semibold text-slate-700";

const show = (v) => (v == null || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));

// Opens a file the customer uploaded, through the subject's wizard file call.
async function openFile(api, referenceId, path) {
  try {
    const blob = await api.file({ reference_id: referenceId, path });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    notifications.error(error.message);
  }
}

// What the request asks for, in a line.
function targetText(t, r) {
  if (r.kind === "FIELDS") return (r.target?.fields ?? []).join(", ");
  if (r.kind === "SECTION") return (r.target?.sections ?? []).join(", ");
  if (r.kind === "DOCUMENT") return r.target?.document ?? "";
  return t("kind_QUESTION");
}

function Answer({ r, api, referenceId }) {
  const { t } = useTranslation("cases");
  const res = r.response;
  if (!res) return null;
  if (res.answer != null) return <p className="whitespace-pre-wrap rounded-lg bg-muted/40 p-2 text-xs">{res.answer}</p>;
  if (Array.isArray(res.files)) {
    return (
      <div className="flex flex-wrap gap-2">
        {res.files.map((path, i) => (
          <button key={path} type="button" onClick={() => void openFile(api, referenceId, path)} className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-xs font-semibold text-primary hover:bg-[var(--primary-light)]">
            <FileText size={12} /> {t("fileN", { n: i + 1 })}
          </button>
        ))}
      </div>
    );
  }
  if (Array.isArray(res.changes)) {
    return (
      <div className="grid gap-2">
        {res.changes.map((c, i) => {
          const keys = [...new Set([...Object.keys(c.before ?? {}), ...Object.keys(c.after ?? {})])].filter((k) => show(c.before?.[k]) !== show(c.after?.[k]));
          return (
            <div key={i} className="rounded-lg bg-muted/40 p-2 text-xs">
              <p className="mb-1 font-bold">{c.section}</p>
              {keys.length ? (
                keys.map((k) => (
                  <p key={k} className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] text-muted-foreground">{k}</span>
                    <span className="text-red-700 line-through">{show(c.before?.[k])}</span>
                    <ArrowRight size={11} />
                    <span className="font-semibold text-emerald-700">{show(c.after?.[k])}</span>
                  </p>
                ))
              ) : (
                <p className="text-muted-foreground">{t("noChanges")}</p>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  return null;
}

// The Requests tab: each request to the customer with its status, due date
// (overdue highlighted), the answer and Accept / Ask again / Cancel.
export function RequestsTab({ requests, canEdit, api, referenceId, busy, onAccept, onAskAgain, onCancel }) {
  const { t } = useTranslation("cases");
  const [again, setAgain] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const list = [...(requests ?? [])].sort((a, b) => Number(b.id) - Number(a.id));
  if (!list.length) return <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{t("noRequests")}</p>;
  return (
    <div className="grid gap-3">
      {list.map((r) => {
        const overdue = r.overdue && (r.status === "OPEN" || r.status === "RESPONDED");
        return (
          <div key={r.id} className={cn("rounded-2xl border bg-card p-4", overdue ? "border-red-300" : "border-border")}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
                  {t(`kind_${r.kind}`)}
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", REQUEST_TONE[r.status])}>{t(`requestStatus_${r.status}`, { defaultValue: r.status })}</span>
                  {overdue && <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">{t("overdue")}</span>}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{targetText(t, r)}</p>
              </div>
              <p className="text-right text-[11px] text-muted-foreground">
                {t("requestedBy", { name: r.requested_by ?? "—", date: caseDate(r.requested_at) })}
                <br />
                <span className={overdue ? "font-bold text-red-700" : ""}>{t("dueOn", { date: caseDate(r.due_at) })}</span>
              </p>
            </div>
            <p className="mt-2 rounded-lg border-l-2 border-primary bg-[var(--primary-light)]/40 px-2 py-1.5 text-xs">{r.message}</p>
            {r.response && (
              <div className="mt-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("customerAnswer", { date: caseDate(r.responded_at) })}</p>
                <Answer r={r} api={api} referenceId={referenceId} />
              </div>
            )}
            {canEdit && (r.status === "OPEN" || r.status === "RESPONDED") && (
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button variant="ghost" size="sm" icon={X} disabled={busy} onClick={() => setCancelling(r)}>{t("cancelRequest")}</Button>
                {r.status === "RESPONDED" && (
                  <>
                    <Button variant="secondary" size="sm" icon={RotateCcw} disabled={busy} onClick={() => setAgain(r)}>{t("askAgain")}</Button>
                    <Button size="sm" icon={Check} loading={busy} onClick={() => onAccept(r)}>{t("acceptAnswer")}</Button>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
      {again && (
        <TextDialog title={t("askAgain")} label={t("messageToCustomer")} hint={t("askAgainHint")} busy={busy} onClose={() => setAgain(null)} onSave={async (message) => (await onAskAgain(again, message)) && setAgain(null)} />
      )}
      {cancelling && (
        <TextDialog title={t("cancelRequest")} label={t("note")} hint={t("cancelRequestHint")} busy={busy} onClose={() => setCancelling(null)} onSave={async (note) => (await onCancel(cancelling, note)) && setCancelling(null)} />
      )}
    </div>
  );
}

function TextDialog({ title, label, hint, busy, onClose, onSave }) {
  const { t } = useTranslation("cases");
  const [text, setText] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t("cancel")}</Button>
          <Button disabled={!text.trim()} loading={busy} onClick={() => onSave(text.trim())}>{t("save")}</Button>
        </>
      }
    >
      {hint && <p className="mb-3 text-sm text-muted-foreground">{hint}</p>}
      <label className={labelClass}>
        {label} <span className="text-red-500">*</span>
        <textarea value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} className={areaClass} />
      </label>
    </Modal>
  );
}

const blankRequest = () => ({ kind: "FIELDS", fields: [], sections: [], document: "", message: "", due_days: 30 });

// "Request information": one or more requests (up to 20) in one call. Fields
// and sections come from the customer's form (the subject's details call);
// FIELDS only lists single-row sections, a multi-row one is asked as a
// whole SECTION.
export function RequestDialog({ api, referenceId, busy, onClose, onSave }) {
  const { t } = useTranslation("cases");
  const [sections, setSections] = useState([]);
  const [items, setItems] = useState([blankRequest()]);

  useEffect(() => {
    let cancelled = false;
    api
      .get(referenceId)
      .then((r) => {
        const w = Array.isArray(r?.data) ? r.data[0] : r?.data;
        if (!cancelled) setSections(w?.sections ?? []);
      })
      .catch((error) => notifications.error(error.message));
    return () => {
      cancelled = true;
    };
  }, [api, referenceId]);

  const fieldOptions = useMemo(
    () =>
      sections
        .filter((s) => !s.multi_row)
        .flatMap((s) => (s.fields ?? []).map((f) => ({ value: f.key, label: `${s.heading ?? s.key} · ${f.label ?? f.name ?? f.key}` }))),
    [sections],
  );
  const sectionOptions = sections.map((s) => ({ value: s.key, label: s.heading ?? s.key }));

  const update = (i, patch) => setItems((list) => list.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const valid = (it) =>
    it.message.trim() &&
    (it.kind === "QUESTION" || (it.kind === "FIELDS" && it.fields.length) || (it.kind === "SECTION" && it.sections.length) || (it.kind === "DOCUMENT" && it.document.trim()));
  const ready = items.length > 0 && items.every(valid);

  const body = () =>
    items.map((it) => ({
      kind: it.kind,
      message: it.message.trim(),
      due_days: Math.min(365, Math.max(1, Number(it.due_days) || 30)),
      ...(it.kind === "FIELDS" ? { target: { fields: it.fields } } : {}),
      ...(it.kind === "SECTION" ? { target: { sections: it.sections } } : {}),
      ...(it.kind === "DOCUMENT" ? { target: { document: it.document.trim() } } : {}),
    }));

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={t("action_request")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t("cancel")}</Button>
          <Button disabled={!ready} loading={busy} onClick={() => onSave(body())}>{t("sendRequests", { count: items.length })}</Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-muted-foreground">{t("requestHint")}</p>
      <div className="grid gap-4">
        {items.map((it, i) => (
          <div key={i} className="rounded-2xl border border-border p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("requestN", { n: i + 1 })}</p>
              {items.length > 1 && (
                <button type="button" onClick={() => setItems((list) => list.filter((_, j) => j !== i))} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" aria-label={t("remove")}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <label className={labelClass}>
                {t("requestKind")}
                <FilterSelect className="mt-1.5" value={it.kind} onChange={(v) => update(i, { kind: v })} options={KINDS.map((k) => ({ value: k, label: t(`kind_${k}`) }))} />
              </label>
              <label className={labelClass}>
                {t("daysToAnswer")}
                <input type="number" min={1} max={365} value={it.due_days} onChange={(e) => update(i, { due_days: e.target.value })} className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" />
              </label>
            </div>
            {it.kind === "FIELDS" && (
              <KeyPicker label={t("fieldsToChange")} options={fieldOptions} value={it.fields} onChange={(fields) => update(i, { fields })} empty={t("loadingForm")} />
            )}
            {it.kind === "SECTION" && (
              <KeyPicker label={t("sectionsToAnswer")} options={sectionOptions} value={it.sections} onChange={(s) => update(i, { sections: s })} empty={t("loadingForm")} />
            )}
            {it.kind === "DOCUMENT" && (
              <label className={`${labelClass} mt-3 block`}>
                {t("documentToUpload")} <span className="text-red-500">*</span>
                <input value={it.document} onChange={(e) => update(i, { document: e.target.value })} placeholder={t("documentPlaceholder")} className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" />
                <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("documentHint")}</span>
              </label>
            )}
            <label className={`${labelClass} mt-3 block`}>
              {t("messageToCustomer")} <span className="text-red-500">*</span>
              <textarea value={it.message} maxLength={2000} onChange={(e) => update(i, { message: e.target.value })} className={areaClass} />
            </label>
          </div>
        ))}
        {items.length < 20 && (
          <Button variant="outline" size="sm" icon={Plus} onClick={() => setItems((list) => [...list, blankRequest()])} className="justify-self-start">
            {t("addAnotherRequest")}
          </Button>
        )}
      </div>
    </Modal>
  );
}

// A list of checkable keys (fields or sections).
function KeyPicker({ label, options, value, onChange, empty }) {
  const toggle = (key) => onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  return (
    <div className="mt-3">
      <p className={labelClass}>
        {label} <span className="text-red-500">*</span>
      </p>
      {options.length ? (
        <div className="mt-1.5 grid max-h-48 gap-1 overflow-y-auto rounded-xl border border-border p-2 sm:grid-cols-2">
          {options.map((o) => (
            <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-muted">
              <input type="checkbox" checked={value.includes(o.value)} onChange={() => toggle(o.value)} className="accent-[var(--primary)]" />
              <span className="truncate">{o.label}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="mt-1.5 text-xs text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
