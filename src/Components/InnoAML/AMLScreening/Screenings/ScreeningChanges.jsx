import { DateInput } from "@/Components/Common/DateInput";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { RowActions } from "@/Components/Common/RowActions";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { amlScreeningApi } from "@/Services/InnoAML/aml.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { BandBadge, CUSTOMER_KINDS, glassCard, when } from "../../Shared/amlShared";
import { CustomerAmlModal } from "../../Shared/CustomerAml";

const filterInput = "rounded-lg border px-2.5 py-1.5 text-xs";

// Ongoing re-screening (AML handoff 07): customers whose result got worse
// after a watchlist changed — band went up, or matches where there were
// none. Improvements aren't listed. `band_code` filters on the new band.
export function ScreeningChanges({ bands }) {
  const { t } = useTranslation(["aml", "common"]);
  const [filters, setFilters] = useState({ customer_kind: "", band_code: "", from: "", to: "" });
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [customer, setCustomer] = useState(null);
  const filterKey = JSON.stringify(filters);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const active = Object.fromEntries(Object.entries(JSON.parse(filterKey)).filter(([, v]) => v !== ""));
        const response = await amlScreeningApi.changes({ page, limit, ...active });
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
  useLiveChannel(amlScreeningApi.changesPath, () => void load({ silent: true }));

  const set = (key) => (value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const columns = [
    { key: "detected_at", label: t("aml:detectedAt"), render: (row) => <span className="whitespace-nowrap text-xs">{when(row.detected_at)}</span> },
    { key: "customer_name", label: t("aml:customer"), align: "left", render: (row) => <span className="font-semibold">{row.customer_name ?? row.reference_id}</span> },
    { key: "customer_kind", label: t("aml:customerKind"), render: (row) => (row.customer_kind ? t(`aml:kind_${row.customer_kind}`) : "-") },
    { key: "inst_profile_name", label: t("aml:institution"), render: (row) => row.inst_profile_name ?? "-" },
    {
      key: "change",
      label: t("aml:change"),
      sortable: false,
      render: (row) => (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <BandBadge band={row.old_band} score={row.old_score} />
          <ArrowRight size={13} className="text-muted-foreground" />
          <BandBadge band={row.new_band} score={row.new_score} showAction />
        </span>
      ),
    },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (row) => <RowActions buttons={{ view: true }} onView={() => setCustomer(row)} />,
    },
  ];

  return (
    <>
      <div className="overflow-hidden rounded-2xl" style={glassCard}>
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <FilterSelect
            size="sm"
            className="w-36"
            value={filters.customer_kind}
            onChange={set("customer_kind")}
            options={[{ value: "", label: t("aml:allCustomers") }, ...CUSTOMER_KINDS.map((k) => ({ value: k, label: t(`aml:kind_${k}`) }))]}
          />
          <FilterSelect
            size="sm"
            className="w-40"
            value={filters.band_code}
            onChange={set("band_code")}
            options={[{ value: "", label: t("aml:allNewBands") }, ...bands.map((b) => ({ value: b.code, label: b.name ?? b.code }))]}
          />
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            {t("aml:from")}
            <DateInput value={filters.from} onChange={(e) => set("from")(e.target.value)} className={filterInput} />
          </label>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            {t("aml:to")}
            <DateInput value={filters.to} onChange={(e) => set("to")(e.target.value)} className={filterInput} />
          </label>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          isLoading={loading}
          title={t("aml:changesTitle")}
          emptyTitle={t("aml:noChanges")}
          serverPagination={{ page, totalPages: pagination.totalPages ?? 1, totalRecords: pagination.totalRecords ?? rows.length, onPageChange: setPage, limit, onLimitChange: (n) => { setLimit(n); setPage(1); } }}
          serverSorted
          bare
        />
      </div>
      {customer && <CustomerAmlModal customerKind={customer.customer_kind} referenceId={customer.reference_id} onClose={() => setCustomer(null)} />}
    </>
  );
}
