import { ArrowRight, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/Components/Common/Button";
import { useGoTo, useMenuLabelOf } from "@/Components/Layout/Menu/goTo";
import { needText } from "@/Hooks/useSetup";

// One need and where it is set up: a button to its fix, or why there is
// none (not in the institution's plan / not in this user's menus).
function NeedRow({ need, quiet }) {
  const { t } = useTranslation("setup");
  const goTo = useGoTo();
  const labelOf = useMenuLabelOf();
  const fix = need.fix ?? {};
  const fixLabel = labelOf(fix.menu_id);
  return (
    <li className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 ${quiet ? "border-border bg-card" : "border-amber-200 bg-amber-50/60"}`}>
      <span className={`text-sm ${quiet ? "text-muted-foreground" : "font-semibold text-slate-800"}`}>{needText(need)}</span>
      {fix.available === false ? (
        <span className="text-xs text-muted-foreground">{t("notInPlan")}</span>
      ) : !fixLabel ? (
        <span className="text-xs text-muted-foreground">{t("askAdmin", { label: fix.part ? t(`part_${fix.part}`, { defaultValue: fix.part }) : `#${fix.menu_id}` })}</span>
      ) : (
        <Button size="sm" variant={quiet ? "secondary" : "primary"} icon={ArrowRight} onClick={() => goTo({ menu_id: fix.menu_id, part: fix.part })}>
          {t("setUpIn", { label: fix.part ? `${fixLabel} › ${t(`part_${fix.part}`, { defaultValue: fix.part })}` : fixLabel })}
        </Button>
      )}
    </li>
  );
}

// A locked menu or tab (Admin_33 B5): shown in place of its list, with no
// Add button. Required needs say why; recommended ones come after, quieter.
export function SetupLocked({ label, needs = [] }) {
  const { t } = useTranslation("setup");
  const required = needs.filter((n) => n.required);
  const recommended = needs.filter((n) => !n.required);
  return (
    <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-border bg-card p-6">
      <p className="flex items-center gap-2 text-lg font-black text-slate-800">
        <Lock size={18} className="text-amber-600" /> {t("notReady", { label })}
      </p>
      <p className="mb-3 mt-1 text-sm text-muted-foreground">{t("itNeeds")}</p>
      <ul className="grid gap-2">
        {required.map((n, i) => (
          <NeedRow key={`r${i}`} need={n} />
        ))}
      </ul>
      {recommended.length > 0 && (
        <>
          <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("recommendedFirst")}</p>
          <ul className="grid gap-2">
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
export function SetupRecommended({ needs = [] }) {
  const { t } = useTranslation("setup");
  const goTo = useGoTo();
  const labelOf = useMenuLabelOf();
  const recommended = needs.filter((n) => !n.required);
  if (!recommended.length) return null;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
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

// After the first save on a menu: where to go next (its leads_to that are
// not DONE yet).
export function SetupNext({ leadsTo = [], stateOf }) {
  const { t } = useTranslation("setup");
  const goTo = useGoTo();
  const labelOf = useMenuLabelOf();
  const next = leadsTo.filter((l) => l.available !== false && stateOf(l.menu_id) !== "DONE" && labelOf(l.menu_id));
  if (!next.length) return null;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
      <span className="font-bold">{t("next")}:</span>
      {next.map((l) => (
        <button key={l.menu_id} type="button" className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 font-bold hover:bg-emerald-100" onClick={() => goTo({ menu_id: l.menu_id })}>
          {labelOf(l.menu_id)} <ArrowRight size={12} />
        </button>
      ))}
    </div>
  );
}
