import { useTranslation } from "react-i18next";
import { money } from "@/Components/Epurse/Accounts/accountShared";
import { cn } from "@/Utils/Lib/utils";
import { dayDate, ratePct } from "../../TermDeposits/depositShared";
import { MiniTable, loanLabel } from "../loanShared";

const upTo = (t, v, cur) => (Number(v) === 0 ? t("noLimit") : money(v, cur));
const charge = (t, type, value, cur) => (type === "NONE" || !type ? t("none") : type === "FIXED" ? money(value, cur) : type === "PERCENT" ? ratePct(value) : `${ratePct(value)} · ${loanLabel(t, type)}`);

// The product's settings as label/value pairs, grouped.
export function policyGroups(t, c, cur) {
  const p = c.policy ?? {};
  const e = c.eligibility_rules ?? {};
  const col = c.collateral_policy ?? {};
  const yes = (v) => t(v ? "yes" : "no");
  return [
    ["groupProduct", [
      ["productName", c.product_name || "—"],
      ["productCategory", loanLabel(t, c.product_category)],
      ["effective", c.effective_to ? t("fromTo", { from: dayDate(c.effective_from), to: dayDate(c.effective_to) }) : dayDate(c.effective_from)],
    ]],
    ["groupRepayment", [
      ["repaymentFrequency", loanLabel(t, p.repayment_frequency)],
      ["installmentMethod", loanLabel(t, p.installment_method)],
      ["gracePeriodDays", t("daysN", { count: Number(p.grace_period_days ?? 0) })],
      ["moratorium", p.moratorium_allowed ? t("upToDays", { count: Number(p.maximum_moratorium_days ?? 0) }) : t("notAllowed")],
      ["earlySettlement", yes(p.early_settlement_allowed)],
      ["prepaymentCharge", charge(t, p.prepayment_charge_type, p.prepayment_charge_value, cur)],
      ["lateCharge", charge(t, p.late_charge_type, p.late_charge_value, cur)],
      ["allocationOrder", (p.repayment_allocation_order ?? []).map((x) => loanLabel(t, x)).join(" → ") || "—"],
      ["autoDebit", yes(p.auto_debit_enabled)],
    ]],
    ["groupEligibility", [
      ["ageRange", e.individual?.minimum_age || e.individual?.maximum_age ? `${e.individual?.minimum_age ?? "—"} – ${e.individual?.maximum_age ?? "—"}` : t("any")],
      ["minimumMonthlyIncome", e.individual?.minimum_monthly_income ? money(e.individual.minimum_monthly_income, cur) : t("any")],
      ["maximumDti", e.maximum_debt_to_income_ratio ? ratePct(Number(e.maximum_debt_to_income_ratio) * 100) : t("any")],
      ["minimumOperatingMonths", e.corporate?.minimum_operating_months ?? t("any")],
      ["creditCheckRequired", yes(e.credit_check_required)],
    ]],
    ["groupCollateral", [
      ["collateralRequired", yes(col.required)],
      ["coverageRatio", col.required ? ratePct(Number(col.minimum_coverage_ratio ?? 0) * 100) : "—"],
      ["acceptedTypes", (col.accepted_types ?? []).map((x) => loanLabel(t, x)).join(", ") || t("any")],
    ]],
  ];
}

// The whole product: settings, terms with rate bands, fees and the
// approval matrix. With `other` (the one in effect), changed values are
// marked.
export function LoanConfigSummary({ config, other, currency, compact = false }) {
  const { t } = useTranslation("loans");
  if (!config) return <p className="text-sm text-muted-foreground">{t("noConfigYet")}</p>;
  const before = other ? Object.fromEntries(policyGroups(t, other, currency).flatMap(([, rows]) => rows)) : null;
  return (
    <div className="grid gap-4">
      {policyGroups(t, config, currency).map(([group, rows]) => (
        <div key={group}>
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t(group)}</p>
          <dl className={cn("grid grid-cols-2 gap-2", compact ? "sm:grid-cols-2" : "sm:grid-cols-3 lg:grid-cols-4")}>
            {rows.map(([key, value]) => {
              const changed = before && String(before[key]) !== String(value);
              return (
                <div key={key} className={cn("rounded-xl border px-3 py-2", changed ? "border-amber-300 bg-amber-50" : "border-border")}>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t(key)}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-foreground">{value}</dd>
                  {changed && <dd className="text-[10px] text-amber-900 line-through">{before[key]}</dd>}
                </div>
              );
            })}
          </dl>
        </div>
      ))}

      <div>
        <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t("termsAndRates")}</p>
        <div className="grid gap-2">
          {(config.terms ?? []).map((term, i) => (
            <div key={term.id ?? i} className="rounded-xl border border-border p-3">
              <p className="mb-2 text-sm font-bold">
                {term.term_code} · {term.term_value} {loanLabel(t, term.term_unit)}
                <span className="ml-2 text-xs font-medium text-muted-foreground">
                  {money(term.minimum_amount, currency)} – {upTo(t, term.maximum_amount, currency)}
                </span>
              </p>
              <MiniTable
                rows={term.pricing}
                columns={[
                  { key: "minimum_amount", label: t("amountFrom"), render: (b) => money(b.minimum_amount, currency) },
                  { key: "maximum_amount", label: t("upTo"), render: (b) => upTo(t, b.maximum_amount, currency) },
                  { key: "annual_rate", label: t("rate"), render: (b) => <b className="text-primary">{ratePct(b.annual_rate)}</b> },
                  { key: "calculation_method", label: t("calculationMethod"), render: (b) => loanLabel(t, b.calculation_method) },
                  { key: "day_count_convention", label: t("dayCount"), render: (b) => loanLabel(t, b.day_count_convention) },
                  { key: "effective_from", label: t("effectiveFrom"), render: (b) => dayDate(b.effective_from) },
                ]}
              />
            </div>
          ))}
          {!config.terms?.length && <p className="text-sm text-muted-foreground">{t("noTerms")}</p>}
        </div>
      </div>

      <div className={cn("grid gap-4", !compact && "lg:grid-cols-2")}>
        <div>
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t("fees")}</p>
          <MiniTable
            rows={config.fees}
            empty={t("noFees")}
            columns={[
              { key: "fee_name", label: t("fee"), render: (f) => <span><b>{f.fee_name}</b> <span className="text-muted-foreground">{f.fee_code}</span></span> },
              { key: "fee_value", label: t("amount"), render: (f) => (f.calculation_type === "PERCENT" ? `${ratePct(f.fee_value)}${Number(f.maximum_fee) ? ` (${t("max")} ${money(f.maximum_fee, currency)})` : ""}` : money(f.fee_value, currency)) },
              { key: "collection_point", label: t("charged"), render: (f) => loanLabel(t, f.collection_point) },
              { key: "refundable", label: t("refundable"), render: (f) => t(f.refundable ? "yes" : "no") },
            ]}
          />
        </div>
        <div>
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t("approvalMatrix")}</p>
          <MiniTable
            rows={config.approval_matrix}
            rowKey={(r, i) => r.id ?? i}
            columns={[
              { key: "minimum_amount", label: t("amountFrom"), render: (r) => money(r.minimum_amount, currency) },
              { key: "maximum_amount", label: t("upTo"), render: (r) => upTo(t, r.maximum_amount, currency) },
              { key: "required_approvals", label: t("approvers"), align: "right" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

