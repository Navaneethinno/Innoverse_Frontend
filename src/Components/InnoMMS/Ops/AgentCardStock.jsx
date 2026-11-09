import { useTranslation } from "react-i18next";
import { ListTable } from "@/Components/Common/ListView";
import { NoAccess } from "@/Components/Common/NoAccess";
import { PageTitle } from "@/Components/Common/PageTitle";
import { CardNumber, CardPill } from "@/Components/InnoCMS/cardOpsShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { cardStockApi } from "@/Services/Cards/cards.api";

const AGENTS_ONLY = { assignee_type: "AGENT" };

// InnoMMS > Agent Banking > Agent Card Stock: the instant cards agents hold.
export function AgentCardStock() {
  const { t } = useTranslation(["ops", "cards"]);
  const can = usePagePermission();
  const list = useServerList({ api: cardStockApi.listPath, call: cardStockApi.list, extra: AGENTS_ONLY });
  if (!can("View")) return <NoAccess />;
  const columns = [
    { key: "pan_masked", label: t("cards:card"), align: "left", render: (s) => <span><CardNumber card={s} /><span className="block font-mono text-[10px] text-muted-foreground">{s.card_serial_number}</span></span> },
    { key: "product_code", label: t("cards:product"), render: (s) => <span className="text-xs">{s.product_code}</span> },
    { key: "assignee_name", label: t("cards:heldBy"), render: (s) => <span className="text-xs font-semibold">{s.assignee_name}</span> },
    { key: "inventory_status", label: t("cards:status"), render: (s) => <CardPill prefix="inv" code={s.inventory_status} /> },
  ];
  return (
    <div className="pt-1 pb-6">
      <div className="mb-4">
        <PageTitle>{t("agentCardStock")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("agentCardStockSub")}</p>
      </div>
      <ListTable list={list} columns={columns} title={t("agentCardStock")} emptyTitle={t("noAgentCards")} />
    </div>
  );
}
