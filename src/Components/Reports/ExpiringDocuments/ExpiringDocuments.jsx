import { useTranslation } from "react-i18next";
import { FileClock } from "lucide-react";
import { ListTable } from "@/Components/Common/ListView";
import { PageTitle } from "@/Components/Common/PageTitle";
import { RowActions } from "@/Components/Common/RowActions";
import { useServerList } from "@/Hooks/useServerList";
import {
  customerOnboardingApi,
  merchantOnboardingApi,
} from "@/Services/Epurse/customerOnboarding.api";
import {
  corpCustomerOnboardingApi,
  corpMerchantOnboardingApi,
} from "@/Services/Epurse/corporateCustomerOnboarding.api";
import { expiringDocumentsApi } from "@/Services/Expiry/expiry.api";
import { KycReportView } from "../KycReport/KycReportView";
import { useReportDetail } from "../Shared/reportShared";
import { documentColumns } from "./expiryShared";

// The party's full report, by who they are.
const REPORT_APIS = {
  CUST_INDV: customerOnboardingApi,
  CUST_CORP: corpCustomerOnboardingApi,
  MERCH_INDV: merchantOnboardingApi,
  MERCH_CORP: corpMerchantOnboardingApi,
};

// REPORTS > Expiring Documents (menu 198): customers' and merchants'
// documents by how close their expiry is: expiring soon, in grace (past the
// date, before the action), expired (the action taken). A renewed document
// leaves the list. A row opens the party's report.
export function ExpiringDocuments() {
  const { t } = useTranslation("expiry");
  const list = useServerList({
    api: expiringDocumentsApi.listPath,
    call: expiringDocumentsApi.list,
  });
  const detail = useReportDetail();
  const open = detail.open;
  if (open)
    return (
      <div className="pb-8 pt-4">
        <KycReportView
          api={REPORT_APIS[open.subject_type]}
          body={{ reference_id: open.party_reference }}
          onBack={detail.back}
          title={open.party_name}
        />
      </div>
    );
  return (
    <div className="pb-8 pt-4">
      <div className="mb-4">
        <PageTitle icon={FileClock}>{t("documentsTitle")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("documentsSubtitle")}</p>
      </div>
      <ListTable
        list={list}
        rowKey={(r) => r.id}
        title={t("documentsTitle")}
        emptyTitle={t("noDocuments")}
        columns={[
          {
            key: "party_name",
            label: t("party"),
            render: (r) => (
              <span className="text-xs leading-tight">
                <b className="block">{r.party_name || "—"}</b>
                <span className="text-muted-foreground">
                  {[
                    t(`party_${r.subject_type}`, { defaultValue: r.subject_type }),
                    r.inst_profile_name,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            ),
          },
          ...documentColumns(t),
          {
            key: "open",
            label: t("open"),
            sortable: false,
            render: (r) =>
              r.party_reference && REPORT_APIS[r.subject_type] ? (
                <RowActions buttons={{ view: true }} onView={() => detail.show(r)} />
              ) : null,
          },
        ]}
      />
    </div>
  );
}
