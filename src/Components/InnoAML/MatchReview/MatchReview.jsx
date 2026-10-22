import { ListPanel } from "@/Components/Common/ListPanel";
import { PageTitle } from "@/Components/Common/PageTitle";
import { useListSearch } from "@/Hooks/useListSearch";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { DataTable } from "@/Components/Common/DataTable";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { RowActions } from "@/Components/Common/RowActions";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { amlReviewApi } from "@/Services/InnoAML/aml.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { AlsoOnChips, NameText, ReviewStateBadge, ViaTag, WeightNote, matchScore, scoreTone, when } from "../Shared/amlShared";
import { formatDay } from "@/Utils/Lib/dateFormat";
import { ScreeningDetailModal } from "../Shared/ScreeningDetail";
import { MediaReviews } from "../AdverseMedia/AdverseMedia";

const STATES = ["PENDING", "APPROVED", "REJECTED", "SUPERSEDED"];
const DECISIONS = ["FALSE_POSITIVE", "TRUE_MATCH", "REVOKE"];

// Waiting rows from one "clear all" share a batch_id: shown as one entry
// (the first row, with `batch` = every row of it on this page), decided
// with one action.
function groupBatches(rows) {
  const out = [];
  const seen = new Map();
  for (const row of rows) {
    if (!row.batch_id) {
      out.push(row);
      continue;
    }
    const group = seen.get(row.batch_id);
    if (group) group.batch.push(row);
    else {
      const entry = { ...row, batch: [row] };
      seen.set(row.batch_id, entry);
      out.push(entry);
    }
  }
  return out;
}

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
    if (view !== "news") void load();
  }, [load, view]);
  useLiveChannel(amlReviewApi.listPath, () => void load({ silent: true }));

  const shown = useMemo(() => (view === "pending" ? groupBatches(rows) : rows), [rows, view]);

  const decide = async () => {
    if (action.type === "deauth" && !narration.trim()) return;
    setWorking(true);
    try {
      const target = action.row.batch ? { batch_id: action.row.batch_id } : { id: action.row.id };
      const response = await amlReviewApi[action.type]({ ...target, ...(narration.trim() ? { narration: narration.trim() } : {}) });
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
          <NameText name={row.party_name} latin={row.party_name_latin} className="font-semibold" />
          {row.party_role && <span className="block text-[11px] text-muted-foreground">{row.party_role}</span>}
          {row.batch && <span className="mt-0.5 block w-fit rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-bold text-primary">{t("aml:batchCleared", { count: row.batch_size ?? row.batch.length })}</span>}
        </span>
      ),
    },
    {
      key: "listed_name",
      label: t("aml:listedName"),
      align: "left",
      render: (row) =>
        row.batch ? (
          <span className="line-clamp-3 max-w-72 text-xs">{row.batch.map((r) => r.listed_name ?? r.matched_name).filter(Boolean).join(" · ")}</span>
        ) : (
        <span>
          <NameText name={row.listed_name ?? row.matched_name} latin={row.listed_name ? row.listed_name_latin : row.matched_name_latin} />
          <span className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
            {row.list} <ViaTag via={row.matched_via} />
          </span>
          <AlsoOnChips alsoOn={row.also_on} />
        </span>
        ),
    },
    { key: "score", label: t("aml:score"), render: (row) => row.batch ? <span className="text-xs text-muted-foreground">—</span> : (
        <span className="grid">
          <span className={`font-black tabular-nums ${scoreTone(matchScore(row))}`}>{matchScore(row)}</span>
          <WeightNote match={row} />
        </span>
      ),
    },
    {
      key: "decision",
      label: t("aml:proposedDecision"),
      render: (row) => (
        <span className="grid justify-items-center gap-0.5">
          <ReviewStateBadge state={row.decision} />
          {row.expires_on && <span className="whitespace-nowrap text-[10px] text-muted-foreground">{t("aml:expiresOn", { date: formatDay(row.expires_on) })}</span>}
        </span>
      ),
    },
    {
      key: "comment",
      label: t("aml:comment"),
      align: "left",
      render: (row) => (
        <span className="grid max-w-64 gap-0.5 text-xs">
          <span className="line-clamp-2">{row.comment}</span>
          {row.evidence && (
            <span className="line-clamp-2 text-[11px] text-muted-foreground">
              {t("aml:evidence")}: {row.evidence}
            </span>
          )}
        </span>
      ),
    },
    { key: "proposed_by", label: t("aml:maker"), render: (row) => row.proposed_by ?? "-" },
    {
      key: "state",
      label: t("common:status"),
      render: (row) => (
        <span className="inline-grid justify-items-center gap-0.5">
          <StatusBadge status={row.state} />
          {row.decided_by && <span className="text-[11px] text-muted-foreground">{row.decided_by}</span>}
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
          // Adverse Media article reviews.
          { value: "news", label: t("aml:tabNews") },
        ]}
        value={view}
        onChange={switchView}
      />
      {view === "news" ? (
        <MediaReviews />
      ) : (
      <ListPanel
        tabs={[]}
        {...searchBind}
        searchPlaceholder={t("aml:searchReviews")}
        filters={
          <>
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
          </>
        }
      >
        <DataTable
          columns={columns}
          rows={shown}
          rowKey={(row) => (row.batch ? `batch-${row.batch_id}` : row.id)}
          isLoading={loading}
          title={t("aml:reviewTitle")}
          emptyTitle={view === "pending" ? t("aml:nothingWaiting") : t("aml:noReviews")}
          serverPagination={{ page, totalPages: pagination.totalPages ?? 1, totalRecords: pagination.totalRecords ?? rows.length, onPageChange: setPage, limit, onLimitChange: (n) => { setLimit(n); setPage(1); } }}
          serverSorted
          bare
        />
      </ListPanel>
      )}

      <ConfirmDialog
        open={Boolean(action)}
        title={action?.type === "auth" ? t("aml:approveReview") : t("aml:rejectReview")}
        description={action ? (action.row.batch ? `${action.row.party_name} · ${t("aml:batchCleared", { count: action.row.batch_size ?? action.row.batch.length })}` : `${action.row.party_name} ↔ ${action.row.listed_name ?? action.row.matched_name} · ${t(`aml:review_${action.row.decision}`)}`) : ""}
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
