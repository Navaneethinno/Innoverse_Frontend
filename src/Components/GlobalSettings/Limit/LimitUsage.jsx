import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Gauge } from "lucide-react";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { money } from "@/Components/Epurse/Accounts/accountShared";
import { OwnerFinder } from "@/Components/TermDeposits/Deposits/OpenDeposit";
import { useMenuPermission } from "@/Hooks/usePermission";
import { limitGroupOps, rowsOf } from "@/Services/Epurse/onboarding.api";
import { cn } from "@/Utils/Lib/utils";

// A code (DAILY_AMOUNT) read as words (Daily amount).
const words = (code) => {
  const text = String(code ?? "").replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// How full a limit is, 0-100.
const share = (used, max) => (Number(max) > 0 ? Math.min(100, (Number(used) / Number(max)) * 100) : 0);

// A party's limits and usage (/config/global/limit/usage): per currency,
// each DEBIT / CREDIT rule with what is used and left. `entity` is
// { entity_type, entity_id }.
export function LimitUsagePanel({ entity, compact = false }) {
  const { t } = useTranslation("limits");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const key = `${entity?.entity_type}-${entity?.entity_id}`;

  useEffect(() => {
    if (!entity?.entity_id) return undefined;
    let cancelled = false;
    setData(null);
    setError("");
    limitGroupOps
      .usage({ entity_type: entity.entity_type, entity_id: entity.entity_id })
      .then((r) => !cancelled && setData(rowsOf(r)[0] ?? {}))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
    // key stands for entity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (error) return <p className="text-xs font-semibold text-red-700">{error}</p>;
  if (!data) return <Spinner size={16} />;
  return (
    <div className="grid gap-3">
      {!compact && (
        <p className="text-xs text-muted-foreground">
          {t("usageGroup", { group: data.limit_group_name ?? "—" })}
          {data.inst_profile_name ? ` · ${data.inst_profile_name}` : ""}
        </p>
      )}
      {(data.currencies ?? []).map((c) => (
        <div key={c.currency_code} className="rounded-xl border border-border bg-card p-3">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-bold">
              {c.currency_code} <span className="font-mono text-xs font-medium text-muted-foreground">{c.acct_num}</span>
            </p>
            <p className="amount-fit text-xs text-muted-foreground">{t("usageBalance", { balance: money(c.balance, c.currency_code) })}</p>
          </div>
          {c.limits?.length ? (
            <div className="grid gap-2 md:grid-cols-2">
              {c.limits.map((l, i) => {
                const counted = l.max_count != null && Number(l.max_count) > 0;
                const pct = counted ? share(l.used_count, l.max_count) : share(l.used_amount, l.max_amount);
                return (
                  <div key={`${l.rule_code}-${l.limit_type}-${i}`} className="min-w-0 rounded-lg bg-muted/40 px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <p className="text-xs font-bold">
                        <span className={cn("mr-1.5 rounded px-1 text-[10px] font-black", l.direction === "DEBIT" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")}>{t(`usageDir_${l.direction}`, { defaultValue: l.direction })}</span>
                        {l.rule_name ?? l.rule_code}
                      </p>
                      {l.default_group && <span className="text-[10px] font-semibold text-muted-foreground">{t("usageDefaultCeiling")}</span>}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {words(l.limit_type)}
                      {l.period ? ` · ${words(l.period)}` : ""}
                    </p>
                    {(Number(l.max_amount) > 0 || counted) && (
                      <>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className={cn("h-full rounded-full transition-all", pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-primary")} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="amount-fit mt-1 text-[11px] tabular-nums">
                          {counted
                            ? t("usageCount", { used: l.used_count ?? 0, max: l.max_count, left: l.left_count ?? 0 })
                            : t("usageAmount", { used: money(l.used_amount ?? 0, c.currency_code), max: money(l.max_amount, c.currency_code), left: money(l.left_amount ?? 0, c.currency_code) })}
                        </p>
                      </>
                    )}
                    {Number(l.min_amount) > 0 && <p className="text-[11px] text-muted-foreground">{t("usageMin", { min: money(l.min_amount, c.currency_code) })}</p>}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t("usageNoLimits")}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// On the Limit screen: find a customer or merchant, then their usage.
export function LimitUsageDialog({ onClose }) {
  const { t } = useTranslation("limits");
  const [entity, setEntity] = useState(null);
  return (
    <Modal open onClose={onClose} size="lg" title={t("limitsAndUsage")}>
      {entity ? (
        <>
          <button type="button" onClick={() => setEntity(null)} className="mb-3 text-xs font-bold text-primary hover:underline">
            {t("usageAnother")}
          </button>
          <LimitUsagePanel entity={entity} />
        </>
      ) : (
        <OwnerFinder onPick={setEntity} />
      )}
    </Modal>
  );
}

// In a customer's or merchant's detail: their limits and usage, for users
// who may view the Limit menu.
export function OwnerLimitUsage({ owner }) {
  const { t } = useTranslation("limits");
  const can = useMenuPermission("Limit");
  if (!owner || !can("View")) return null;
  return (
    <div className="mb-4 rounded-2xl border border-border bg-card p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
        <Gauge size={15} className="text-primary" /> {t("limitsAndUsage")}
      </p>
      <LimitUsagePanel entity={{ entity_type: owner.kind, entity_id: owner.id }} />
    </div>
  );
}
