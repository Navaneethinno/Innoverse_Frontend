import { PageTitle } from "@/Components/Common/PageTitle";
import { useListSearch } from "@/Hooks/useListSearch";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileSearch } from "lucide-react";
import { DataTable } from "@/Components/Common/DataTable";
import { RowActions } from "@/Components/Common/RowActions";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { StatusFilterTabs } from "@/Components/Common/StatusFilterTabs";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { InstitutionOnly } from "@/Components/Common/InstitutionOnly";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { useMenuPermission } from "@/Hooks/usePermission";
import {
  customerOnboardingApi,
  merchantOnboardingApi,
  onboardingRowsOf,
} from "@/Services/Epurse/customerOnboarding.api";
import {
  corpCustomerOnboardingApi,
  corpMerchantOnboardingApi,
} from "@/Services/Epurse/corporateCustomerOnboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { ExportButtons, glassCard, useReportDetail } from "../Shared/reportShared";
import { KycReportView } from "./KycReportView";
import { CustomerStateBadges } from "@/Components/Epurse/Onboarding/OnboardingWizard/customerPortal";

// Reports > KYC Report (group 204): Customer KYC Report (206) and Merchant
// KYC Report (205). A list of the onboarding records, Individual |
// Corporate, as on the Onboarding Wizard; a row opens its report.
const APIS = {
  customer: { individual: customerOnboardingApi, corporate: corpCustomerOnboardingApi },
  merchant: { individual: merchantOnboardingApi, corporate: corpMerchantOnboardingApi },
};
export const REPORT_MENU = { customer: "Customer KYC Report", merchant: "Merchant KYC Report" };

// The report call's body for a list row: the onboarding's reference, else
// the customer's id.
export const reportBody = (row) =>
  row.reference_id
    ? { reference_id: row.reference_id }
    : { customer_id: row.id ?? row.customer_id };

function KycReportList({ audience }) {
  const { t } = useTranslation("kycReport");
  const [type, setType] = useState("individual");
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState("desc");
  const [loading, setLoading] = useState(true);
  const detail = useReportDetail();
  const api = APIS[audience][type];

  const { body: searchBody, latest: latestList, bind: searchBind } = useListSearch(() => setPage(1));
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await latestList(api.list({ ...searchBody, page, limit, filter: "all", sort_by: sortBy }));
      setRows(onboardingRowsOf(response));
      setPagination(response?.pagination ?? {});
    } catch (error) {
      notifications.error(error.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [api, searchBody, latestList, page, limit, sortBy]);
  useEffect(() => {
    void load();
  }, [load]);


  const columns = [
    {
      key: "customer_name",
      label: t("name"),
      align: "left",
      render: (r) => (
        <div className="min-w-0 text-left">
          <button
            type="button"
            onClick={() => detail.show(r)}
            className="block max-w-full truncate font-semibold hover:text-[var(--primary)] hover:underline"
          >
            {r.customer_name || r.company_name || "—"}
          </button>
          <div className="truncate text-[11px] text-muted-foreground">
            {r.email || r.phone_number}
          </div>
          <CustomerStateBadges record={r} />
          <InstitutionOnly>
            {r.inst_profile_name && (
              <div className="text-[11px] text-muted-foreground">{r.inst_profile_name}</div>
            )}
          </InstitutionOnly>
        </div>
      ),
    },
    {
      key: "onboarding_definition_name",
      label: t("type"),
      render: (r) => r.onboarding_definition_name ?? "—",
    },
    {
      key: "status_name",
      label: t("status"),
      render: (r) => (r.status_name ? <StatusBadge status={String(r.status_name)} /> : "—"),
    },
    {
      key: "updated_time",
      label: t("lastActivity"),
      render: (r) => (r.updated_time ? new Date(r.updated_time).toLocaleString() : "—"),
    },
    {
      key: "actions",
      label: "",
      sortable: false,
      render: (r) => <RowActions buttons={{ view: true }} onView={() => detail.show(r)} />,
    },
  ];

  return (
    <>
      {detail.open && (
        <KycReportView api={api} body={reportBody(detail.open)} onBack={detail.back} title={t(audience === "merchant" ? "merchantTitle" : "customerTitle")} />
      )}
      <div className={detail.open ? "hidden" : "pt-1 pb-6"}>
        <div className="mb-3">
          <PageTitle>
            {t(audience === "merchant" ? "merchantTitle" : "customerTitle")}
          </PageTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(audience === "merchant" ? "merchantListSubtitle" : "listSubtitle")}
          </p>
        </div>
        <SegmentedSwitch
          className="mb-3"
          options={[
            { value: "individual", label: t("individual") },
            { value: "corporate", label: t("corporate") },
          ]}
          value={type}
          onChange={(next) => {
            setType(next);
            setPage(1);
          }}
        />
        <div className="overflow-hidden rounded-2xl" style={glassCard}>
          <StatusFilterTabs
            serverFiltered
            tabs={[]}
            sortBy={sortBy}
            onSortChange={(next) => {
              setSortBy(next);
              setPage(1);
            }}
            total={pagination.totalRecords}
            rows={rows}
            value="all"
            onChange={() => {}}
            {...searchBind}
            searchPlaceholder={t("search")}
            actions={<ExportButtons exportFile={(format) => api.export({ ...searchBody, filter: "all", sort_by: sortBy, format })} />}
            bare
          />
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.reference_id ?? r.id}
            isLoading={loading}
            title={t(audience === "merchant" ? "merchantTitle" : "customerTitle")}
            emptyTitle={t("noRows")}
            serverPagination={{
              page,
              totalPages: pagination.totalPages ?? 1,
              totalRecords: pagination.totalRecords ?? rows.length,
              onPageChange: setPage,
              limit,
              onLimitChange: (next) => {
                setLimit(next);
                setPage(1);
              },
            }}
            bare
          />
        </div>
      </div>
    </>
  );
}

export function CustomerKycReport() {
  return <KycReportList audience="customer" />;
}

export function MerchantKycReport() {
  return <KycReportList audience="merchant" />;
}

// "View report" on an Onboarding Wizard row: shown only with View on the
// report menu (206 customers, 205 merchants).
export function ViewReportButton({ audience, onClick }) {
  const { t } = useTranslation("kycReport");
  const can = useMenuPermission(REPORT_MENU[audience]);
  if (!can.menu || !can("View")) return null;
  return <ActionIconButton label={t("viewReport")} icon={FileSearch} onClick={onClick} />;
}
