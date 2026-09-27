import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ChevronDown, History, Send } from "lucide-react";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { useMenuPermission } from "@/Hooks/usePermission";
import { amlLookupApi, amlReviewApi, amlScreeningApi } from "@/Services/InnoAML/aml.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { AdjustmentChips, EffectiveResult, EntityRecord, ReviewStateBadge, scoreTone, when } from "./amlShared";

const first = (response) => rowsOf(response)[0] ?? (Array.isArray(response?.data) ? null : response?.data) ?? null;
const MAX_COMMENT = 2000;

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

// Every step of a match's reviews for its party, oldest first.
function ReviewHistory({ matchId, onClose }) {
  const { t } = useTranslation("aml");
  const [steps, setSteps] = useState(null);
  useEffect(() => {
    amlReviewApi
      .history({ match_id: matchId })
      .then((r) => setSteps(rowsOf(r)))
      .catch((error) => {
        notifications.error(error.message);
        setSteps([]);
      });
  }, [matchId]);
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
  return (
    <li className="rounded-xl border p-3">
      <div className="flex flex-wrap items-start gap-3">
        <span className={`w-10 shrink-0 text-2xl font-black tabular-nums ${scoreTone(match.score)}`}>{match.score}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-700">{match.matched_name}</p>
          <p className="text-[11px] text-muted-foreground">
            {[match.list, match.category, match.entity_type].filter(Boolean).join(" · ")} · {t("nameScore", { score: match.name_score })}
          </p>
          <div className="mt-1">
            <AdjustmentChips adjustments={match.adjustments} />
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
          <div className="grid gap-2 rounded-lg border border-dashed p-2 sm:grid-cols-[12rem_1fr]">
            <FilterSelect
              size="sm"
              disabled={waiting}
              disabledReason={t("decisionWaiting")}
              value={draft?.decision ?? ""}
              onChange={(v) => onDraft({ ...draft, decision: v })}
              options={[
                { value: "", label: t("noDecision") },
                { value: "FALSE_POSITIVE", label: t("review_FALSE_POSITIVE") },
                { value: "TRUE_MATCH", label: t("review_TRUE_MATCH") },
              ]}
            />
            <input
              value={draft?.comment ?? ""}
              disabled={waiting || !draft?.decision}
              maxLength={MAX_COMMENT}
              onChange={(e) => onDraft({ ...draft, comment: e.target.value })}
              placeholder={t("commentRequired")}
              className="rounded-lg border px-2.5 py-1.5 text-xs disabled:bg-muted"
            />
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
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);
  const failed = screening.status === "ERROR";
  const matches = screening.matches ?? [];
  const reviewing = canPropose && !failed && matches.length > 0;
  const decisions = Object.entries(drafts)
    .filter(([, d]) => d?.decision)
    .map(([matchId, d]) => ({ match_id: Number(matchId), decision: d.decision, comment: (d.comment ?? "").trim() }));

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
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-base font-black text-slate-800">{screening.name ?? subject.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {[screening.party_role, screening.trigger && t(`trigger_${screening.trigger}`), screening.screened_by, when(screening.screened_at)].filter(Boolean).join(" · ")}
          </p>
        </div>
        <EffectiveResult row={screening} />
      </div>

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
        <Fact label={t("searched")}>{screening.searched}</Fact>
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

      {reviewing && (
        <div className="flex items-center justify-end gap-2">
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
