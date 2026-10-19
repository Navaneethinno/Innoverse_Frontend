import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ChevronDown, ExternalLink, Newspaper, Search, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { CountryMultiSelect } from "@/Components/Common/CountryMultiSelect";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { ListPanel } from "@/Components/Common/ListPanel";
import { Modal } from "@/Components/Common/Modal";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
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

const startLive = { phase: "planning", queries: [], candidates: null, cards: {}, order: [], stories: {}, icons: {}, profile: null, relations: [], score: { score: 0, level: "NONE" }, done: null };
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
    case "relation":
      return { ...state, relations: state.relations.some((r) => r.id === data.id) ? state.relations.map((r) => (r.id === data.id ? data : r)) : [...state.relations, data] };
    case "profile":
      return { ...state, profile: data?.found ? data.profile : null };
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

// A round picture: the photo, or the initials on a colour from the name.
function Avatar({ name, photo, size = 56 }) {
  const initials = String(name ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const hue = [...String(name ?? "")].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 11);
  if (photo) return <img src={photo} alt="" className="shrink-0 rounded-full object-cover ring-2 ring-card shadow" style={{ width: size, height: size }} />;
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full font-black text-white shadow" style={{ width: size, height: size, fontSize: size / 2.8, background: `hsl(${hue} 45% 45%)` }}>
      {initials || "?"}
    </span>
  );
}

// An article's own picture, with its site's icon on the corner.
function Thumb({ image, domain, className = "h-16 w-24" }) {
  if (!image) return null;
  return (
    <span className={cn("relative shrink-0", className)}>
      <img src={image} alt="" loading="lazy" className="h-full w-full rounded-lg object-cover" />
      <span className="absolute -bottom-1 -right-1 rounded bg-card p-0.5 shadow">
        <SiteIcon domain={domain} className="h-3.5 w-3.5" />
      </span>
    </span>
  );
}

// "Photo: <author>, <licence>, Wikimedia Commons", each part linked.
function PhotoCredit({ profile }) {
  const { t } = useTranslation("aml");
  const link = (href, text) => (href ? <a href={href} target="_blank" rel="noreferrer" className="hover:underline">{text}</a> : text);
  return (
    <span className="max-w-[9rem] text-center text-[9px] leading-tight text-muted-foreground">
      {t("mediaPhoto")}: {profile.photo_author && <>{link(profile.photo_source, profile.photo_author)}, </>}
      {profile.photo_licence && <>{link(profile.photo_licence_url, profile.photo_licence)}, </>}
      {link(profile.photo_source, "Wikimedia Commons")}
    </span>
  );
}

// The subject, with their public profile (Wikidata) when one entry fits.
function SubjectCard({ subject, profile }) {
  const { t } = useTranslation("aml");
  if (!subject) return null;
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="grid justify-items-center gap-0.5">
        <Avatar name={subject.name} photo={profile?.photo} />
        {profile?.photo && <PhotoCredit profile={profile} />}
      </div>
      <div className="min-w-0">
      <p className="truncate text-lg font-black text-foreground">{subject.name}</p>
      {profile?.description && <p className="text-xs font-semibold text-slate-600">{profile.description}</p>}
      <p className="text-xs text-muted-foreground">
        {[t(`entity_${subject.entity_type ?? "PERSON"}`), subject.birth_date && t("mediaBorn", { date: subject.birth_date })].filter(Boolean).join(" · ")}
      </p>
      {profile && (
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
          {profile.wikipedia_url && (
            <a href={profile.wikipedia_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-primary hover:underline">
              Wikipedia <ExternalLink size={10} />
            </a>
          )}
          {(profile.matched_on ?? []).some((m) => m !== "NAME") ? (
            <span>{t("mediaMatchedOn", { on: (profile.matched_on ?? []).map((m) => t(`mediaMatched_${m}`, { defaultValue: m })).join(", ") })}</span>
          ) : (
            <span className="font-semibold text-amber-700">{t("mediaPossibleWikipedia")}</span>
          )}
        </p>
      )}
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
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
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
      <li className="animate-pulse rounded-xl border border-dashed border-border bg-muted/40 p-2.5" style={{ animation: "amSlide 400ms ease-out" }}>
        <Source a={card} />
        <p className="mt-1 line-clamp-2 text-xs font-semibold text-muted-foreground">{card.title}</p>
      </li>
    );
  }
  const adverse = card.verdict === "ADVERSE";
  return (
    <li style={{ animation: "amSlide 400ms ease-out" }} className={cn("flex gap-2.5 rounded-xl border p-2.5 transition-colors", adverse ? (card.score >= 50 ? "border-red-200 bg-red-50/60" : "border-amber-200 bg-amber-50/60") : "border-border bg-card")}>
      <Thumb image={card.image} domain={card.domain} />
      <div className="min-w-0 flex-1">
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
      </div>
    </li>
  );
}

const storyImage = (story, article) => article(story.best_article ?? story.articles?.[0])?.image || (story.articles ?? []).map((no) => article(no)?.image).find(Boolean);

function StoryHeader({ story, image }) {
  const { t } = useTranslation("aml");
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <Thumb image={image} domain={story.best_source} className="h-14 w-20" />
      <div className="min-w-0 flex-1">
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

// Keyframes the investigation uses (scoped names).
const LIVE_CSS = `
@keyframes amSweep { to { transform: rotate(360deg); } }
@keyframes amPop { 0% { transform: scale(0); opacity: 0; } 70% { transform: scale(1.5); opacity: 1; } 100% { transform: scale(1); } }
@keyframes amRing { 0% { transform: scale(0.6); opacity: 0.7; } 100% { transform: scale(2.6); opacity: 0; } }
@keyframes amSlide { from { transform: translateY(10px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes amFade { to { opacity: 0.25; } }
`;

// A number that counts up to its value.
function CountUp({ value }) {
  const [shown, setShown] = useState(0);
  const target = Number(value) || 0;
  useEffect(() => {
    let frame;
    const from = shown;
    const startedAt = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - startedAt) / 600);
      setShown(Math.round(from + (target - from) * (1 - (1 - p) ** 3)));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // Counts from wherever it is now.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return value == null ? "—" : shown;
}

// Where an article sits on the radar: its angle from its number, nearer the
// centre the more it matters.
function radarPoint(card) {
  const angle = ((Number(card.id) * 137.508) % 360) * (Math.PI / 180);
  const weight = card.reading ? 0.9 : card.verdict === "ADVERSE" ? 0.25 + (1 - Math.min(100, card.score) / 100) * 0.45 : card.verdict === "MENTION" ? 0.7 : 0.88;
  return { x: 50 + Math.cos(angle) * 46 * weight, y: 50 + Math.sin(angle) * 46 * weight };
}
const dotTone = (c) => (c.reading ? "#94a3b8" : c.verdict === "ADVERSE" ? (c.score >= 50 ? "#dc2626" : "#d97706") : c.verdict === "MENTION" ? "#0284c7" : "#cbd5e1");

// The search as a radar: a sweep while it works, one blip per article read,
// red the more adverse, grey when it's about someone else.
function Radar({ live }) {
  const cards = live.order.map((no) => live.cards[no]).filter(Boolean);
  const working = live.phase !== "done";
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[300px]">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="amGlow">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="amBeam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#amGlow)" stroke="var(--border)" strokeWidth="0.4" />
        {[36, 24, 12].map((r) => <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="0.3" strokeDasharray="1 1.5" />)}
        <line x1="2" y1="50" x2="98" y2="50" stroke="var(--border)" strokeWidth="0.2" />
        <line x1="50" y1="2" x2="50" y2="98" stroke="var(--border)" strokeWidth="0.2" />
        {working && (
          <g style={{ transformOrigin: "50px 50px", animation: "amSweep 2.4s linear infinite" }}>
            <path d="M50 50 L98 50 A48 48 0 0 0 83.9 16.1 Z" fill="url(#amBeam)" />
          </g>
        )}
        {cards.map((c) => {
          const p = radarPoint(c);
          const big = c.verdict === "ADVERSE";
          return (
            <g key={c.id} style={{ transformOrigin: `${p.x}px ${p.y}px`, animation: c.verdict === "NOT_SUBJECT" ? "amFade 1.2s forwards" : "amPop 450ms ease-out" }}>
              {big && <circle cx={p.x} cy={p.y} r="2.4" fill={dotTone(c)} style={{ transformOrigin: `${p.x}px ${p.y}px`, animation: "amRing 1.6s ease-out infinite" }} />}
              {big && c.image ? (
                <>
                  <clipPath id={`amBlip${c.id}`}>
                    <circle cx={p.x} cy={p.y} r="4.2" />
                  </clipPath>
                  <image href={c.image} x={p.x - 4.2} y={p.y - 4.2} width="8.4" height="8.4" clipPath={`url(#amBlip${c.id})`} preserveAspectRatio="xMidYMid slice">
                    <title>{c.title}</title>
                  </image>
                  <circle cx={p.x} cy={p.y} r="4.4" fill="none" stroke={dotTone(c)} strokeWidth="0.9" />
                </>
              ) : (
                <circle cx={p.x} cy={p.y} r={big ? 1.9 : 1.2} fill={dotTone(c)}>
                  <title>{c.title}</title>
                </circle>
              )}
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <ScoreGauge score={live.score.score} level={live.score.level} size={118} />
      </div>
    </div>
  );
}

// The investigation while it runs: radar and score, the steps, the queries,
// the funnel, and the newest findings sliding in.
function LiveView({ subject, live, error }) {
  const { t } = useTranslation("aml");
  const cards = live.order.map((no) => live.cards[no]).filter((c) => c && c.verdict !== "NOT_SUBJECT");
  const ruledOut = live.order.filter((no) => live.cards[no]?.verdict === "NOT_SUBJECT").length;
  const judged = Object.values(live.cards).filter((c) => !c.reading).length;
  const stories = Object.values(live.stories).sort((a, b) => b.score - a.score).slice(0, 4);
  const feed = [...cards].reverse().slice(0, 6);
  return (
    <IconsContext.Provider value={live.icons}>
      <style>{LIVE_CSS}</style>
      <div className="grid min-w-0 gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SubjectCard subject={subject} profile={live.profile} />
          <PhaseRail phase={live.phase} />
        </div>
        <div className="grid min-w-0 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="grid content-start gap-3">
            <Radar live={live} />
            <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
              {[["ADVERSE", "#dc2626"], ["MENTION", "#0284c7"], ["READING", "#94a3b8"], ["NOT_SUBJECT", "#cbd5e1"]].map(([k, c]) => (
                <li key={k} className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: c }} /> {t(`mediaDot_${k}`)}
                </li>
              ))}
            </ul>
            <Relations compact subject={subject} profile={live.profile} relations={live.relations} />
          </div>
          <div className="grid min-w-0 content-start gap-3">
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
              {[["found", live.candidates?.found], ["unique", live.candidates?.unique], ["read", live.candidates ? judged : null], ["about", live.score.about_subject], ["adverse", live.score.adverse]].map(([key, value]) => (
                <div key={key} className={cn("rounded-xl border px-2 py-1.5 text-center", key === "adverse" && value ? "border-red-200 bg-red-50" : "border-border bg-card")}>
                  <p className={cn("text-xl font-black tabular-nums", key === "adverse" && value ? "text-red-700" : "")}>
                    <CountUp value={value} />
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t(`mediaFunnel_${key}`)}</p>
                </div>
              ))}
            </div>
            {live.candidates?.reading > 0 && (
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.min(100, (judged / live.candidates.reading) * 100)}%` }} />
              </div>
            )}
            <QueryChips queries={live.queries} />
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
            {stories.length > 0 && (
              <div className="grid gap-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t("mediaStoriesForming")}</p>
                {stories.map((st) => (
                  <div key={st.id} className="rounded-xl border border-border bg-card px-3 py-2" style={{ animation: "amSlide 400ms ease-out" }}>
                    <StoryHeader story={st} image={storyImage(st, (no) => live.cards[no])} />
                  </div>
                ))}
              </div>
            )}
            <div className="grid gap-1.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t("mediaLatestFindings")}</p>
              <ul className="grid gap-1.5">
                {feed.map((c) => (
                  <LiveCard key={c.id} card={c} />
                ))}
                {!feed.length && <li className="text-xs text-muted-foreground">{t(`mediaWaiting_${live.phase}`)}</li>}
              </ul>
              {ruledOut > 0 && <p className="text-[11px] text-muted-foreground">{t("mediaRuledOutN", { count: ruledOut })}</p>}
            </div>
          </div>
        </div>
      </div>
    </IconsContext.Provider>
  );
}

// -------------------------------------------------------- relationships --

const GROUP_COLOUR = { FAMILY: "#8b5cf6", AFFILIATION: "#0ea5e9", OWNERSHIP: "#10b981", ASSOCIATE: "#f97316", NEWS: "#64748b" };
const GROUPS = Object.keys(GROUP_COLOUR);
// A flagged related party: red for sanctions or crime, amber otherwise.
const flagColour = (watch, review) => (!watch || review?.state === "NOT_RELEVANT" ? null : ["SANCTIONS", "CRIME"].includes(watch.category) ? "#dc2626" : "#d97706");
const years = (r) => (r.from || r.to ? `${r.from ?? "…"}–${r.to ?? ""}` : "");
const shortName = (name, n = 16) => (String(name).length > n ? `${String(name).slice(0, n - 1)}…` : String(name));
const nodeGlyph = (r) => (r.entity_type === "ORGANIZATION" ? "🏢" : r.entity_type === "POSITION" ? "🎖" : r.entity_type === "VESSEL" ? "⚓" : "");

// A round picture in SVG: the photo clipped to a circle, or initials /
// a glyph on the group colour; a red or amber ring when flagged.
function SvgFace({ id, x, y, r, photo, text, fill, ring, selected }) {
  return (
    <>
      {ring && <circle cx={x} cy={y} r={r + 4} fill="none" stroke={ring} strokeWidth={Math.max(2, r / 5)} />}
      <circle cx={x} cy={y} r={r} fill={fill} stroke={selected ? "var(--foreground)" : "var(--card)"} strokeWidth="2" />
      {photo ? (
        <>
          <clipPath id={id}>
            <circle cx={x} cy={y} r={r - 1} />
          </clipPath>
          <image href={photo} x={x - r} y={y - r} width={r * 2} height={r * 2} clipPath={`url(#${id})`} preserveAspectRatio="xMidYMid slice" />
        </>
      ) : (
        <text x={x} y={y + r * 0.32} textAnchor="middle" fill="white" style={{ fontSize: r * 0.85, fontWeight: 800 }}>
          {text}
        </text>
      )}
    </>
  );
}
const initialsOf = (name) => String(name ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
const faceText = (r) => nodeGlyph(r) || initialsOf(r.name);

// The relationships as a globe around the subject: drag to turn it, the
// + / − buttons to zoom (the page keeps its own scroll), click a node to open it. It turns slowly by
// itself unless the user prefers less motion.
function Network3D({ subject, profile, relations, picked, onPick, height = 420 }) {
  const { t } = useTranslation("aml");
  const [rot, setRot] = useState({ x: -0.35, y: 0 });
  const [zoom, setZoom] = useState(1);
  const drag = useRef(null);
  const idle = useRef(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    let frame;
    const step = () => {
      if (!drag.current && Date.now() > idle.current) setRot((r) => ({ ...r, y: r.y + 0.0035 }));
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, []);
  const W = 460;
  const H = height;
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) * 0.36 * zoom;
  const n = relations.length;
  const [sx, cxr, sy, cyr] = [Math.sin(rot.x), Math.cos(rot.x), Math.sin(rot.y), Math.cos(rot.y)];
  const points = relations.map((r, i) => {
    // An even spread over a sphere (Fibonacci), then turned and projected.
    const y0 = 1 - ((i + 0.5) / n) * 2;
    const ring = Math.sqrt(1 - y0 * y0);
    const th = i * 2.399963;
    const x0 = Math.cos(th) * ring;
    const z0 = Math.sin(th) * ring;
    const x1 = x0 * cyr + z0 * sy;
    const z1 = -x0 * sy + z0 * cyr;
    const y2 = y0 * cxr - z1 * sx;
    const z2 = y0 * sx + z1 * cxr;
    const f = 2.6 / (2.6 + z2);
    return { r, x: cx + x1 * R * f, y: cy + y2 * R * f, z: z2, f };
  });
  const back = points.filter((p) => p.z > 0).sort((p, q) => q.z - p.z);
  const front = points.filter((p) => p.z <= 0).sort((p, q) => q.z - p.z);
  const node = (p) => {
    const { r } = p;
    const depth = Math.max(0.35, Math.min(1, 1.15 - p.z * 0.55));
    const size = 15 * p.f;
    const dim = picked && picked !== r.id;
    return (
      <g key={r.id} onClick={() => onPick(picked === r.id ? null : r.id)} className="cursor-pointer" opacity={dim ? 0.3 : depth}>
        <title>{[r.name, r.label, years(r), r.watch && `${r.watch.list} · ${r.watch.category}`].filter(Boolean).join(" · ")}</title>
        <SvgFace id={`amNode${r.id}`} x={p.x} y={p.y} r={size} photo={r.photo} text={faceText(r)} fill={GROUP_COLOUR[r.group] ?? "#94a3b8"} ring={flagColour(r.watch, r.review)} selected={picked === r.id} />
        {(p.z < 0.2 || picked === r.id) && (
          <text x={p.x} y={p.y + size + 11} textAnchor="middle" className="fill-foreground" style={{ fontSize: 9, fontWeight: 600 }}>
            {shortName(r.name)}
          </text>
        )}
      </g>
    );
  };
  const edge = (p) => (
    <line key={`e${p.r.id}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={GROUP_COLOUR[p.r.group] ?? "#94a3b8"} strokeOpacity={(picked && picked !== p.r.id ? 0.08 : 0.45) * Math.max(0.3, 1 - p.z * 0.6)} strokeWidth={p.r.watch ? 2 : 1.1} strokeDasharray={p.r.source === "NEWS" ? "4 3" : undefined} />
  );
  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto w-full max-w-[520px] touch-none select-none"
        role="img"
        aria-label={t("mediaRelations")}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY, rot };
          e.currentTarget.setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const d = drag.current;
          setRot({ y: d.rot.y + (e.clientX - d.x) / 160, x: Math.max(-1.3, Math.min(1.3, d.rot.x + (e.clientY - d.y) / 160)) });
        }}
        onPointerUp={() => {
          drag.current = null;
          idle.current = Date.now() + 4000;
        }}
      >
        <defs>
          <radialGradient id="amOrb">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={R * 1.15} fill="url(#amOrb)" />
        <ellipse cx={cx} cy={cy} rx={R} ry={R * Math.abs(sx) + 2} fill="none" stroke="var(--border)" strokeDasharray="2 4" />
        {back.map(edge)}
        {back.map(node)}
        <SvgFace id="amSubjectFace" x={cx} y={cy} r={30} photo={profile?.photo} text={initialsOf(subject?.name)} fill="var(--primary)" />
        {front.map(edge)}
        {front.map(node)}
      </svg>
      <div className="absolute right-1 top-1 flex flex-col gap-1">
        {[["+", 0.2], ["−", -0.2]].map(([label, d]) => (
          <button key={label} type="button" onClick={() => setZoom((z) => Math.max(0.6, Math.min(1.8, z + d)))} className="h-6 w-6 rounded-md border border-border bg-card text-sm font-bold text-muted-foreground hover:text-primary">
            {label}
          </button>
        ))}
      </div>
      <p className="text-center text-[10px] text-muted-foreground">{t("mediaDragHint")}</p>
    </div>
  );
}

// The family as a tree: parents above, the subject with spouses and
// siblings in the middle, children below, other relatives at the side.
function FamilyTree({ subject, profile, relations, picked, onPick }) {
  const { t } = useTranslation("aml");
  const of = (...kinds) => relations.filter((r) => kinds.includes(r.relation));
  const parents = of("PARENT");
  const spouses = of("SPOUSE");
  const siblings = of("SIBLING");
  const children = of("CHILD");
  const others = relations.filter((r) => r.group === "FAMILY" && !["PARENT", "SPOUSE", "SIBLING", "CHILD"].includes(r.relation));
  const W = 560;
  const slot = 92;
  const row = (list, y) => list.map((r, i) => ({ r, x: W / 2 + (i - (list.length - 1) / 2) * slot, y }));
  const top = row(parents, 60);
  const middleList = [...siblings, null, ...spouses];
  const middle = middleList.map((r, i) => ({ r, x: W / 2 + (i - siblings.length) * slot, y: 185 }));
  const me = middle.find((p) => p.r === null);
  const bottom = row(children, 310);
  const height = children.length ? 370 : 245;
  const span = [...top, ...middle, ...bottom].map((p) => p.x);
  const minX = Math.min(...span, 60) - 60;
  const maxX = Math.max(...span, W - 60) + 60;
  const person = (p) => (
    <g key={p.r.id} onClick={() => onPick(picked === p.r.id ? null : p.r.id)} className="cursor-pointer" opacity={picked && picked !== p.r.id ? 0.4 : 1} style={{ animation: "amPop 450ms ease-out", transformOrigin: `${p.x}px ${p.y}px` }}>
      <title>{[p.r.name, p.r.label, years(p.r), p.r.watch && `${p.r.watch.list} · ${p.r.watch.category}`].filter(Boolean).join(" · ")}</title>
      <SvgFace id={`amFam${p.r.id}`} x={p.x} y={p.y} r={24} photo={p.r.photo} text={initialsOf(p.r.name)} fill={GROUP_COLOUR.FAMILY} ring={flagColour(p.r.watch, p.r.review)} selected={picked === p.r.id} />
      <text x={p.x} y={p.y + 40} textAnchor="middle" className="fill-foreground" style={{ fontSize: 10, fontWeight: 700 }}>
        {shortName(p.r.name, 18)}
      </text>
      <text x={p.x} y={p.y + 52} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 8.5 }}>
        {[p.r.label, years(p.r)].filter(Boolean).join(" · ")}
      </text>
      {p.r.watch && (
        <text x={p.x} y={p.y - 30} textAnchor="middle" style={{ fontSize: 8.5, fontWeight: 800, fill: flagColour(p.r.watch) }}>
          {t(`category_${p.r.watch.category}`, { defaultValue: p.r.watch.category })}
        </text>
      )}
    </g>
  );
  const elbow = (from, to, key) => <path key={key} d={`M${from.x} ${from.y} V${(from.y + to.y) / 2} H${to.x} V${to.y}`} fill="none" stroke="var(--border)" strokeWidth="1.5" />;
  return (
    <div className="grid gap-2">
      <svg viewBox={`${minX} 0 ${maxX - minX} ${height}`} className="mx-auto w-full max-w-[620px]" role="img" aria-label={t("mediaFamilyTree")}>
        {top.map((p, i) => elbow({ x: p.x, y: p.y + 24 }, { x: me.x, y: me.y - 34 }, `p${i}`))}
        {middle.filter((p) => p.r).map((p, i) => <line key={`m${i}`} x1={me.x} y1={me.y} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth="1.5" strokeDasharray={p.r.relation === "SIBLING" ? "4 3" : undefined} />)}
        {bottom.map((p, i) => elbow({ x: me.x, y: me.y + 34 }, { x: p.x, y: p.y - 24 }, `c${i}`))}
        {top.map(person)}
        {middle.filter((p) => p.r).map(person)}
        {bottom.map(person)}
        <SvgFace id="amFamMe" x={me.x} y={me.y} r={32} photo={profile?.photo} text={initialsOf(subject?.name)} fill="var(--primary)" />
        <text x={me.x} y={me.y + 48} textAnchor="middle" className="fill-foreground" style={{ fontSize: 11, fontWeight: 900 }}>
          {shortName(subject?.name ?? "", 22)}
        </text>
      </svg>
      {others.length > 0 && (
        <p className="flex flex-wrap items-center justify-center gap-1.5 text-[11px]">
          <span className="text-muted-foreground">{t("mediaOtherRelatives")}</span>
          {others.map((r) => (
            <button key={r.id} type="button" onClick={() => onPick(r.id)} className="rounded-full border border-border bg-card px-2 py-0.5 font-semibold hover:border-primary/40">
              {r.name}
            </button>
          ))}
        </p>
      )}
    </div>
  );
}

// One related party in full: what links them, their own watchlist match
// (a lead, not a finding about the subject), and where it came from.
function RelationDetail({ r, articlesByNo, search, onChange }) {
  const { t } = useTranslation("aml");
  const link = r.wikidata_id ? `https://www.wikidata.org/wiki/${r.wikidata_id}` : r.entity_key ? `https://www.opensanctions.org/entities/${r.entity_key}` : null;
  return (
    <div className="grid gap-1.5 rounded-xl border border-border bg-card p-3 text-xs">
      <p className="text-sm font-bold">{r.name}</p>
      <p className="text-muted-foreground">
        {[r.label, years(r), t(`mediaSource_${r.source}`, { defaultValue: r.source })].filter(Boolean).join(" · ")}
      </p>
      {r.description && <p>{r.description}</p>}
      {r.watch && (
        <p className="rounded-lg px-2 py-1 font-semibold" style={{ background: `${flagColour(r.watch)}1a`, color: flagColour(r.watch) }}>
          {t("mediaRelationFlag", { label: r.label, name: r.name, category: t(`category_${r.watch.category}`, { defaultValue: r.watch.category }), list: r.watch.list, score: r.watch.score })}
        </p>
      )}
      {r.source === "NEWS" && <p className="text-[11px] text-amber-700">{t("mediaNewsLead")}</p>}
      {(r.articles ?? []).length > 0 && (
        <ul className="grid gap-1">
          {r.articles.map((no) => articlesByNo?.[no]).filter(Boolean).map((a) => (
            <li key={a.no}>
              <a href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1 hover:text-primary">
                <ExternalLink size={11} className="mt-0.5 shrink-0" /> <span className="line-clamp-1">{a.title}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {link && (
        <a href={link} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1 font-bold text-primary hover:underline">
          {r.wikidata_id ? "Wikidata" : "OpenSanctions"} <ExternalLink size={10} />
        </a>
      )}
      {search && <RelationReview key={r.id} r={r} search={search} onChange={onChange} />}
    </div>
  );
}

// A relationship's review: where it stands, a proposal (Relevant / Not
// relevant with a comment), and the checker's approve / reject.
function RelationReview({ r, search, onChange }) {
  const { t } = useTranslation("aml");
  const canPropose = useMenuPermission("Match Review")("Add");
  const canAuthorize = useMenuPermission("Match Review")("Authorize");
  const [decision, setDecision] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null);
  const review = r.review ?? { state: "OPEN" };
  const waiting = review.state === "PENDING" ? { review_id: review.review_id, decision: review.decision, proposed_by: review.proposed_by } : review.pending;
  const run = async (fn) => {
    setBusy(true);
    try {
      const response = await fn();
      notifications.success(apiMessage(response, t("done")));
      onChange?.(rowsOf(response)[0] ?? search);
      return true;
    } catch (e) {
      notifications.error(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-1 grid gap-1.5 border-t border-dashed border-border pt-2">
      <p className="flex items-center gap-1.5">
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", REVIEW_TONE[review.state] ?? REVIEW_TONE.OPEN)}>{t(`mediaReview_${review.state}`, { defaultValue: review.state })}</span>
        {review.comment && <span className="truncate italic text-muted-foreground">“{review.comment}”</span>}
      </p>
      {waiting ? (
        canAuthorize && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-[11px] text-amber-900">
            <span className="font-semibold">{t("mediaWaiting", { decision: t(`mediaReview_${waiting.decision}`, { defaultValue: waiting.decision ?? "" }), name: waiting.proposed_by ?? "" })}</span>
            <span className="ml-auto flex gap-1">
              <Button size="sm" variant="danger" icon={XCircle} onClick={() => setDialog({ verb: "deauth", id: waiting.review_id })}>{t("reject")}</Button>
              <Button size="sm" icon={CheckCircle2} onClick={() => setDialog({ verb: "auth", id: waiting.review_id })}>{t("approve")}</Button>
            </span>
          </div>
        )
      ) : (
        canPropose && search.status === "DONE" && (
          <div className="grid gap-1.5">
            <div className="flex flex-wrap gap-1">
              {["NOT_RELEVANT", "RELEVANT"].map((d) => (
                <button key={d} type="button" onClick={() => setDecision(decision === d ? "" : d)} className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-bold", decision === d ? REVIEW_TONE[d] : "border-border text-muted-foreground")}>
                  {t(`mediaReview_${d}`)}
                </button>
              ))}
            </div>
            {decision && (
              <div className="flex gap-1.5">
                <input autoFocus className="min-w-0 flex-1 rounded-lg border border-border px-2 py-1 text-xs" maxLength={2000} placeholder={t("mediaComment")} value={comment} onChange={(e) => setComment(e.target.value)} />
                <Button size="sm" loading={busy} disabled={!comment.trim()} onClick={async () => (await run(() => amlMediaReviewApi.propose({ search_id: search.id, decisions: [{ relation_id: r.id, decision, comment: comment.trim() }] }))) && (setDecision(""), setComment(""))}>
                  {t("mediaPropose")}
                </Button>
              </div>
            )}
          </div>
        )
      )}
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
  );
}

// The relationships: the graph, a grouped list with filters, and the one
// picked in full.
function Relations({ subject, profile, relations, articlesByNo, compact = false, search, onChange }) {
  const { t } = useTranslation("aml");
  const [picked, setPicked] = useState(null);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [source, setSource] = useState("");
  const [view, setView] = useState("network");
  if (!relations?.length) return null;
  const hasFamily = relations.some((r) => r.group === "FAMILY" && ["PARENT", "SPOUSE", "SIBLING", "CHILD"].includes(r.relation));
  const shown = relations.filter((r) => (!flaggedOnly || r.watch) && (!source || r.source === source));
  const flagged = relations.filter((r) => r.watch && r.review?.state !== "NOT_RELEVANT").length;
  const current = relations.find((r) => r.id === picked);
  const legend = (
    <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
      {GROUPS.filter((g) => relations.some((r) => r.group === g)).map((g) => (
        <li key={g} className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: GROUP_COLOUR[g] }} /> {t(`mediaGroup_${g}`)}
        </li>
      ))}
      <li className="flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-full border-2 border-red-600" /> {t("mediaFlagged")}
      </li>
    </ul>
  );
  if (compact) {
    return (
      <div className="grid gap-1">
        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t("mediaRelationsN", { count: relations.length, flagged })}</p>
        <Network3D subject={subject} profile={profile} relations={relations} picked={picked} onPick={setPicked} height={300} />
        {legend}
        {current && <RelationDetail r={current} articlesByNo={articlesByNo} />}
      </div>
    );
  }
  return (
    <section className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={labelClass}>{t("mediaRelationsN", { count: relations.length, flagged })}</p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} className="accent-[var(--primary)]" />
            {t("mediaFlaggedOnly")}
          </label>
          <FilterSelect size="sm" className="w-40" value={source} onChange={setSource} options={[{ value: "", label: t("mediaAnySource") }, ...["WIKIDATA", "OPENSANCTIONS", "NEWS"].map((v) => ({ value: v, label: t(`mediaSource_${v}`) }))]} />
        </div>
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-2">
          {hasFamily && <SegmentedSwitch className="mx-auto" value={view} onChange={setView} options={[{ value: "network", label: t("mediaNetwork") }, { value: "family", label: t("mediaFamilyTree") }]} />}
          {view === "family" && hasFamily ? (
            <FamilyTree subject={subject} profile={profile} relations={shown.filter((r) => r.group === "FAMILY")} picked={picked} onPick={setPicked} />
          ) : (
            <Network3D subject={subject} profile={profile} relations={shown} picked={picked} onPick={setPicked} />
          )}
          {legend}
        </div>
        <div className="grid content-start gap-3">
          {current && <RelationDetail r={current} articlesByNo={articlesByNo} search={search} onChange={onChange} />}
          {GROUPS.map((g) => {
            const list = shown.filter((r) => r.group === g);
            if (!list.length) return null;
            return (
              <div key={g}>
                <p className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider" style={{ color: GROUP_COLOUR[g] }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: GROUP_COLOUR[g] }} /> {t(`mediaGroup_${g}`)}
                </p>
                <ul className="grid gap-1">
                  {list.map((r) => (
                    <li key={r.id}>
                      <button type="button" onClick={() => setPicked(picked === r.id ? null : r.id)} className={cn("flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors", picked === r.id ? "border-primary bg-[var(--primary-light)]" : "border-border bg-card hover:border-primary/40")}>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{r.name}</span>
                          <span className="block truncate text-[10px] text-muted-foreground">{[r.label, years(r)].filter(Boolean).join(" · ")}</span>
                        </span>
                        {r.watch && (
                          <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: flagColour(r.watch) }}>
                            {t(`category_${r.watch.category}`, { defaultValue: r.watch.category })}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {!shown.length && <p className="text-xs text-muted-foreground">{t("mediaNoRelationsShown")}</p>}
        </div>
      </div>
    </section>
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
        <Thumb image={a.image} domain={a.domain} className="hidden h-20 w-28 sm:block" />
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

// Adverse articles on a date axis: one dot each, stacked when they fall
// together, red and larger the higher the score. A dot shows its article
// below; the whole range fits the width.
const COLUMNS = 48;
const STACK = 4;
function Timeline({ articles }) {
  const { t } = useTranslation("aml");
  const [picked, setPicked] = useState(null);
  const times = articles.map((a) => new Date(a.published_at).getTime());
  let from = Math.min(...times);
  let to = Math.max(...times);
  if (to - from < 30 * 86400000) {
    const middle = (from + to) / 2;
    from = middle - 15 * 86400000;
    to = middle + 15 * 86400000;
  }
  const columns = new Map();
  articles.forEach((a, i) => {
    const col = Math.round(((times[i] - from) / (to - from)) * COLUMNS);
    columns.set(col, [...(columns.get(col) ?? []), a].sort((x, y) => y.score - x.score));
  });
  const ticks = Array.from({ length: 5 }, (_, i) => from + ((to - from) * i) / 4);
  const shown = picked && articles.find((a) => a.id === picked);
  return (
    <div className="mt-2 grid gap-2">
      <div className="relative h-28 rounded-xl border border-border bg-card px-4">
        {/* the axis and its date ticks */}
        <div className="absolute inset-x-4 bottom-6 border-t border-border" />
        {ticks.map((tick, i) => (
          <span key={i} className={cn("absolute bottom-1 whitespace-nowrap text-[10px] tabular-nums text-muted-foreground", i === 0 ? "" : i === 4 ? "-translate-x-full" : "-translate-x-1/2")} style={{ left: `calc(1rem + (100% - 2rem) * ${i / 4})` }}>
            {formatDay(new Date(tick).toISOString())}
          </span>
        ))}
        {[...columns.entries()].map(([col, list]) => (
          <div key={col} className="absolute bottom-6 flex -translate-x-1/2 flex-col-reverse items-center gap-1 pb-1" style={{ left: `calc(1rem + (100% - 2rem) * ${col / COLUMNS})` }}>
            {list.slice(0, STACK).map((a) => {
              const size = 8 + Math.round((Math.min(100, a.score) / 100) * 8);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setPicked(picked === a.id ? null : a.id)}
                  title={`${formatDay(a.published_at)} · ${a.title}`}
                  aria-label={a.title}
                  className={cn("rounded-full ring-2 ring-card transition-transform hover:scale-125", picked === a.id && "ring-primary")}
                  style={{ width: size, height: size, background: a.score >= 50 ? "#dc2626" : a.score >= 20 ? "#f59e0b" : "#fcd34d" }}
                />
              );
            })}
            {list.length > STACK && <span className="text-[9px] font-bold text-muted-foreground">+{list.length - STACK}</span>}
          </div>
        ))}
      </div>
      {shown ? (
        <a href={shown.url} target="_blank" rel="noreferrer" className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50/50 p-2.5 hover:border-red-300">
          <span className="min-w-0">
            <Source a={shown} />
            <span className="mt-0.5 block text-xs font-semibold">{shown.title}</span>
            <span className="mt-1 block">
              <Badges a={shown} />
            </span>
          </span>
          <b className="text-sm tabular-nums text-red-700">{shown.score}</b>
        </a>
      ) : (
        <p className="text-[11px] text-muted-foreground">{t("mediaTimelineHint", { count: articles.length })}</p>
      )}
    </div>
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
  const [order, setOrder] = useState("stories");

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
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SubjectCard subject={search.subject} profile={search.profile} />
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
              <li key={c} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_2rem] items-center gap-2 text-xs">
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
        <section className="min-w-0">
          <p className={labelClass}>{t("mediaTimeline")}</p>
          <Timeline articles={timeline} />
        </section>
      )}

      <Relations subject={search.subject} profile={search.profile} relations={search.relations} articlesByNo={byNo} search={search} onChange={onChange} />

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
        {articles.length > 0 && <SegmentedSwitch className="w-fit" value={order} onChange={setOrder} options={[{ value: "stories", label: t("mediaByStory") }, { value: "latest", label: t("mediaLatestFirst") }]} />}
        {order === "latest" ? (
          <ul className="grid gap-2">{[...articles].sort((x, y) => String(y.published_at ?? "").localeCompare(String(x.published_at ?? ""))).map(card)}</ul>
        ) : (
        <>
        {stories.map((s) => (
          <section key={s.id} className="rounded-2xl border border-border p-3">
            <StoryHeader story={s} image={storyImage(s, (no) => byNo[no])} />
            <ul className="mt-2 grid gap-2">{(s.articles ?? []).map((no) => byNo[no]).filter(Boolean).map(card)}</ul>
          </section>
        ))}
        {loose.length > 0 && (
          <section>
            <p className={labelClass}>{t("mediaOtherArticles")}</p>
            <ul className="mt-2 grid gap-2">{loose.map(card)}</ul>
          </section>
        )}
        </>
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
// its result straight away. `popup`: the live investigation opens in its
// own window and the result lands on the page when it's done (Name Lookup);
// without it (already inside a window) it plays in place.
export function MediaSearchView({ searchId, initial, popup = false }) {
  const { t } = useTranslation("aml");
  const [search, setSearch] = useState(initial ?? null);
  const [loading, setLoading] = useState(!initial);
  const [hidden, setHidden] = useState(false);
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
  if (!running) return <ResultView search={search} onChange={setSearch} />;
  if (!popup) return <LiveView subject={search.subject} live={live} error={error} />;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-primary/40 p-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Spinner size={14} /> {t("mediaInvestigating", { name: search.subject?.name ?? "" })}
        </span>
        {hidden && (
          <Button size="sm" variant="secondary" onClick={() => setHidden(false)}>
            {t("mediaWatch")}
          </Button>
        )}
      </div>
      <Modal open={!hidden} onClose={() => setHidden(true)} size="xl" title={t("mediaInvestigationTitle")}>
        <LiveView subject={search.subject} live={live} error={error} />
      </Modal>
    </>
  );
}

function LevelPill({ row }) {
  const { t } = useTranslation("aml");
  const level = row.effective_level ?? row.level;
  const tone = LEVEL_TONE[level];
  if (!tone || ["RUNNING", "ERROR"].includes(row.status)) return <span className="text-xs text-muted-foreground">{t(`mediaStatus_${row.status}`, { defaultValue: row.status })}</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-black", tone.bg, tone.text)}>
        {t(`mediaLevel_${level}`)} · {row.effective_score ?? row.score}
      </span>
      <FlaggedRelations row={row} />
    </span>
  );
}

// "2 related parties on a watchlist (PEP)": context beside the level, not
// part of it.
function FlaggedRelations({ row }) {
  const { t } = useTranslation("aml");
  const count = Number(row?.flagged_relations) || 0;
  if (!count) return null;
  const colour = ["SANCTIONS", "CRIME"].includes(row.flagged_category) ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800";
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", colour)}>
      {t("mediaFlaggedRelations", { count, category: t(`category_${row.flagged_category}`, { defaultValue: row.flagged_category }) })}
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
    {
      key: "name",
      label: t("aml:name"),
      align: "left",
      render: (r) => (
        <span className="flex items-center gap-2">
          <Avatar name={r.name} photo={r.photo} size={28} />
          <span className="font-semibold">{[r.name, r.reason].filter(Boolean).join(" · ")}</span>
        </span>
      ),
    },
    { key: "level", label: t("aml:result"), render: (r) => <LevelPill row={r} /> },
    { key: "adverse", label: t("aml:mediaFunnel_adverse"), render: (r) => <span className="tabular-nums">{r.stats?.adverse ?? "—"}</span> },
    { key: "searched_by", label: t("aml:screenedBy"), render: (r) => r.searched_by ?? "—" },
    { key: "actions", label: t("common:actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setOpenId(r.id)} /> },
  ];

  return (
    <div className="grid min-w-0 gap-4">
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
        <div className="min-w-0 overflow-hidden rounded-2xl p-4" style={glassCard}>
          <MediaSearchView key={current.id} searchId={current.id} initial={current.initial} popup />
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
      render: (r) =>
        r.relation_id ? (
          <span className="block max-w-sm">
            <span className="text-xs font-semibold">{r.title}</span>
            <span className="block text-[11px] text-muted-foreground">
              {t("aml:mediaRelationship")} · {t(`aml:mediaRel_${r.stage}`, { defaultValue: r.stage })}
              {r.category && ` · ${t(`aml:category_${r.category}`, { defaultValue: r.category })}`}
            </span>
          </span>
        ) : (
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
