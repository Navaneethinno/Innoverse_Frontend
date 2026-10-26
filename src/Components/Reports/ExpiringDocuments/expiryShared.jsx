import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";
import { formatDay } from "@/Utils/Lib/dateFormat";
import { cn } from "@/Utils/Lib/utils";

// A document's expiry state: VALID grey, EXPIRING amber, IN_GRACE orange,
// EXPIRED red (its action taken).
const TONES = {
  VALID: "bg-slate-100 text-slate-700",
  EXPIRING: "bg-amber-50 text-amber-800",
  IN_GRACE: "bg-orange-100 text-orange-800",
  EXPIRED: "bg-red-50 text-red-700",
};
export function ExpiryStateBadge({ state }) {
  const { t } = useTranslation("expiry");
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold",
        TONES[state] ?? TONES.VALID,
      )}
    >
      {t(`state_${state}`, { defaultValue: state })}
    </span>
  );
}

// Money held on the owner's accounts while an expired document isn't renewed.
export function MoneyHeldTag({ holds }) {
  const { t } = useTranslation("expiry");
  if (!holds?.length) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
      <Lock size={10} /> {t("moneyHeld")}
    </span>
  );
}

// "in 6 days", "today", "5 days ago".
export const daysLeftText = (t, days) =>
  days == null
    ? ""
    : days > 0
      ? t("inDays", { count: days })
      : days === 0
        ? t("today")
        : t("daysAgo", { count: -days });

// The columns both the report and a customer's page show.
export function documentColumns(t) {
  return [
    {
      key: "label",
      label: t("document"),
      render: (r) => (
        <span className="text-xs leading-tight">
          <b className="block">{r.label}</b>
          <span className="font-mono text-muted-foreground">{r.reference || "—"}</span>
        </span>
      ),
    },
    {
      key: "expires_on",
      label: t("expiresOn"),
      render: (r) => (
        <span className="text-xs leading-tight">
          <b className="block">{formatDay(r.expires_on)}</b>
          <span className={cn(r.days_left < 0 ? "text-red-700" : "text-muted-foreground")}>
            {daysLeftText(t, r.days_left)}
          </span>
        </span>
      ),
    },
    {
      key: "state",
      label: t("state"),
      render: (r) => (
        <span className="flex flex-wrap items-center gap-1">
          <ExpiryStateBadge state={r.state} />
          <MoneyHeldTag holds={r.holds} />
        </span>
      ),
    },
    {
      key: "action_taken",
      label: t("actionTaken"),
      render: (r) => (
        <span className="text-xs">
          {r.action_taken ? t(`action_${r.action_taken}`, { defaultValue: r.action_taken }) : "—"}
        </span>
      ),
    },
  ];
}
