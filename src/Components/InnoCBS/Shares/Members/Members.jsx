import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { ListTable } from "@/Components/Common/ListView";
import { NoAccess } from "@/Components/Common/NoAccess";
import { RowActions } from "@/Components/Common/RowActions";
import { OpDialog, ownerOf, cell, dateCell, first, splitParty, useL, words } from "@/Components/InnoCBS/cbsOps";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { MemberView, Status, header, memberApi, memberCell } from "@/Components/InnoCBS/Shares/shareShared";

export function Members() {
  const L = useL();
  const { t } = useTranslation("common");
  const can = usePagePermission();
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [memberOpts, setMemberOpts] = useState({});
  useEffect(() => {
    memberApi
      .options({})
      .then((r) => setMemberOpts(first(r) ?? {}))
      .catch(() => {});
  }, []);
  const list = useServerList({ api: memberApi.listPath, call: memberApi.list, enabled: !openId });
  if (!can("View")) return <NoAccess />;
  if (openId) return <MemberView id={openId} onBack={() => (setOpenId(null), list.reload())} />;
  return (
    <div className="pt-1 pb-6">
      {header(L, "members", "Shareholders, and each member's holdings, certificates and statement.")}
      <ListTable
        list={list}
        rowKey={(r) => r.id}
        title={L("members")}
        emptyTitle={L("No members yet")}
        actions={
          can("Add") && (
            <Button size="sm" icon={Plus} onClick={() => setAdding(true)}>
              {L("Add a member")}
            </Button>
          )
        }
        columns={[
          { key: "member_number", label: L("member"), align: "left", render: (r) => <button type="button" className="text-left text-primary hover:underline" onClick={() => setOpenId(r.id)}>{memberCell(r)}</button> },
          { key: "member_category", label: L("member_category"), render: (r) => cell(words(r.member_category)) },
          { key: "shares", label: L("shares"), render: (r) => cell(r.shares) },
          { key: "paid_amount", label: L("paid_amount"), render: (r) => cell(r.paid_amount) },
          { key: "joined_on", label: L("joined_on"), render: (r) => dateCell(r.joined_on) },
          { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
          { key: "actions", label: t("actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setOpenId(r.id)} /> },
        ]}
      />
      {adding && (
        <OpDialog
          title={L("Add a member")}
          hint={L("The member becomes active with their first approved purchase.")}
          fields={[
            { key: "party", label: L("Customer"), type: "party", required: true },
            { key: "member_category", label: L("member_category"), type: "select", required: true, options: (memberOpts.member_categories ?? ["CUSTOMER"]).map((v) => ({ value: v, label: words(v) })) },
            { key: "acct_id", label: L("Payout account"), type: "acct", required: true, owner: (x) => ownerOf(x.party) },
            { key: "nominee", label: L("nominee") },
          ]}
          initial={{ member_category: "CUSTOMER" }}
          run={(x) => memberApi.add({ ...splitParty(x.party), member_category: x.member_category, acct_id: Number(x.acct_id), nominee: x.nominee })}
          onClose={() => setAdding(false)}
          onDone={() => (setAdding(false), list.reload())}
        />
      )}
    </div>
  );
}
