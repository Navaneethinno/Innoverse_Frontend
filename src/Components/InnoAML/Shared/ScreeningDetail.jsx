import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Ban, BriefcaseBusiness, ChevronDown, History, Send } from "lucide-react";
import { DateInput } from "@/Components/Common/DateInput";
import { Modal } from "@/Components/Common/Modal";
import { RaiseCaseDialog } from "@/Components/CaseManagement/AmlCases/RaiseCaseDialog";
import { Spinner } from "@/Components/Common/Spinner";
import { useMenuPermission } from "@/Hooks/usePermission";
import { amlLookupApi, amlReviewApi, amlScreeningApi } from "@/Services/InnoAML/aml.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { formatDay } from "@/Utils/Lib/dateFormat";
import { AdjustmentChips, AlsoOnChips, EffectiveResult, EntityRecord, NameText, ReviewStateBadge, ViaTag, WeightNote, blacklistByIdentifier, matchScore, when } from "./amlShared";

const first = (response) => rowsOf(response)[0] ?? (Array.isArray(response?.data) ? null : response?.data) ?? null;
const MAX_COMMENT = 2000;
const tomorrow = () => new Date(Date.now() + 864e5).toISOString().slice(0, 10);

// "innoverse_aml_list_os_peps_v35" -> "OS_PEPS": the list, not its index.
const listCode = (index) => String(index).replace(/^innoverse_aml_list_/, "").replace(/_v\d+$/, "").toUpperCase();

// A score as a ring, coloured like the match tone.
function ScoreRing({ score, size = 52, colour }) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  const r = 20;
  const c = 2 * Math.PI * r;
  const stroke = colour ?? (value >= 85 ? "#dc2626" : value >= 60 ? "#d97706" : "#059669");
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 48 48" width={size} height={size} className="-rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      </svg>
      <span className="absolute text-sm font-black tabular-nums" style={{ color: stroke }}>
        {Math.round(value)}
      </span>
    </span>
  );
}

// One labelled value in the subject strip.
function Fact({ label, children }) {
  if (children == null || children === "" || (Array.isArray(children) && !children.length)) return null;
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase text-muted-foreground">{label}</dt>
      <dd className="text-xs font-semibold text-slate-700">{Array.isArray(children) ? children.join(", ") : children}</dd>
    </div>
  );
}

// Every step of a match's reviews for its party, oldest first. `load`:
// another menu's history call (the Whitelist's), Match Review's otherwise.
export function ReviewHistory({ matchId, onClose, load = amlReviewApi.history }) {
  const { t } = useTranslation("aml");
  const [steps, setSteps] = useState(null);
  useEffect(() => {
    load({ match_id: matchId })
      .then((r) => setSteps(rowsOf(r)))
      .catch((error) => {
        notifications.error(error.message);
        setSteps([]);
      });
  }, [matchId, load]);
  return (
    <Modal open onClose={onClose} size="md" title={t("reviewHistory")}>
      {!steps ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : steps.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">{t("noReviewsYet")}</p>
      ) : (
        <ol className="space-y-2">
          {steps.map((s, i) => (
            <li key={i} className="rounded-xl border p-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold">{t(`action_${s.action}`, { defaultValue: s.action })}</span>
                <ReviewStateBadge state={s.decision} />
                <span className="text-muted-foreground">
                  {s.actor} · {when(s.at)}
                </span>
              </div>
              {s.note && <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{s.note}</p>}
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}

// The decision in force (or lapsed) and any proposal waiting for a checker.
function ReviewSummary({ review }) {
  const { t } = useTranslation("aml");
  if (!review) return null;
  return (
    <div className="space-y-1 text-[11px]">
      {review.decision && (
        <p className="text-muted-foreground">
          <b className="text-slate-700">{t(`review_${review.decision}`)}</b>: {review.comment} — {review.proposed_by}
          {review.decided_by ? ` / ${review.decided_by}` : ""} {review.decided_at ? `· ${when(review.decided_at)}` : ""}
          {review.expires_on && (
            <span className={`ms-1 font-semibold ${review.state === "EXPIRED" ? "text-amber-700" : ""}`}>
              · {t(review.state === "EXPIRED" ? "expiredOn" : "expiresOn", { date: formatDay(review.expires_on) })}
            </span>
          )}
        </p>
      )}
      {review.evidence && (
        <p className="text-muted-foreground">
          <b className="text-slate-700">{t("evidence")}</b>: {review.evidence}
        </p>
      )}
      {review.pending && (
        <p className="rounded-lg bg-amber-50 px-2 py-1 text-amber-700">
          {t("waitingForChecker", { decision: t(`review_${review.pending.decision}`), by: review.pending.proposed_by })}: {review.pending.comment}
        </p>
      )}
    </div>
  );
}

function MatchCard({ match, draft, onDraft, reviewing }) {
  const { t } = useTranslation("aml");
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState(false);
  const waiting = Boolean(match.review?.pending) || match.review?.state === "PENDING";
  // Found on the blacklist by a shared phone, email or document: only a true
  // match can be recorded.
  const locked = blacklistByIdentifier(match);
  return (
    <li className="overflow-hidden rounded-xl border bg-card p-3" style={{ boxShadow: `inset 4px 0 0 ${matchScore(match) >= 85 ? "#dc2626" : matchScore(match) >= 60 ? "#d97706" : "#059669"}` }}>
      <div className="flex flex-wrap items-start gap-3 ps-1">
        <ScoreRing score={matchScore(match)} />
        <div className="min-w-0 flex-1">
          <NameText name={match.matched_name} latin={match.matched_name_latin} className="text-sm font-bold text-slate-800" />
          {match.entity?.name && match.entity.name !== match.matched_name && (
            <p className="text-[11px] text-muted-foreground">
              {t("listedAsLabel")} <span dir="auto">{match.entity.name}</span>
            </p>
          )}
          <p className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
            <span className="rounded-full bg-slate-800 px-2 py-0.5 font-mono font-bold text-white">{match.list}</span>
            {match.category && <span className="rounded-full bg-muted px-2 py-0.5 font-bold">{t(`category_${match.category}`, { defaultValue: match.category })}</span>}
            {match.entity_type && <span className="rounded-full bg-muted px-2 py-0.5 font-bold">{t(`entity_${match.entity_type}`, { defaultValue: match.entity_type })}</span>}
            <ViaTag via={match.matched_via} />
            <span className="text-muted-foreground">{t("nameScore", { score: match.name_score })}</span>
          </p>
          <WeightNote match={match} />
          <div className="mt-1 grid gap-1">
            <AdjustmentChips adjustments={match.adjustments} />
            <AlsoOnChips alsoOn={match.also_on} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ReviewStateBadge state={match.review?.state} />
          {match.id != null && (
            <button type="button" onClick={() => setHistory(true)} title={t("reviewHistory")} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
              <History size={14} />
            </button>
          )}
          <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex items-center gap-1 text-[11px] font-bold text-primary">
            {t("listedRecord")}
            <ChevronDown size={13} className={open ? "rotate-180" : ""} />
          </button>
        </div>
      </div>
      <div className="mt-2 space-y-2">
        <ReviewSummary review={match.review} />
        {open && <EntityRecord entity={match.entity} />}
        {reviewing && (
          <div className="grid gap-2 rounded-lg bg-muted/40 p-2">
            {waiting ? (
              <p className="text-[11px] font-semibold text-amber-700">{t("decisionWaiting")}</p>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground">{t("yourDecision")}</span>
                {[
                  ["FALSE_POSITIVE", "border-emerald-300 bg-emerald-50 text-emerald-800"],
                  ["TRUE_MATCH", "border-red-300 bg-red-50 text-red-800"],
                ].filter(([value]) => !(locked && value === "FALSE_POSITIVE")).map(([value, tone]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onDraft({ ...draft, decision: draft?.decision === value ? "" : value })}
                    className={`rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${draft?.decision === value ? tone : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
                  >
                    {t(`review_${value}`)}
                  </button>
                ))}
                {locked && <span className="text-[11px] font-semibold text-destructive">{t("identifierMatchNoFalsePositive")}</span>}
              </div>
            )}
            {draft?.decision && !waiting && (
              <input
                autoFocus
                value={draft?.comment ?? ""}
                maxLength={MAX_COMMENT}
                onChange={(e) => onDraft({ ...draft, comment: e.target.value })}
                placeholder={t("commentRequired")}
                className="rounded-lg border bg-card px-2.5 py-1.5 text-xs"
              />
            )}
            {draft?.decision === "FALSE_POSITIVE" && !waiting && (
              <div className="grid gap-2 sm:grid-cols-[1fr_12rem]">
                <input
                  value={draft?.evidence ?? ""}
                  maxLength={MAX_COMMENT}
                  onChange={(e) => onDraft({ ...draft, evidence: e.target.value })}
                  placeholder={t("evidenceOptional")}
                  className="rounded-lg border bg-card px-2.5 py-1.5 text-xs"
                />
                <DateInput
                  value={draft?.expires_on ?? ""}
                  min={tomorrow()}
                  onChange={(e) => onDraft({ ...draft, expires_on: e.target.value })}
                  placeholder={t("expiryDefault")}
                  title={t("expiryDefaultHint")}
                  className="rounded-lg border bg-card px-2.5 py-1.5 text-xs"
                />
              </div>
            )}
          </div>
        )}
      </div>
      {history && <ReviewHistory matchId={match.id} onClose={() => setHistory(false)} />}
    </li>
  );
}

// A screening or lookup (screening/get, lookup/get shape): what was
// screened, the lists searched and every match best first. With Add on
// Match Review, matches can be proposed as false positive / true match.
export function ScreeningDetail({ screening, onChange }) {
  const { t } = useTranslation("aml");
  const canPropose = useMenuPermission("Match Review")("Add");
  const canRaise = useMenuPermission("AML Cases")("Add");
  const [raising, setRaising] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);
  const failed = screening.status === "ERROR";
  const matches = screening.matches ?? [];
  const reviewing = canPropose && !failed && matches.length > 0;
  const decisions = Object.entries(drafts)
    .filter(([, d]) => d?.decision)
    .map(([matchId, d]) => ({
      match_id: Number(matchId),
      decision: d.decision,
      comment: (d.comment ?? "").trim(),
      // A false positive's evidence and expiry (empty = the setup's months).
      ...(d.decision === "FALSE_POSITIVE" ? { evidence: (d.evidence ?? "").trim(), expires_on: d.expires_on ?? "" } : {}),
    }));

  const propose = async () => {
    if (decisions.some((d) => !d.comment)) {
      notifications.error(t("commentRequired"));
      return;
    }
    setSaving(true);
    try {
      const response = await amlReviewApi.propose({ screening_id: screening.id, decisions });
      notifications.success(apiMessage(response, t("reviewSubmitted")));
      setDrafts({});
      onChange?.(first(response) ?? screening);
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const subject = screening.subject ?? {};
  const band = screening.effective_band ?? screening.band;
  const colour = band?.color_code || "#64748b";
  const score = screening.effective_score ?? screening.score;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4" style={{ borderColor: `${colour}66`, background: `linear-gradient(120deg, ${colour}1f, transparent 70%)` }}>
        <div className="min-w-0">
          <NameText name={screening.name ?? subject.name} latin={screening.subject_name_latin} className="text-lg font-black text-slate-800" />
          <p className="text-[11px] text-muted-foreground">
            {[screening.party_role, screening.trigger && t(`trigger_${screening.trigger}`, { defaultValue: screening.trigger }), screening.screened_by, when(screening.screened_at)].filter(Boolean).join(" · ")}
          </p>
          {/* A customer's screening (not a Name Lookup) can open an AML case. */}
          {canRaise && screening.reference_id && screening.customer_kind && screening.customer_kind !== "NONE" && (
            <button type="button" onClick={() => setRaising(true)} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1 text-xs font-bold text-primary hover:border-primary">
              <BriefcaseBusiness size={13} /> {t("raiseCase")}
            </button>
          )}
        </div>
        {failed ? (
          <EffectiveResult row={screening} />
        ) : (
          <div className="flex items-center gap-3">
            <div className="text-end">
              <p className="text-xl font-black leading-tight" style={{ color: colour }}>
                {band?.name ?? t("noSetup")}
              </p>
              <p className="text-[11px] font-semibold text-muted-foreground">
                {[band?.risk_action_name, t("matchCount", { count: matches.length })].filter(Boolean).join(" · ")}
              </p>
              {screening.effective_score != null && screening.score !== screening.effective_score && <p className="text-[10px] text-muted-foreground">{t("rawScore", { score: screening.score })}</p>}
            </div>
            <ScoreRing score={score} size={64} colour={colour} />
          </div>
        )}
      </div>

      {screening.blacklisted && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-[color-mix(in_srgb,var(--destructive)_10%,transparent)] p-3 text-sm font-bold text-destructive">
          <Ban size={16} className="shrink-0" />
          <span>
            {t("onBlacklist")}
            <span className="block text-[11px] font-semibold">{t("onBlacklistHint")}</span>
          </span>
        </div>
      )}

      {failed && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 p-3 text-sm text-destructive">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            {t("screeningFailedHint")} {screening.error}
          </span>
        </div>
      )}

      <dl className="grid gap-3 rounded-xl border p-3 sm:grid-cols-3">
        <Fact label={t("entityType")}>{subject.entity_type}</Fact>
        <Fact label={t("birthDate")}>{subject.birth_date}</Fact>
        <Fact label={t("countries")}>{subject.countries}</Fact>
        <Fact label={t("gender")}>{subject.gender}</Fact>
        <Fact label={t("altNames")}>{screening.alt_names}</Fact>
        <Fact label={t("minMatchScore")}>{screening.min_match_score}</Fact>
        {screening.searched?.length > 0 && (
          <div className="sm:col-span-3">
            <dt className="text-[10px] font-bold uppercase text-muted-foreground">{t("listsSearchedN", { count: screening.searched.length })}</dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {screening.searched.map((index) => (
                <span key={index} title={index} className="rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                  {listCode(index)}
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>

      {matches.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">{failed ? t("notRun") : t("noMatches")}</p>
      ) : (
        <ul className="space-y-2">
          {matches.map((m) => (
            <MatchCard key={m.id ?? m.entity_id} match={m} reviewing={reviewing} draft={drafts[m.id]} onDraft={(d) => setDrafts((all) => ({ ...all, [m.id]: d }))} />
          ))}
        </ul>
      )}

      {raising && <RaiseCaseDialog target={{ screening_id: screening.id }} subtitle={screening.name} onClose={() => setRaising(false)} onRaised={() => setRaising(false)} />}

      {reviewing && (
        <div className="sticky bottom-0 flex items-center justify-end gap-2 rounded-xl border bg-card/95 p-2 backdrop-blur">
          <span className="text-[11px] text-muted-foreground">{t("decisionsSelected", { count: decisions.length })}</span>
          <button
            type="button"
            disabled={saving || decisions.length === 0}
            onClick={() => void propose()}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {saving ? <Spinner size={13} /> : <Send size={14} />} {t("submitReview")}
          </button>
        </div>
      )}
    </div>
  );
}

// Loads one screening (or lookup) by id and shows it in a modal.
export function ScreeningDetailModal({ id, lookup = false, onClose, onChanged }) {
  const { t } = useTranslation("aml");
  const [screening, setScreening] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (lookup ? amlLookupApi : amlScreeningApi)
      .get({ id })
      .then((r) => !cancelled && setScreening(first(r)))
      .catch((error) => {
        notifications.error(error.message);
        if (!cancelled) onClose();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, lookup]);
  return (
    <Modal open onClose={onClose} size="xl" title={lookup ? t("lookupTitle") : t("screeningTitle")}>
      {!screening ? (
        <div className="flex justify-center py-10">
          <Spinner size={22} />
        </div>
      ) : (
        <ScreeningDetail
          screening={screening}
          onChange={(next) => {
            setScreening(next);
            onChanged?.(next);
          }}
        />
      )}
    </Modal>
  );
}
