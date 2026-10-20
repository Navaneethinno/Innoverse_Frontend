import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { useAuth } from "@/Hooks/useAuth";
import { usersApi } from "@/Services/UserManagement/users.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { caseDate, isApproval, outcomeWord } from "./caseShared";

const areaClass = "mt-1.5 min-h-24 w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary";
const labelClass = "text-sm font-semibold text-slate-700";

// Assign the case to a user (or unassign). The server checks the user is
// active and in the case's institution or yours. You aren't listed among the
// users; "Assign to me" covers that.
export function AssignDialog({ kase, busy, onClose, onSave }) {
  const { t } = useTranslation("cases");
  const me = useAuth((s) => s.user);
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState(kase.assigned_to?.id ? String(kase.assigned_to.id) : "");

  useEffect(() => {
    usersApi
      .getActive()
      .then((r) => setUsers(rowsOf(r).map((u) => ({ value: String(u.id ?? u.user_id), label: u.username ?? u.user_name ?? u.name ?? String(u.id) }))))
      .catch(() => setUsers([]));
  }, []);

  return (
    <Modal
      open
      onClose={onClose}
      title={t("action_assign")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t("cancel")}</Button>
          {kase.assigned_to && <Button variant="secondary" loading={busy} onClick={() => onSave(0)}>{t("unassign")}</Button>}
          <Button disabled={!userId} loading={busy} onClick={() => onSave(Number(userId))}>{t("assign")}</Button>
        </>
      }
    >
      <label className={labelClass}>
        {t("assignTo")}
        <FilterSelect className="mt-1.5" value={userId} onChange={setUserId} options={[{ value: "", label: t("chooseUser") }, ...users.filter((u) => u.value !== String(me?.id) || u.value === userId)]} />
      </label>
      {me?.id && String(me.id) !== userId && (
        <button type="button" onClick={() => setUserId(String(me.id))} className="mt-2 text-xs font-bold text-primary hover:underline">
          {t("assignToMe")}
        </button>
      )}
    </Modal>
  );
}

// A note on the case; reopen and release take one too.
export function NoteDialog({ title, hint, label, busy, onClose, onSave }) {
  const { t } = useTranslation("cases");
  const [body, setBody] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t("cancel")}</Button>
          <Button disabled={!body.trim()} loading={busy} onClick={() => onSave(body.trim())}>{t("save")}</Button>
        </>
      }
    >
      {hint && <p className="mb-3 text-sm text-muted-foreground">{hint}</p>}
      <label className={labelClass}>
        {label ?? t("note")}
        <textarea value={body} maxLength={4000} onChange={(e) => setBody(e.target.value)} className={areaClass} />
      </label>
    </Modal>
  );
}

// Propose approving or rejecting; a second user confirms it (a System user's
// is carried out at once). Approval is refused while AML matches are open.
export function ProposeDialog({ outcome, openMatches, busy, onClose, onSave }) {
  const { t } = useTranslation("cases");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const reject = outcome === "REJECT";
  return (
    <Modal
      open
      onClose={onClose}
      title={t(reject ? "action_proposeReject" : "action_proposeApprove")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t("cancel")}</Button>
          <Button
            variant={reject ? "danger" : "primary"}
            disabled={!reason.trim() || (reject && !message.trim())}
            loading={busy}
            onClick={() => onSave({ outcome, reason: reason.trim(), ...(reject ? { customer_message: message.trim() } : {}) })}
          >
            {t("propose")}
          </Button>
        </>
      }
    >
      {!reject && openMatches > 0 && (
        <p className="mb-3 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
          <AlertTriangle size={14} /> {t("openMatchesBlock", { count: openMatches })}
        </p>
      )}
      <p className="mb-3 text-sm text-muted-foreground">{t("proposeHint")}</p>
      <label className={labelClass}>
        {t("reason")} <span className="text-red-500">*</span>
        <textarea value={reason} maxLength={4000} onChange={(e) => setReason(e.target.value)} className={areaClass} />
      </label>
      {reject && (
        <label className={`${labelClass} mt-4 block`}>
          {t("customerMessage")} <span className="text-red-500">*</span>
          <textarea value={message} maxLength={4000} onChange={(e) => setMessage(e.target.value)} className={areaClass} placeholder={t("customerMessagePlaceholder")} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("customerMessageHint")}</span>
        </label>
      )}
    </Modal>
  );
}

// The checker's view of a proposal: Confirm or Return, with a note.
// Returning a proposal needs a note (every case type).
export function DecideDialog({ proposal, canConfirm, canReturn, busy, onClose, onSave }) {
  const { t } = useTranslation("cases");
  const [note, setNote] = useState("");
  const approve = isApproval(proposal?.outcome) || proposal?.outcome === "CLEARED" || proposal?.outcome === "NO_ACTION";
  const amlOutcome = /^(CLEARED|CONFIRMED|NO_ACTION)$/.test(proposal?.outcome ?? "");
  return (
    <Modal
      open
      onClose={onClose}
      title={t("action_decide")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t("cancel")}</Button>
          {canReturn && <Button variant="secondary" loading={busy} disabled={!note.trim()} onClick={() => onSave({ confirm: false, note: note.trim() })}>{t("returnProposal")}</Button>}
          {canConfirm && (
            <Button variant={approve ? "primary" : "danger"} loading={busy} onClick={() => onSave({ confirm: true, note: note.trim() })}>
              {amlOutcome ? t("confirmOutcome", { outcome: outcomeWord(t, proposal.outcome) }) : t(approve ? "confirmApprove" : "confirmReject")}
            </Button>
          )}
        </>
      }
    >
      {proposal && (
        <div className="mb-4 rounded-xl border border-border p-3 text-sm">
          <p className="font-bold">{t("proposalWaiting", { outcome: outcomeWord(t, proposal.outcome), name: proposal.proposed_by?.name ?? "—", date: caseDate(proposal.proposed_at) })}</p>
          {proposal.restriction && <p className="mt-1 text-xs"><span className="font-semibold">{t("restriction")}:</span> {t(`restriction_${proposal.restriction}`, { defaultValue: proposal.restriction })}</p>}
          {proposal.reason && <p className="mt-1 text-xs"><span className="font-semibold">{t("reason")}:</span> {proposal.reason}</p>}
          {proposal.customer_message && <p className="mt-0.5 text-xs"><span className="font-semibold">{t("customerMessage")}:</span> {proposal.customer_message}</p>}
        </div>
      )}
      <label className={labelClass}>
        {t("note")}
        <textarea value={note} maxLength={4000} onChange={(e) => setNote(e.target.value)} className={areaClass} />
      </label>
    </Modal>
  );
}

export const RESTRICTIONS = ["NONE", "BLOCK_OUTGOING", "SUSPEND"];

// Close an AML case, for a second user to confirm (a System user's applies
// at once): CLEARED (only once every match is decided in Match Review),
// CONFIRMED (the customer is restricted; empty = the AML setup's most, a
// lighter one may be chosen) or NO_ACTION. The customer message is optional
// and must stay neutral.
export function AmlProposeDialog({ allowCleared, allowClose, openMatches, busy, onClose, onSave }) {
  const { t } = useTranslation("cases");
  const outcomes = [...(allowCleared ? ["CLEARED"] : []), ...(allowClose ? ["CONFIRMED", "NO_ACTION"] : [])];
  const [outcome, setOutcome] = useState(outcomes[0] ?? "");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [restriction, setRestriction] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      title={t("action_proposeClose")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t("cancel")}</Button>
          <Button
            variant={outcome === "CONFIRMED" ? "danger" : "primary"}
            disabled={!outcome || !reason.trim()}
            loading={busy}
            onClick={() =>
              onSave({
                outcome,
                reason: reason.trim(),
                ...(message.trim() ? { customer_message: message.trim() } : {}),
                ...(outcome === "CONFIRMED" && restriction ? { restriction } : {}),
              })
            }
          >
            {t("propose")}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-2 sm:grid-cols-3">
          {["CLEARED", "CONFIRMED", "NO_ACTION"].map((o) => (
            <button
              key={o}
              type="button"
              disabled={!outcomes.includes(o)}
              onClick={() => setOutcome(o)}
              className={`rounded-xl border p-2.5 text-left text-xs disabled:opacity-40 ${outcome === o ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"}`}
            >
              <span className="block font-bold">{t(`outcome_${o}`)}</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">{t(`outcomeHint_${o}`)}</span>
            </button>
          ))}
        </div>
        {outcome === "CLEARED" && openMatches > 0 && (
          <p className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
            <AlertTriangle size={14} /> {t("openMatchesBlock", { count: openMatches })}
          </p>
        )}
        {outcome === "CONFIRMED" && (
          <label className={labelClass}>
            {t("restriction")}
            <FilterSelect
              className="mt-1.5"
              value={restriction}
              onChange={setRestriction}
              options={[{ value: "", label: t("restrictionSetupDefault") }, ...RESTRICTIONS.map((r) => ({ value: r, label: t(`restriction_${r}`) }))]}
            />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("restrictionHint")}</span>
          </label>
        )}
        <label className={labelClass}>
          {t("reason")} <span className="text-red-500">*</span>
          <textarea value={reason} maxLength={4000} onChange={(e) => setReason(e.target.value)} className={areaClass} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("reasonInternal")}</span>
        </label>
        <label className={labelClass}>
          {t("customerMessage")}
          <textarea value={message} maxLength={4000} onChange={(e) => setMessage(e.target.value)} className={areaClass} placeholder={t("customerMessagePlaceholder")} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("amlCustomerMessageHint")}</span>
        </label>
      </div>
    </Modal>
  );
}

// Close a support case in one step (no checker): an internal reason and an
// optional message the customer sees.
export function CloseCaseDialog({ busy, onClose, onSave }) {
  const { t } = useTranslation("cases");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      title={t("action_closeCase")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t("cancel")}</Button>
          <Button disabled={!reason.trim()} loading={busy} onClick={() => onSave({ reason: reason.trim(), ...(message.trim() ? { customer_message: message.trim() } : {}) })}>
            {t("action_closeCase")}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <p className="text-sm text-muted-foreground">{t("closeCaseHint")}</p>
        <label className={labelClass}>
          {t("reason")} <span className="text-red-500">*</span>
          <textarea value={reason} maxLength={4000} onChange={(e) => setReason(e.target.value)} className={areaClass} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("reasonInternal")}</span>
        </label>
        <label className={labelClass}>
          {t("customerMessage")}
          <textarea dir="auto" value={message} maxLength={4000} onChange={(e) => setMessage(e.target.value)} className={areaClass} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("closeMessageHint")}</span>
        </label>
      </div>
    </Modal>
  );
}
