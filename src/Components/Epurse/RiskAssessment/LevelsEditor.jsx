import { useTranslation } from "react-i18next";
import { Plus, X } from "lucide-react";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { codeOf } from "../NotificationCenter/notificationShared";
import { LevelBar } from "./riskShared";

const cell = "w-full rounded-lg border px-2 py-1.5 text-sm";

// Levels must cover 0–100 with no gaps or overlaps, so only each level's
// maximum is edited: the first starts at 0 and every other starts where the
// previous one ends (a boundary score belongs to the higher level).
export const chainLevels = (levels) =>
  levels.map((l, i) => ({ ...l, min_score: i === 0 ? 0 : levels[i - 1].max_score }));

export function LevelsEditor({ levels, riskActions, onChange }) {
  const { t } = useTranslation("risk");
  const chained = chainLevels(levels);
  const last = chained[chained.length - 1];
  const set = (index, patch) => onChange(chainLevels(levels.map((l, i) => (i === index ? { ...l, ...patch } : l))));
  const add = () => {
    const from = Number(last?.max_score ?? 0);
    onChange(chainLevels([...levels, { code: "", name: "", min_score: from, max_score: 100, color_code: "", risk_action_id: "" }]));
  };
  const actionOptions = [{ value: "", label: t("selectAction") }, ...riskActions.map((a) => ({ value: a.id, label: a.name }))];

  return (
    <section>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">
            {t("levels")} <span className="text-red-500">*</span>
          </p>
          <p className="text-[11px] text-muted-foreground">{t("levelsHint")}</p>
        </div>
        <button type="button" onClick={add} className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold text-primary">
          <Plus size={13} /> {t("addLevel")}
        </button>
      </div>

      <div className="mt-2">
        <LevelBar levels={chained} />
      </div>
      {last && Number(last.max_score) !== 100 && <p className="mt-1 text-[11px] font-semibold text-amber-700">{t("lastLevelMustEnd")}</p>}

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-[11px] font-semibold text-muted-foreground">
              <th className="px-1 pb-1">{t("code")}</th>
              <th className="px-1 pb-1">{t("name")}</th>
              <th className="w-16 px-1 pb-1 text-right">{t("minScore")}</th>
              <th className="w-20 px-1 pb-1">{t("maxScore")}</th>
              <th className="w-24 px-1 pb-1">{t("colour")}</th>
              <th className="w-40 px-1 pb-1">{t("riskAction")}</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {chained.map((l, index) => (
              <tr key={index}>
                <td className="p-1">
                  <input value={l.code} onChange={(e) => set(index, { code: codeOf(e.target.value) })} className={`${cell} font-mono`} placeholder="LOW" />
                </td>
                <td className="p-1">
                  <input value={l.name} onChange={(e) => set(index, { name: e.target.value })} className={cell} placeholder={t("levelNamePlaceholder")} />
                </td>
                <td className="p-1 text-right tabular-nums text-muted-foreground">{l.min_score}</td>
                <td className="p-1">
                  <input type="number" min="0" max="100" step="any" value={l.max_score} onChange={(e) => set(index, { max_score: e.target.value })} className={`${cell} text-right tabular-nums`} />
                </td>
                <td className="p-1">
                  <div className="flex items-center gap-1">
                    <input type="color" aria-label={t("colour")} value={l.color_code || "#9E9E9E"} onChange={(e) => set(index, { color_code: e.target.value.toUpperCase() })} className="h-8 w-9 cursor-pointer rounded border bg-transparent p-0.5" />
                    {l.color_code ? (
                      <UiTooltip label={t("clearColour")}>
                        <button type="button" onClick={() => set(index, { color_code: "" })} className="rounded p-1 text-muted-foreground hover:text-destructive">
                          <X size={12} />
                        </button>
                      </UiTooltip>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">{t("noColour")}</span>
                    )}
                  </div>
                </td>
                <td className="p-1">
                  <FilterSelect size="sm" value={l.risk_action_id} onChange={(v) => set(index, { risk_action_id: v === "" ? "" : Number(v) })} options={actionOptions} />
                </td>
                <td className="p-1">
                  <UiTooltip label={t("removeLevel")}>
                    <button type="button" disabled={levels.length === 1} onClick={() => onChange(chainLevels(levels.filter((_, i) => i !== index)))} className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-30">
                      <X size={14} />
                    </button>
                  </UiTooltip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
