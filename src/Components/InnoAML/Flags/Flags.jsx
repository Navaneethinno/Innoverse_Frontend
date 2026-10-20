import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Ban, BriefcaseBusiness, CheckCircle2, Flag, ListChecks, XCircle } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { ListPanel } from "@/Components/Common/ListPanel";
import { PageTitle } from "@/Components/Common/PageTitle";
import { NarrationDialog } from "@/Components/Finance/Deposits/depositShared";
import { RaiseCaseDialog } from "@/Components/CaseManagement/AmlCases";
import { useListSearch } from "@/Hooks/useListSearch";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { useMenuPermission, usePagePermission } from "@/Hooks/usePermission";
import { useOpenMenu } from "@/Pages/Sidebar/menuContext";
import { amlFlagApi } from "@/Services/InnoAML/aml.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { BandBadge, CUSTOMER_KINDS, when } from "../Shared/amlShared";

const STATES = [
  ["OPEN", "aml:flagState_OPEN", Flag],
  ["CASE_RAISED", "aml:flagState_CASE_RAISED", BriefcaseBusiness],
  ["DISMISSED", "aml:flagState_DISMISSED", XCircle],
  ["ALL", "aml:flagState_ALL", ListChecks],
];
const STATE_TONE = { OPEN: "bg-amber-50 text-amber-700", CASE_RAISED: "bg-sky-50 text-sky-700", DISMISSED: "bg-muted text-muted-foreground" };

// A band as the flag carries it: its colour when set.
const band = (b, score) => (b ? <BandBadge band={{ ...b, color_code: b.color_code || undefined }} score={score} /> : <span className="text-xs tabular-nums text-muted-foreground">{score ?? 0}</span>);

// InnoAML > Flags (menu 184): customers whose AML result got worse on
// ongoing rescreening. Each stays open until a case is raised from it or it
// is dismissed with a comment; either settles every open flag of that
// customer.
export function Flags() {
  const { t } = useTranslation(["aml", "common"]);
  const can = usePagePermission();
  const canRaise = useMenuPermission("AML Cases")("Add");
  const openMenu = useOpenMenu();
  const [state, setState] = useState("OPEN");
  const [filters, setFilters] = useState({ customer_kind: "", blacklisted: "" });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { term, latest, bind: searchBind } = useListSearch(() => setPage(1));
  const [data, setData] = useState({ flags: [], total: 0, open: 0 });
  const [loading, setLoading] = useState(true);
  const [raising, setRaising] = useState(null);
  const [dismissing, setDismissing] = useState(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const body = {
          page,
          limit,
          state,
          ...(term ? { search: term } : {}),
          ...(filters.customer_kind ? { customer_kind: filters.customer_kind } : {}),
          ...(filters.blacklisted ? { blacklisted: true } : {}),
        };
        const row = rowsOf(await latest(amlFlagApi.list(body)))[0] ?? {};
        setData({ flags: row.flags ?? [], total: row.total ?? 0, open: row.open ?? 0 });
      } catch (error) {
        notifications.error(error.message);
      } finally {
        setLoading(false);
      }
    },
    [page, limit, state, term, filters, latest],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel(amlFlagApi.listPath, () => void load({ silent: true }));

  const setFilter = (key) => (value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };
  const dismiss = async (comment) => {
    setWorking(true);
    try {
      const response = await amlFlagApi.dismiss({ id: dismissing.id, comment });
      notifications.success(apiMessage(response, t("aml:flagDismissed")));
      setDismissing(null);
      void load({ silent: true });
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setWorking(false);
    }
  };

  const columns = [
    {
      key: "customer_name",
      label: t("aml:customer"),
      align: "left",
      render: (f) => (
        <span className="grid gap-0.5">
          <span dir="auto" className="font-semibold">{f.customer_name || "-"}</span>
          <span className="break-all text-[10px] text-muted-foreground">
            {t(`aml:kind_${f.customer_kind}`, { defaultValue: f.customer_kind })} · {f.reference_id}
          </span>
        </span>
      ),
    },
    { key: "inst_profile_name", label: t("aml:institution"), render: (f) => <span className="text-xs">{f.inst_profile_name ?? "-"}</span> },
    {
      key: "change",
      label: t("aml:flagChange"),
      sortable: false,
      render: (f) => (
        <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
          {band(f.old_band, f.old_score)}
          <ArrowRight size={13} className="text-muted-foreground" />
          {band(f.new_band, f.new_score)}
        </span>
      ),
    },
    {
      key: "blacklisted",
      label: t("aml:blacklistedCol"),
      render: (f) =>
        f.blacklisted ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase text-white">
            <Ban size={11} /> {t("aml:onBlacklistShort")}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        ),
    },
    { key: "detected_at", label: t("aml:detectedAt"), render: (f) => <span className="whitespace-nowrap text-xs">{when(f.detected_at)}</span> },
    {
      key: "state",
      label: t("common:status"),
      render: (f) => (
        <span className="inline-grid justify-items-center gap-0.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATE_TONE[f.state] ?? STATE_TONE.DISMISSED}`}>{t(`aml:flagState_${f.state}`, { defaultValue: f.state })}</span>
          {f.case_number && (
            <button type="button" onClick={() => openMenu("amlcases", { caseId: f.case_id })} className="font-mono text-[10px] font-bold text-primary hover:underline">
              {f.case_number}
            </button>
          )}
          {f.state === "DISMISSED" && f.settle_comment && (
            <span className="line-clamp-2 max-w-48 text-[10px] text-muted-foreground" title={f.settle_comment}>
              {f.settled_by}: {f.settle_comment}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (f) =>
        f.state === "OPEN" ? (
          <span className="flex items-center justify-center gap-1">
            {canRaise && <ActionIconButton label={t("aml:raiseCase")} intent="submit" icon={BriefcaseBusiness} onClick={() => setRaising(f)} />}
            {can("Edit") && <ActionIconButton label={t("aml:dismissFlag")} intent="deauth" icon={CheckCircle2} onClick={() => setDismissing(f)} />}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        ),
    },
  ];

  return (
    <div className="pt-1 pb-6">
      <div className="mb-3">
        <PageTitle>{t("aml:flagsTitle")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("aml:flagsSubtitle")}</p>
      </div>
      <ListPanel
        tabs={STATES}
        value={state}
        onChange={(next) => {
          setState(next);
          setPage(1);
        }}
        counts={{ OPEN: data.open, [state]: data.total }}
        {...searchBind}
        searchPlaceholder={t("aml:searchFlags")}
        filters={
          <>
            <FilterSelect size="sm" className="w-48" value={filters.customer_kind} onChange={setFilter("customer_kind")} options={[{ value: "", label: t("aml:allKinds") }, ...CUSTOMER_KINDS.map((k) => ({ value: k, label: t(`aml:kind_${k}`, { defaultValue: k }) }))]} />
            <FilterSelect
              size="sm"
              className="w-44"
              value={filters.blacklisted}
              onChange={setFilter("blacklisted")}
              options={[
                { value: "", label: t("aml:blacklistAny") },
                { value: "YES", label: t("aml:blacklistYes") },
              ]}
            />
          </>
        }
      >
        <DataTable
          columns={columns}
          rows={data.flags}
          rowKey={(f) => f.id}
          isLoading={loading}
          title={t("aml:flagsTitle")}
          emptyTitle={state === "OPEN" ? t("aml:noOpenFlags") : t("aml:noFlags")}
          serverSorted
          bare
          serverPagination={{
            page,
            totalPages: Math.max(1, Math.ceil(data.total / limit)),
            totalRecords: data.total,
            onPageChange: setPage,
            limit,
            onLimitChange: (n) => {
              setLimit(n);
              setPage(1);
            },
          }}
        />
      </ListPanel>

      {raising && (
        <RaiseCaseDialog
          target={{ flag_id: raising.id }}
          subtitle={`${raising.customer_name} · ${raising.reference_id}`}
          onClose={() => setRaising(null)}
          onRaised={() => setRaising(null)}
        />
      )}
      {dismissing && (
        <NarrationDialog
          title={t("aml:dismissFlag")}
          hint={t("aml:dismissHint", { name: dismissing.customer_name })}
          confirmLabel={t("aml:dismiss")}
          variant="danger"
          required
          label={t("aml:commentRequiredLabel")}
          busy={working}
          onClose={() => setDismissing(null)}
          onSave={(comment) => void dismiss(comment)}
        />
      )}
    </div>
  );
}
