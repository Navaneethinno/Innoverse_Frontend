import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CheckCircle2, Eye, MessageSquarePlus, MessageSquare, MinusCircle, Paperclip, RefreshCw, RotateCcw, Send, ShieldAlert, ShieldCheck, Unlock, UserPlus, X, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { Spinner } from "@/Components/Common/Spinner";
import { usePagePermission } from "@/Hooks/usePermission";
import { CustomerAccounts } from "@/Components/Finance/Accounts/accountShared";
import { StaffOnboardingWizard } from "@/Components/Epurse/Customers/StaffOnboardingWizard";
import { ScreeningDetailModal } from "@/Components/InnoAML/Shared/ScreeningDetail";
import { AdverseMediaBadge } from "@/Components/InnoAML/AdverseMedia/AdverseMedia";
import { onboardingCasesApi } from "@/Services/CaseManagement/onboardingCases.api";
import { corpCustomerOnboardingApi, corpMerchantOnboardingApi } from "@/Services/Epurse/corporateCustomerOnboarding.api";
import { customerOnboardingApi, merchantOnboardingApi } from "@/Services/Epurse/customerOnboarding.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { AmlPill, isApproval, outcomeWord, CaseStatus, OverdueFlag, PriorityFlag, ReasonChips, RiskPill, caseDate, subjectKind } from "./caseShared";
import { AmlProposeDialog, AssignDialog, CloseCaseDialog, DecideDialog, NoteDialog, ProposeDialog } from "./CaseDialogs";
import { RequestDialog, RequestsTab } from "./CaseRequests";
import { useLiveChannel } from "@/Hooks/useLiveChannel";

const TABS = ["overview", "customer", "requests", "risk", "aml", "timeline", "account"];
// An AML case is about an active customer: the conversation with them
// instead of onboarding requests.
const AML_TABS = ["overview", "conversation", "risk", "aml", "timeline", "account"];

// Who closed a case: the staff user, or the customer (withdrawn) or the
// system (the onboarding decision).
const closedBy = (t, kase) => kase.closed_by_user?.name ?? (kase.closed_by ? t(`closedBy_${kase.closed_by}`, { defaultValue: kase.closed_by }) : "");

// The staff onboarding calls for the case's subject (customer or merchant,
// individual or corporate).
const subjectApi = (subject) =>
  subject?.party === "MERCHANT"
    ? subject?.ownership === "CORPORATE" ? corpMerchantOnboardingApi : merchantOnboardingApi
    : subject?.ownership === "CORPORATE" ? corpCustomerOnboardingApi : customerOnboardingApi;

// One onboarding case: header (number, status, priority, reasons, assignee
// and the buttons `actions` allows, gated by the menu's permissions) and
// the Overview / Customer / Risk / AML / Timeline / Account tabs. Every
// action replies with the whole case, which replaces what is shown.
export function CaseView({ id, config, onBack }) {
  const { t } = useTranslation(["cases", "common"]);
  const api = config?.api ?? onboardingCasesApi;
  const aml = config?.kind === "aml";
  // AML and support (Customer Cases) cases: a conversation with an active customer.
  const conversational = aml || config?.kind === "support";
  const can = usePagePermission();
  const [kase, setKase] = useState(null);
  const [tab, setTab] = useState("overview");
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      setKase(rowsOf(await api.get({ id }))[0] ?? null);
    } catch (error) {
      notifications.error(error.message);
    }
  }, [api, id]);
  useEffect(() => {
    void reload();
  }, [reload]);
  // The open record: reload when the push names it, or names nothing.
  useLiveChannel(api.listPath, (_action, records) => (!records.length || records.some((r) => String(r.id) === String(id))) && void reload());

  // Runs an action with the case's updated_time; a 409 (someone else acted)
  // reloads the case.
  const act = async (verb, body = {}) => {
    setBusy(true);
    try {
      const response = await api[verb]({ id, expected_updated_time: kase?.updated_time, ...body });
      setKase(rowsOf(response)[0] ?? kase);
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      return true;
    } catch (error) {
      notifications.error(error.message);
      if (/updated|conflict|409/i.test(error.message)) void reload();
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (!kase) {
    return (
      <div className="flex items-center gap-2 pt-10 text-sm text-muted-foreground">
        <Spinner size={16} /> {t("loadingCase")}
      </div>
    );
  }

  const allowed = kase.actions ?? {};
  const openRequests = (kase.requests ?? []).filter((r) => r.status === "OPEN" || r.status === "RESPONDED").length;
  const edit = can("Edit");
  const authorize = can("Authorize");
  const buttons = [
    allowed.assign && edit && { key: "assign", icon: UserPlus, variant: "secondary", run: () => setDialog("assign") },
    allowed.note && edit && { key: "note", icon: MessageSquare, variant: "secondary", run: () => setDialog("note") },
    allowed.message && edit && { key: "message", icon: Send, variant: "secondary", run: () => setDialog("message") },
    allowed.close && edit && { key: "closeCase", icon: CheckCircle2, variant: "primary", run: () => setDialog("close") },
    allowed.propose_close && edit && { key: "proposeClose", icon: ShieldAlert, variant: "danger", run: () => setDialog("amlPropose") },
    allowed.propose_cleared && edit && { key: "proposeCleared", icon: CheckCircle2, variant: "primary", run: () => setDialog("amlPropose") },
    allowed.request && edit && { key: "request", icon: MessageSquarePlus, variant: "secondary", run: () => setDialog("request") },
    allowed.rescreen && edit && { key: "rescreen", icon: RefreshCw, variant: "secondary", run: () => void act("rescreen", { what: [] }) },
    allowed.propose_reject && edit && { key: "proposeReject", icon: XCircle, variant: "danger", run: () => setDialog("reject") },
    allowed.propose_approve && edit && { key: "proposeApprove", icon: CheckCircle2, variant: "primary", run: () => setDialog("approve") },
    (allowed.confirm || allowed.return) && authorize && { key: "decide", icon: ShieldCheck, variant: "primary", run: () => setDialog("decide") },
    allowed.reopen && edit && { key: "reopen", icon: RotateCcw, variant: "secondary", run: () => setDialog("reopen") },
    allowed.release && authorize && { key: "release", icon: Unlock, variant: "secondary", run: () => setDialog("release") },
  ].filter(Boolean);

  return (
    <div className="pb-8 pt-4">
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft size={15} /> {t("backToQueue")}
      </button>

      <div className={cn("mb-4 rounded-2xl border bg-card p-4", kase.priority === "HIGH" ? "border-red-300" : "border-border")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-xl font-black text-foreground">{kase.case_number}</h1>
              <CaseStatus status={kase.status} outcome={kase.outcome} />
              <PriorityFlag priority={kase.priority} />
              <OverdueFlag overdue={kase.overdue} />
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {kase.subject?.name || t("noNameYet")}
              <span className="ml-2 text-xs font-medium text-muted-foreground">{subjectKind(t, kase.subject)}{kase.subject?.customer_type ? ` · ${kase.subject.customer_type}` : ""}</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("openedOn", { date: caseDate(kase.opened_at) })}
              {kase.due_at && kase.status !== "CLOSED" ? <span className={kase.overdue ? "font-bold text-red-700" : ""}> · {t("dueOn", { date: caseDate(kase.due_at) })}</span> : null} · {t("assignee")}: {kase.assigned_to?.name ?? t("unassigned")}
              {kase.inst_profile_name ? ` · ${kase.inst_profile_name}` : ""}
            </p>
            <ReasonChips reasons={kase.reasons} className="mt-2" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {buttons.map((b) => (
              <Button key={b.key} variant={b.variant} size="sm" icon={b.icon} disabled={busy} onClick={b.run}>
                {t(`action_${b.key}`)}
              </Button>
            ))}
          </div>
        </div>
        {conversational && kase.title && <p className="mt-2 text-xs text-muted-foreground">{t("caseTitle")}: <span className="font-semibold text-foreground">{kase.title}</span></p>}
        {kase.proposal && <ProposalBanner proposal={kase.proposal} closed={kase.status === "CLOSED"} />}
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-border">
        {(conversational ? AML_TABS : TABS).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn("shrink-0 border-b-2 px-3 py-2 text-sm font-bold", tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {t(`tab_${key}`)}
            {key === "requests" && openRequests > 0 && <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 text-[10px] text-white">{openRequests}</span>}
            {key === "aml" && kase.aml_open_matches > 0 && <span className="ml-1.5 rounded-full bg-red-600 px-1.5 text-[10px] text-white">{kase.aml_open_matches}</span>}
          </button>
        ))}
      </div>

      {tab === "overview" && (conversational ? <AmlOverviewTab kase={kase} /> : <OverviewTab kase={kase} />)}
      {tab === "conversation" && (
        <ConversationTab caseId={kase.id} api={api} events={kase.timeline} canMessage={allowed.message && edit} busy={busy} onSend={(body, files) => act("message", { body, ...(files.length ? { files } : {}) })} />
      )}
      {tab === "customer" && <StaffOnboardingWizard kind={kase.subject?.ownership === "CORPORATE" ? "corporate" : "individual"} api={subjectApi(kase.subject)} referenceId={kase.subject?.reference_id} forceReadOnly onClose={() => setTab("overview")} />}
      {tab === "requests" && (
        <RequestsTab
          requests={kase.requests}
          canEdit={edit}
          api={subjectApi(kase.subject)}
          referenceId={kase.subject?.reference_id}
          busy={busy}
          onAccept={(r) => act("requestReview", { request_id: r.id, accept: true })}
          onAskAgain={(r, message) => act("requestReview", { request_id: r.id, accept: false, message })}
          onCancel={(r, note) => act("requestCancel", { request_id: r.id, note })}
        />
      )}
      {tab === "risk" && <RiskTab assessment={kase.risk_assessment} />}
      {tab === "aml" && <AmlTab result={kase.aml_result} media={kase.adverse_media} openMatches={kase.aml_open_matches} onChanged={reload} />}
      {tab === "timeline" && <TimelineTab events={kase.timeline} canNote={allowed.note && edit} onNote={(body) => act("note", { body })} busy={busy} fileOf={api.file ? (f) => <CaseFile key={f.path} file={f} caseId={kase.id} api={api} light /> : null} />}
      {tab === "account" && (kase.accounts?.length ? <CustomerAccounts accounts={kase.accounts} /> : <Empty text={t("noAccountYet")} />)}

      {dialog === "request" && (
        <RequestDialog
          api={subjectApi(kase.subject)}
          referenceId={kase.subject?.reference_id}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={async (requests) => (await act("request", { requests })) && setTab("requests")}
        />
      )}
      {dialog === "assign" && <AssignDialog kase={kase} busy={busy} onClose={() => setDialog(null)} onSave={(userId) => act("assign", { user_id: userId })} />}
      {dialog === "note" && <NoteDialog title={t("action_note")} busy={busy} onClose={() => setDialog(null)} onSave={(body) => act("note", { body })} />}
      {(dialog === "approve" || dialog === "reject") && (
        <ProposeDialog outcome={dialog === "approve" ? "APPROVE" : "REJECT"} openMatches={kase.aml_open_matches} busy={busy} onClose={() => setDialog(null)} onSave={(body) => act("propose", body)} />
      )}
      {dialog === "decide" && <DecideDialog proposal={kase.proposal} busy={busy} onClose={() => setDialog(null)} onSave={(body) => act("decide", body)} canConfirm={allowed.confirm} canReturn={allowed.return} />}
      {dialog === "message" && <NoteDialog title={t("action_message")} hint={t("messageHint")} label={t("messageToCustomer")} busy={busy} onClose={() => setDialog(null)} onSave={(body) => act("message", { body })} />}
      {dialog === "close" && <CloseCaseDialog busy={busy} onClose={() => setDialog(null)} onSave={(body) => act("close", body)} />}
      {dialog === "amlPropose" && (
        <AmlProposeDialog allowCleared={allowed.propose_cleared} allowClose={allowed.propose_close} openMatches={kase.aml_open_matches} busy={busy} onClose={() => setDialog(null)} onSave={(body) => act("propose", body)} />
      )}
      {(dialog === "reopen" || dialog === "release") && (
        <NoteDialog title={t(`action_${dialog}`)} hint={t(`${dialog}Hint`)} busy={busy} onClose={() => setDialog(null)} onSave={(note) => act(dialog, { note })} />
      )}
    </div>
  );
}

function Empty({ text }) {
  return <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{text}</p>;
}

const goodOutcome = (outcome) => isApproval(outcome) || outcome === "CLEARED";

function ProposalBanner({ proposal, closed }) {
  const { t } = useTranslation("cases");
  const approve = goodOutcome(proposal.outcome);
  const neutral = proposal.outcome === "NO_ACTION";
  const Icon = neutral ? MinusCircle : approve ? CheckCircle2 : XCircle;
  return (
    <div
      className={cn(
        "mt-3 flex gap-3 rounded-xl border border-l-4 p-3 text-sm",
        neutral ? "border-border border-l-slate-400 bg-muted/50" : approve ? "border-emerald-300 border-l-emerald-500 bg-emerald-50 text-emerald-900" : "border-red-300 border-l-red-500 bg-red-50 text-red-900",
      )}
    >
      <Icon size={18} className={cn("mt-0.5 shrink-0", neutral ? "text-muted-foreground" : approve ? "text-emerald-600" : "text-red-600")} />
      <div className="min-w-0">
        <p className="font-bold">
          {t(closed ? "decisionTaken" : "proposalWaiting", { outcome: outcomeWord(t, proposal.outcome), name: proposal.proposed_by?.name ?? "—", date: caseDate(proposal.proposed_at) })}
        </p>
        {proposal.restriction && <p className="mt-1 text-xs"><span className="font-semibold">{t("restriction")}:</span> {t(`restriction_${proposal.restriction}`, { defaultValue: proposal.restriction })}</p>}
        {proposal.reason && <p className="mt-1 text-xs"><span className="font-semibold">{t("reason")}:</span> {proposal.reason}</p>}
        {proposal.customer_message && <p className="mt-0.5 text-xs"><span className="font-semibold">{t("customerMessage")}:</span> {proposal.customer_message}</p>}
      </div>
    </div>
  );
}

// Snapshot card: KYC level, risk and AML side by side.
function SnapshotRow({ title, snap }) {
  const { t } = useTranslation("cases");
  if (!snap) return null;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile label={t("kycLevel")}>{snap.kyc_level != null ? t("levelN", { n: snap.kyc_level }) : "—"}</Tile>
        <Tile label={t("risk")}>
          <RiskPill risk={snap.risk} />
          {snap.risk?.action?.risk_action_name && <p className="mt-1 text-[11px] text-muted-foreground">{t("actionIs", { name: snap.risk.action.risk_action_name, outcome: snap.risk.action.onboarding_outcome ?? "—" })}</p>}
        </Tile>
        <Tile label={t("aml")}>
          <AmlPill aml={snap.aml} />
          {snap.aml?.blacklisted && (
            <p className="mt-1 text-[11px] font-bold text-destructive">
              {t("onBlacklist")}
              {snap.aml.blacklist_action && ` · ${t(`blacklistAction_${snap.aml.blacklist_action}`, { defaultValue: snap.aml.blacklist_action })}`}
            </p>
          )}
          {snap.aml?.action?.risk_action_code && <p className="mt-1 text-[11px] text-muted-foreground">{t("actionIs", { name: snap.aml.action.risk_action_name ?? snap.aml.action.risk_action_code, outcome: snap.aml.action.onboarding_outcome ?? "—" })}</p>}
        </Tile>
      </div>
      {snap.reasons?.length > 0 && <ReasonChips reasons={snap.reasons} className="mt-3" />}
      {snap.eligibility?.length > 0 && (
        <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200">
          <p className="mb-1 font-bold">{t("eligibilityMissed")}</p>
          <ul className="list-disc pl-4">
            {snap.eligibility.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Tile({ label, children }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="text-sm font-semibold text-foreground">{children}</div>
    </div>
  );
}

function OverviewTab({ kase }) {
  const { t } = useTranslation("cases");
  const latest = kase.latest_snapshot ?? { kyc_level: kase.kyc_level, risk: kase.risk, aml: kase.aml };
  return (
    <div className="grid gap-4">
      <SnapshotRow title={t("latestResults")} snap={latest} />
      <SnapshotRow title={t("whatOpenedCase")} snap={kase.decision_snapshot} />
      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-3">
        <Tile label={t("contact")}>
          <p>{kase.subject?.email || "—"}</p>
          <p className="text-xs text-muted-foreground">{kase.subject?.phone_number || "—"}</p>
        </Tile>
        <Tile label={t("onboardingReference")}>
          <p className="break-all font-mono text-xs">{kase.subject?.reference_id ?? "—"}</p>
        </Tile>
        <Tile label={t("closed")}>
          {kase.closed_at ? (
            <>
              <p>{caseDate(kase.closed_at)}</p>
              <p className="text-xs text-muted-foreground">{closedBy(t, kase)}{kase.released ? ` · ${t("contactReleased")}` : ""}</p>
            </>
          ) : (
            "—"
          )}
        </Tile>
      </div>
    </div>
  );
}

function RiskTab({ assessment }) {
  const { t } = useTranslation("cases");
  if (!assessment || !Object.keys(assessment).length) return <Empty text={t("noRiskAssessment")} />;
  const points = assessment.points ?? [];
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <RiskPill risk={assessment} />
        {assessment.risk_action_code && <span className="text-xs text-muted-foreground">{t("riskAction")}: <span className="font-semibold text-foreground">{assessment.risk_action_code}</span></span>}
        <span className="text-xs text-muted-foreground">{t("assessedAt", { date: caseDate(assessment.assessed_at) })}</span>
      </div>
      {points.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="pb-2 pr-3">{t("criterion")}</th>
                <th className="pb-2 pr-3">{t("answer")}</th>
                <th className="pb-2 text-right">{t("points")}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p, i) => (
                <tr key={p.criterion_id ?? p.id ?? i} className="border-t border-border">
                  <td className="py-2 pr-3 font-semibold">{p.criterion_name ?? p.name ?? p.criterion ?? p.field_key ?? "—"}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{p.value_label ?? p.answer ?? p.value ?? "—"}</td>
                  <td className="py-2 text-right font-bold tabular-nums">{p.points ?? p.score ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("noPoints")}</p>
      )}
    </div>
  );
}

function AmlTab({ result, media, openMatches, onChanged }) {
  const { t } = useTranslation("cases");
  const [screeningId, setScreeningId] = useState(null);
  if (!result || !Object.keys(result).length) {
    return media ? (
      <div className="grid gap-3">
        <AdverseMediaBadge media={media} />
        <Empty text={t("noAmlResult")} />
      </div>
    ) : (
      <Empty text={t("noAmlResult")} />
    );
  }
  const screenings = result.screenings ?? [];
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <AmlPill aml={{ status: result.status, score: result.score, band_name: result.band?.name ?? result.band_name, band_code: result.band?.code ?? result.band_code }} />
        {openMatches > 0 ? (
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">{t("openMatches", { count: openMatches })}</span>
        ) : (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">{t("noOpenMatches")}</span>
        )}
        <span className="ml-auto">
          <AdverseMediaBadge media={media} />
        </span>
      </div>
      {screenings.length ? (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {screenings.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span className="text-sm font-semibold">{[s.name, s.party_role].filter(Boolean).join(" · ") || "—"}</span>
              <span className="flex items-center gap-2 text-xs">
                <AmlPill aml={{ score: s.score ?? s.effective_score, band_name: s.band?.name ?? s.band_name, band_code: s.band?.code ?? s.band_code }} />
                <span className="text-muted-foreground">{t("matchCount", { count: s.match_count ?? 0 })}</span>
                <button type="button" onClick={() => setScreeningId(s.id)} title={t("reviewMatches")} className="rounded-lg p-1.5 text-primary hover:bg-muted">
                  <Eye size={14} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">{t("noScreenings")}</p>
      )}
      {screeningId && <ScreeningDetailModal id={screeningId} onClose={() => setScreeningId(null)} onChanged={onChanged} />}
    </div>
  );
}

function TimelineTab({ events, canNote, onNote, busy, fileOf }) {
  const { t } = useTranslation("cases");
  const [note, setNote] = useState("");
  const list = [...(events ?? [])].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return (
    <div className="grid gap-4">
      {canNote && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <textarea value={note} maxLength={4000} onChange={(e) => setNote(e.target.value)} placeholder={t("notePlaceholder")} className="min-h-20 w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary" />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">{note.length}/4000</span>
            <Button size="sm" icon={MessageSquare} disabled={!note.trim()} loading={busy} onClick={async () => (await onNote(note.trim())) && setNote("")}>
              {t("addNote")}
            </Button>
          </div>
        </div>
      )}
      {list.length ? (
        <ol className="relative ml-2 border-l border-border pl-5">
          {list.map((e) => (
            <li key={e.id} className="relative mb-4">
              <span className={cn("absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-card", e.visibility === "CUSTOMER" ? "bg-amber-500" : "bg-primary")} />
              <p className="text-xs font-bold text-foreground">
                {t(`event_${e.event}`, { defaultValue: e.event })}
                {e.visibility === "CUSTOMER" && <span className="ml-2 rounded-full bg-amber-50 px-1.5 text-[10px] text-amber-700">{t("toCustomer")}</span>}
              </p>
              <p className="text-[11px] text-muted-foreground">{caseDate(e.at)}{e.actor?.name || typeof e.actor === "string" ? ` · ${e.actor?.name ?? e.actor}` : ""}</p>
              {e.body && <p dir="auto" className="mt-1 whitespace-pre-wrap rounded-lg bg-muted/40 p-2 text-xs text-foreground">{e.body}</p>}
              {fileOf && Array.isArray(e.data?.files) && e.data.files.length > 0 && <div className="mt-1 flex flex-wrap gap-1.5">{e.data.files.map(fileOf)}</div>}
              {e.data?.outcome && <p className="mt-1 text-xs text-muted-foreground">{t("outcomeIs", { outcome: t(`outcome_${e.data.outcome}`, { defaultValue: e.data.outcome }) })}</p>}
            </li>
          ))}
        </ol>
      ) : (
        <Empty text={t("noEvents")} />
      )}
    </div>
  );
}

// An AML case's overview: who, why the case opened, and when each side
// last wrote.
function AmlOverviewTab({ kase }) {
  const { t } = useTranslation("cases");
  return (
    <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-3">
      <Tile label={t("contact")}>
        <p>{kase.subject?.email || "—"}</p>
        <p className="text-xs text-muted-foreground">{kase.subject?.phone_number || "—"}</p>
      </Tile>
      <Tile label={t("customerReference")}>
        <p className="break-all font-mono text-xs">{kase.subject?.reference_id ?? "—"}</p>
        <p className="text-xs text-muted-foreground">{kase.subject?.status_name ?? ""}</p>
      </Tile>
      {kase.category ? (
        <Tile label={t("category")}>{t(`category_${kase.category}`, { defaultValue: kase.category })}</Tile>
      ) : (
        <Tile label={t("screeningRun")}>
          <p className="break-all font-mono text-xs">{kase.screening_run_id ?? "—"}</p>
        </Tile>
      )}
      <Tile label={t("lastStaff")}>{kase.last_staff_at ? caseDate(kase.last_staff_at) : "—"}</Tile>
      <Tile label={t("lastCustomer")}>{kase.last_customer_at ? caseDate(kase.last_customer_at) : "—"}</Tile>
      <Tile label={t("closed")}>{kase.closed_at ? `${caseDate(kase.closed_at)} · ${closedBy(t, kase)}` : "—"}</Tile>
    </div>
  );
}

const MAX_FILES = 5;
const MAX_BYTES = 5 * 1024 * 1024;

// A file on the conversation: downloaded with the case's own file call.
function CaseFile({ file, caseId, api, light = false }) {
  const [busy, setBusy] = useState(false);
  const open = async () => {
    setBusy(true);
    try {
      const blob = await api.file({ id: caseId, path: file.path });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" onClick={() => void open()} className={cn("inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold", light ? "border-border bg-card hover:border-primary" : "border-primary/30 bg-primary/5 hover:bg-primary/10")}>
      {busy ? <Spinner size={11} /> : <Paperclip size={11} className="shrink-0" />}
      <span className="truncate">{file.name || file.path?.split("/").pop()}</span>
    </button>
  );
}

// What the customer sees (events marked CUSTOMER), as a conversation: the
// customer's posts (actor CUSTOMER) on one side, staff on the other, with
// their files; and a box to write to them, with up to 5 files. Internal
// events stay on the Timeline.
function ConversationTab({ caseId, api, events, canMessage, busy, onSend }) {
  const { t } = useTranslation("cases");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState([]); // [{ key, name, path?, uploading, error? }]
  const picker = useRef(null);
  const messages = [...(events ?? [])].filter((e) => e.visibility === "CUSTOMER").sort((a, b) => String(a.at).localeCompare(String(b.at)));
  const ready = files.filter((f) => f.path);
  const uploading = files.some((f) => f.uploading);

  const pick = async (list) => {
    const room = MAX_FILES - files.length;
    if (list.length > room) notifications.error(t("tooManyFiles", { max: MAX_FILES }));
    for (const file of [...list].slice(0, Math.max(0, room))) {
      const key = `${file.name}-${file.size}-${Math.random()}`;
      if (file.size > MAX_BYTES) {
        setFiles((all) => [...all, { key, name: file.name, error: t("fileTooBig") }]);
        continue;
      }
      setFiles((all) => [...all, { key, name: file.name, uploading: true }]);
      try {
        const stored = await api.upload({ id: caseId, file });
        setFiles((all) => all.map((f) => (f.key === key ? { ...f, uploading: false, path: stored.path, name: stored.name ?? f.name } : f)));
      } catch (error) {
        setFiles((all) => all.map((f) => (f.key === key ? { ...f, uploading: false, error: error.message } : f)));
      }
    }
  };
  const send = async () => {
    const ok = await onSend(body.trim(), ready.map(({ path, name }) => ({ path, name })));
    if (ok) {
      setBody("");
      setFiles([]);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        {messages.length ? (
          <ol className="space-y-3">
            {messages.map((e) => {
              const fromCustomer = e.actor === "CUSTOMER";
              const attached = Array.isArray(e.data?.files) ? e.data.files : [];
              return (
                <li key={e.id} className={cn("flex", fromCustomer ? "justify-start" : "justify-end")}>
                  <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm", fromCustomer ? "rounded-bl-sm bg-muted" : "rounded-br-sm bg-primary/10")}>
                    {e.body && <p dir="auto" className="whitespace-pre-wrap">{e.body}</p>}
                    {attached.length > 0 && (
                      <div className={cn("flex flex-wrap gap-1.5", e.body && "mt-2")}>
                        {attached.map((f) => (
                          <CaseFile key={f.path} file={f} caseId={caseId} api={api} light={fromCustomer} />
                        ))}
                      </div>
                    )}
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {fromCustomer ? t("theCustomer") : t(`event_${e.event}`, { defaultValue: e.event })} · {caseDate(e.at)}
                      {!fromCustomer && e.actor ? ` · ${e.actor?.name ?? e.actor}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("noConversation")}</p>
        )}
      </div>
      {canMessage && (
        <div className="rounded-2xl border border-border bg-card p-3">
          {files.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-1.5">
              {files.map((f) => (
                <li key={f.key} className={cn("flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs", f.error ? "border-red-300 text-red-600" : "border-border")}>
                  {f.uploading ? <Spinner size={11} /> : <Paperclip size={11} />}
                  <span className="max-w-40 truncate">{f.name}</span>
                  {f.error && <span className="text-[10px]">· {f.error}</span>}
                  <button type="button" aria-label={t("removeFile")} onClick={() => setFiles((all) => all.filter((x) => x.key !== f.key))} className="rounded p-0.5 hover:bg-muted">
                    <X size={11} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <textarea dir="auto" value={body} maxLength={4000} onChange={(e) => setBody(e.target.value)} placeholder={t("messagePlaceholder")} className="min-h-20 w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary" />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Button variant="secondary" size="sm" icon={Paperclip} disabled={files.length >= MAX_FILES} onClick={() => picker.current?.click()}>
                {t("attach")}
              </Button>
              <input
                ref={picker}
                type="file"
                multiple
                hidden
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={(e) => {
                  void pick(e.target.files ?? []);
                  e.target.value = "";
                }}
              />
              <span className="text-[11px] text-muted-foreground">{t("messageHint")}</span>
            </span>
            <Button size="sm" icon={Send} disabled={uploading || (!body.trim() && !ready.length)} loading={busy} onClick={() => void send()}>
              {t("send")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
