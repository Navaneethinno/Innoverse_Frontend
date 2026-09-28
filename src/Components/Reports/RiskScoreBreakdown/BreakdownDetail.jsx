import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Info } from "lucide-react";
import { Spinner } from "@/Components/Common/Spinner";
import { riskBreakdownApi } from "@/Services/Reports/riskBreakdown.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { LevelBar } from "@/Components/Epurse/RiskAssessment/riskShared";
import { BandChip, ReportDetailPage, atIst } from "../Shared/reportShared";

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-black uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

// 0–100 split into the setup's bands, with a marker at the score. The band
// the assessment fell in is outlined.
function ScoreBar({ levels, score, levelCode }) {
  const pos = Math.max(0, Math.min(100, Number(score) || 0));
  return (
    <div className="relative pt-5">
      <span className="absolute top-0 -translate-x-1/2 text-[10px] font-black tabular-nums" style={{ left: `${pos}%` }}>
        {score}▼
      </span>
      <LevelBar levels={levels} />
      <div className="mt-1 flex flex-wrap gap-1.5">
        {(levels ?? []).map((l) => (
          <span key={l.code} className={`rounded-lg px-1.5 py-0.5 text-[11px] ${l.code === levelCode ? "ring-2 ring-primary" : ""}`}>
            <BandChip name={`${l.name} ${l.min_score}–${l.max_score}`} color={l.color_code} /> <span className="text-muted-foreground">{l.risk_action_name ?? "—"}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// The customer's value for a criterion: "Not given", "not scored in this
// setup", or several values with the one that counted (the riskiest).
function CriterionValue({ c }) {
  const { t } = useTranslation("reports");
  if (!c.answered) return <span className="italic text-muted-foreground">{t("notGiven")}</span>;
  if (c.values?.length) {
    return (
      <ul className="space-y-0.5">
        {c.values.map((v) => (
          <li key={v.value_id} className={v.counted ? "font-bold" : "text-muted-foreground"}>
            {v.value_name} <span className="tabular-nums">({v.score})</span>
            {v.counted && <span className="ml-1 rounded bg-primary-light px-1 text-[10px] text-primary">{t("counted")}</span>}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <span>
      {c.value_name}
      {!c.scored && <span className="block text-[10px] text-amber-700">{t("notScored")}</span>}
    </span>
  );
}

// One assessment (risk_breakdown/get): how the score was reached, what
// changed since the previous one, and the customer's assessment history —
// clicking a history entry loads that assessment here.
export function BreakdownDetail({ customerKind, assessmentId, onClose }) {
  const { t } = useTranslation("reports");
  const [id, setId] = useState(assessmentId);
  const [item, setItem] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setItem(null);
    riskBreakdownApi
      .get({ customer_kind: customerKind, assessment_id: id })
      .then((r) => !cancelled && setItem(rowsOf(r)[0] ?? null))
      .catch((error) => {
        notifications.error(error.message);
        if (!cancelled) onClose();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerKind, id]);

  const b = item?.breakdown ?? {};
  const criteria = b.criteria ?? [];
  const bandChanged = item?.previous && item.previous.level_code !== item.level_code;

  return (
    <ReportDetailPage onBack={onClose} title={item ? item.customer_name : t("breakdownTitle")}>
      {!item ? (
        <div className="flex justify-center py-10">
          <Spinner size={22} />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
            <span className="text-3xl font-black tabular-nums">{item.risk_score}</span>
            <BandChip name={item.level_name} color={item.level_color} />
            <span className="text-xs font-semibold">{item.risk_action_name ?? "—"}</span>
            <span className="text-xs text-muted-foreground">
              {t(`kind_${item.customer_kind}`)} · {b.setup?.name ?? item.risk_setup_name} · {atIst(item.assessed_at)} · {item.assessed_by} · {item.source_name}
            </span>
            {!item.is_latest && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">{t("earlier")}</span>}
          </div>

          {b.from_current_setup && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
              <Info size={14} className="mt-0.5 shrink-0" /> {t("fromCurrentSetup")}
            </p>
          )}

          <Section title={t("scoreAndBands")}>
            <ScoreBar levels={b.levels} score={item.risk_score} levelCode={item.level_code} />
            {b.max_score != null && <p className="text-[11px] text-muted-foreground">{t("highestPossible", { max: b.max_score })}</p>}
          </Section>

          <Section title={t("criteria")}>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-1 pr-2 font-semibold">{t("criterion")}</th>
                  <th className="py-1 pr-2 text-right font-semibold">{t("weight")}</th>
                  <th className="py-1 pr-2 font-semibold">{t("customerValue")}</th>
                  <th className="py-1 pr-2 text-right font-semibold">{t("valueScore")}</th>
                  <th className="py-1 text-right font-semibold">{t("points")}</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {criteria.map((c) => (
                  <tr key={c.field_code} className="border-b align-top">
                    <td className="py-1.5 pr-2 font-semibold text-slate-700">{c.field_name}</td>
                    <td className="py-1.5 pr-2 text-right">{c.weight}%</td>
                    <td className="py-1.5 pr-2">
                      <CriterionValue c={c} />
                    </td>
                    <td className="py-1.5 pr-2 text-right">{c.answered && c.scored ? c.score : "—"}</td>
                    <td className="py-1.5 text-right">
                      <b>{c.points}</b> <span className="text-muted-foreground">/ {c.max_points}</span>
                    </td>
                  </tr>
                ))}
                <tr className="font-black">
                  <td className="py-1.5" colSpan={4}>
                    {t("total")}
                  </td>
                  <td className="py-1.5 text-right">
                    {item.risk_score} {b.max_score != null && <span className="font-semibold text-muted-foreground">/ {b.max_score}</span>}
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {item.previous && (
            <Section title={t("sincePrevious", { score: item.previous.risk_score, band: item.previous.level_name })}>
              {item.changes?.length ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-1 pr-2 font-semibold">{t("criterion")}</th>
                      <th className="py-1 pr-2 font-semibold">{t("customerValue")}</th>
                      <th className="py-1 text-right font-semibold">{t("points")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.changes.map((c) => (
                      <tr key={c.field_code} className="border-b align-top last:border-0">
                        <td className="py-1.5 pr-2 font-semibold text-slate-700">{c.field_name}</td>
                        <td className="py-1.5 pr-2">
                          <span className="inline-flex flex-wrap items-center gap-1">
                            {c.before_value_name || <i className="text-muted-foreground">{t("none")}</i>} <ArrowRight size={11} className="text-muted-foreground" />
                            {c.after_value_name || <i className="text-muted-foreground">{t("none")}</i>}
                          </span>
                          {c.before_weight !== c.after_weight && (
                            <span className="block text-[10px] text-muted-foreground">{t("weightChange", { before: c.before_weight, after: c.after_weight })}</span>
                          )}
                        </td>
                        <td className="py-1.5 text-right tabular-nums">
                          {c.before_points} → <b>{c.after_points}</b>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-muted-foreground">{bandChanged ? t("bandsChanged") : t("noCriterionChanges")}</p>
              )}
            </Section>
          )}

          {item.history?.length > 1 && (
            <Section title={t("assessmentHistory")}>
              <ol className="relative space-y-2 border-l pl-4">
                {item.history.map((h) => (
                  <li key={h.assessment_id} className="relative text-xs">
                    <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card ${h.assessment_id === item.assessment_id ? "bg-primary" : "bg-muted-foreground"}`} />
                    <button
                      type="button"
                      disabled={h.assessment_id === item.assessment_id}
                      onClick={() => setId(h.assessment_id)}
                      className="flex flex-wrap items-center gap-2 text-left enabled:hover:text-primary"
                    >
                      <span className="text-muted-foreground">{atIst(h.assessed_at)}</span>
                      <b className="tabular-nums">{h.risk_score}</b>
                      <BandChip name={h.level_name} color={h.level_color} />
                      <span className="text-muted-foreground">{h.source_name}</span>
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
