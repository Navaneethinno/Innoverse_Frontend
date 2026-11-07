import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ListTable } from "@/Components/Common/ListView";
import { Modal } from "@/Components/Common/Modal";
import { PageTitle } from "@/Components/Common/PageTitle";
import { RowActions } from "@/Components/Common/RowActions";
import { Facts } from "@/Components/InnoCBS/Deposits/depositShared";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { useServerList } from "@/Hooks/useServerList";
import { paymentRequestApi } from "@/Services/PaysePay/paysePay.api";
import { API_ENDPOINTS } from "@/Utils/Constant";
import { PillTabs, when } from "./docShared";

const party = (name, type, id) => (
  <div>
    <p className="text-xs font-semibold">{name || "—"}</p>
    {(type || id) && <p className="font-mono text-[10px] text-muted-foreground">{[type, id].filter(Boolean).join(" · ")}</p>}
  </div>
);

// GLOBAL SETTINGS > Payment Requests (menu 221): money requests and payment
// QRs, read only. Tabs, filters and paging come from the list standard.
export function PaymentRequests() {
  const { t } = useTranslation(["paysePay", "common"]);
  const [kind, setKind] = useState("REQUEST");
  const [open, setOpen] = useState(null);
  const list = useServerList({ api: API_ENDPOINTS.PAYSE_DOC.PAYMENT_REQUEST_LIST, call: paymentRequestApi.list, extra: { kind } });
  const columns = [
    { key: "reference", label: t("pr_reference"), render: (r) => <span className="font-mono text-xs font-semibold">{r.reference}</span> },
    { key: "amount", label: t("pr_amount"), render: (r) => <span className="whitespace-nowrap text-xs font-semibold">{r.amount ?? "—"} {r.currency_code}</span> },
    { key: "payee_name", label: kind === "QR" ? t("pr_qrOwner") : t("pr_requester"), render: (r) => party(r.payee_name, r.payee_entity_type, r.payee_entity_id) },
    { key: "payer_name", label: t("pr_payer"), render: (r) => party(r.payer_name, r.payer_entity_type, r.payer_entity_id) },
    { key: "status", label: t("common:status"), render: (r) => <StatusBadge status={r.status} label={t(`pr_status_${r.status}`, { defaultValue: r.status })} /> },
    { key: "channel", label: t("pr_channel"), render: (r) => <span className="text-xs">{r.channel ?? "—"}</span> },
    { key: "created_time", label: t("pr_created"), render: (r) => <span className="whitespace-nowrap text-xs">{when(r.created_time)}</span> },
    { key: "expires_at", label: t("pr_expires"), render: (r) => <span className="whitespace-nowrap text-xs">{when(r.expires_at)}</span> },
    { key: "inst_profile_name", label: t("common:institution"), render: (r) => <span className="text-xs">{r.inst_profile_name ?? "—"}</span> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setOpen(r)} /> },
  ];
  return (
    <div className="pt-1 pb-6">
      <PageTitle>{t("pr_title")}</PageTitle>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("pr_subtitle")}</p>
      <PillTabs tabs={[["REQUEST", t("pr_kind_REQUEST")], ["QR", t("pr_kind_QR")]]} value={kind} onChange={setKind} />
      <ListTable list={list} columns={columns} rowKey={(r) => `${r.kind}-${r.id}`} title={t("pr_title")} emptyTitle={t("pr_empty")} />
      {open && (
        <Modal open onClose={() => setOpen(null)} title={open.reference} size="lg">
          <Facts
            rows={[
              [t("pr_kind"), t(`pr_kind_${open.kind}`, { defaultValue: open.kind })],
              [t("common:status"), t(`pr_status_${open.status}`, { defaultValue: open.status })],
              [t("pr_amount"), `${open.amount ?? "—"} ${open.currency_code ?? ""}`],
              [open.kind === "QR" ? t("pr_qrOwner") : t("pr_requester"), open.payee_name],
              [t("pr_payer"), open.payer_name],
              [t("pr_store"), open.store_id],
              [t("pr_terminal"), open.terminal_id],
              [t("pr_channel"), open.channel],
              [t("pr_rrn"), open.rrn],
              [t("pr_note"), open.note],
              [t("pr_created"), when(open.created_time)],
              [t("pr_expires"), when(open.expires_at)],
              [t("pr_closed"), when(open.closed_time)],
              [t("common:institution"), open.inst_profile_name],
            ]}
          />
        </Modal>
      )}
    </div>
  );
}
