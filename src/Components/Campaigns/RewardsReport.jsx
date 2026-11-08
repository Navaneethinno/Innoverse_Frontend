import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/Components/Common/DataTable";
import { DateInput } from "@/Components/Common/DateInput";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { NoAccess } from "@/Components/Common/NoAccess";
import { PageTitle } from "@/Components/Common/PageTitle";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { when } from "@/Components/GlobalSettings/PaysePay/docShared";
import { useInstitutionScope } from "@/Components/InnoCBS/Loans/loanShared";
import { usePagedList } from "@/Hooks/usePagedList";
import { usePagePermission } from "@/Hooks/usePermission";
import { rewardsCampaignApi, rewardsReportApi } from "@/Services/Campaigns/campaigns.api";
import { inputClass, labelClass, shownSetup } from "./rewardsShared";

const REPORTS = ["decisions", "points", "campaigns", "referrals", "redemptions"];
const DECISIONS = ["CREDITED", "SKIPPED", "FAILED", "REVERSED"];
// Which filters each report offers.
const FILTERS = {
  decisions: ["campaign_id", "decision", "txn_id", "entity"],
  points: ["entity"],
  campaigns: [],
  referrals: [],
  redemptions: [],
};
// Each report's fields, in order. Every value is a string or null.
const COLUMNS = {
  decisions: ["id", "inst_profile_id", "created_at", "txn_rrn", "txn_type", "txn_amount", "kind", "campaign_code", "campaign_name", "entity_type", "entity_id", "decision", "reason", "amount", "points", "reward_rrn"],
  points: ["id", "created_at", "entity_type", "entity_id", "op", "points", "remaining", "expires_at", "txn_rrn", "reason"],
  campaigns: ["id", "code", "name", "reward_kind", "start_date", "end_date", "status", "budget_used", "credited", "skipped", "failed", "reversed", "customers"],
  referrals: ["id", "created_at", "code", "referrer_entity_type", "referrer_entity_id", "referee_entity_type", "referee_entity_id", "status", "reason", "rewarded_at"],
  redemptions: ["id", "created_at", "entity_type", "entity_id", "voucher_code", "points", "amount", "rrn"],
};

const columnsOf = (report, t) =>
  COLUMNS[report].map((k) => ({
    key: k,
    label: t(`rep_col_${k}`),
    sortable: false,
    render: (r) => <span className="whitespace-nowrap text-xs">{/_at$/.test(k) ? when(r[k]) : (r[k] ?? "—")}</span>,
  }));

// EPURSE > Rewards Report (menu 229): why a transaction did or did not earn
// a reward, points, campaign spend, referrals and redemptions.
export function RewardsReport() {
  const { t } = useTranslation(["campaigns", "common"]);
  const can = usePagePermission();
  const { scope } = useInstitutionScope();
  const [report, setReport] = useState("decisions");
  const [f, setF] = useState({ date_from: "", date_to: "", campaign_id: "", decision: "", txn_id: "", entity_type: "", entity_id: "" });
  const [campaigns, setCampaigns] = useState([]);
  useEffect(() => {
    let cancelled = false;
    rewardsCampaignApi
      .list(scope({ page: 1, page_size: 100 }))
      .then((r) => {
        const first = Array.isArray(r?.data) ? r.data[0] : r?.data;
        if (!cancelled) setCampaigns((first?.items ?? []).map((c) => ({ value: String(c.id), label: shownSetup(c).name ?? String(c.id) })));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [scope]);
  const on = FILTERS[report];
  const body = useMemo(
    () =>
      scope({
        ...(f.date_from ? { date_from: f.date_from } : {}),
        ...(f.date_to ? { date_to: f.date_to } : {}),
        ...(on.includes("campaign_id") && f.campaign_id ? { campaign_id: Number(f.campaign_id) } : {}),
        ...(on.includes("decision") && f.decision ? { decision: f.decision } : {}),
        ...(on.includes("txn_id") && f.txn_id ? { txn_id: Number(f.txn_id) } : {}),
        ...(on.includes("entity") && f.entity_type.trim() && f.entity_id ? { entity_type: f.entity_type.trim(), entity_id: Number(f.entity_id) } : {}),
      }),
    [f, on, scope],
  );
  const list = usePagedList(rewardsReportApi[report], body);
  if (!can("View")) return <NoAccess />;
  const set = (key) => (v) => setF((x) => ({ ...x, [key]: v?.target ? v.target.value : (v ?? "") }));
  const digits = (key) => (e) => setF((x) => ({ ...x, [key]: e.target.value.replace(/\D/g, "") }));
  return (
    <div>
      <div className="mb-4">
        <PageTitle>{t("reportTitle")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("reportSubtitle")}</p>
      </div>
      <SegmentedSwitch className="mb-3" options={REPORTS.map((r) => ({ value: r, label: t(`rep_${r}`) }))} value={report} onChange={setReport} />
      <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className={labelClass}>
          {t("dateFrom")}
          <DateInput className={inputClass} value={f.date_from} max={f.date_to || undefined} onChange={set("date_from")} />
        </label>
        <label className={labelClass}>
          {t("dateTo")}
          <DateInput className={inputClass} value={f.date_to} min={f.date_from || undefined} onChange={set("date_to")} />
        </label>
        {on.includes("campaign_id") && (
          <label className={labelClass}>
            {t("rewardCampaign")}
            <FilterSelect className="mt-1.5" value={f.campaign_id} onChange={set("campaign_id")} options={[{ value: "", label: t("tabAll") }, ...campaigns]} />
          </label>
        )}
        {on.includes("decision") && (
          <label className={labelClass}>
            {t("decision")}
            <FilterSelect className="mt-1.5" value={f.decision} onChange={set("decision")} options={[{ value: "", label: t("tabAll") }, ...DECISIONS.map((d) => ({ value: d, label: t(`decision_${d}`) }))]} />
          </label>
        )}
        {on.includes("txn_id") && (
          <label className={labelClass}>
            {t("txnId")}
            <input className={inputClass} inputMode="numeric" value={f.txn_id} onChange={digits("txn_id")} placeholder="10245" />
          </label>
        )}
        {on.includes("entity") && (
          <>
            <label className={labelClass}>
              {t("entityType")}
              <input className={inputClass} value={f.entity_type} onChange={set("entity_type")} />
            </label>
            <label className={labelClass}>
              {t("entityId")}
              <input className={inputClass} inputMode="numeric" value={f.entity_id} onChange={digits("entity_id")} placeholder="1024" />
            </label>
          </>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <DataTable bare columns={columnsOf(report, t)} rows={list.rows} rowKey={(r, i) => r.id ?? i} isLoading={list.loading} title={t(`rep_${report}`)} emptyTitle={t("reportEmpty")} serverPagination={list.pagination} />
      </div>
    </div>
  );
}
