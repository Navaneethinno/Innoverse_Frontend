import { ArrowRight, Check, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/Components/Common/Button";
import { useGoTo, useMenuLabelOf } from "@/Components/Layout/Menu/goTo";
import { cn } from "@/Utils/Lib/utils";

// A guide step's name: its own title (a part), else the menu's label.
function useStepLabel() {
  const { t } = useTranslation("setup");
  const labelOf = useMenuLabelOf();
  return (step) => {
    const menu = labelOf(step.menu_id);
    if (step.part) return [menu, step.title ?? t(`part_${step.part}`, { defaultValue: step.part })].filter(Boolean).join(" › ");
    return menu ?? step.title ?? `#${step.menu_id}`;
  };
}

// One setup guide (Admin_33 B8, /setup/state `flows[]`): its done/total bar
// and steps; each step opens its menu (and part) through goTo; `next` is
// marked.
export function SetupFlowChecklist({ flow }) {
  const { t } = useTranslation("setup");
  const goTo = useGoTo();
  const labelOf = useStepLabel();
  const isNext = (s) => flow.next && Number(s.menu_id) === Number(flow.next.menu_id) && (s.part ?? null) === (flow.next.part ?? null);
  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black">{flow.title}</p>
        <span className="text-[11px] font-bold tabular-nums text-muted-foreground">
          {flow.done}/{flow.total}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${flow.total ? (flow.done / flow.total) * 100 : 0}%` }} />
      </div>
      <ul className="mt-2 grid gap-0.5">
        {(flow.steps ?? []).map((s, i) => (
          <li key={`${s.menu_id}:${s.part ?? ""}:${i}`}>
            <button
              type="button"
              onClick={() => goTo({ menu_id: s.menu_id, part: s.part }, { label: s.title })}
              className={cn("flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-xs hover:bg-muted", isNext(s) && "bg-[var(--primary-light)]")}
            >
              <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-full border", s.state === "DONE" ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/40")}>
                {s.state === "DONE" ? <Check size={10} strokeWidth={3} /> : s.state === "LOCKED" ? <Lock size={8} className="text-muted-foreground" /> : null}
              </span>
              <span className={cn("flex-1 truncate", s.state === "DONE" ? "text-muted-foreground line-through" : s.state === "LOCKED" ? "text-muted-foreground" : "font-semibold")}>{labelOf(s)}</span>
              {isNext(s) && <span className="shrink-0 rounded-full bg-[var(--primary)] px-1.5 text-[9px] font-bold leading-4 text-primary-foreground">{t("nextTag")}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// On a module dashboard: a not-complete guide in one line, with Continue.
export function SetupFlowCard({ flow }) {
  const { t } = useTranslation("setup");
  const goTo = useGoTo();
  const labelOf = useStepLabel();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--primary-light)] bg-card p-4">
      <div className="min-w-0">
        <p className="text-sm font-bold">{t("progress", { title: flow.title, done: flow.done, total: flow.total })}</p>
        {flow.next && <p className="text-xs text-muted-foreground">{t("nextStep", { label: labelOf(flow.next) })}</p>}
        <div className="mt-2 h-1.5 w-48 max-w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${flow.total ? (flow.done / flow.total) * 100 : 0}%` }} />
        </div>
      </div>
      {flow.next && (
        <Button size="sm" icon={ArrowRight} onClick={() => goTo({ menu_id: flow.next.menu_id, part: flow.next.part }, { label: flow.next.title })}>
          {t("continue")}
        </Button>
      )}
    </div>
  );
}
