import { ListPanel } from "@/Components/Common/ListPanel";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Briefcase, CheckCircle2, Clock3, Eye, Gavel, Inbox, ListChecks, MessageCircleReply, RefreshCw, Settings2, UserRound } from "lucide-react";
import { useListSearch } from "@/Hooks/useListSearch";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { RowActions } from "@/Components/Common/RowActions";
import { onboardingCasesApi } from "@/Services/CaseManagement/onboardingCases.api";
import { amlCasesApi } from "@/Services/CaseManagement/amlCases.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { AmlPill, CaseStatus, OverdueFlag, PriorityFlag, ReasonChips, RiskPill, ageText, caseDate, subjectKind } from "./caseShared";
import { CaseView } from "./CaseView";
import { CaseSettings } from "./CaseSettings";
import { useLiveChannel } from "@/Hooks/useLiveChannel";

// Tabs from the list's `counts` (they ignore the status filter): each sets
// the status (or assigned) filter.
const TABS = [
  { key: "ACTIVE", icon: ListChecks, body: { status: "ACTIVE" } },
  { key: "MINE", icon: UserRound, body: { status: "ACTIVE", assigned: "ME" } },
  { key: "OVERDUE", icon: AlertTriangle, body: { status: "ACTIVE", overdue: true } },
  { key: "OPEN", icon: Inbox, body: { status: "OPEN" } },
  { key: "IN_REVIEW", icon: Eye, body: { status: "IN_REVIEW" } },
  { key: "AWAITING_CUSTOMER", icon: Clock3, body: { status: "AWAITING_CUSTOMER" } },
  { key: "PENDING_DECISION", icon: Gavel, body: { status: "PENDING_DECISION" } },
  { key: "CLOSED", icon: CheckCircle2, body: { status: "CLOSED" } },
];
const REASONS = ["RISK_REVIEW", "RISK_REJECT", "AML_REVIEW", "AML_REJECT", "NO_RISK_SETUP", "NO_RISK_LEVEL", "NO_RISK_ACTION", "NO_AML_SCREENING", "NO_AML_SETUP", "NO_AML_ACTION", "AML_ERROR", "BLACKLISTED", "MANUAL_POLICY", "PRODUCT_NOT_ELIGIBLE"];
const EMPTY = { priority: "", reason: "", party: "", ownership: "", assigned: "", outcome: "" };

// What differs between the case queues (Onboarding Cases, AML Cases).
export const ONBOARDING_QUEUE = {
  kind: "onboarding",
  api: onboardingCasesApi,
  tabs: TABS,
  reasons: REASONS,
  outcomes: ["APPROVED", "REJECTED", "WITHDRAWN"],
  titleKey: "title",
  subtitleKey: "subtitle",
  settings: true,
};
// AML Cases: a customer's reply waits in its own tab, listed first.
export const AML_QUEUE = {
  kind: "aml",
  api: amlCasesApi,
  tabs: [...TABS.slice(0, 5), { key: "CUSTOMER_REPLIED", icon: MessageCircleReply, body: { status: "CUSTOMER_REPLIED" } }, ...TABS.slice(5)],
  reasons: [],
  outcomes: ["CLEARED", "CONFIRMED", "NO_ACTION"],
  titleKey: "amlTitle",
  subtitleKey: "amlSubtitle",
  settings: false,
};

const filterBody = (f) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ""));

// CASE MANAGEMENT > Onboarding Cases (menu 179): the queue of new customers
// and merchants whose risk / AML result needs a person to decide. Open
// cases first, HIGH priority first, then newest (server order).
export function OnboardingCases() {
  return <CaseQueue config={ONBOARDING_QUEUE} />;
}

// A case queue (`config`: ONBOARDING_QUEUE or AML_QUEUE with its api). A
// page opened with { caseId } in its state starts on that case.
export function CaseQueue({ config }) {
  const { t } = useTranslation(["cases", "common"]);
  const { api, tabs: TABS, reasons: REASONS } = config;
  const aml = config.kind === "aml";
  const location = useLocation();
  const [tab, setTab] = useState("ACTIVE");
  const [filters, setFilters] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { term, bind: searchBind } = useListSearch(() => setPage(1));
  const [data, setData] = useState({ cases: [], total: 0, counts: {} });
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState(() => location.state?.caseId ?? null);
  const [openedFor, setOpenedFor] = useState(location.state?.menuClick);
  if (location.state?.caseId && location.state.menuClick !== openedFor) {
    setOpenedFor(location.state.menuClick);
    setOpenId(location.state.caseId);
  }
  const [settings, setSettings] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const tabBody = TABS.find((x) => x.key === tab)?.body ?? {};
      const row = rowsOf(await api.list({ page, limit, ...filterBody(filters), ...(term ? { search: term } : {}), ...tabBody }))[0];
      setData({ cases: row?.cases ?? [], total: row?.total ?? 0, counts: row?.counts ?? {} });
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [api, TABS, tab, filters, term, page, limit]);
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel(api.listPath, () => void load({ silent: true }));

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
        config={config}
        onBack={() => {
          setOpenId(null);
          void load();
        }}
      />
    );
  }

  const setFilter = (key) => (value) => {
    setFilters((f) => ({ ...f, [key]: value }));
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
    ...(aml
      ? [
          {
            key: "title",
            label: t("caseTitle"),
            align: "left",
            sortable: false,
            render: (c) => (
              <div className="min-w-0 max-w-64">
                <p className="line-clamp-2 text-xs">{c.title || "—"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {c.last_customer_at ? t("customerLastAt", { date: caseDate(c.last_customer_at) }) : c.last_staff_at ? t("staffLastAt", { date: caseDate(c.last_staff_at) }) : ""}
                </p>
              </div>
            ),
          },
        ]
      : [
          { key: "risk", label: t("riskLevel"), sortable: false, render: (c) => <RiskPill risk={c.risk} /> },
          { key: "aml", label: t("amlBand"), sortable: false, render: (c) => <AmlPill aml={c.aml} /> },
        ]),
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
            <Briefcase size={22} className="text-primary" /> {t(config.titleKey)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t(config.subtitleKey)}</p>
        </div>
        <div className="flex gap-2">
          {config.settings && (
            <Button variant="secondary" size="sm" icon={Settings2} onClick={() => setSettings(true)}>
              {t("settings")}
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> {t("refresh")}
          </Button>
        </div>
      </div>

      <ListPanel
        tabs={TABS.map((x) => [x.key, `cases:tab_${x.key}`, x.icon])}
        value={tab}
        onChange={(key) => {
          setTab(key);
          setPage(1);
        }}
        counts={data.counts}
        {...searchBind}
        searchPlaceholder={t("searchPlaceholder")}
        filters={
          <>
            <FilterSelect value={filters.priority} onChange={setFilter("priority")} options={[{ value: "", label: t("anyPriority") }, { value: "HIGH", label: t("high") }, { value: "NORMAL", label: t("normal") }, ...(aml ? [{ value: "LOW", label: t("low") }] : [])]} />
            {REASONS.length > 0 && <FilterSelect value={filters.reason} onChange={setFilter("reason")} options={[{ value: "", label: t("anyReason") }, ...REASONS.map((r) => ({ value: r, label: t(`reason_${r}`) }))]} />}
            <FilterSelect value={filters.party} onChange={setFilter("party")} options={[{ value: "", label: t("anyParty") }, { value: "CUSTOMER", label: t("customer") }, { value: "MERCHANT", label: t("merchant") }]} />
            {tab === "CLOSED" ? (
              <FilterSelect value={filters.outcome} onChange={setFilter("outcome")} options={[{ value: "", label: t("anyOutcome") }, ...config.outcomes.map((o) => ({ value: o, label: t(`outcome_${o}`) }))]} />
            ) : (
              <FilterSelect value={filters.assigned} onChange={setFilter("assigned")} options={[{ value: "", label: t("anyAssignee") }, { value: "ME", label: t("assignedToMe") }, { value: "UNASSIGNED", label: t("unassigned") }]} />
            )}
          </>
        }
      >
      <DataTable
        bare
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
      </ListPanel>
    </div>
  );
}
