import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CheckCircle2, Eye, MessageSquarePlus, MessageSquare, RefreshCw, RotateCcw, ShieldCheck, Unlock, UserPlus, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { Spinner } from "@/Components/Common/Spinner";
import { usePagePermission } from "@/Hooks/usePermission";
import { CustomerAccounts } from "@/Components/Epurse/Accounts/accountShared";
import { StaffOnboardingWizard } from "@/Components/Epurse/Onboarding/OnboardingWizard/StaffOnboardingWizard";
import { ScreeningDetailModal } from "@/Components/InnoAML/Shared/ScreeningDetail";
import { onboardingCasesApi } from "@/Services/CaseManagement/onboardingCases.api";
import { corpCustomerOnboardingApi, corpMerchantOnboardingApi } from "@/Services/Epurse/corporateCustomerOnboarding.api";
import { customerOnboardingApi, merchantOnboardingApi } from "@/Services/Epurse/customerOnboarding.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { AmlPill, isApproval, CaseStatus, OverdueFlag, PriorityFlag, ReasonChips, RiskPill, caseDate, subjectKind } from "./caseShared";
import { AssignDialog, DecideDialog, NoteDialog, ProposeDialog } from "./CaseDialogs";
import { RequestDialog, RequestsTab } from "./CaseRequests";

const TABS = ["overview", "customer", "requests", "risk", "aml", "timeline", "account"];

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
export function CaseView({ id, onBack }) {
  const { t } = useTranslation(["cases", "common"]);
  const can = usePagePermission();
  const [kase, setKase] = useState(null);
  const [tab, setTab] = useState("overview");
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      setKase(rowsOf(await onboardingCasesApi.get({ id }))[0] ?? null);
    } catch (error) {
      notifications.error(error.message);
    }
  }, [id]);
  useEffect(() => {
    void reload();
  }, [reload]);

  // Runs an action with the case's updated_time; a 409 (someone else acted)
  // reloads the case.
  const act = async (verb, body = {}) => {
    setBusy(true);
    try {
      const response = await onboardingCasesApi[verb]({ id, expected_updated_time: kase?.updated_time, ...body });
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
        {kase.proposal && <ProposalBanner proposal={kase.proposal} closed={kase.status === "CLOSED"} />}
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((key) => (
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

      {tab === "overview" && <OverviewTab kase={kase} />}
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
      {tab === "aml" && <AmlTab result={kase.aml_result} openMatches={kase.aml_open_matches} onChanged={reload} />}
      {tab === "timeline" && <TimelineTab events={kase.timeline} canNote={allowed.note && edit} onNote={(body) => act("note", { body })} busy={busy} />}
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
      {(dialog === "reopen" || dialog === "release") && (
        <NoteDialog title={t(`action_${dialog}`)} hint={t(`${dialog}Hint`)} busy={busy} onClose={() => setDialog(null)} onSave={(note) => act(dialog, { note })} />
      )}
    </div>
  );
}

function Empty({ text }) {
  return <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{text}</p>;
}

function ProposalBanner({ proposal, closed }) {
  const { t } = useTranslation("cases");
  const approve = isApproval(proposal.outcome);
  const Icon = approve ? CheckCircle2 : XCircle;
  return (
    <div
      className={cn(
        "mt-3 flex gap-3 rounded-xl border border-l-4 p-3 text-sm",
        approve ? "border-emerald-300 border-l-emerald-500 bg-emerald-50 text-emerald-900" : "border-red-300 border-l-red-500 bg-red-50 text-red-900",
      )}
    >
      <Icon size={18} className={cn("mt-0.5 shrink-0", approve ? "text-emerald-600" : "text-red-600")} />
      <div className="min-w-0">
        <p className="font-bold">
          {t(closed ? "decisionTaken" : "proposalWaiting", { outcome: t(approve ? "approve" : "reject"), name: proposal.proposed_by?.name ?? "—", date: caseDate(proposal.proposed_at) })}
        </p>
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
          {snap.aml?.action?.risk_action_code && <p className="mt-1 text-[11px] text-muted-foreground">{t("actionIs", { name: snap.aml.action.risk_action_name ?? snap.aml.action.risk_action_code, outcome: snap.aml.action.onboarding_outcome ?? "—" })}</p>}
        </Tile>
      </div>
      {snap.reasons?.length > 0 && <ReasonChips reasons={snap.reasons} className="mt-3" />}
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
              <p className="text-xs text-muted-foreground">{kase.closed_by?.name ?? ""}{kase.released ? ` · ${t("contactReleased")}` : ""}</p>
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

function AmlTab({ result, openMatches, onChanged }) {
  const { t } = useTranslation("cases");
  const [screeningId, setScreeningId] = useState(null);
  if (!result || !Object.keys(result).length) return <Empty text={t("noAmlResult")} />;
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

function TimelineTab({ events, canNote, onNote, busy }) {
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
              {e.body && <p className="mt-1 whitespace-pre-wrap rounded-lg bg-muted/40 p-2 text-xs text-foreground">{e.body}</p>}
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
