import { createContext, useCallback, useContext, useEffect, useReducer, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ChevronDown, ExternalLink, Newspaper, Search, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { CountryMultiSelect } from "@/Components/Common/CountryMultiSelect";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { ListPanel } from "@/Components/Common/ListPanel";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { Spinner } from "@/Components/Common/Spinner";
import { NarrationDialog } from "@/Components/Finance/Deposits/depositShared";
import { InstitutionField, inputClass, labelClass } from "@/Components/GlobalSettings/Notifications/notificationShared";
import { useCountries } from "@/Hooks/Master/masterHooks";
import { useAuth } from "@/Hooks/useAuth";
import { useListSearch } from "@/Hooks/useListSearch";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { useMenuPermission } from "@/Hooks/usePermission";
import { amlMediaApi, amlMediaReviewApi, amlScreeningApi } from "@/Services/InnoAML/aml.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { formatDay, formatDateTime } from "@/Utils/Lib/dateFormat";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { glassCard, partyLabel, useInstitutionScope } from "../Shared/amlShared";

// AML > Adverse Media (handoff 20): news searched for a person or company on
// demand, judged article by article. Not part of the AML score. Search and
// view: Name Lookup's permission; reviewing articles: Match Review's.

const LEVEL_TONE = {
  NONE: { text: "text-emerald-700", bg: "bg-emerald-50", ring: "#059669" },
  LOW: { text: "text-sky-700", bg: "bg-sky-50", ring: "#0284c7" },
  MEDIUM: { text: "text-amber-700", bg: "bg-amber-50", ring: "#d97706" },
  HIGH: { text: "text-red-700", bg: "bg-red-50", ring: "#dc2626" },
};
const PHASES = ["planning", "searching", "reading", "analysing", "done"];
const HIGHLIGHT = {
  NAME: "font-bold text-foreground",
  CATEGORY: "rounded bg-red-100 px-0.5 text-red-800",
  STAGE: "rounded bg-amber-100 px-0.5 text-amber-900",
  MITIGATING: "rounded bg-emerald-100 px-0.5 text-emerald-800",
  VICTIM: "rounded bg-sky-100 px-0.5 text-sky-800",
  ROLE: "rounded bg-muted px-0.5 text-muted-foreground",
};
const flag = (code) => (/^[A-Z]{2}$/.test(code ?? "") ? String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "");
// Each site's icon comes from the backend (`icon` events, `icons` on get)
// as a data: URI; a site without one gets a letter avatar.
const IconsContext = createContext({});
function SiteIcon({ domain, className = "h-4 w-4" }) {
  const icons = useContext(IconsContext);
  const icon = icons[domain];
  if (icon) return <img src={icon} alt="" title={domain} className={cn(className, "shrink-0 rounded")} />;
  const hue = [...String(domain ?? "")].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  return (
    <span title={domain} className={cn(className, "inline-flex shrink-0 items-center justify-center rounded text-[9px] font-black uppercase text-white")} style={{ background: `hsl(${hue} 55% 45%)` }}>
      {String(domain ?? "?").charAt(0)}
    </span>
  );
}
const pct = (v) => `${Math.round(Number(v ?? 0) * 100)}%`;

// ------------------------------------------------------------ the stream --

const startLive = { phase: "planning", queries: [], candidates: null, cards: {}, order: [], stories: {}, icons: {}, score: { score: 0, level: "NONE" }, done: null };
const sameQuery = (a, b) => a.provider === b.provider && a.edition === b.edition && a.lang === b.lang && a.text === b.text;

function liveReducer(state, { kind, data }) {
  switch (kind) {
    case "reset":
      return startLive;
    case "plan":
      return { ...state, phase: "searching", queries: (data?.queries ?? []).map((q) => ({ ...q, state: "running" })) };
    case "query":
      return { ...state, queries: state.queries.some((q) => sameQuery(q, data)) ? state.queries.map((q) => (sameQuery(q, data) ? { ...q, ...data, state: data.error ? "error" : "done" } : q)) : [...state.queries, { ...data, state: data.error ? "error" : "done" }] };
    case "candidates":
      return { ...state, phase: "reading", candidates: data };
    case "reading":
      return { ...state, cards: { ...state.cards, [data.id]: { ...data, reading: true } }, order: state.order.includes(data.id) ? state.order : [...state.order, data.id] };
    case "article":
      return { ...state, phase: "analysing", cards: { ...state.cards, [data.id]: { ...data, no: data.id, reading: false } }, order: state.order.includes(data.id) ? state.order : [...state.order, data.id] };
    case "story":
      return { ...state, stories: { ...state.stories, [data.id]: data } };
    case "score":
      return { ...state, score: data };
    case "icon":
      return { ...state, icons: { ...state.icons, [data.domain]: data.icon } };
    case "done":
      return { ...state, phase: "done", done: data };
    default:
      return state;
  }
}

// Follows a search's events from the start until `done`.
function useLiveSearch(searchId, onDone) {
  const [live, dispatch] = useReducer(liveReducer, startLive);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!searchId) return undefined;
    const controller = new AbortController();
    dispatch({ kind: "reset" });
    setError("");
    amlMediaApi
      .follow(searchId, (kind, data) => dispatch({ kind, data }), controller.signal)
      .then(() => !controller.signal.aborted && onDone())
      .catch((e) => !controller.signal.aborted && setError(e.message));
    return () => controller.abort();
    // onDone is the caller's "load the result"; a new search starts over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchId]);
  return { live, error };
}

// ------------------------------------------------------------- pieces ----

function ScoreGauge({ score = 0, level = "NONE", size = 132 }) {
  const { t } = useTranslation("aml");
  const tone = LEVEL_TONE[level] ?? LEVEL_TONE.NONE;
  const r = 52;
  const half = Math.PI * r;
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg viewBox="0 0 120 68" width={size} height={size * 0.57} aria-hidden>
        <path d="M8 62 A52 52 0 0 1 112 62" fill="none" stroke="var(--border)" strokeWidth="10" strokeLinecap="round" />
        <path d="M8 62 A52 52 0 0 1 112 62" fill="none" stroke={tone.ring} strokeWidth="10" strokeLinecap="round" strokeDasharray={half} strokeDashoffset={half * (1 - value / 100)} style={{ transition: "stroke-dashoffset 600ms ease, stroke 300ms" }} />
      </svg>
      <span className="-mt-8 text-3xl font-black tabular-nums">{Math.round(value)}</span>
      <span className={cn("mt-1 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase", tone.bg, tone.text)}>{t(`mediaLevel_${level}`, { defaultValue: level })}</span>
    </div>
  );
}

function SubjectCard({ subject }) {
  const { t } = useTranslation("aml");
  if (!subject) return null;
  return (
    <div className="min-w-0">
      <p className="truncate text-lg font-black text-foreground">{subject.name}</p>
      <p className="text-xs text-muted-foreground">
        {[t(`entity_${subject.entity_type ?? "PERSON"}`), subject.birth_date && t("mediaBorn", { date: subject.birth_date })].filter(Boolean).join(" · ")}
      </p>
      {subject.countries?.length > 0 && (
        <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
          {subject.countries.map((c) => (
            <span key={c} className="rounded-full bg-muted px-2 py-0.5 font-semibold">
              {flag(c)} {c}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

function PhaseRail({ phase }) {
  const { t } = useTranslation("aml");
  const at = PHASES.indexOf(phase);
  return (
    <ol className="flex items-center gap-1 overflow-x-auto">
      {PHASES.map((p, i) => (
        <li key={p} className="flex shrink-0 items-center gap-1">
          <span className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold", i < at || phase === "done" ? "bg-primary/15 text-primary" : i === at ? "animate-pulse bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
            {(i < at || phase === "done") && <CheckCircle2 size={12} />}
            {t(`mediaPhase_${p}`)}
          </span>
          {i < PHASES.length - 1 && <span className={cn("h-0.5 w-4", i < at ? "bg-primary" : "bg-border")} />}
        </li>
      ))}
    </ol>
  );
}

function QueryChips({ queries }) {
  const { t } = useTranslation("aml");
  if (!queries.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {queries.map((q, i) => (
        <span key={i} title={q.text} className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold", q.state === "running" ? "animate-pulse border-primary/40 text-primary" : q.state === "error" ? "border-border bg-muted text-muted-foreground line-through" : "border-border bg-card")}>
          {t(`mediaProvider_${q.provider}`, { defaultValue: q.provider })} · {String(q.lang).toUpperCase()}
          <b className="tabular-nums">{q.state === "running" ? "…" : q.state === "error" ? t("mediaQueryFailed") : q.results}</b>
        </span>
      ))}
    </div>
  );
}

function Funnel({ steps }) {
  const { t } = useTranslation("aml");
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {steps.map(([key, value]) => (
        <div key={key} className="rounded-xl border border-border bg-card px-2 py-1.5 text-center">
          <p className="text-lg font-black tabular-nums">{value ?? "—"}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t(`mediaFunnel_${key}`)}</p>
        </div>
      ))}
    </div>
  );
}

// A sentence with its NAME / CATEGORY / STAGE / ... spans marked.
function Highlighted({ text, highlights }) {
  const { t } = useTranslation("aml");
  const parts = [];
  let at = 0;
  [...(highlights ?? [])]
    .sort((a, b) => a.start - b.start)
    .forEach((h, i) => {
      if (h.start < at) return;
      if (h.start > at) parts.push(<span key={`t${i}`}>{text.slice(at, h.start)}</span>);
      parts.push(
        <mark key={`h${i}`} title={h.code ? t(`mediaCode_${h.code}`, { defaultValue: h.code }) : undefined} className={cn("bg-transparent", HIGHLIGHT[h.kind])}>
          {text.slice(h.start, h.end)}
        </mark>,
      );
      at = h.end;
    });
  if (at < text.length) parts.push(<span key="end">{text.slice(at)}</span>);
  return <p className="text-xs leading-relaxed text-slate-700">{parts}</p>;
}

function Badges({ a }) {
  const { t } = useTranslation("aml");
  return (
    <span className="flex flex-wrap gap-1">
      {a.category && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">{t(`mediaCode_${a.category}`, { defaultValue: a.category })}</span>}
      {a.stage && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">{t(`mediaCode_${a.stage}`, { defaultValue: a.stage })}</span>}
      {["mitigated", "victim", "role", "headline_only"].filter((k) => a[k]).map((k) => (
        <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{t(`mediaFlag_${k}`)}</span>
      ))}
    </span>
  );
}

function Source({ a }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
      <SiteIcon domain={a.domain} />
      <span className="truncate">{a.source || a.domain}</span>
      {(a.published_at || a.published) && <span className="shrink-0">· {formatDay(a.published_at || a.published)}</span>}
    </span>
  );
}

// A card while the search runs: reading (shimmer), then judged.
function LiveCard({ card }) {
  if (card.reading) {
    return (
      <li className="animate-pulse rounded-xl border border-dashed border-border bg-muted/40 p-2.5">
        <Source a={card} />
        <p className="mt-1 line-clamp-2 text-xs font-semibold text-muted-foreground">{card.title}</p>
      </li>
    );
  }
  const adverse = card.verdict === "ADVERSE";
  return (
    <li className={cn("rounded-xl border p-2.5 transition-colors", adverse ? (card.score >= 50 ? "border-red-200 bg-red-50/60" : "border-amber-200 bg-amber-50/60") : "border-border bg-card")}>
      <div className="flex items-start justify-between gap-2">
        <Source a={card} />
        {adverse && <b className="text-xs tabular-nums text-red-700">{card.score}</b>}
      </div>
      <p className="mt-1 line-clamp-2 text-xs font-semibold">{card.title}</p>
      {adverse && (
        <div className="mt-1.5 grid gap-1.5">
          <Badges a={card} />
          {card.evidence?.[0] && <Highlighted text={card.evidence[0].text} highlights={card.evidence[0].highlights} />}
        </div>
      )}
    </li>
  );
}

function StoryHeader({ story }) {
  const { t } = useTranslation("aml");
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm font-bold">{story.headline}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="flex -space-x-1">
            {(story.sources ?? []).slice(0, 5).map((d) => (
              <SiteIcon key={d} domain={d} className="h-4 w-4 ring-2 ring-card" />
            ))}
          </span>
          {t("mediaSources", { count: story.sources?.length ?? 0 })}
          {story.first_seen && <span>· {story.first_seen === story.last_seen ? formatDay(story.first_seen) : `${formatDay(story.first_seen)} – ${formatDay(story.last_seen)}`}</span>}
        </p>
      </div>
      <span className="flex items-center gap-1.5">
        <Badges a={story} />
        <b className="text-sm tabular-nums">{story.score}</b>
      </span>
    </div>
  );
}

// ------------------------------------------------------------ live view --

function LiveView({ subject, live, error }) {
  const { t } = useTranslation("aml");
  const cards = live.order.map((no) => live.cards[no]).filter((c) => c && c.verdict !== "NOT_SUBJECT");
  const ruledOut = live.order.filter((no) => live.cards[no]?.verdict === "NOT_SUBJECT").length;
  const stories = Object.values(live.stories).sort((a, b) => b.score - a.score);
  const inStory = new Set(stories.flatMap((s) => s.articles ?? []));
  const judged = Object.values(live.cards).filter((c) => !c.reading).length;
  return (
    <IconsContext.Provider value={live.icons}>
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SubjectCard subject={subject} />
        <ScoreGauge score={live.score.score} level={live.score.level} />
      </div>
      <PhaseRail phase={live.phase} />
      <QueryChips queries={live.queries} />
      <Funnel steps={[["found", live.candidates?.found], ["unique", live.candidates?.unique], ["read", live.candidates ? `${judged}/${live.candidates.reading}` : null], ["about", live.score.about_subject], ["adverse", live.score.adverse]]} />
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
      <div className="grid gap-3">
        {stories.map((s) => (
          <section key={s.id} className="rounded-2xl border border-border p-3">
            <StoryHeader story={s} />
            <ul className="mt-2 grid gap-2 md:grid-cols-2">
              {(s.articles ?? []).map((no) => live.cards[no]).filter(Boolean).map((c) => <LiveCard key={c.id} card={c} />)}
            </ul>
          </section>
        ))}
        <ul className="grid gap-2 md:grid-cols-2">
          {cards.filter((c) => !inStory.has(c.id)).map((c) => <LiveCard key={c.id} card={c} />)}
        </ul>
        {ruledOut > 0 && <p className="text-[11px] text-muted-foreground">{t("mediaRuledOutN", { count: ruledOut })}</p>}
      </div>
    </div>
    </IconsContext.Provider>
  );
}

// ---------------------------------------------------------- result view --

const REVIEW_TONE = { OPEN: "bg-muted text-muted-foreground", PENDING: "bg-amber-50 text-amber-800", RELEVANT: "bg-red-50 text-red-700", NOT_RELEVANT: "bg-emerald-50 text-emerald-700" };

function ArticleCard({ a, selectable, selected, onSelect, onDecide }) {
  const { t } = useTranslation("aml");
  const [open, setOpen] = useState(false);
  const review = a.review ?? { state: "OPEN" };
  const waiting = review.state === "PENDING" ? { review_id: review.review_id, decision: review.decision, proposed_by: review.proposed_by } : review.pending;
  const adverse = a.verdict === "ADVERSE";
  return (
    <li className={cn("rounded-xl border p-3", a.verdict === "NOT_SUBJECT" ? "border-dashed opacity-70" : adverse ? "border-red-200" : "border-border")}>
      <div className="flex items-start gap-2">
        {selectable && <input type="checkbox" checked={selected} onChange={onSelect} aria-label={t("mediaSelectArticle")} className="mt-1 accent-[var(--primary)]" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Source a={a} />
            <span className="flex items-center gap-1.5">
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", REVIEW_TONE[review.state] ?? REVIEW_TONE.OPEN)}>{t(`mediaReview_${review.state}`, { defaultValue: review.state })}</span>
              {adverse && <b className="text-sm tabular-nums text-red-700">{a.score}</b>}
            </span>
          </div>
          <a href={a.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-start gap-1 text-sm font-semibold hover:text-primary">
            {a.title} <ExternalLink size={12} className="mt-1 shrink-0" />
          </a>
          <div className="mt-1.5">
            <Badges a={a} />
          </div>
          {a.evidence?.[0] ? <div className="mt-1.5"><Highlighted text={a.evidence[0].text} highlights={a.evidence[0].highlights} /></div> : a.excerpt && <p className="mt-1.5 text-xs text-muted-foreground">{a.excerpt}</p>}
          <button type="button" onClick={() => setOpen(!open)} className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-primary">
            {t("mediaWhy")} <ChevronDown size={12} className={open ? "rotate-180" : ""} />
          </button>
          {open && (
            <div className="mt-2 grid gap-2 rounded-xl bg-muted/40 p-2.5 text-xs">
              <p className="flex flex-wrap gap-x-4 gap-y-1">
                <span>{t("mediaIdentity")}: <b>{pct(a.identity)}</b> · {t(a.identity >= 0.8 ? "mediaIdStrong" : a.identity >= 0.6 ? "mediaIdProbable" : "mediaIdPossible")}</span>
                <span>{t("mediaCredibility")}: <b>{pct(a.credibility)}</b></span>
                <span>{t("mediaRecency")}: <b>{pct(a.recency)}</b></span>
              </p>
              <ul className="flex flex-wrap gap-1">
                {(a.signals ?? []).map((s, i) => (
                  <li key={i} className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", s.effect >= 0 && !["AGE_CONFLICT", "COUNTRY_OTHER", "OTHER_PERSON", "ALSO_OTHER_PERSON"].includes(s.code) ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                    {t(`mediaSignal_${s.code}`, { defaultValue: s.code })}
                    {s.detail ? ` · ${s.detail}` : ""}
                  </li>
                ))}
              </ul>
              {(a.evidence ?? []).slice(1).map((e, i) => <Highlighted key={i} text={e.text} highlights={e.highlights} />)}
              {review.comment && <p className="italic text-muted-foreground">“{review.comment}” · {review.proposed_by}</p>}
            </div>
          )}
          {waiting && onDecide && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900">
              <span className="font-semibold">{t("mediaWaiting", { decision: t(`mediaReview_${waiting.decision}`, { defaultValue: waiting.decision ?? "" }), name: waiting.proposed_by ?? "" })}</span>
              <span className="ml-auto flex gap-1.5">
                <Button size="sm" variant="danger" icon={XCircle} onClick={() => onDecide("deauth", waiting.review_id)}>{t("reject")}</Button>
                <Button size="sm" icon={CheckCircle2} onClick={() => onDecide("auth", waiting.review_id)}>{t("approve")}</Button>
              </span>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function ResultView({ search, onChange }) {
  const { t } = useTranslation("aml");
  const canPropose = useMenuPermission("Match Review")("Add");
  const canAuthorize = useMenuPermission("Match Review")("Authorize");
  const [picked, setPicked] = useState([]);
  const [decision, setDecision] = useState("NOT_RELEVANT");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [ruledOut, setRuledOut] = useState(false);

  const articles = search.articles ?? [];
  const byNo = Object.fromEntries(articles.map((a) => [a.no, a]));
  const stories = [...(search.stories ?? [])].sort((a, b) => b.score - a.score);
  const inStory = new Set(stories.flatMap((s) => s.articles ?? []));
  const loose = articles.filter((a) => !inStory.has(a.no));
  const timeline = articles.filter((a) => a.verdict === "ADVERSE" && a.published_at).sort((a, b) => String(a.published_at).localeCompare(String(b.published_at)));
  const categories = Object.entries(search.categories ?? {}).sort((a, b) => b[1] - a[1]);
  const stats = search.stats ?? {};
  const level = search.effective_level ?? search.level;
  const score = search.effective_score ?? search.score;

  const toggleRuledOut = async (on) => {
    setRuledOut(on);
    try {
      onChange(rowsOf(await amlMediaApi.get({ search_id: search.id, include_ruled_out: on }))[0] ?? search);
    } catch (e) {
      notifications.error(e.message);
    }
  };
  const run = async (fn) => {
    setBusy(true);
    try {
      const response = await fn();
      notifications.success(apiMessage(response, t("done")));
      onChange(rowsOf(response)[0] ?? search);
      return true;
    } catch (e) {
      notifications.error(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const propose = async () => {
    if (await run(() => amlMediaReviewApi.propose({ search_id: search.id, decisions: picked.map((article_id) => ({ article_id, decision, comment: comment.trim().slice(0, 2000) })) }))) {
      setPicked([]);
      setComment("");
    }
  };
  const selectable = canPropose && search.status === "DONE";
  const card = (a) => (
    <ArticleCard
      key={a.id}
      a={a}
      selectable={selectable}
      selected={picked.includes(a.id)}
      onSelect={() => setPicked((p) => (p.includes(a.id) ? p.filter((x) => x !== a.id) : [...p, a.id]))}
      onDecide={canAuthorize ? (verb, id) => setDialog({ verb, id }) : null}
    />
  );

  return (
    <IconsContext.Provider value={search.icons ?? {}}>
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SubjectCard subject={search.subject} />
        <div className="flex items-center gap-4">
          {search.effective_score != null && search.effective_score !== search.score && <p className="max-w-[12rem] text-[11px] text-muted-foreground">{t("mediaFoundBefore", { score: search.score, level: t(`mediaLevel_${search.level}`, { defaultValue: search.level }) })}</p>}
          <ScoreGauge score={score} level={level} />
        </div>
      </div>
      {search.status === "ERROR" && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{t("mediaFailed")}</p>}
      <Funnel steps={[["found", stats.found], ["unique", stats.unique], ["read", stats.read], ["about", stats.about_subject], ["adverse", stats.adverse]]} />
      <p className="text-[11px] text-muted-foreground">
        {[search.searched_by, formatDateTime(search.started_at), stats.took_ms && t("mediaTook", { seconds: Math.round(stats.took_ms / 1000) }), (stats.languages ?? []).join(", ").toUpperCase(), (stats.providers ?? []).map((p) => t(`mediaProvider_${p}`, { defaultValue: p })).join(", ")].filter(Boolean).join(" · ")}
      </p>

      {categories.length > 0 && (
        <section>
          <p className={labelClass}>{t("mediaCategories")}</p>
          <ul className="mt-2 grid gap-1.5">
            {categories.map(([c, v]) => (
              <li key={c} className="grid grid-cols-[9rem_1fr_2rem] items-center gap-2 text-xs">
                <span className="truncate font-semibold">{t(`mediaCode_${c}`, { defaultValue: c })}</span>
                <span className="h-2 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-red-500" style={{ width: `${Math.min(100, v)}%` }} />
                </span>
                <b className="text-right tabular-nums">{v}</b>
              </li>
            ))}
          </ul>
        </section>
      )}

      {timeline.length > 0 && (
        <section>
          <p className={labelClass}>{t("mediaTimeline")}</p>
          <ol className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {timeline.map((a) => (
              <li key={a.id} title={a.title} className="w-40 shrink-0 rounded-lg border border-red-200 bg-red-50/50 p-2 text-[11px]">
                <b>{formatDay(a.published_at)}</b>
                <p className="line-clamp-2 text-muted-foreground">{a.title}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {selectable && picked.length > 0 && (
        <div className="sticky top-0 z-10 flex flex-wrap items-end gap-2 rounded-xl border border-primary/30 bg-card p-2.5 shadow">
          <span className="text-xs font-bold">{t("mediaPickedN", { count: picked.length })}</span>
          <FilterSelect className="w-44" size="sm" value={decision} onChange={setDecision} options={["NOT_RELEVANT", "RELEVANT"].map((d) => ({ value: d, label: t(`mediaReview_${d}`) }))} />
          <input className="min-w-[12rem] flex-1 rounded-lg border border-border px-2.5 py-1.5 text-xs" placeholder={t("mediaComment")} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} />
          <Button size="sm" loading={busy} disabled={!comment.trim()} onClick={() => void propose()}>
            {t("mediaPropose")}
          </Button>
        </div>
      )}

      <div className="grid gap-3">
        {stories.map((s) => (
          <section key={s.id} className="rounded-2xl border border-border p-3">
            <StoryHeader story={s} />
            <ul className="mt-2 grid gap-2">{(s.articles ?? []).map((no) => byNo[no]).filter(Boolean).map(card)}</ul>
          </section>
        ))}
        {loose.length > 0 && (
          <section>
            <p className={labelClass}>{t("mediaOtherArticles")}</p>
            <ul className="mt-2 grid gap-2">{loose.map(card)}</ul>
          </section>
        )}
        {!articles.length && <p className="py-6 text-center text-sm text-muted-foreground">{t("mediaNothingFound")}</p>}
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={ruledOut} onChange={(e) => void toggleRuledOut(e.target.checked)} className="accent-[var(--primary)]" />
          {t("mediaShowRuledOut", { count: stats.not_subject ?? 0 })}
        </label>
      </div>

      {dialog && (
        <NarrationDialog
          title={t(dialog.verb === "auth" ? "mediaApproveTitle" : "mediaRejectTitle")}
          confirmLabel={t(dialog.verb === "auth" ? "approve" : "reject")}
          variant={dialog.verb === "auth" ? "primary" : "danger"}
          required={dialog.verb === "deauth"}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={async (narration) => (await run(() => amlMediaReviewApi[dialog.verb]({ id: dialog.id, ...(narration ? { narration } : {}) }))) && setDialog(null)}
        />
      )}
    </div>
    </IconsContext.Provider>
  );
}

// One search: live while it runs, then its result. A finished one opens on
// its result straight away.
export function MediaSearchView({ searchId, initial }) {
  const [search, setSearch] = useState(initial ?? null);
  const [loading, setLoading] = useState(!initial);
  const load = useCallback(async () => {
    try {
      setSearch(rowsOf(await amlMediaApi.get({ search_id: searchId }))[0] ?? null);
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [searchId]);
  useEffect(() => {
    if (!initial) void load();
  }, [initial, load]);
  const running = search && !["DONE", "ERROR"].includes(search.status);
  // A review decided elsewhere changes the effective score.
  useLiveChannel(amlMediaApi.listPath, (action, records) => !running && action === "review" && records?.some((r) => r.id === searchId) && void load(), { enabled: Boolean(search) });
  const { live, error } = useLiveSearch(running ? searchId : null, load);
  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size={20} />
      </div>
    );
  }
  if (!search) return null;
  return running ? <LiveView subject={search.subject} live={live} error={error} /> : <ResultView search={search} onChange={setSearch} />;
}

function LevelPill({ row }) {
  const { t } = useTranslation("aml");
  const level = row.effective_level ?? row.level;
  const tone = LEVEL_TONE[level];
  if (!tone || ["RUNNING", "ERROR"].includes(row.status)) return <span className="text-xs text-muted-foreground">{t(`mediaStatus_${row.status}`, { defaultValue: row.status })}</span>;
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-black", tone.bg, tone.text)}>
      {t(`mediaLevel_${level}`)} · {row.effective_score ?? row.score}
    </span>
  );
}

// ---------------------------------------------------- Name Lookup tab ----

const emptyForm = (inst) => ({ inst_profile_id: inst ?? "", name: "", entity_type: "PERSON", birth_date: "", countries: [], aliases: "", languages: [], reason: "" });

export function AdverseMediaLookup() {
  const { t } = useTranslation(["aml", "common"]);
  const can = useMenuPermission("Name Lookup");
  const scope = useInstitutionScope();
  const myInstitution = useAuth((state) => state.user?.inst_profile_id);
  const { countries } = useCountries();
  const [form, setForm] = useState(() => emptyForm(myInstitution));
  const [starting, setStarting] = useState(false);
  const [current, setCurrent] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [level, setLevel] = useState("");
  const { term, bind } = useListSearch(() => setPage(1));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await amlMediaApi.list({ page, limit, ...(term ? { search: term } : {}), ...(level ? { level } : {}) });
      setRows(rowsOf(response));
      setPagination(response?.pagination ?? {});
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, term, level]);
  useEffect(() => {
    void load();
  }, [load]);
  // start / done / review pushes carry the row as list returns it.
  useLiveChannel(amlMediaApi.listPath, (_action, records) => {
    const fresh = Object.fromEntries((records ?? []).map((r) => [r.id, r]));
    if (records?.length && rows.some((r) => fresh[r.id]) && records.every((r) => rows.some((x) => x.id === r.id))) setRows((list) => list.map((r) => fresh[r.id] ?? r));
    else void load();
  });

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const start = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      notifications.error(t("aml:nameRequired"));
      return;
    }
    setStarting(true);
    try {
      const aliases = form.aliases.split(",").map((a) => a.trim()).filter(Boolean).slice(0, 3);
      const response = await amlMediaApi.search({
        name: form.name.trim(),
        entity_type: form.entity_type,
        ...(form.birth_date.trim() ? { birth_date: form.birth_date.trim() } : {}),
        ...(form.countries.length ? { countries: form.countries } : {}),
        ...(aliases.length ? { aliases } : {}),
        ...(form.languages.length ? { languages: form.languages } : {}),
        ...(form.reason.trim() ? { reason: form.reason.trim() } : {}),
        ...scope(form.inst_profile_id),
      });
      const started = rowsOf(response)[0];
      if (started?.search_id) setCurrent({ id: started.search_id, initial: { id: started.search_id, status: started.status, subject: started.subject } });
      void load();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setStarting(false);
    }
  };

  const columns = [
    { key: "started_at", label: t("aml:mediaStarted"), render: (r) => <span className="whitespace-nowrap text-xs">{formatDateTime(r.started_at)}</span> },
    { key: "name", label: t("aml:name"), align: "left", render: (r) => <span className="font-semibold">{[r.name, r.reason].filter(Boolean).join(" · ")}</span> },
    { key: "level", label: t("aml:result"), render: (r) => <LevelPill row={r} /> },
    { key: "adverse", label: t("aml:mediaFunnel_adverse"), render: (r) => <span className="tabular-nums">{r.stats?.adverse ?? "—"}</span> },
    { key: "searched_by", label: t("aml:screenedBy"), render: (r) => r.searched_by ?? "—" },
    { key: "actions", label: t("common:actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setOpenId(r.id)} /> },
  ];

  return (
    <div className="grid gap-4">
      {can("Add") && (
        <form onSubmit={(e) => void start(e)} className="grid gap-x-4 gap-y-3 rounded-2xl p-4 md:grid-cols-3" style={glassCard}>
          <InstitutionField value={form.inst_profile_id} onChange={set("inst_profile_id")} />
          <label className={`${labelClass} md:col-span-2`}>
            {t("aml:name")} <span className="text-red-500">*</span>
            <input value={form.name} onChange={(e) => set("name")(e.target.value)} className={inputClass} placeholder="Manuel Chang" />
          </label>
          <label className={labelClass}>
            {t("aml:entityType")}
            <FilterSelect className="mt-1.5" value={form.entity_type} onChange={set("entity_type")} options={["PERSON", "ORGANIZATION"].map((v) => ({ value: v, label: t(`aml:entity_${v}`) }))} />
          </label>
          <label className={labelClass}>
            {t("aml:birthDate")}
            <input value={form.birth_date} onChange={(e) => set("birth_date")(e.target.value)} className={inputClass} placeholder="1955 / 1955-03 / 1955-03-10" />
          </label>
          <label className={labelClass}>
            {t("aml:countries")}
            <CountryMultiSelect className="mt-1.5" countries={countries} value={form.countries} onChange={set("countries")} placeholder={t("aml:selectCountries")} />
          </label>
          <label className={labelClass}>
            {t("aml:mediaAliases")}
            <input value={form.aliases} onChange={(e) => set("aliases")(e.target.value)} className={inputClass} placeholder={t("aml:mediaAliasesHint")} />
          </label>
          <div className={labelClass}>
            {t("aml:mediaLanguages")}
            <div className="mt-2 flex gap-3">
              {["pt", "fr"].map((l) => (
                <label key={l} className="flex items-center gap-1.5 text-xs font-medium">
                  <input type="checkbox" checked={form.languages.includes(l)} onChange={() => set("languages")(form.languages.includes(l) ? form.languages.filter((x) => x !== l) : [...form.languages, l])} className="accent-[var(--primary)]" />
                  {t(`aml:mediaLang_${l}`)}
                </label>
              ))}
            </div>
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("aml:mediaLanguagesHint")}</span>
          </div>
          <label className={labelClass}>
            {t("aml:reason")}
            <input value={form.reason} onChange={(e) => set("reason")(e.target.value)} className={inputClass} placeholder={t("aml:reasonPlaceholder")} />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2 md:col-span-3">
            <p className="text-[11px] text-muted-foreground">{t("aml:mediaSearchHint")}</p>
            <Button type="submit" loading={starting} icon={Newspaper}>
              {t("aml:mediaSearch")}
            </Button>
          </div>
        </form>
      )}

      {current && (
        <div className="rounded-2xl p-4" style={glassCard}>
          <MediaSearchView key={current.id} searchId={current.id} initial={current.initial} />
        </div>
      )}

      <ListPanel
        tabs={[]}
        {...bind}
        searchPlaceholder={t("aml:mediaSearchHistory")}
        filters={<FilterSelect value={level} onChange={(v) => (setLevel(v), setPage(1))} options={[{ value: "", label: t("aml:mediaAnyLevel") }, ...Object.keys(LEVEL_TONE).map((l) => ({ value: l, label: t(`aml:mediaLevel_${l}`) }))]} />}
      >
        <DataTable
          bare
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          isLoading={loading}
          title={t("aml:mediaPast")}
          emptyTitle={t("aml:mediaNoSearches")}
          serverSorted
          serverPagination={{ page, totalPages: pagination.totalPages ?? 1, totalRecords: pagination.totalRecords ?? rows.length, onPageChange: setPage, limit, onLimitChange: (n) => (setLimit(n), setPage(1)) }}
        />
      </ListPanel>
      {openId && (
        <Modal open onClose={() => (setOpenId(null), void load())} size="xl" title={t("aml:mediaTitle")}>
          <MediaSearchView searchId={openId} />
        </Modal>
      )}
    </div>
  );
}

// --------------------------------------------------- a customer's media --

// A customer's news: the customer itself, or any party screened with it
// (directors, owners: `party_key` from the latest screening), each with its
// latest search and a new search on demand.
export function AdverseMediaCustomer({ customerKind, referenceId }) {
  const { t } = useTranslation("aml");
  const can = useMenuPermission("Name Lookup");
  const [parties, setParties] = useState([]);
  const [party, setParty] = useState("");
  const [latest, setLatest] = useState(undefined);
  const [starting, setStarting] = useState(false);
  useEffect(() => {
    amlScreeningApi
      .customer({ customer_kind: customerKind, reference_id: referenceId })
      .then((r) => setParties((rowsOf(r)[0]?.screenings ?? []).filter((s) => s.party_key && !["CUSTOMER", "COMPANY"].includes(s.party_key))))
      .catch(() => setParties([]));
  }, [customerKind, referenceId]);
  const loadLatest = useCallback(() => {
    amlMediaApi
      .list({ customer_kind: customerKind, reference_id: referenceId, ...(party ? { party_key: party } : {}), page: 1, limit: 1 })
      .then((r) => setLatest(rowsOf(r)[0] ?? null))
      .catch(() => setLatest(null));
  }, [customerKind, referenceId, party]);
  useEffect(() => {
    setLatest(undefined);
    loadLatest();
  }, [loadLatest]);

  const start = async () => {
    setStarting(true);
    try {
      const started = rowsOf(await amlMediaApi.search({ customer_kind: customerKind, reference_id: referenceId, ...(party ? { party_key: party } : {}) }))[0];
      if (started?.search_id) setLatest({ id: started.search_id, status: started.status, subject: started.subject, fresh: true });
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="grid gap-3">
      {parties.length > 0 && (
        <label className={`${labelClass} max-w-md`}>
          {t("mediaParty")}
          <FilterSelect className="mt-1.5" value={party} onChange={setParty} options={[{ value: "", label: t("mediaPartyCustomer") }, ...parties.map((p) => ({ value: p.party_key, label: partyLabel(p) }))]} />
        </label>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{latest ? (latest.started_at ? t("mediaLatest", { date: formatDateTime(latest.started_at) }) : "") : latest === null ? t("mediaNoneYet") : ""}</p>
        {can("Add") && (
          <Button size="sm" icon={Search} loading={starting} onClick={() => void start()}>
            {t("mediaSearchAgain")}
          </Button>
        )}
      </div>
      {latest === undefined ? (
        <div className="flex justify-center py-6">
          <Spinner size={18} />
        </div>
      ) : (
        latest && <MediaSearchView key={latest.id} searchId={latest.id} initial={latest.fresh ? latest : undefined} />
      )}
    </div>
  );
}

// The latest news result beside the AML result on customer screens
// (`adverse_media` on the customer replies: the worst party's latest).
export function AdverseMediaBadge({ media, customerKind, referenceId }) {
  const { t } = useTranslation("aml");
  const [open, setOpen] = useState(false);
  if (!media) return null;
  const running = media.status === "RUNNING";
  const customer = customerKind && referenceId;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-[11px] font-bold">
        <Newspaper size={13} className="text-muted-foreground" /> {t("mediaTitle")}
        {running ? <Spinner size={12} /> : <LevelPill row={media} />}
      </button>
      {open && (
        <Modal open onClose={() => setOpen(false)} size="xl" title={t("mediaTitle")}>
          {customer ? <AdverseMediaCustomer customerKind={customerKind} referenceId={referenceId} /> : <MediaSearchView searchId={media.search_id} />}
        </Modal>
      )}
      {media.status === "ERROR" && customer && <span className="text-[11px] font-semibold text-primary">{t("mediaSearchAgainHint")}</span>}
    </>
  );
}

// ------------------------------------------- Match Review > News view ----

// Article reviews waiting for a checker, across every search the user can
// see; each opens its search to read the article in full.
export function MediaReviews() {
  const { t } = useTranslation(["aml", "common"]);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [openId, setOpenId] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await amlMediaReviewApi.pending({ page, limit });
      setRows(rowsOf(response));
      setPagination(response?.pagination ?? {});
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel(amlMediaReviewApi.listPath, () => void load());

  const decide = async (narration) => {
    setBusy(true);
    try {
      const response = await amlMediaReviewApi[dialog.verb]({ id: dialog.row.id, ...(narration ? { narration } : {}) });
      notifications.success(apiMessage(response, t("aml:done")));
      setDialog(null);
      void load();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: "proposed_at", label: t("aml:proposedAt"), render: (r) => <span className="whitespace-nowrap text-xs">{formatDateTime(r.proposed_at)}</span> },
    { key: "name", label: t("aml:name"), align: "left", render: (r) => <span className="font-semibold">{r.name}</span> },
    {
      key: "title",
      label: t("aml:mediaArticle"),
      align: "left",
      render: (r) => (
        <a href={r.url} target="_blank" rel="noreferrer" className="block max-w-sm hover:text-primary">
          <span className="line-clamp-2 text-xs font-semibold">{r.title}</span>
          <span className="text-[11px] text-muted-foreground">
            {r.domain} · <Badges a={r} />
          </span>
        </a>
      ),
    },
    {
      key: "decision",
      label: t("aml:mediaDecision"),
      render: (r) => (
        <span className="grid gap-0.5">
          <span className={cn("w-fit rounded-full px-2 py-0.5 text-[10px] font-bold", REVIEW_TONE[r.decision])}>{t(`aml:mediaReview_${r.decision}`, { defaultValue: r.decision })}</span>
          {r.comment && <span className="max-w-xs text-[11px] italic text-muted-foreground">“{r.comment}”</span>}
        </span>
      ),
    },
    { key: "proposed_by", label: t("aml:mediaProposedBy"), render: (r) => r.proposed_by ?? "—" },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (r) => <RowActions buttons={{ view: true, authorize: true, deauthorize: true }} onView={() => setOpenId(r.search_id)} onAuthorize={() => setDialog({ verb: "auth", row: r })} onDeauthorize={() => setDialog({ verb: "deauth", row: r })} />,
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={loading}
        title={t("aml:tabNews")}
        emptyTitle={t("aml:mediaNoPending")}
        serverSorted
        serverPagination={{ page, totalPages: pagination.totalPages ?? 1, totalRecords: pagination.totalRecords ?? rows.length, onPageChange: setPage, limit, onLimitChange: (n) => (setLimit(n), setPage(1)) }}
      />
      {dialog && (
        <NarrationDialog
          title={t(dialog.verb === "auth" ? "aml:mediaApproveTitle" : "aml:mediaRejectTitle")}
          hint={dialog.row.title}
          confirmLabel={t(dialog.verb === "auth" ? "aml:approve" : "aml:reject")}
          variant={dialog.verb === "auth" ? "primary" : "danger"}
          required={dialog.verb === "deauth"}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(narration) => void decide(narration)}
        />
      )}
      {openId && (
        <Modal open onClose={() => (setOpenId(null), void load())} size="xl" title={t("aml:mediaTitle")}>
          <MediaSearchView searchId={openId} />
        </Modal>
      )}
    </>
  );
}
