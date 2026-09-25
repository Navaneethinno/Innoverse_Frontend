import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Calculator } from "lucide-react";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Spinner } from "@/Components/Common/Spinner";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { LevelChip } from "./riskShared";

// "Test score": one dropdown per criterion, POST <base>/score. Scores the
// setup as saved (a pending edit isn't used until approved); nothing is saved.
export function TestScorePanel({ api, row, risk }) {
  const { t } = useTranslation("risk");
  const [values, setValues] = useState({});
  const [result, setResult] = useState(null);
  const [scoring, setScoring] = useState(false);
  const criteria = row.criteria ?? [];

  useEffect(() => {
    criteria.forEach((c) => risk.loadValues(c.field_code));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id, risk.loadValues]);

  const run = async () => {
    setScoring(true);
    try {
      const chosen = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== ""));
      setResult(rowsOf(await api.score({ id: row.id, values: chosen }))[0] ?? null);
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setScoring(false);
    }
  };

  return (
    <div className="rounded-xl border p-3">
      <p className="text-sm font-semibold text-slate-700">{t("testScore")}</p>
      <p className="text-[11px] text-muted-foreground">{t("testScoreHint")}</p>
      <div className="mt-2 space-y-2">
        {criteria.map((c) => (
          <label key={c.field_code} className="block text-xs font-semibold text-muted-foreground">
            {risk.fieldName(c.field_code)} · {c.weight}%
            <FilterSelect
              size="sm"
              className="mt-1"
              value={values[c.field_code] ?? ""}
              onChange={(v) => {
                setValues((prev) => ({ ...prev, [c.field_code]: v === "" ? "" : Number(v) }));
                setResult(null);
              }}
              options={[{ value: "", label: t("unanswered") }, ...(risk.values[c.field_code] ?? []).map((v) => ({ value: v.id, label: v.name }))]}
            />
          </label>
        ))}
      </div>
      <button type="button" disabled={scoring} onClick={() => void run()} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
        {scoring ? <Spinner size={13} /> : <Calculator size={14} />} {t("calculate")}
      </button>

      {result && (
        <div className="mt-3 rounded-xl bg-muted/50 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-2xl font-black tabular-nums">{result.score}</span>
            <div className="text-right">
              <LevelChip level={result.level} />
              <p className="mt-0.5 text-[11px] text-muted-foreground">{risk.actionName(result.level?.risk_action_id)}</p>
            </div>
          </div>
          <table className="mt-2 w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="font-semibold">{t("criterion")}</th>
                <th className="text-right font-semibold">{t("scoreCol")}</th>
                <th className="text-right font-semibold">{t("weight")}</th>
                <th className="text-right font-semibold">{t("points")}</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {(result.points ?? []).map((p) => (
                <tr key={p.field_code}>
                  <td className="py-0.5">
                    {risk.fieldName(p.field_code)}
                    {p.value_id != null && <span className="text-muted-foreground"> · {risk.valueName(p.field_code, p.value_id)}</span>}
                  </td>
                  <td className="text-right">{p.score}</td>
                  <td className="text-right">{p.weight}%</td>
                  <td className="text-right font-bold">{p.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
