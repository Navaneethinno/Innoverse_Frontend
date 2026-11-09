import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Undo2, UserCheck } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { ListTable } from "@/Components/Common/ListView";
import { NoAccess } from "@/Components/Common/NoAccess";
import { PageTitle } from "@/Components/Common/PageTitle";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { AssignDialog } from "@/Components/InnoCMS/CardStock";
import { CardNumber, CardPill } from "@/Components/InnoCMS/cardOpsShared";
import { useMenuPermission, usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { cardStockApi } from "@/Services/Cards/cards.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";

const HELD = { AGENT: { assignee_type: "AGENT" }, VAULT: { assignee_type: "VAULT" } };

// InnoMMS > Agent Banking > Agent Card Stock: the instant cards agents hold.
// Staff hand vault cards to an agent or take cards back; both use the Card
// Stock menu's rights, which the server checks on /card/stock/assign.
export function AgentCardStock() {
  const { t } = useTranslation(["ops", "cards", "common"]);
  const can = usePagePermission();
  const canStock = useMenuPermission("Card Stock");
  const [held, setHeld] = useState("AGENT");
  const [picked, setPicked] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [options, setOptions] = useState(null);
  const list = useServerList({ api: cardStockApi.listPath, call: cardStockApi.list, extra: HELD[held] });
  useEffect(() => {
    cardStockApi
      .options({})
      .then((r) => setOptions(rowsOf(r)[0] ?? {}))
      .catch(() => setOptions({}));
  }, []);
  if (!can("View")) return <NoAccess />;
  const mayMove = canStock("Edit");
  const movable = (s) => s.inventory_status !== "ISSUED";
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const switchHeld = (v) => {
    setHeld(v);
    setPicked([]);
  };
  const columns = [
    ...(mayMove ? [{ key: "pick", label: "", sortable: false, render: (s) => movable(s) && <input type="checkbox" aria-label={t("cards:select")} checked={picked.includes(s.id)} onChange={() => toggle(s.id)} className="accent-[var(--primary)]" /> }] : []),
    { key: "pan_masked", label: t("cards:card"), align: "left", render: (s) => <span><CardNumber card={s} /><span className="block font-mono text-[10px] text-muted-foreground">{s.card_serial_number}</span></span> },
    { key: "product_code", label: t("cards:product"), render: (s) => <span className="text-xs">{s.product_code}</span> },
    { key: "assignee_name", label: t("cards:heldBy"), render: (s) => <span className="text-xs font-semibold">{s.assignee_type === "VAULT" ? t("cards:vault") : s.assignee_name}</span> },
    { key: "inventory_status", label: t("cards:status"), render: (s) => <CardPill prefix="inv" code={s.inventory_status} /> },
  ];
  return (
    <div className="pt-1 pb-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle>{t("agentCardStock")}</PageTitle>
          <p className="mt-1 text-sm text-muted-foreground">{t("agentCardStockSub")}</p>
        </div>
        {mayMove && (
          <div className="flex flex-wrap gap-2">
            {held === "AGENT" && (
              <Button size="sm" variant="secondary" icon={Undo2} disabled={!picked.length} disabledReason={t("common:blockedSelectRows")} onClick={() => setDialog("VAULT")}>
                {t("takeBackCards", { count: picked.length })}
              </Button>
            )}
            <Button size="sm" icon={UserCheck} disabled={!picked.length} disabledReason={t("common:blockedSelectRows")} onClick={() => setDialog("AGENT")}>
              {t("assignToAgent", { count: picked.length })}
            </Button>
          </div>
        )}
      </div>
      <SegmentedSwitch className="mb-3" value={held} onChange={switchHeld} options={[{ value: "AGENT", label: t("heldByAgents") }, { value: "VAULT", label: t("inTheVault") }]} />
      <ListTable list={list} columns={columns} title={t("agentCardStock")} emptyTitle={held === "AGENT" ? t("noAgentCards") : t("noVaultCards")} />
      {dialog && options && (
        <AssignDialog
          ids={picked}
          options={{ ...options, assignee_types: [dialog] }}
          initialType={dialog}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            setPicked([]);
            list.reload();
          }}
        />
      )}
    </div>
  );
}
