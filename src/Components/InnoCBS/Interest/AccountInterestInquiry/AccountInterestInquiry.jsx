import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ListTable } from "@/Components/Common/ListView";
import { NoAccess } from "@/Components/Common/NoAccess";
import { PageTitle } from "@/Components/Common/PageTitle";
import { RowActions } from "@/Components/Common/RowActions";
import { accountDate } from "@/Components/InnoCBS/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { AccountRate, accountApi, cell, pct, useL, words } from "@/Components/InnoCBS/Interest/interestShared";

export function AccountInterestInquiry() {
  const L = useL();
  const { t } = useTranslation("common");
  const can = usePagePermission();
  const [open, setOpen] = useState(null);
  const list = useServerList({ api: accountApi.listPath, call: accountApi.list, enabled: !open });
  if (!can("View")) return <NoAccess />;
  if (open) return <AccountRate row={open} onBack={() => setOpen(null)} />;
  return (
    <div className="pt-1 pb-6">
      <PageTitle>{L("accountInterestInquiry")}</PageTitle>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">{L("The rate each account got at booking, and its revisions.")}</p>
      <ListTable
        list={list}
        rowKey={(r) => r.id}
        title={L("accountInterestInquiry")}
        emptyTitle={L("No account rates yet")}
        columns={[
          { key: "account_ref", label: L("account"), align: "left", render: (r) => <button type="button" className="text-left text-xs font-bold text-primary hover:underline" onClick={() => setOpen(r)}>{r.account_ref}<span className="block text-[10px] font-normal text-muted-foreground">{words(r.account_kind)}</span></button> },
          { key: "owner_name", label: L("owner"), render: (r) => cell(r.owner_name) },
          { key: "account_name", label: L("product"), render: (r) => cell(r.account_name) },
          { key: "scheme_code", label: L("scheme_code"), render: (r) => cell(r.scheme_code) },
          { key: "current_rate", label: L("current_rate"), render: (r) => cell(pct(r.current_rate)) },
          { key: "original_rate", label: L("original_rate"), render: (r) => cell(pct(r.original_rate)) },
          { key: "rate_type", label: L("rate_type"), render: (r) => cell(words(r.rate_type)) },
          { key: "effective_date", label: L("effective_date"), render: (r) => cell(accountDate(r.effective_date)) },
          { key: "actions", label: t("actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setOpen(r)} /> },
        ]}
      />
    </div>
  );
}
