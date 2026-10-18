import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { Spinner } from "@/Components/Common/Spinner";
import { RISK_KINDS, RiskPointsTable } from "./riskShared";
import { useRiskOptions } from "./useRiskOptions";

// A customer's risk as the customer APIs return it. For now it is only
// recorded and shown — onboarding carries on the same whatever the action.
// Two shapes: the live score (`risk`: a `level` object with its colour) and
// a stored one (`risk_saved` / `risk_current`: level_code/level_name and
// assessed_at, no colour). Both are absent when the customer type has no
// active risk setup, so every component here renders nothing without them.
const levelOf = (result) => result.level ?? { code: result.level_code, name: result.level_name };

function RiskBadge({ result, colour }) {
  const level = levelOf(result);
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-bold"
      style={colour ? { borderColor: colour, background: `${colour}1a` } : undefined}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full border"
        style={{ background: colour || "transparent" }}
      />
      <span className="tabular-nums">{result.risk_score}</span>
      <span>{level.name ?? level.code}</span>
      {result.risk_action_name && (
        <span className="font-semibold text-muted-foreground">· {result.risk_action_name}</span>
      )}
    </span>
  );
}

// The "why" breakdown. Mounted only when opened, so the setup's options
// (field and value names) are fetched only when someone asks.
function RiskWhy({ kind, instProfileId, points }) {
  const risk = useRiskOptions(RISK_KINDS[kind].api, instProfileId || undefined);
  const { loadValues } = risk;
  useEffect(() => {
    (points ?? []).forEach((p) => p.value_id && loadValues(p.field_code));
  }, [points, loadValues]);
  if (risk.loading) {
    return (
      <div className="flex justify-center py-3">
        <Spinner size={16} />
      </div>
    );
  }
  return <RiskPointsTable points={points} risk={risk} />;
}

// One row per score: label, badge, optional note, and its own "why" toggle.
// A stored score has no colour of its own; it borrows the live level's
// colour when both name the same level.
function RiskScores({ kind, instProfileId, entries }) {
  const { t } = useTranslation("risk");
  const [open, setOpen] = useState(null);
  const shown = entries.filter((e) => e.result);
  if (!shown.length) return null;
  const colours = Object.fromEntries(
    shown
      .map((e) => levelOf(e.result))
      .filter((l) => l.color_code)
      .map((l) => [l.code, l.color_code]),
  );

  return (
    <div className="mb-4 rounded-xl border p-3">
      <p className="mb-2 text-xs font-bold text-slate-700">{t("customerRisk")}</p>
      <div className="space-y-2">
        {shown.map(({ key, label, result, note }) => (
          <div key={key}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-28 shrink-0 text-[11px] font-semibold text-muted-foreground">
                {label}
              </span>
              <RiskBadge result={result} colour={colours[levelOf(result).code]} />
              {note && <span className="text-[11px] text-muted-foreground">{note}</span>}
              <button
                type="button"
                aria-expanded={open === key}
                onClick={() => setOpen(open === key ? null : key)}
                className="ml-auto flex items-center gap-1 text-[11px] font-bold text-primary"
              >
                {t("whyScore")}
                <ChevronDown
                  size={13}
                  className={
                    open === key ? "rotate-180 transition-transform" : "transition-transform"
                  }
                />
              </button>
            </div>
            {open === key && (
              <RiskWhy kind={kind} instProfileId={instProfileId} points={result.points} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const assessedNote = (t, result) =>
  result?.assessed_at
    ? t("assessedAt", { when: new Date(result.assessed_at).toLocaleString() })
    : null;

// Customer detail (wizard): `risk` follows the answers as the maker fills
// them in; `risk_saved` is what was stored at the last approval.
export function CustomerRiskPanel({ kind, instProfileId, risk, saved }) {
  const { t } = useTranslation("risk");
  return (
    <RiskScores
      kind={kind}
      instProfileId={instProfileId}
      entries={[
        { key: "risk", label: t("riskFromAnswers"), result: risk },
        { key: "saved", label: t("riskApproved"), result: saved, note: assessedNote(t, saved) },
      ]}
    />
  );
}

// Checker's approval dialog (add/edit `pending`): the proposed answers'
// score next to the one stored now (absent for a new customer), so the
// checker sees how the change moves the risk.
export function PendingRiskCompare({ kind, instProfileId, pending }) {
  const { t } = useTranslation("risk");
  if (!pending?.risk) return null;
  return (
    <div className="mt-3">
      <RiskScores
        kind={kind}
        instProfileId={instProfileId}
        entries={[
          {
            key: "current",
            label: t("riskStoredNow"),
            result: pending.risk_current,
            note: assessedNote(t, pending.risk_current),
          },
          { key: "proposed", label: t("riskIfApproved"), result: pending.risk },
        ]}
      />
    </div>
  );
}
