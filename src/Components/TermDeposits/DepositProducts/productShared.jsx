import { useTranslation } from "react-i18next";
import { money } from "@/Components/Epurse/Accounts/accountShared";
import { cn } from "@/Utils/Lib/utils";
import { dayDate, ratePct } from "../depositShared";

// A code from the options lists (ACT_365, HALF YEARLY, RENEW_PRINCIPAL...)
// as a label; an unknown code shows as itself.
export const optionLabel = (t, code) => (code ? t(`deposits:opt_${String(code).replace(/\W/g, "_")}`, { defaultValue: String(code) }) : "—");

// A payout period's length: a tenor must be at least this long.
export const PERIOD_DAYS = { MONTHLY: 30, QUARTERLY: 90, "HALF YEARLY": 180 };

const yesNo = (t, value) => t(value ? "deposits:yes" : "deposits:no");

// The policy as label/value pairs, in reading order.
export function policyRows(t, config, currency) {
  const amount = (v) => (Number(v) === 0 ? t("deposits:noLimit") : money(v, currency));
  return [
    ["minimumPrincipal", money(config.minimum_principal, currency)],
    ["maximumPrincipal", amount(config.maximum_principal)],
    ["interestEnabled", yesNo(t, config.interest_enabled)],
    ["calculationMethod", optionLabel(t, config.interest_calculation_method)],
    ["dayCount", optionLabel(t, config.day_count_convention)],
    ["accrualFrequency", optionLabel(t, config.accrual_frequency)],
    ["payoutFrequency", optionLabel(t, config.interest_payout_frequency)],
    ["compounding", yesNo(t, config.compounding_enabled)],
    ["maturityDefault", optionLabel(t, config.maturity_instruction_default)],
    ["graceDays", t("deposits:daysN", { count: Number(config.grace_period_days ?? 0) })],
    ["payoutAccountRequired", yesNo(t, config.payout_account_required)],
    ["earlyWithdrawal", config.early_withdrawal_allowed ? earlyText(t, config) : t("deposits:notAllowed")],
    ["recoverPaidInterest", yesNo(t, config.recover_previously_paid_interest)],
  ];
}

export const earlyText = (t, c) =>
  c.early_withdrawal_adjustment_type === "REDUCED_RATE"
    ? t("deposits:reducedRateText", { rate: ratePct(c.early_withdrawal_adjustment_value) })
    : t("deposits:forfeitText", { percent: ratePct(c.early_withdrawal_adjustment_value) });

// The whole setup: policy tiles, then each tenor with its rate bands. With
// `other` (the configuration in effect), values that differ are marked.
export function ConfigSummary({ config, other, currency, compact = false }) {
  const { t } = useTranslation("deposits");
  if (!config) return <p className="text-sm text-muted-foreground">{t("noConfigYet")}</p>;
  const otherRows = other ? Object.fromEntries(policyRows(t, other, currency)) : null;
  return (
    <div className="grid gap-4">
      <dl className={cn("grid grid-cols-2 gap-2", compact ? "sm:grid-cols-2" : "sm:grid-cols-3 lg:grid-cols-4")}>
        {policyRows(t, config, currency).map(([key, value]) => {
          const changed = otherRows && otherRows[key] !== value;
          return (
            <div key={key} className={cn("rounded-xl border px-3 py-2", changed ? "border-amber-300 bg-amber-50" : "border-border")}>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t(key)}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-foreground">{value}</dd>
              {changed && <dd className="text-[10px] text-amber-900 line-through">{otherRows[key]}</dd>}
            </div>
          );
        })}
      </dl>
      <TenorTable tenors={config.tenors} other={other?.tenors} currency={currency} />
    </div>
  );
}

const bandKey = (b) => `${b.minimum_principal}|${b.maximum_principal}|${b.annual_rate}|${b.effective_from ?? ""}|${b.effective_to ?? ""}`;
const tenorKey = (x) => `${x.label}|${x.tenor_days}|${x.effective_from ?? ""}|${x.effective_to ?? ""}`;

// The tenors and their bands; with `other`, new or changed rows are marked.
export function TenorTable({ tenors, other, currency }) {
  const { t } = useTranslation("deposits");
  if (!tenors?.length) return <p className="text-sm text-muted-foreground">{t("noTenors")}</p>;
  const otherTenors = other ? new Set(other.map(tenorKey)) : null;
  const otherBands = other ? new Set(other.flatMap((x) => (x.rates ?? []).map(bandKey))) : null;
  return (
    <div className="grid gap-3">
      {tenors.map((tenor, i) => (
        <div key={tenor.id ?? `n${i}`} className={cn("rounded-xl border p-3", otherTenors && !otherTenors.has(tenorKey(tenor)) ? "border-amber-300 bg-amber-50" : "border-border")}>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-foreground">
              {tenor.label} <span className="text-xs font-medium text-muted-foreground">· {t("daysN", { count: Number(tenor.tenor_days) })}</span>
            </p>
            <p className="text-[11px] text-muted-foreground">{periodText(t, tenor)}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-xs">
              <thead className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-1 pr-3">{t("amountFrom")}</th>
                  <th className="py-1 pr-3">{t("amountUpTo")}</th>
                  <th className="py-1 pr-3">{t("annualRate")}</th>
                  <th className="py-1">{t("effective")}</th>
                </tr>
              </thead>
              <tbody>
                {(tenor.rates ?? []).map((b, j) => (
                  <tr key={b.id ?? `b${j}`} className={cn("border-t border-border", otherBands && !otherBands.has(bandKey(b)) && "bg-amber-50")}>
                    <td className="py-1.5 pr-3 tabular-nums">{money(b.minimum_principal, currency)}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{Number(b.maximum_principal) === 0 ? t("noLimit") : money(b.maximum_principal, currency)}</td>
                    <td className="py-1.5 pr-3 font-bold tabular-nums text-primary">{ratePct(b.annual_rate)}</td>
                    <td className="py-1.5 text-muted-foreground">{periodText(t, b)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export const periodText = (t, x) => (x.effective_to ? t("fromTo", { from: dayDate(x.effective_from), to: dayDate(x.effective_to) }) : t("fromOn", { from: dayDate(x.effective_from) }));

// The record's status, with what waits for a checker.
export function ProductStatus({ product }) {
  const { t } = useTranslation("deposits");
  const pending = product.pending?.action ?? product.pending_action;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", STATUS_TONE[product.status] ?? "bg-muted text-muted-foreground")}>{product.status_name ?? product.status}</span>
      {pending && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase text-amber-900">{t("pendingX", { action: t(`pending_${pending}`, { defaultValue: pending }) })}</span>}
    </span>
  );
}

const STATUS_TONE = {
  1: "bg-emerald-50 text-emerald-700",
  2: "bg-amber-50 text-amber-900",
  5: "bg-red-50 text-red-700",
  8: "bg-red-50 text-red-700",
  9: "bg-muted text-muted-foreground",
  13: "bg-orange-50 text-orange-700",
};
