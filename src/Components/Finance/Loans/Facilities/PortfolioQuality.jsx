import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { money } from "@/Components/Finance/Accounts/accountShared";
import { loanPortfolioApi, recordOf } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { Section, ratePct } from "../../Deposits/depositShared";
import { branchOptions, officerOptions, useCoreBanking } from "../../coreBankingShared";
import { useInstitutionScope } from "../loanShared";

const GROUP_BY = ["PRODUCT", "BRANCH", "OFFICER", "GROUP", "INSTITUTION"];
// Ageing buckets, current (green) to oldest (dark red).
const BUCKET_TONE = {
  CURRENT: "bg-emerald-500",
  "1-30": "bg-yellow-400",
  "31-60": "bg-amber-500",
  "61-90": "bg-orange-500",
  "91-180": "bg-red-500",
  OVER_180: "bg-red-800",
};

// Loan Facilities › Portfolio quality: portfolio at risk (PAR 1 / 30 / 90),
// arrears, provisions and interest in suspense, grouped by product, branch,
// officer or group, one row per currency with its ageing as a bar.
export function PortfolioQuality() {
  const { t } = useTranslation("loans");
  const { scope } = useInstitutionScope();
  const setup = useCoreBanking(scope);
  const [groupBy, setGroupBy] = useState("PRODUCT");
  const [branchId, setBranchId] = useState("");
  const [officerId, setOfficerId] = useState("");
  const [data, setData] = useState(null);
  useEffect(() => {
    let current = true;
    setData(null);
    loanPortfolioApi
      .par(
        scope({
          group_by: groupBy,
          ...(branchId ? { branch_id: Number(branchId) } : {}),
          ...(officerId ? { officer_user_id: Number(officerId) } : {}),
        }),
      )
      .then((r) => current && setData(recordOf(r) ?? { rows: [], totals: [] }))
      .catch((e) => current && (setData({ rows: [], totals: [] }), notifications.error(e.message)));
    return () => {
      current = false;
    };
  }, [groupBy, branchId, officerId, scope]);
  const buckets = data?.buckets ?? Object.keys(BUCKET_TONE);
  const branches = branchOptions(setup);
  const officers = officerOptions(setup);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedSwitch
          value={groupBy}
          onChange={setGroupBy}
          options={GROUP_BY.map((g) => ({ value: g, label: t(`parBy_${g}`) }))}
        />
        {branches.length > 0 && (
          <FilterSelect
            value={branchId}
            onChange={setBranchId}
            options={[{ value: "", label: t("allBranches") }, ...branches]}
          />
        )}
        {officers.length > 0 && (
          <FilterSelect
            value={officerId}
            onChange={setOfficerId}
            options={[{ value: "", label: t("allOfficers") }, ...officers]}
          />
        )}
      </div>
      {!data ? (
        <PageSkeleton />
      ) : (
        <>
          {(data.totals ?? []).map((row) => (
            <Section key={row.currency} title={t("parTotals", { currency: row.currency })}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                {[
                  ["outstanding", money(row.outstanding, row.currency)],
                  ["par1", ratePct(row.par1_ratio), Number(row.par1_ratio) > 0],
                  ["par30", ratePct(row.par30_ratio), Number(row.par30_ratio) > 5],
                  ["par90", ratePct(row.par90_ratio), Number(row.par90_ratio) > 0],
                  ["arrears", money(row.arrears, row.currency)],
                  ["provision", money(row.provision, row.currency)],
                  ["par30Coverage", ratePct(row.par30_coverage)],
                  ["suspendedInterest", money(row.suspended_interest, row.currency)],
                ].map(([key, value, bad]) => (
                  <div key={key} className="rounded-xl border border-border bg-card px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {t(`par_${key}`)}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-sm font-black tabular-nums",
                        bad && "text-red-700",
                      )}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              <AgeingBar row={row} buckets={buckets} className="mt-3" />
            </Section>
          ))}
          <Section title={t(`parBy_${groupBy}`)}>
            {!(data.rows ?? []).length ? (
              <p className="py-4 text-center text-sm text-muted-foreground">{t("noLoans")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">{t(`parBy_${groupBy}`)}</th>
                      <th className="px-3 py-2 text-right">{t("par_loans")}</th>
                      <th className="px-3 py-2 text-right">{t("par_outstanding")}</th>
                      <th className="px-3 py-2 text-right">{t("par_par1")}</th>
                      <th className="px-3 py-2 text-right">{t("par_par30")}</th>
                      <th className="px-3 py-2 text-right">{t("par_par90")}</th>
                      <th className="px-3 py-2 text-right">{t("par_provision")}</th>
                      <th className="px-3 py-2 text-right">{t("par_suspendedInterest")}</th>
                      <th className="min-w-48 px-3 py-2">{t("par_ageing")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r) => (
                      <tr key={`${r.key}-${r.currency}`} className="border-b border-border/60">
                        <td className="px-3 py-2 text-xs">
                          <b className="block">{r.label}</b>
                          <span className="text-[10px] text-muted-foreground">
                            {t("parBorrowers", { count: r.borrowers })} · {r.currency}
                            {r.non_accrual_loans > 0 && (
                              <span className="ml-1 font-bold text-amber-700">
                                · {t("nonAccrualN", { count: r.non_accrual_loans })}
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-xs tabular-nums">{r.loans}</td>
                        <td className="px-3 py-2 text-right text-xs font-bold tabular-nums">
                          {money(r.outstanding, r.currency)}
                        </td>
                        {["par1", "par30", "par90"].map((k) => (
                          <td
                            key={k}
                            className={cn(
                              "px-3 py-2 text-right text-xs tabular-nums",
                              Number(r[`${k}_ratio`]) > 0 && "font-bold text-red-700",
                            )}
                          >
                            {ratePct(r[`${k}_ratio`])}
                            <span className="block text-[10px] font-normal text-muted-foreground">
                              {money(r[k])}
                            </span>
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right text-xs tabular-nums">
                          {money(r.provision)}
                        </td>
                        <td className="px-3 py-2 text-right text-xs tabular-nums">
                          {money(r.suspended_interest)}
                        </td>
                        <td className="px-3 py-2">
                          <AgeingBar row={r} buckets={buckets} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

// The outstanding split by days past due, as one stacked bar with a legend
// in its tooltip (amount and loans per bucket).
function AgeingBar({ row, buckets, className }) {
  const { t } = useTranslation("loans");
  const total = Number(row.outstanding) || 0;
  return (
    <div className={className}>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {total > 0 &&
          buckets.map((b) => {
            const v = Number(row.buckets?.[b] ?? 0);
            return v > 0 ? (
              <span
                key={b}
                title={`${t(`bucket_${b}`, { defaultValue: b })}: ${money(v, row.currency)} · ${t("parLoans", { count: row.bucket_loans?.[b] ?? 0 })}`}
                className={BUCKET_TONE[b] ?? "bg-slate-400"}
                style={{ width: `${(v / total) * 100}%` }}
              />
            ) : null;
          })}
      </div>
      {className && (
        <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
          {buckets.map((b) => (
            <span key={b} className="inline-flex items-center gap-1">
              <span className={cn("h-2 w-2 rounded-full", BUCKET_TONE[b] ?? "bg-slate-400")} />
              {t(`bucket_${b}`, { defaultValue: b })} · {money(row.buckets?.[b] ?? 0, row.currency)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
