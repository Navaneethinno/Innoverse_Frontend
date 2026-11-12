import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ListTable } from "@/Components/Common/ListView";
import { NoAccess } from "@/Components/Common/NoAccess";
import { PageTitle } from "@/Components/Common/PageTitle";
import { RowActions } from "@/Components/Common/RowActions";
import { VerbDialog } from "@/Components/MakerChecker/SetupDocument";
import { accountDate } from "@/Components/InnoCBS/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { notifications } from "@/Utils/Lib/notifications";
import { ApprovalView, approvalApi, cell, r_inst, routeApi, useL, words } from "@/Components/InnoCBS/Interest/interestShared";

export function InterestRateApproval() {
  const L = useL();
  const { t } = useTranslation("common");
  const can = usePagePermission();
  const list = useServerList({ api: approvalApi.listPath, call: approvalApi.list });
  const [decision, setDecision] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [busy, setBusy] = useState(false);
  const { t: tr } = useTranslation("record");
  if (!can("View")) return <NoAccess />;
  const decide = async (narration) => {
    setBusy(true);
    try {
      const r = await routeApi(decision.row.route)[decision.verb]({ id: decision.row.id, narration });
      notifications.success(r?.message ?? L("Done"));
      setDecision(null);
      list.reload();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="pt-1 pb-6">
      <PageTitle>{L("interestRateApproval")}</PageTitle>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">{L("Interest changes waiting for approval. The user who proposed a change cannot approve it.")}</p>
      <ListTable
        list={list}
        rowKey={(r) => `${r.type}:${r.id}`}
        title={L("interestRateApproval")}
        emptyTitle={L("Nothing is waiting for approval")}
        columns={[
          { key: "type", label: L("type"), render: (r) => cell(words(r.type)) },
          { key: "code", label: L("record"), align: "left", render: (r) => <span className="text-xs"><b>{r.name}</b><span className="block font-mono text-[10px] text-muted-foreground">{r.code}</span></span> },
          { key: "action", label: L("change"), render: (r) => cell(words(r.action)) },
          { key: "effective_from", label: L("effective_from"), render: (r) => cell(r.effective_from ? accountDate(r.effective_from) : "—") },
          { key: "proposed_by", label: L("proposed_by"), render: (r) => cell(`${r.proposed_by ?? ""}${r.mine ? ` (${L("you")})` : ""}`) },
          { key: "proposed_at", label: L("proposed_at"), render: (r) => cell(r.proposed_at ? accountDate(r.proposed_at) : "—") },
          r_inst(L),
          {
            key: "actions",
            label: t("actions"),
            sortable: false,
            render: (r) => (
              <RowActions
                permission={can}
                buttons={{ view: true, authorize: Boolean(r.actions?.auth), deauthorize: Boolean(r.actions?.deauth) }}
                onView={() => setViewing(r)}
                onAuthorize={() => setDecision({ row: r, verb: "auth" })}
                onDeauthorize={() => setDecision({ row: r, verb: "deauth" })}
              />
            ),
          },
        ].filter(Boolean)}
      />
      <VerbDialog dialog={decision?.verb ?? null} t={tr} busy={busy} onClose={() => setDecision(null)} onSave={decide} />
      {viewing && <ApprovalView row={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
