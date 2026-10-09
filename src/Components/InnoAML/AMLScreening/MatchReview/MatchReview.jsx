import { PageTitle } from "@/Components/Common/PageTitle";
import { useListSearch } from "@/Hooks/useListSearch";
import { SearchBox } from "@/Components/Common/SearchBox";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { RowActions } from "@/Components/Common/RowActions";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { amlReviewApi } from "@/Services/InnoAML/aml.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { ReviewStateBadge, glassCard, scoreTone, when } from "../../Shared/amlShared";
import { ScreeningDetailModal } from "../../Shared/ScreeningDetail";

const STATES = ["PENDING", "APPROVED", "REJECTED", "SUPERSEDED"];
const DECISIONS = ["FALSE_POSITIVE", "TRUE_MATCH"];

// InnoAML > AML Screening > Match Review (menu 104). Makers propose
// decisions on the screening detail; here a checker approves or rejects
// each proposal (a maker can't approve their own). "All" shows every
// review in any state.
export function MatchReview() {
  const { t } = useTranslation(["aml", "common"]);
  const [view, setView] = useState("pending");
  const [filters, setFilters] = useState({ state: "", decision: "" });
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  // The screened name, reference, matched entity, proposer, decider or
  // comment (both views).
  const { body: searchBody, latest: latestList, bind: searchBind } = useListSearch(() => setPage(1));
  const [screeningId, setScreeningId] = useState(null);
  const [action, setAction] = useState(null); // { type: "auth" | "deauth", row }
  const [narration, setNarration] = useState("");
  const [working, setWorking] = useState(false);
  const filterKey = JSON.stringify(filters);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const active = view === "all" ? Object.fromEntries(Object.entries(JSON.parse(filterKey)).filter(([, v]) => v)) : {};
        const response = await latestList((view === "pending" ? amlReviewApi.pending : amlReviewApi.list)({ ...searchBody, page, limit, ...active }));
        setRows(rowsOf(response));
        setPagination(response?.pagination ?? {});
      } catch (error) {
        notifications.error(error.message);
      } finally {
        setLoading(false);
      }
    },
    [searchBody, latestList, view, page, limit, filterKey],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel(amlReviewApi.listPath, () => void load({ silent: true }));

  const decide = async () => {
    if (action.type === "deauth" && !narration.trim()) return;
    setWorking(true);
    try {
      const response = await amlReviewApi[action.type]({ id: action.row.id, ...(narration.trim() ? { narration: narration.trim() } : {}) });
      notifications.success(apiMessage(response, action.type === "auth" ? t("aml:reviewApproved") : t("aml:reviewRejected")));
      setAction(null);
      setNarration("");
      await load({ silent: true });
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setWorking(false);
    }
  };

  const switchView = (next) => {
    setView(next);
    setPage(1);
  };
  const setFilter = (key) => (value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const columns = [
    { key: "proposed_at", label: t("aml:proposedAt"), render: (row) => <span className="whitespace-nowrap text-xs">{when(row.proposed_at)}</span> },
    {
      key: "party_name",
      label: t("aml:party"),
      align: "left",
      render: (row) => (
        <span>
          <span className="font-semibold">{row.party_name}</span>
          {row.party_role && <span className="block text-[11px] text-muted-foreground">{row.party_role}</span>}
        </span>
      ),
    },
    {
      key: "listed_name",
      label: t("aml:listedName"),
      align: "left",
      render: (row) => (
        <span>
          {row.listed_name ?? row.matched_name}
          <span className="block text-[11px] text-muted-foreground">{row.list}</span>
        </span>
      ),
    },
    { key: "score", label: t("aml:score"), render: (row) => <span className={`font-black tabular-nums ${scoreTone(row.score)}`}>{row.score}</span> },
    { key: "decision", label: t("aml:proposedDecision"), render: (row) => <ReviewStateBadge state={row.decision} /> },
    { key: "comment", label: t("aml:comment"), align: "left", render: (row) => <span className="line-clamp-2 max-w-64 text-xs">{row.comment}</span> },
    { key: "proposed_by", label: t("aml:maker"), render: (row) => row.proposed_by ?? "-" },
    {
      key: "state",
      label: t("common:status"),
      render: (row) => (
        <span className="text-xs">
          {t(`aml:reviewState_${row.state}`, { defaultValue: row.state })}
          {row.decided_by && <span className="block text-[11px] text-muted-foreground">{row.decided_by}</span>}
        </span>
      ),
    },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (row) => (
        <RowActions
          buttons={{ view: true, authorize: row.state === "PENDING", deauthorize: row.state === "PENDING" }}
          onView={() => setScreeningId(row.screening_id)}
          onAuthorize={() => setAction({ type: "auth", row })}
          onDeauthorize={() => setAction({ type: "deauth", row })}
        />
      ),
    },
  ];

  return (
    <div className="pt-1 pb-6">
      <div className="mb-3">
        <PageTitle>{t("aml:reviewTitle")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("aml:reviewSubtitle")}</p>
      </div>
      <SegmentedSwitch
        className="mb-3"
        options={[
          { value: "pending", label: t("aml:waitingForApproval") },
          { value: "all", label: t("aml:allReviews") },
        ]}
        value={view}
        onChange={switchView}
      />
      <div className="overflow-hidden rounded-2xl" style={glassCard}>
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <SearchBox {...searchBind} className="min-w-[14rem]" placeholder={t("aml:searchReviews")} />
          {view === "all" && (
            <>
            <FilterSelect
              size="sm"
              className="w-40"
              value={filters.state}
              onChange={setFilter("state")}
              options={[{ value: "", label: t("aml:allStates") }, ...STATES.map((s) => ({ value: s, label: t(`aml:reviewState_${s}`) }))]}
            />
            <FilterSelect
              size="sm"
              className="w-40"
              value={filters.decision}
              onChange={setFilter("decision")}
              options={[{ value: "", label: t("aml:allDecisions") }, ...DECISIONS.map((d) => ({ value: d, label: t(`aml:review_${d}`) }))]}
            />
            </>
          )}
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          isLoading={loading}
          title={t("aml:reviewTitle")}
          emptyTitle={view === "pending" ? t("aml:nothingWaiting") : t("aml:noReviews")}
          serverPagination={{ page, totalPages: pagination.totalPages ?? 1, totalRecords: pagination.totalRecords ?? rows.length, onPageChange: setPage, limit, onLimitChange: (n) => { setLimit(n); setPage(1); } }}
          serverSorted
          bare
        />
      </div>

      <ConfirmDialog
        open={Boolean(action)}
        title={action?.type === "auth" ? t("aml:approveReview") : t("aml:rejectReview")}
        description={action ? `${action.row.party_name} ↔ ${action.row.listed_name ?? action.row.matched_name} · ${t(`aml:review_${action.row.decision}`)}` : ""}
        confirmLabel={action?.type === "auth" ? t("common:authorize") : t("aml:reject")}
        destructive={action?.type === "deauth"}
        confirmDisabled={action?.type === "deauth" && !narration.trim()}
        pending={working}
        onClose={() => {
          setAction(null);
          setNarration("");
        }}
        onConfirm={() => void decide()}
      >
        {action?.row.comment && <p className="mt-2 rounded-lg bg-muted p-2 text-xs">{action.row.comment}</p>}
        <textarea
          value={narration}
          onChange={(e) => setNarration(e.target.value)}
          placeholder={action?.type === "deauth" ? t("aml:reasonRequired") : t("aml:narrationOptional")}
          className="mt-3 min-h-20 w-full rounded-xl border p-3 text-sm"
        />
      </ConfirmDialog>

      {screeningId && <ScreeningDetailModal id={screeningId} onClose={() => setScreeningId(null)} onChanged={() => void load({ silent: true })} />}
    </div>
  );
}
