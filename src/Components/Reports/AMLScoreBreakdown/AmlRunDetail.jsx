import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowRight, ChevronDown } from "lucide-react";
import { Spinner } from "@/Components/Common/Spinner";
import { amlBreakdownApi } from "@/Services/Reports/amlBreakdown.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { LevelBar } from "@/Components/Epurse/RiskAssessment/riskShared";
import { EntityRecord, ReviewStateBadge, scoreTone } from "@/Components/InnoAML/Shared/amlShared";
import { BandChip, ReportDetailPage, atIst } from "../Shared/reportShared";

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-black uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

const pct = (n) => `${Math.max(0, Math.min(100, Number(n) || 0))}%`;

// 0–100 split into the setup's bands (as they are now), a marker at the
// run's score and a dashed line at the minimum match score it used.
function ScoreBar({ levels, score, minMatch }) {
  const { t } = useTranslation("reports");
  return (
    <div>
      <div className="relative pt-5">
        <span
          className="absolute top-0 -translate-x-1/2 text-[10px] font-black tabular-nums"
          style={{ left: pct(score) }}
        >
          {score}▼
        </span>
        {minMatch != null && (
          <span
            className="absolute bottom-4 top-5 z-10 border-l-2 border-dashed border-slate-700"
            style={{ left: pct(minMatch) }}
          />
        )}
        <LevelBar levels={levels} />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        {(levels ?? []).map((l) => (
          <span key={l.code} className="inline-flex items-center gap-1">
            <BandChip name={`${l.name} ${l.min_score}–${l.max_score}`} color={l.color_code} />
          </span>
        ))}
        {minMatch != null && <span>┊ {t("minMatchLine", { score: minMatch })}</span>}
      </div>
    </div>
  );
}

function Adjustments({ list }) {
  if (!list?.length) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {list.map((a) => (
        <span
          key={a.reason}
          className={`whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold ${a.points >= 0 ? "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-success" : "bg-[color-mix(in_srgb,var(--destructive)_12%,transparent)] text-destructive"}`}
        >
          {a.reason_name ?? a.reason} {a.points > 0 ? `+${a.points}` : `−${Math.abs(a.points)}`}
        </span>
      ))}
    </span>
  );
}

// One match row; a false positive didn't count, so it's struck through.
function MatchRow({ m }) {
  const [open, setOpen] = useState(false);
  const cleared = m.review?.state === "FALSE_POSITIVE";
  return (
    <>
      <tr className={`border-t align-top ${cleared ? "text-muted-foreground" : ""}`}>
        <td className="py-1.5 pr-2">
          <span className="font-mono text-[11px]">{m.list}</span>
          {m.category && (
            <span className="block text-[10px] text-muted-foreground">{m.category}</span>
          )}
        </td>
        <td className={`py-1.5 pr-2 font-semibold ${cleared ? "line-through" : ""}`}>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="inline-flex items-center gap-1 text-left hover:text-primary"
          >
            {m.listed_name} <ChevronDown size={11} className={open ? "rotate-180" : ""} />
          </button>
        </td>
        <td className="py-1.5 pr-2">{m.matched_name}</td>
        <td className="py-1.5 pr-2 text-right tabular-nums">{m.name_score}</td>
        <td className="py-1.5 pr-2">
          <Adjustments list={m.adjustments} />
        </td>
        <td
          className={`py-1.5 pr-2 text-right font-black tabular-nums ${cleared ? "line-through" : scoreTone(m.score)}`}
        >
          {m.score}
        </td>
        <td className="py-1.5">
          <ReviewStateBadge state={m.review?.state} />
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} className="pb-2">
            <EntityRecord entity={m.entity} />
          </td>
        </tr>
      )}
    </>
  );
}

function PartyCard({ party }) {
  const { t } = useTranslation("reports");
  const s = party.subject ?? {};
  const facts = [s.birth_date, (s.countries ?? []).join(", "), s.gender, s.entity_type]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="rounded-xl border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-slate-800">
            {party.name}{" "}
            <span className="text-xs font-semibold text-muted-foreground">
              · {party.party_role}
            </span>
          </p>
          {facts && (
            <p className="text-[11px] text-muted-foreground">{t("screenedAs", { facts })}</p>
          )}
          {party.alt_names?.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              {t("alsoScreened", { names: party.alt_names.join(", ") })}
            </p>
          )}
        </div>
        {party.status === "ERROR" ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-amber-700">
            <AlertTriangle size={13} /> {t("notScreened")}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span
              className={`text-xl font-black tabular-nums ${scoreTone(party.effective_score ?? 0)}`}
            >
              {party.effective_score ?? 0}
            </span>
            <BandChip
              name={party.effective_band?.name ?? t("noBand")}
              color={party.effective_band?.color_code}
            />
          </span>
        )}
      </div>
      {party.status === "ERROR" ? (
        <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
          {party.error || t("someNotScreened")}
        </p>
      ) : party.matches?.length ? (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1 pr-2 font-semibold">{t("list")}</th>
                <th className="py-1 pr-2 font-semibold">{t("listedName")}</th>
                <th className="py-1 pr-2 font-semibold">{t("matchedOn")}</th>
                <th className="py-1 pr-2 text-right font-semibold">{t("nameScore")}</th>
                <th className="py-1 pr-2 font-semibold">{t("adjustments")}</th>
                <th className="py-1 pr-2 text-right font-semibold">{t("score")}</th>
                <th className="py-1 font-semibold">{t("review")}</th>
              </tr>
            </thead>
            <tbody>
              {party.matches.map((m) => (
                <MatchRow key={m.match_id ?? m.entity_id} m={m} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">{t("noMatch")}</p>
      )}
    </div>
  );
}

// "What changed since the previous screening": score and band, then per
// party new / gone / rescored matches (or the party added / removed).
function Changes({ changes }) {
  const { t } = useTranslation("reports");
  const moved = (label, list) =>
    list?.length > 0 && (
      <p className="text-[11px]">
        <b>{label}:</b>{" "}
        {list
          .map((m) => `${m.listed_name} (${m.list}) ${m.score_before} → ${m.score_after}`)
          .join("; ")}
      </p>
    );
  return (
    <div className="space-y-2">
      <p className="flex flex-wrap items-center gap-2 text-xs">
        <b className="tabular-nums">{changes.score_before}</b>
        <BandChip
          name={changes.band_before?.name ?? t("noBand")}
          color={changes.band_before?.color_code}
        />
        <ArrowRight size={12} className="text-muted-foreground" />
        <b className="tabular-nums">{changes.score_after}</b>
        <BandChip
          name={changes.band_after?.name ?? t("noBand")}
          color={changes.band_after?.color_code}
        />
      </p>
      {changes.parties?.length ? (
        changes.parties.map((p) => (
          <div key={p.party_key} className="rounded-lg border p-2 text-xs">
            <p className="font-semibold">
              {p.name} <span className="text-muted-foreground">· {p.party_role}</span>
              <span className="ml-2 rounded-full bg-muted px-1.5 text-[10px] font-bold">
                {t(`partyChange_${p.change}`, { defaultValue: p.change })}
              </span>
              <span className="ml-2 tabular-nums text-muted-foreground">
                {p.score_before} → {p.score_after}
              </span>
            </p>
            {moved(t("newMatches"), p.new_matches)}
            {moved(t("goneMatches"), p.gone_matches)}
            {moved(t("rescored"), p.rescored)}
          </div>
        ))
      ) : (
        <p className="text-xs text-muted-foreground">{t("noPartyChanges")}</p>
      )}
    </div>
  );
}

// One screening run (aml_breakdown/get) as a full page: the score over the
// bands, a card per party with its matches, what changed since the
// previous run, and the customer's run history (click to load a run).
export function AmlRunDetail({ runId, onClose }) {
  const { t } = useTranslation("reports");
  const [id, setId] = useState(runId);
  const [item, setItem] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setItem(null);
    amlBreakdownApi
      .get({ run_id: id })
      .then((r) => !cancelled && setItem(rowsOf(r)[0] ?? null))
      .catch((error) => {
        notifications.error(error.message);
        if (!cancelled) onClose();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <ReportDetailPage onBack={onClose} title={item ? item.customer_name : t("amlTitle")}>
      {!item ? (
        <div className="flex justify-center py-10">
          <Spinner size={22} />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
            <span className="text-3xl font-black tabular-nums">{item.score}</span>
            {item.raw_score != null && item.raw_score !== item.score && (
              <span className="text-xs text-muted-foreground">
                {t("raw", { score: item.raw_score })}
              </span>
            )}
            <BandChip name={item.band?.name ?? t("noBand")} color={item.band?.color_code} />
            <span className="text-xs font-semibold">{item.band?.risk_action_name ?? "—"}</span>
            <span className="text-xs text-muted-foreground">
              {t(`kind_${item.customer_kind}`)} · {atIst(item.screened_at)} · {item.screened_by} ·{" "}
              {item.trigger_name}
            </span>
            {!item.is_latest && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">
                {t("earlier")}
              </span>
            )}
            {item.status === "ERROR" && (
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-700">
                <AlertTriangle size={13} /> {t("someNotScreened")}
              </span>
            )}
          </div>

          <Section title={t("scoreAndBands")}>
            {item.setup ? (
              <ScoreBar
                levels={item.setup.levels}
                score={item.score}
                minMatch={item.setup.min_match_score ?? item.min_match_score}
              />
            ) : (
              <p className="text-xs text-muted-foreground">{t("noAmlSetupThen")}</p>
            )}
          </Section>

          <Section title={t("partiesScreened", { count: item.parties?.length ?? 0 })}>
            <div className="space-y-3">
              {(item.parties ?? []).map((p) => (
                <PartyCard key={p.party_key ?? p.screening_id} party={p} />
              ))}
            </div>
          </Section>

          {item.previous && item.changes && (
            <Section title={t("sincePreviousScreening")}>
              <Changes changes={item.changes} />
            </Section>
          )}

          {item.history?.length > 1 && (
            <Section title={t("screeningHistory")}>
              <ol className="relative space-y-2 border-l pl-4">
                {item.history.map((h) => (
                  <li key={h.run_id} className="relative text-xs">
                    <span
                      className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card ${h.run_id === item.run_id ? "bg-primary" : "bg-muted-foreground"}`}
                    />
                    <button
                      type="button"
                      disabled={h.run_id === item.run_id}
                      onClick={() => setId(h.run_id)}
                      className="flex flex-wrap items-center gap-2 text-left enabled:hover:text-primary"
                    >
                      <span className="text-muted-foreground">{atIst(h.screened_at)}</span>
                      <b className="tabular-nums">{h.score}</b>
                      <BandChip name={h.band?.name ?? t("noBand")} color={h.band?.color_code} />
                      <span className="text-muted-foreground">{h.trigger_name}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </Section>
          )}
        </div>
      )}
    </ReportDetailPage>
  );
}
