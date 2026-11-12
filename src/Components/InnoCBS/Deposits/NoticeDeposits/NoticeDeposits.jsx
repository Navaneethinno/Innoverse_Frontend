import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Wallet, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { ListTable } from "@/Components/Common/ListView";
import { NoAccess } from "@/Components/Common/NoAccess";
import { OpDialog, cell, dateCell, useL } from "@/Components/InnoCBS/cbsOps";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { Status, act, header, noticeApi } from "@/Components/InnoCBS/Deposits/depositOpsShared";

// ---------- Notice deposits ----------

export function NoticeDeposits() {
  const L = useL();
  const { t } = useTranslation("common");
  const can = usePagePermission();
  const [dialog, setDialog] = useState(null);
  const list = useServerList({ api: noticeApi.listPath, call: noticeApi.list });
  if (!can("View")) return <NoAccess />;
  const done = () => (setDialog(null), list.reload());
  return (
    <div className="pt-1 pb-6">
      {header(L, "noticeDeposits", "A notice to withdraw, then the withdrawal. Withdrawing before the notice period ends is charged.")}
      <ListTable
        list={list}
        rowKey={(r) => r.id}
        title={L("noticeDeposits")}
        emptyTitle={L("No notices yet")}
        actions={
          can("Add") && (
            <Button size="sm" icon={Plus} onClick={() => setDialog({ kind: "add" })}>
              {L("Give notice")}
            </Button>
          )
        }
        columns={[
          { key: "acct_num", label: L("account"), render: (r) => cell(r.acct_num) },
          { key: "owner_name", label: L("owner"), render: (r) => cell(r.owner_name) },
          { key: "terms_code", label: L("terms"), render: (r) => cell(r.terms_code) },
          { key: "amount", label: L("amount"), render: (r) => cell(r.amount) },
          { key: "notice_date", label: L("notice_date"), render: (r) => dateCell(r.notice_date) },
          { key: "available_from", label: L("available_from"), render: (r) => dateCell(r.available_from) },
          { key: "early_withdrawal_charge", label: L("early_withdrawal_charge"), render: (r) => cell(Number(r.early_withdrawal_charge) ? r.early_withdrawal_charge : "") },
          { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
          {
            key: "actions",
            label: t("actions"),
            sortable: false,
            render: (r) =>
              r.status !== "WITHDRAWN" &&
              r.status !== "CANCELLED" && (
                <span className="flex gap-1">
                  {r.actions?.withdraw && (
                    <Button size="sm" variant="ghost" icon={Wallet} onClick={() => setDialog({ kind: "withdraw", id: r.id })}>
                      {L("Withdraw")}
                    </Button>
                  )}
                  {r.actions?.cancel && (
                    <Button size="sm" variant="ghost" icon={XCircle} onClick={() => act(noticeApi.cancel, { id: r.id }, list.reload)}>
                      {L("Cancel notice")}
                    </Button>
                  )}
                </span>
              ),
          },
        ]}
      />
      {dialog?.kind === "add" && (
        <OpDialog
          title={L("Give notice")}
          hint={L("Under the notice deposit terms of the account's product.")}
          fields={[
            { key: "acct_id", label: L("Account"), type: "acct", required: true },
            { key: "amount", label: L("amount"), type: "amount", required: true },
          ]}
          run={(x) => noticeApi.add({ acct_id: Number(x.acct_id), amount: x.amount })}
          onClose={() => setDialog(null)}
          onDone={done}
        />
      )}
      {dialog?.kind === "withdraw" && (
        <OpDialog title={L("Withdraw")} hint={L("Before the notice period ends, the early withdrawal charge applies.")} fields={[{ key: "to_acct_id", label: L("To account"), type: "acct", required: true }]} run={(x) => noticeApi.withdraw({ id: dialog.id, to_acct_id: Number(x.to_acct_id) })} onClose={() => setDialog(null)} onDone={done} />
      )}
    </div>
  );
}
