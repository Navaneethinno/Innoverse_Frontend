import { useState } from "react";
import { ListTable } from "@/Components/Common/ListView";
import { useServerList } from "@/Hooks/useServerList";
import { useTranslation } from "react-i18next";
import { UserSearch } from "lucide-react";
import { RowActions } from "@/Components/Common/RowActions";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { amlScreeningApi } from "@/Services/InnoAML/aml.api";
import { EffectiveResult, partyLabel, when } from "../Shared/amlShared";
import { ScreeningDetailModal } from "../Shared/ScreeningDetail";
import { CustomerAmlModal } from "../Shared/CustomerAml";

// Every screening of the institution's customers. Tabs and filters come
// from list/options; band and minimum score filter on the effective values.
export function ScreeningsList({ initial = {} }) {
  const { t } = useTranslation(["aml", "common"]);
  const [openId, setOpenId] = useState(null);
  const [customer, setCustomer] = useState(null);
  // Opened for one customer: only their screenings.
  const list = useServerList({ api: amlScreeningApi.listPath, call: amlScreeningApi.list, extra: initial.reference_id ? { reference_id: initial.reference_id } : null });
  useLiveChannel(amlScreeningApi.listPath, () => list.reload());

  const columns = [
    { key: "screened_at", label: t("aml:screenedAt"), render: (row) => <span className="whitespace-nowrap text-xs">{when(row.screened_at)}</span> },
    { key: "name", label: t("aml:party"), align: "left", render: (row) => <span dir="auto" className="font-semibold">{partyLabel(row)}</span> },
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
      <ListTable list={list} columns={columns} rowKey={(row) => row.id} title={t("aml:screeningsTitle")} emptyTitle={t("aml:noScreenings")} />
      {openId && <ScreeningDetailModal id={openId} onClose={() => setOpenId(null)} onChanged={() => list.reload()} />}
      {customer && <CustomerAmlModal customerKind={customer.customer_kind} referenceId={customer.reference_id} onClose={() => setCustomer(null)} />}
    </>
  );
}
