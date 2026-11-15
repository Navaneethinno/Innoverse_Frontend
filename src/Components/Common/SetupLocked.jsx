import { ArrowRight, Lock } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";
import { useTranslation } from "react-i18next";
import { Button } from "@/Components/Common/Button";
import { useGoTo, useMenuLabelOf } from "@/Components/Layout/Menu/goTo";
import { needText } from "@/Hooks/useSetup";

// "Form Builder › Sections": a place's menu label and its part.
export function usePlaceLabel() {
  const { t } = useTranslation("setup");
  const labelOf = useMenuLabelOf();
  return (place) => {
    const menu = labelOf(place?.menu_id);
    if (!menu) return null;
    return place.part ? `${menu} › ${t(`part_${place.part}`, { defaultValue: place.part })}` : menu;
  };
}

// One need and where it is set up: a button to its fix, or why there is
// none (not in the institution's plan / not in this user's menus / the
// service provider sets it up / the fix is itself locked, in which case
// the path above says where to start).
function NeedRow({ need, quiet }) {
  const { t } = useTranslation("setup");
  const goTo = useGoTo();
  const placeLabel = usePlaceLabel();
  const fix = need.fix ?? {};
  const fixLabel = placeLabel(fix);
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
      <span className={`flex items-center gap-2 text-sm ${quiet ? "text-muted-foreground" : "font-semibold text-slate-800"}`}>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${quiet ? "bg-slate-300" : "bg-amber-500"}`} />
        {needText(need)}
      </span>
      {fix.external ? (
        <span className="text-xs text-muted-foreground">{t("providerSetsUp")}</span>
      ) : fix.available === false ? (
        <span className="text-xs text-muted-foreground">{t("notInPlan")}</span>
      ) : fix.state === "LOCKED" ? null : !fixLabel ? (
        <span className="text-xs text-muted-foreground">{t("askAdmin", { label: fix.part ? t(`part_${fix.part}`, { defaultValue: fix.part }) : `#${fix.menu_id}` })}</span>
      ) : (
        <Button size="sm" variant={quiet ? "secondary" : "primary"} icon={ArrowRight} onClick={() => goTo({ menu_id: fix.menu_id, part: fix.part })}>
          {t("setUpIn", { label: fixLabel })}
        </Button>
      )}
    </li>
  );
}

// A locked menu or tab (Admin_33 B5): shown in place of its list, with no
// Add button. Required needs say why; recommended ones come after, quieter.
export function SetupLocked({ label, needs = [], path = [] }) {
  const { t } = useTranslation("setup");
  const goTo = useGoTo();
  const placeLabel = usePlaceLabel();
  // More than one place to set up (Admin_34 B1): the whole path in order,
  // starting at the first one that can be done now.
  const steps = path.length > 1 ? path : [];
  const start = steps.find((p) => p.state !== "LOCKED" && !p.external && p.available !== false && placeLabel(p));
  const required = needs.filter((n) => n.required);
  const recommended = needs.filter((n) => !n.required);
  return (
    <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-border bg-card p-6">
      <p className="flex items-center gap-2 text-lg font-black text-slate-800">
        <Lock size={18} className="text-amber-600" /> {t("notReady", { label })}
      </p>
      {steps.length > 0 && (
        <div className="mb-4 mt-3 rounded-xl border border-[var(--primary-light)] p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("whereToBegin")}</p>
          <ol className="grid gap-1.5">
            {steps.map((p, i) => {
              const name = placeLabel(p) ?? `#${p.menu_id}`;
              const doable = p.state !== "LOCKED" && !p.external && p.available !== false && placeLabel(p);
              return (
                <li key={`${p.menu_id}:${p.part ?? ""}`} className="flex items-center gap-2 text-sm">
                  <span className="w-5 shrink-0 text-right font-bold tabular-nums text-muted-foreground">{i + 1}.</span>
                  {doable ? (
                    <button type="button" className="font-semibold text-primary hover:underline" onClick={() => goTo({ menu_id: p.menu_id, part: p.part })}>
                      {name}
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      {p.state === "LOCKED" && <Lock size={11} />} {name}
                      {p.external && <span className="text-[11px]">· {t("byProvider")}</span>}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          {start && (
            <Button size="sm" className="mt-3" icon={ArrowRight} onClick={() => goTo({ menu_id: start.menu_id, part: start.part })}>
              {t("startAt", { label: placeLabel(start) })}
            </Button>
          )}
        </div>
      )}
      <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("itNeeds").replace(/:\s*$/, "")}</p>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {required.map((n, i) => (
          <NeedRow key={`r${i}`} need={n} />
        ))}
      </ul>
      {recommended.length > 0 && (
        <>
          <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("recommendedFirst")}</p>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {recommended.map((n, i) => (
              <NeedRow key={`o${i}`} need={n} quiet />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// A TODO menu with recommended needs: a slim line above the list.
export function SetupRecommended({ needs = [], className = "mb-3" }) {
  const { t } = useTranslation("setup");
  const goTo = useGoTo();
  const labelOf = useMenuLabelOf();
  const recommended = needs.filter((n) => !n.required);
  if (!recommended.length) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs text-sky-900", className)}>
      <span className="font-bold">{t("recommendedFirst")}:</span>
      {recommended.map((n, i) => {
        const label = labelOf(n.fix?.menu_id);
        return (
          <span key={i}>
            {needText(n)}
            {label && n.fix?.available !== false && (
              <button type="button" className="ml-1 font-bold underline" onClick={() => goTo({ menu_id: n.fix.menu_id, part: n.fix.part })}>
                {t("setUpIn", { label })}
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}

// After the first save on a menu: its guide's next step that can be done
// now (menus[].next), the same step as the sidebar tag and the dashboard
// card. Nothing when there is none.
export function SetupNext({ next, className = "mb-3" }) {
  const { t } = useTranslation("setup");
  const goTo = useGoTo();
  const placeLabel = usePlaceLabel();
  const label = next && !next.external ? placeLabel(next) : null;
  if (!label) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-900", className)}>
      <span className="font-bold">{t("next")}:</span>
      <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 font-bold hover:bg-emerald-100" onClick={() => goTo({ menu_id: next.menu_id, part: next.part })}>
        {label} <ArrowRight size={12} />
      </button>
    </div>
  );
}
