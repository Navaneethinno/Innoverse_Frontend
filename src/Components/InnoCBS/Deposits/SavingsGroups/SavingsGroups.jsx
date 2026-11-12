import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { ListTable } from "@/Components/Common/ListView";
import { NoAccess } from "@/Components/Common/NoAccess";
import { RowActions } from "@/Components/Common/RowActions";
import { labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { OpDialog, cell, coded, dateCell, first, useL, words } from "@/Components/InnoCBS/cbsOps";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { GroupView, Members, Status, groupApi, header, memberBody } from "@/Components/InnoCBS/Deposits/depositOpsShared";

export function SavingsGroups() {
  const L = useL();
  const { t } = useTranslation("common");
  const can = usePagePermission();
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [choices, setChoices] = useState(null);
  const list = useServerList({ api: groupApi.listPath, call: groupApi.list, enabled: !openId });
  useEffect(() => {
    groupApi
      .options({})
      .then((r) => setChoices(first(r) ?? {}))
      .catch(() => setChoices({}));
  }, []);
  if (!can("View")) return <NoAccess />;
  if (openId) return <GroupView id={openId} onBack={() => (setOpenId(null), list.reload())} />;
  const roles = (choices?.roles ?? []).map((x) => ({ value: x, label: words(x) }));
  return (
    <div className="pt-1 pb-6">
      {header(L, "savingsGroups", "Members, dues, contributions, withdrawals approved by members, and dissolution.")}
      <ListTable
        list={list}
        rowKey={(r) => r.id}
        title={L("savingsGroups")}
        emptyTitle={L("No savings groups yet")}
        actions={
          can("Add") && (
            <Button size="sm" icon={Plus} onClick={() => setAdding(true)}>
              {L("Form a group")}
            </Button>
          )
        }
        columns={[
          { key: "group_name", label: L("group"), align: "left", render: (r) => <button type="button" className="text-left text-xs font-bold text-primary hover:underline" onClick={() => setOpenId(r.id)}>{r.group_name}<span className="block font-mono text-[10px] font-normal text-muted-foreground">{r.group_code}</span></button> },
          { key: "scheme_code", label: L("scheme"), render: (r) => cell(r.scheme_code) },
          { key: "members", label: L("members"), render: (r) => cell(`${r.members}${r.members_in_arrears ? ` · ${r.members_in_arrears} ${L("in arrears")}` : ""}`) },
          { key: "group_balance", label: L("group_balance"), render: (r) => cell(r.group_balance) },
          { key: "next_due_date", label: L("next_due_date"), render: (r) => dateCell(r.next_due_date) },
          { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
          { key: "actions", label: t("actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setOpenId(r.id)} /> },
        ]}
      />
      {adding && (
        <OpDialog
          size="lg"
          title={L("Form a group")}
          hint={L("At least the scheme's minimum members; a checker approves it.")}
          choices={choices}
          fields={[
            { key: "group_code", label: L("group_code"), type: "code", required: true },
            { key: "group_name", label: L("group_name"), required: true },
            { key: "scheme_code", label: L("scheme"), type: "select", required: true, options: coded("schemes") },
            { key: "group_acct_id", label: L("Group account"), type: "acct", required: true },
            { key: "start_date", label: L("start_date"), type: "date", required: true },
          ]}
          initial={{ members: [] }}
          run={(x) => groupApi.add({ group_code: x.group_code, group_name: x.group_name, scheme_code: x.scheme_code, group_acct_id: Number(x.group_acct_id), start_date: x.start_date, members: x.members.map(memberBody) })}
          onClose={() => setAdding(false)}
          onDone={() => (setAdding(false), list.reload())}
        >
          {(form, setForm) => (
            <div className={`${labelClass} mb-3`}>
              {L("members")}
              <Members value={form.members} onChange={(v) => setForm((f) => ({ ...f, members: v }))} roles={roles} />
            </div>
          )}
        </OpDialog>
      )}
    </div>
  );
}
