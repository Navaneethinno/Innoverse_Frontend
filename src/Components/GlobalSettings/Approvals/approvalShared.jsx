import { createContext, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Circle, Clock, X } from "lucide-react";
import { Modal } from "@/Components/Common/Modal";
import { approvalApi } from "@/Services/GlobalSettings/approval.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";

// A waiting record's `approval` (multi-level approval): which level, how
// many approvals of how many, who it waits for, and whether the signed-in
// user may approve it now.

// The route of the list a table shows (its path without /list), for the
// timeline of a row's approval. ListTable provides it.
export const ApprovalRouteContext = createContext(null);
export const useApprovalRoute = () => useContext(ApprovalRouteContext);

// "Level 1 of 2 · 1 of 2 approved · waiting for BankA3"
export function approvalText(t, a) {
  if (!a) return "";
  const parts = [];
  if (Number(a.levels) > 1) parts.push(t("approvalLevel", { level: a.level, levels: a.levels }));
  parts.push(t("approvalCount", { approved: a.approved ?? 0, required: a.required ?? 1 }));
  if (a.waiting_for?.length) parts.push(t("approvalWaitingFor", { names: a.waiting_for.join(", ") }));
  return parts.join(" · ");
}

const STEP_STYLE = {
  DONE: { icon: Check, ring: "border-emerald-500 bg-emerald-500 text-white" },
  OPEN: { icon: Clock, ring: "border-primary bg-[var(--primary-light)] text-primary" },
  WAITING: { icon: Circle, ring: "border-border bg-card text-muted-foreground" },
  CLOSED: { icon: X, ring: "border-slate-300 bg-muted text-muted-foreground" },
};

// The policy's levels, left to right: DONE, OPEN, WAITING or CLOSED.
export function ApprovalSteps({ steps }) {
  const { t } = useTranslation("common");
  if (!steps?.length) return null;
  return (
    <ol className="flex flex-wrap items-start gap-2">
      {steps.map((s, i) => {
        const style = STEP_STYLE[s.state] ?? STEP_STYLE.WAITING;
        const Icon = style.icon;
        return (
          <li key={s.level ?? i} className="flex min-w-[180px] flex-1 items-start gap-2 rounded-xl border border-border bg-card p-2.5">
            <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border", style.ring)}>
              <Icon size={12} />
            </span>
            <div className="min-w-0 text-xs">
              <p className="font-bold text-slate-800">
                {t("approvalLevelShort", { level: s.level ?? i + 1 })}
                {s.name ? ` · ${s.name}` : ""}
              </p>
              <p className="text-muted-foreground">{t(`approvalStep_${s.state}`, { defaultValue: s.state })} · {t("approvalCount", { approved: s.approved ?? 0, required: s.required ?? 1 })}</p>
              {s.approvers?.length > 0 && <p className="mt-0.5 [overflow-wrap:anywhere] text-[11px] text-muted-foreground">{s.approvers.join(", ")}</p>}
              {s.approved_by?.length > 0 && <p className="mt-0.5 text-[11px] font-semibold text-emerald-700">{t("approvalApprovedBy", { names: s.approved_by.join(", ") })}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const when = (at) => (at ? new Date(at).toLocaleString() : "");

// One submission's events, newest last, as a vertical timeline.
function Events({ events }) {
  const { t } = useTranslation("common");
  return (
    <ol className="relative ml-2 border-l border-border pl-5">
      {(events ?? []).map((e, i) => (
        <li key={i} className="relative pb-4 last:pb-0">
          <span className={cn("absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-card", e.event === "REJECTED" || e.event === "EXPIRED" ? "bg-red-500" : e.event === "FINAL_APPROVED" || e.event === "APPROVED" ? "bg-emerald-500" : "bg-primary")} />
          <p className="text-xs font-bold text-slate-800">
            {t(`approvalEvent_${e.event}`, { defaultValue: e.event })}
            {e.level != null && <span className="font-normal text-muted-foreground"> · {t("approvalLevelShort", { level: e.level })}</span>}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {[e.user, e.profile, e.on_behalf_of && t("approvalOnBehalfOf", { name: e.on_behalf_of }), e.channel, when(e.at)].filter(Boolean).join(" · ")}
          </p>
          {e.data?.approval != null && <p className="text-[11px] text-muted-foreground">{t("approvalCount", { approved: e.data.approval, required: e.data.of })}</p>}
          {e.narration && <p className="mt-0.5 text-xs text-slate-700">“{e.narration}”</p>}
        </li>
      ))}
    </ol>
  );
}

// A record's approvals: one entry per submission, newest first, each with
// its levels above its events.
export function ApprovalTimeline({ route, recordId, title, onClose }) {
  const { t } = useTranslation("common");
  const [entries, setEntries] = useState(null);
  useEffect(() => {
    let live = true;
    approvalApi
      .timeline({ route, record_id: recordId })
      .then((r) => live && setEntries(rowsOf(r)))
      .catch((e) => {
        if (!live) return;
        setEntries([]);
        notifications.error(e.message);
      });
    return () => {
      live = false;
    };
  }, [route, recordId]);
  return (
    <Modal open size="lg" onClose={onClose} title={title ?? t("approvalTimeline")}>
      {entries === null ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : !entries.length ? (
        <p className="text-sm text-muted-foreground">{t("approvalNoTimeline")}</p>
      ) : (
        <div className="grid gap-6">
          {entries.map((entry, i) => (
            <section key={entry.chain_id ?? i} className={cn("grid gap-3", i > 0 && "border-t border-border pt-5 opacity-80")}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-bold text-slate-800">
                  {t(`approvalState_${entry.state}`, { defaultValue: entry.state })}
                  {entry.action ? ` · ${entry.action}` : ""}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {[entry.maker && t("approvalMaker", { name: entry.maker }), entry.policy_version != null && t("approvalPolicyVersion", { version: entry.policy_version }), when(entry.opened_at)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <ApprovalSteps steps={entry.steps} />
              <Events events={entry.events} />
            </section>
          ))}
        </div>
      )}
    </Modal>
  );
}
