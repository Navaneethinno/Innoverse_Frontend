import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Briefcase, RefreshCw, Search, Settings2 } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { RowActions } from "@/Components/Common/RowActions";
import { onboardingCasesApi } from "@/Services/CaseManagement/onboardingCases.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { AmlPill, CaseStatus, OverdueFlag, PriorityFlag, ReasonChips, RiskPill, ageText, caseDate, subjectKind } from "./caseShared";
import { CaseView } from "./CaseView";
import { CaseSettings } from "./CaseSettings";
import { useLiveChannel } from "@/Hooks/useLiveChannel";

// Tabs from the list's `counts` (they ignore the status filter): each sets
// the status (or assigned) filter.
const TABS = [
  { key: "ACTIVE", body: { status: "ACTIVE" } },
  { key: "MINE", body: { status: "ACTIVE", assigned: "ME" } },
  { key: "OVERDUE", body: { status: "ACTIVE", overdue: true } },
  { key: "OPEN", body: { status: "OPEN" } },
  { key: "IN_REVIEW", body: { status: "IN_REVIEW" } },
  { key: "AWAITING_CUSTOMER", body: { status: "AWAITING_CUSTOMER" } },
  { key: "PENDING_DECISION", body: { status: "PENDING_DECISION" } },
  { key: "CLOSED", body: { status: "CLOSED" } },
];
const REASONS = ["RISK_REVIEW", "RISK_REJECT", "AML_REVIEW", "AML_REJECT", "NO_RISK_SETUP", "NO_RISK_LEVEL", "NO_AML_SCREENING", "NO_AML_SETUP", "AML_ERROR", "MANUAL_POLICY", "PRODUCT_NOT_ELIGIBLE"];
const EMPTY = { search: "", priority: "", reason: "", party: "", ownership: "", assigned: "", outcome: "" };
const inputClass = "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";

const filterBody = (f) => Object.fromEntries(Object.entries({ ...f, search: f.search.trim() }).filter(([, v]) => v !== ""));

// CASE MANAGEMENT > Onboarding Cases (menu 179): the queue of new customers
// and merchants whose risk / AML result needs a person to decide. Open
// cases first, HIGH priority first, then newest (server order).
export function OnboardingCases() {
  const { t } = useTranslation(["cases", "common"]);
  const [tab, setTab] = useState("ACTIVE");
  const [filters, setFilters] = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [data, setData] = useState({ cases: [], total: 0, counts: {} });
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [settings, setSettings] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const tabBody = TABS.find((x) => x.key === tab)?.body ?? {};
      const row = rowsOf(await onboardingCasesApi.list({ page, limit, ...filterBody(applied), ...tabBody }))[0];
      setData({ cases: row?.cases ?? [], total: row?.total ?? 0, counts: row?.counts ?? {} });
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [tab, applied, page, limit]);
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel("/config/case/onboarding/list", () => void load({ silent: true }));

  if (settings) {
    return (
      <CaseSettings
        onBack={() => {
          setSettings(false);
          void load();
        }}
      />
    );
  }

  if (openId) {
    return (
      <CaseView
        id={openId}
        onBack={() => {
          setOpenId(null);
          void load();
        }}
      />
    );
  }

  const setFilter = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }));
  const apply = (event) => {
    event?.preventDefault();
    setApplied(filters);
    setPage(1);
  };

  const columns = [
    {
      key: "case_number",
      label: t("caseNumber"),
      render: (c) => (
        <button type="button" onClick={() => setOpenId(c.id)} className="flex flex-col items-start gap-1 text-left">
          <span className="font-mono text-xs font-bold text-primary hover:underline">{c.case_number}</span>
          <span className="flex flex-wrap gap-1">
            <PriorityFlag priority={c.priority} />
            <OverdueFlag overdue={c.overdue} />
          </span>
        </button>
      ),
    },
    {
      key: "subject",
      label: t("subject"),
      align: "left",
      render: (c) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">{c.subject?.name || t("noNameYet")}</p>
          <p className="text-[10px] text-muted-foreground">{subjectKind(t, c.subject)}{c.subject?.customer_type ? ` · ${c.subject.customer_type}` : ""}</p>
        </div>
      ),
    },
    { key: "reasons", label: t("reasons"), sortable: false, render: (c) => <ReasonChips reasons={c.reasons} /> },
    { key: "risk", label: t("riskLevel"), sortable: false, render: (c) => <RiskPill risk={c.risk} /> },
    { key: "aml", label: t("amlBand"), sortable: false, render: (c) => <AmlPill aml={c.aml} /> },
    { key: "status", label: t("status"), render: (c) => <CaseStatus status={c.status} outcome={c.outcome} /> },
    { key: "assigned_to", label: t("assignee"), render: (c) => <span className="text-xs">{c.assigned_to?.name ?? <span className="text-muted-foreground">{t("unassigned")}</span>}</span> },
    { key: "age_hours", label: t("age"), render: (c) => (
        <span className={c.overdue ? "whitespace-nowrap text-xs font-bold tabular-nums text-red-700" : "whitespace-nowrap text-xs tabular-nums"} title={c.due_at ? t("dueOn", { date: caseDate(c.due_at) }) : undefined}>
          {ageText(c.age_hours)}
        </span>
      ),
    },
    { key: "actions", label: t("common:actions"), sortable: false, render: (c) => <RowActions buttons={{ view: true }} onView={() => setOpenId(c.id)} /> },
  ];

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <Briefcase size={22} className="text-primary" /> {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={Settings2} onClick={() => setSettings(true)}>
            {t("settings")}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> {t("refresh")}
          </Button>
        </div>
      </div>

      <div className="mb-3 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1">
        {TABS.map(({ key }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key);
              setPage(1);
            }}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold",
              tab === key ? "bg-primary text-primary-foreground shadow-sm" : key === "OVERDUE" && data.counts?.OVERDUE ? "text-red-700 hover:bg-red-50" : "text-muted-foreground hover:bg-[var(--primary-light)] hover:text-primary",
            )}
          >
            {t(`tab_${key}`)}
            <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", tab === key ? "bg-white/25" : "bg-muted")}>{data.counts?.[key] ?? 0}</span>
          </button>
        ))}
      </div>

      <form onSubmit={apply} className="mb-4 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-7">
        <input className={cn(inputClass, "lg:col-span-2")} placeholder={t("searchPlaceholder")} value={filters.search} onChange={(e) => setFilter("search")(e.target.value)} />
        <FilterSelect value={filters.priority} onChange={setFilter("priority")} options={[{ value: "", label: t("anyPriority") }, { value: "HIGH", label: t("high") }, { value: "NORMAL", label: t("normal") }]} />
        <FilterSelect value={filters.reason} onChange={setFilter("reason")} options={[{ value: "", label: t("anyReason") }, ...REASONS.map((r) => ({ value: r, label: t(`reason_${r}`) }))]} />
        <FilterSelect value={filters.party} onChange={setFilter("party")} options={[{ value: "", label: t("anyParty") }, { value: "CUSTOMER", label: t("customer") }, { value: "MERCHANT", label: t("merchant") }]} />
        {tab === "CLOSED" ? (
          <FilterSelect value={filters.outcome} onChange={setFilter("outcome")} options={[{ value: "", label: t("anyOutcome") }, ...["APPROVED", "REJECTED", "WITHDRAWN"].map((o) => ({ value: o, label: t(`outcome_${o}`) }))]} />
        ) : (
          <FilterSelect value={filters.assigned} onChange={setFilter("assigned")} options={[{ value: "", label: t("anyAssignee") }, { value: "ME", label: t("assignedToMe") }, { value: "UNASSIGNED", label: t("unassigned") }]} />
        )}
        <div className="flex gap-2">
          <Button type="submit" size="sm" icon={Search} className="flex-1">{t("search")}</Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setFilters(EMPTY);
              setApplied(EMPTY);
              setPage(1);
            }}
          >
            {t("clear")}
          </Button>
        </div>
      </form>

      <DataTable
        columns={columns}
        rows={data.cases}
        rowKey={(c) => c.id}
        isLoading={loading}
        title={t(`tab_${tab}`)}
        emptyTitle={t("noCases")}
        emptyDescription={t("noCasesHint")}
        serverSorted
        serverPagination={{
          page,
          totalPages: Math.max(1, Math.ceil(data.total / limit)),
          totalRecords: data.total,
          onPageChange: setPage,
          limit,
          onLimitChange: (n) => {
            setLimit(Math.min(n, 100));
            setPage(1);
          },
        }}
      />
    </div>
  );
}
