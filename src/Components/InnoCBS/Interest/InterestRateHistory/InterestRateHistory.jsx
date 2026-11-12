import { ListTable } from "@/Components/Common/ListView";
import { NoAccess } from "@/Components/Common/NoAccess";
import { PageTitle } from "@/Components/Common/PageTitle";
import { accountDate } from "@/Components/InnoCBS/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { cell, historyApi, pct, useL, words } from "@/Components/InnoCBS/Interest/interestShared";

export function InterestRateHistory() {
  const L = useL();
  const can = usePagePermission();
  const list = useServerList({ api: historyApi.listPath, call: historyApi.list });
  if (!can("View")) return <NoAccess />;
  return (
    <div className="pt-1 pb-6">
      <PageTitle>{L("interestRateHistory")}</PageTitle>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">{L("Every approved version of every rate slab over time.")}</p>
      <ListTable
        list={list}
        rowKey={(r) => `${r.code}:${r.version}`}
        title={L("interestRateHistory")}
        emptyTitle={L("No rate history yet")}
        columns={[
          { key: "code", label: L("slab"), align: "left", render: (r) => <span className="text-xs"><b>{r.name}</b><span className="block font-mono text-[10px] text-muted-foreground">{r.code} · v{r.version}</span></span> },
          { key: "scheme_code", label: L("scheme_code"), render: (r) => cell(r.scheme_code) },
          { key: "rate", label: L("rate"), render: (r) => cell(pct(r.rate)) },
          { key: "effective_from", label: L("effective_from"), render: (r) => cell(accountDate(r.effective_from)) },
          { key: "effective_to", label: L("effective_to"), render: (r) => cell(r.effective_to ? accountDate(r.effective_to) : L("open")) },
          { key: "state", label: L("state"), render: (r) => <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${r.state === "CURRENT" ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{words(r.state)}</span> },
          { key: "proposed_by", label: L("proposed_by"), render: (r) => cell(r.proposed_by) },
          { key: "approved_by", label: L("approved_by"), render: (r) => cell(r.approved_by) },
          { key: "approved_at", label: L("approved_on"), render: (r) => cell(r.approved_at ? accountDate(r.approved_at) : "—") },
        ]}
      />
    </div>
  );
}
