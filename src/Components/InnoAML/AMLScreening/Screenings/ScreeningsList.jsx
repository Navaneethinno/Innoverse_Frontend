import { DateInput } from "@/Components/Common/DateInput";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { UserSearch } from "lucide-react";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { RowActions } from "@/Components/Common/RowActions";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { amlScreeningApi } from "@/Services/InnoAML/aml.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { CUSTOMER_KINDS, EffectiveResult, TRIGGERS, glassCard, partyLabel, when } from "../../Shared/amlShared";
import { ScreeningDetailModal } from "../../Shared/ScreeningDetail";
import { CustomerAmlModal } from "../../Shared/CustomerAml";

const filterInput = "rounded-lg border px-2.5 py-1.5 text-xs";

// Every screening of the institution's customers, newest first. All filters
// are server-side; band and minimum score filter on the effective values.
export function ScreeningsList({ bands, initial = {} }) {
  const { t } = useTranslation(["aml", "common"]);
  const [filters, setFilters] = useState({ customer_kind: "", trigger: "", status: "", band_code: "", min_score: "", name: "", from: "", to: "", reference_id: "", ...initial });
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [openId, setOpenId] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [nameInput, setNameInput] = useState(filters.name);
  const filterKey = JSON.stringify(filters);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const active = Object.fromEntries(Object.entries(JSON.parse(filterKey)).filter(([, v]) => v !== ""));
        if (active.min_score != null) active.min_score = Number(active.min_score);
        const response = await amlScreeningApi.list({ page, limit, ...active });
        setRows(rowsOf(response));
        setPagination(response?.pagination ?? {});
      } catch (error) {
        notifications.error(error.message);
      } finally {
        setLoading(false);
      }
    },
    [page, limit, filterKey],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel(amlScreeningApi.listPath, () => void load({ silent: true }));

  const set = (key) => (value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };
  // The name filter is a server search: wait for a pause in typing.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((f) => (f.name === nameInput ? f : { ...f, name: nameInput }));
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [nameInput]);
  const opt = (values, prefix, allKey) => [{ value: "", label: t(`aml:${allKey}`) }, ...values.map((v) => ({ value: v, label: t(`aml:${prefix}${v}`) }))];

  const columns = [
    { key: "screened_at", label: t("aml:screenedAt"), render: (row) => <span className="whitespace-nowrap text-xs">{when(row.screened_at)}</span> },
    { key: "name", label: t("aml:party"), align: "left", render: (row) => <span className="font-semibold">{partyLabel(row)}</span> },
    { key: "customer_kind", label: t("aml:customerKind"), render: (row) => (row.customer_kind ? t(`aml:kind_${row.customer_kind}`) : "-") },
    { key: "inst_profile_name", label: t("aml:institution"), render: (row) => row.inst_profile_name ?? "-" },
    { key: "trigger", label: t("aml:trigger"), render: (row) => (row.trigger ? t(`aml:trigger_${row.trigger}`) : "-") },
    { key: "effective_score", label: t("aml:result"), render: (row) => <EffectiveResult row={row} /> },
    { key: "match_count", label: t("aml:matches"), render: (row) => row.match_count ?? 0 },
    { key: "screened_by", label: t("aml:screenedBy"), render: (row) => row.screened_by ?? "-" },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (row) => (
        <span className="flex items-center gap-1">
          <RowActions buttons={{ view: true }} onView={() => setOpenId(row.id)} />
          {row.reference_id && (
            <UiTooltip label={t("aml:customerResult")}>
              <button type="button" onClick={() => setCustomer(row)} className="rounded-lg p-1.5 text-primary hover:bg-muted">
                <UserSearch size={15} />
              </button>
            </UiTooltip>
          )}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="overflow-hidden rounded-2xl" style={glassCard}>
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder={t("aml:searchName")} className={`${filterInput} w-44`} />
          <FilterSelect size="sm" className="w-44" value={filters.customer_kind} onChange={set("customer_kind")} options={opt(CUSTOMER_KINDS, "kind_", "allCustomers")} />
          <FilterSelect size="sm" className="w-36" value={filters.trigger} onChange={set("trigger")} options={opt(TRIGGERS, "trigger_", "allTriggers")} />
          <FilterSelect size="sm" className="w-32" value={filters.status} onChange={set("status")} options={opt(["DONE", "ERROR"], "status_", "allStatuses")} />
          <FilterSelect
            size="sm"
            className="w-40"
            value={filters.band_code}
            onChange={set("band_code")}
            options={[{ value: "", label: t("aml:allBands") }, ...bands.map((b) => ({ value: b.code, label: b.name ?? b.code }))]}
          />
          <input type="number" min={0} max={100} value={filters.min_score} onChange={(e) => set("min_score")(e.target.value)} placeholder={t("aml:minScore")} className={`${filterInput} w-24`} />
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            {t("aml:from")}
            <DateInput value={filters.from} onChange={(e) => set("from")(e.target.value)} className={filterInput} />
          </label>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            {t("aml:to")}
            <DateInput value={filters.to} onChange={(e) => set("to")(e.target.value)} className={filterInput} />
          </label>
          {filters.reference_id && (
            <button type="button" onClick={() => set("reference_id")("")} className="rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-bold text-primary">
              {t("aml:oneCustomer")} ✕
            </button>
          )}
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          isLoading={loading}
          title={t("aml:screeningsTitle")}
          emptyTitle={t("aml:noScreenings")}
          serverPagination={{ page, totalPages: pagination.totalPages ?? 1, totalRecords: pagination.totalRecords ?? rows.length, onPageChange: setPage, limit, onLimitChange: (n) => { setLimit(n); setPage(1); } }}
          serverSorted
          bare
        />
      </div>
      {openId && <ScreeningDetailModal id={openId} onClose={() => setOpenId(null)} onChanged={() => void load({ silent: true })} />}
      {customer && <CustomerAmlModal customerKind={customer.customer_kind} referenceId={customer.reference_id} onClose={() => setCustomer(null)} />}
    </>
  );
}
