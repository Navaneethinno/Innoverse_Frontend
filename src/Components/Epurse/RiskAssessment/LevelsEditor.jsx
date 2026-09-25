import { useTranslation } from "react-i18next";
import { Plus, X } from "lucide-react";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { codeOf } from "../NotificationCenter/notificationShared";
import { LevelBar } from "./riskShared";

// Levels must cover 0–100 with no gaps or overlaps, so only each level's
// maximum is edited: the first starts at 0 and every other starts where the
// previous one ends (a boundary score belongs to the higher level).
export const chainLevels = (levels) =>
  levels.map((l, i) => ({ ...l, min_score: i === 0 ? 0 : levels[i - 1].max_score }));

// Colours offered to a newly added level, after the default three.
const NEXT_COLOURS = ["#2196F3", "#9C27B0", "#795548", "#607D8B"];

export function LevelsEditor({ levels, riskActions, onChange }) {
  const { t } = useTranslation("risk");
  const chained = chainLevels(levels);
  const last = chained[chained.length - 1];
  const set = (index, patch) => onChange(chainLevels(levels.map((l, i) => (i === index ? { ...l, ...patch } : l))));
  const add = () => {
    const colour = NEXT_COLOURS.find((c) => !levels.some((l) => l.color_code === c)) ?? "";
    onChange(chainLevels([...levels, { code: "", name: "", min_score: last?.max_score ?? 0, max_score: 100, color_code: colour, risk_action_id: "" }]));
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
        <button type="button" onClick={add} className="flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold text-primary">
          <Plus size={13} /> {t("addLevel")}
        </button>
      </div>

      <div className="mt-3">
        <LevelBar levels={chained} />
      </div>
      {last && Number(last.max_score) !== 100 && <p className="mt-1 text-[11px] font-semibold text-amber-700">{t("lastLevelMustEnd")}</p>}

      <ul className="mt-3 divide-y rounded-xl border">
        {chained.map((l, index) => (
          <li key={index} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-2.5" style={{ boxShadow: `inset 3px 0 0 ${l.color_code || "transparent"}` }}>
            {/* Colour: the dot is the picker. */}
            <UiTooltip label={t("colour")}>
              <label className="relative ml-1 h-7 w-7 shrink-0 cursor-pointer rounded-full border-2 border-background shadow ring-1 ring-border" style={{ background: l.color_code || "var(--muted)" }}>
                <input type="color" aria-label={t("colour")} value={l.color_code || "#9E9E9E"} onChange={(e) => set(index, { color_code: e.target.value.toUpperCase() })} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
              </label>
            </UiTooltip>

            <div className="min-w-[10rem] flex-1">
              <input value={l.name} onChange={(e) => set(index, { name: e.target.value })} placeholder={t("levelNamePlaceholder")} aria-label={t("name")} className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-sm font-semibold hover:border-border focus:border-border focus:outline-none" />
              <input value={l.code} onChange={(e) => set(index, { code: codeOf(e.target.value) })} placeholder="CODE" aria-label={t("code")} className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground hover:border-border focus:border-border focus:outline-none" />
            </div>

            {/* Range: From follows the previous level; only To is typed. One
                oval holds both, the To number editable in place. */}
            <label className="flex h-8 shrink-0 cursor-text items-center gap-1 rounded-full border bg-background pl-3 pr-1 text-sm tabular-nums focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15" aria-label={t("scoreRange")}>
              <span className="text-muted-foreground">{l.min_score}</span>
              <span className="text-muted-foreground">–</span>
              <input type="number" min="0" max="100" step="any" value={l.max_score} aria-label={t("maxScore")} onChange={(e) => set(index, { max_score: e.target.value })} className="h-6 w-12 rounded-full border-0 bg-muted/60 px-2 text-right font-semibold shadow-none outline-none focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
            </label>

            <FilterSelect size="sm" className="w-40 shrink-0" value={l.risk_action_id} onChange={(v) => set(index, { risk_action_id: v === "" ? "" : Number(v) })} options={actionOptions} />

            <UiTooltip label={t("removeLevel")}>
              <button type="button" disabled={levels.length === 1} onClick={() => onChange(chainLevels(levels.filter((_, i) => i !== index)))} className="ml-auto rounded-lg p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-30">
                <X size={14} />
              </button>
            </UiTooltip>
          </li>
        ))}
      </ul>
    </section>
  );
}
