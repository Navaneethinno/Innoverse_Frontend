import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react";
import { useAuth } from "@/Hooks/useAuth";
import { formatDateTime } from "@/Utils/Lib/dateFormat";

// Shared by every InnoAML screen (AML handoffs 03–07). The AML score and band
// are separate from the risk-assessment score: shown side by side, never
// combined.

const GOOD = "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-success";
const BAD = "bg-[color-mix(in_srgb,var(--destructive)_12%,transparent)] text-destructive";

export const when = (value) => (value ? formatDateTime(value) : "-");
export const glassCard = { background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" };

// Calls that take inst_profile_id only from Service Provider users (upload,
// name lookup): send it only when the chosen institution isn't the user's
// own, so ordinary institution users never send it.
export function useInstitutionScope() {
  const own = useAuth((state) => state.user?.inst_profile_id);
  return (instProfileId) => (instProfileId && String(instProfileId) !== String(own) ? { inst_profile_id: Number(instProfileId) } : {});
}

// A band ({code, name, color_code, risk_action_name}) as a coloured pill,
// optionally with the score. `band` is null when the institution has no
// active AML Setup: say so rather than show an empty badge.
export function BandBadge({ band, score, showAction = false }) {
  const { t } = useTranslation("aml");
  if (!band) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
        {t("noSetup")}
        {score != null && <span className="tabular-nums">· {score}</span>}
      </span>
    );
  }
  const colour = band.color_code || undefined;
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-bold"
      style={colour ? { borderColor: colour, background: `${colour}1a` } : undefined}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colour || "var(--muted-foreground)" }} />
      {band.name ?? band.code}
      {score != null && <span className="tabular-nums">· {score}</span>}
      {showAction && band.risk_action_name && <span className="font-semibold text-muted-foreground">· {band.risk_action_name}</span>}
    </span>
  );
}

// A screening's effective result as the main value, the raw one secondary
// when a false positive cleared it: "Clear · 0 (raw 100)".
export function EffectiveResult({ row }) {
  const { t } = useTranslation("aml");
  if (row?.status === "ERROR") {
    return (
      <span className="text-[11px] font-semibold text-destructive" title={row.error || undefined}>
        {t("screeningFailed")}
      </span>
    );
  }
  const effective = row?.effective_score ?? row?.score;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <BandBadge band={row?.effective_band ?? row?.band} score={effective} />
      {row?.effective_score != null && row.score !== row.effective_score && (
        <span className="text-[10px] tabular-nums text-muted-foreground">{t("rawScore", { score: row.score })}</span>
      )}
    </span>
  );
}

// Why a match's score differs from its name score.
const ADJUSTMENT_KEYS = {
  DOB_EXACT: "adjDobExact",
  DOB_YEAR: "adjDobYear",
  DOB_CONFLICT: "adjDobConflict",
  COUNTRY_MATCH: "adjCountryMatch",
  COUNTRY_DIFFER: "adjCountryDiffer",
  GENDER_DIFFER: "adjGenderDiffer",
  IDENTIFIER_MATCH: "adjIdentifierMatch",
};
// AML Setup's category weights (handoff 18): percent kept of a match's score.
export const AML_CATEGORIES = ["SANCTIONS", "PEP", "CRIME", "DEBARMENT", "REGULATORY", "INTERNAL", "BLACKLIST"];

// A name in any script (Arabic reads right to left inside the page), with
// the server's Latin spelling under it when there is one: a reading aid
// made by rule, not an official spelling.
export function NameText({ name, latin, className = "" }) {
  const { t } = useTranslation("aml");
  return (
    <span className={`inline-grid ${className}`}>
      <span dir="auto">{name ?? "-"}</span>
      {latin && latin !== name && (
        <span className="text-[11px] font-normal text-muted-foreground" title={t("latinSpellingHint")}>
          {t("latinSpelling")}: {latin}
        </span>
      )}
    </span>
  );
}

// A match whose name was found in another script ("matched_via").
export function ViaTag({ via }) {
  const { t } = useTranslation("aml");
  if (via !== "transliteration") return null;
  return <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">{t("matchedAcrossScripts")}</span>;
}

// A blacklist match found by a shared phone, email or document: it can't be
// cleared as a false positive (blacklist beats whitelist).
export const blacklistByIdentifier = (m) => m?.list === "BLACKLIST" && (m.adjustments ?? []).some((a) => a.reason === "IDENTIFIER_MATCH");

// "SA" -> "Saudi Arabia" in the page language; the code as is otherwise.
export function countryNameOf(code, language = "en") {
  try {
    return /^[A-Z]{2}$/i.test(code ?? "") ? new Intl.DisplayNames([language], { type: "region" }).of(code.toUpperCase()) ?? code : code;
  } catch {
    return code;
  }
}

// What the bands use: the weighted score, or the plain one before weights.
export const matchScore = (m) => m?.weighted_score ?? m?.score;

// "100 → 50 (PEP 50%)" when a weight cut the score.
export function WeightNote({ match }) {
  const { t } = useTranslation("aml");
  if (!(Number(match?.weight) < 100)) return null;
  return <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">{t("weightedFrom", { score: match.score, weighted: matchScore(match), category: t(`category_${match.category}`, { defaultValue: match.category }), weight: match.weight })}</span>;
}

// The other lists the same person was found on.
export function AlsoOnChips({ alsoOn }) {
  const { t } = useTranslation("aml");
  if (!alsoOn?.length) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className="text-[10px] font-semibold text-muted-foreground">{t("alsoOn")}</span>
      {alsoOn.map((o) => (
        <span key={o.entity_id ?? o.list} title={`${o.entity_id} · ${t(`category_${o.category}`, { defaultValue: o.category })} · ${o.score}`} className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">
          {o.list} <span className="font-sans font-semibold">· {t(`category_${o.category}`, { defaultValue: o.category })} {o.score}</span>
        </span>
      ))}
    </span>
  );
}

export function AdjustmentChips({ adjustments }) {
  const { t } = useTranslation("aml");
  if (!adjustments?.length) return null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {adjustments.map((a) => (
        <span
          key={a.reason}
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${a.points >= 0 ? GOOD : BAD}`}
        >
          {ADJUSTMENT_KEYS[a.reason] ? t(ADJUSTMENT_KEYS[a.reason]) : a.reason} {a.points > 0 ? `+${a.points}` : a.points}
        </span>
      ))}
    </span>
  );
}

const REVIEW_TONES = {
  OPEN: "bg-muted text-muted-foreground",
  PENDING: "bg-amber-50 text-amber-700",
  FALSE_POSITIVE: GOOD,
  TRUE_MATCH: BAD,
  LAPSED: "bg-amber-50 text-amber-700",
  EXPIRED: "bg-amber-50 text-amber-700",
  REVOKE: "bg-amber-50 text-amber-700",
};
export function ReviewStateBadge({ state }) {
  const { t } = useTranslation("aml");
  const key = state || "OPEN";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${REVIEW_TONES[key] ?? REVIEW_TONES.OPEN}`}>{t(`review_${key}`, { defaultValue: key })}</span>;
}

export const scoreTone = (score) => (score >= 85 ? "text-destructive" : score >= 60 ? "text-amber-600" : "text-success");

// The listed record behind a match. Many fields may be empty.
export function EntityRecord({ entity }) {
  const { t } = useTranslation("aml");
  if (!entity) return null;
  const rows = [
    [t("aliases"), entity.aliases?.join(", ")],
    [t("birthDates"), (entity.birth_dates?.length ? entity.birth_dates : entity.birth_years)?.join(", ")],
    [t("countries"), [...new Set([...(entity.nationalities ?? []), ...(entity.countries ?? [])])].join(", ")],
    [t("identifiers"), entity.identifiers?.map((i) => `${i.type ?? ""} ${i.number ?? ""}`.trim()).join(", ")],
    [t("programs"), entity.programs?.join(", ")],
    [t("listedOn"), entity.listed_on],
    [t("remarks"), Array.isArray(entity.remarks) ? entity.remarks.join("; ") : entity.remarks],
  ].filter(([, v]) => v);
  return (
    <div className="rounded-lg bg-muted/50 p-2.5 text-xs">
      <p dir="auto" className="font-semibold text-slate-700">{entity.name}</p>
      <dl className="mt-1 grid gap-x-3 gap-y-0.5 sm:grid-cols-[auto_1fr]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd dir="auto" className="break-words">{value}</dd>
          </div>
        ))}
      </dl>
      {entity.source_url && (
        <a href={entity.source_url} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 font-semibold text-primary">
          {t("publisherPage")} <ExternalLink size={11} />
        </a>
      )}
    </div>
  );
}

// "Director · Vladimir Putin" style party label for a screening row.
export const partyLabel = (row) => [row?.name, row?.party_role].filter(Boolean).join(" · ") || "-";

// Customers and merchants are screened by the same AML (merchant APIs handoff).
export const CUSTOMER_KINDS = ["INDIVIDUAL", "CORPORATE", "MERCHANT_INDIVIDUAL", "MERCHANT_CORPORATE"];
export const TRIGGERS = ["SUBMIT", "RESCREEN", "ONGOING"];
