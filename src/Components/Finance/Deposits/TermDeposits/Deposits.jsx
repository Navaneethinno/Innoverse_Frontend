import { ListTable } from "@/Components/Common/ListView";
import { useServerList } from "@/Hooks/useServerList";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Landmark, PiggyBank, Plus } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { money } from "@/Components/Finance/Accounts/accountShared";
import { useMenuPermission } from "@/Hooks/usePermission";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { depositsApi } from "@/Services/TermDeposits/termDeposits.api";
import { dayDate, ratePct } from "../depositShared";
import { DepositView } from "./DepositView";
import { OpenDeposit } from "./OpenDeposit";
import { useLiveChannel } from "@/Hooks/useLiveChannel";

// The deposit table, shared by the Deposits screen and a customer's detail.
function depositColumns(t, can, onOpen, compact) {
  return [
    {
      key: "reference_no",
      label: t("reference"),
      render: (d) => (
        <button type="button" onClick={() => onOpen(d.id)} className="text-left">
          <span className="font-mono text-xs font-bold text-primary hover:underline">{d.reference_no}</span>
          {d.deposit_number && <span className="block font-mono text-[10px] text-muted-foreground">{d.deposit_number}</span>}
        </button>
      ),
    },
    !compact && {
      key: "owner",
      label: t("owner"),
      align: "left",
      render: (d) => (
        <div>
          <p className="text-xs font-semibold">{d.owner?.name}</p>
          <p className="text-[10px] text-muted-foreground">{t(d.owner?.party === "MERCHANT" ? "accounts:merchant" : "accounts:customer")}</p>
        </div>
      ),
    },
    { key: "product_name", label: t("depositProduct"), render: (d) => <span className="text-xs">{d.deposit_product_name ?? d.product_name} · {d.tenor_label}</span> },
    { key: "principal", label: t("principal"), render: (d) => <span className="whitespace-nowrap text-xs font-bold tabular-nums">{money(d.principal, d.currency_code)}</span> },
    { key: "annual_rate", label: t("rate"), render: (d) => <span className="text-xs font-semibold tabular-nums text-primary">{ratePct(d.annual_rate)}</span> },
    { key: "maturity_date", label: t("maturityDate"), render: (d) => <span className="whitespace-nowrap text-xs">{dayDate(d.maturity_date)}</span> },
    { key: "status", label: t("status"), render: (d) => <StatusBadge status={d.status} variant="subtle" /> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (d) => <RowActions buttons={{ view: true }} onView={() => onOpen(d.id)} permission={can} /> },
  ].filter(Boolean);
}

// TERM DEPOSITS > Deposits (menu 181): deposits opened for customers and
// merchants. Filters, "Open deposit", and the deposit's own page.
export function Deposits() {
  const { t } = useTranslation(["deposits", "accounts", "common"]);
  const can = useMenuPermission("Term Deposits");
  const [openId, setOpenId] = useState(null);
  const [opening, setOpening] = useState(false);

  const list = useServerList({ api: depositsApi.listPath, call: depositsApi.list });

  const load = list.reload;
  useLiveChannel("/config/deposit/contract/list", () => load());

  const columns = depositColumns(t, can, setOpenId, false);

  if (openId) {
    return (
      <DepositView
        id={openId}
        onBack={() => {
          setOpenId(null);
          load();
        }}
      />
    );
  }
  const listActions = (
    <>
      {can("Add") && (
        <Button size="sm" icon={Plus} onClick={() => setOpening(true)}>
          {t("openDeposit")}
        </Button>
      )}
    </>
  );

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <Landmark size={22} className="text-primary" /> {t("depositsTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("depositsSubtitle")}</p>
        </div>
      </div>

      <ListTable list={list} actions={listActions} columns={columns} rowKey={(d) => d.id} title={t("depositsTitle")} emptyTitle={t("noDeposits")} emptyDescription={t("noDepositsHint")} />

      {opening && (
        <OpenDeposit
          onClose={() => setOpening(false)}
          onOpened={(deposit) => {
            setOpening(false);
            if (deposit?.id) setOpenId(deposit.id);
            else load();
          }}
        />
      )}
    </div>
  );
}

// A customer's or merchant's deposits, in their detail, with "Open deposit" for
// staff who may open one. Shown only to users with the Deposits menu.
export function OwnerDeposits({ owner }) {
  const { t } = useTranslation(["deposits", "accounts", "common"]);
  const can = useMenuPermission("Term Deposits");
  const [items, setItems] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [opening, setOpening] = useState(false);
  const allowed = can("View");
  const columns = depositColumns(t, can, setOpenId, true);

  const loadDeposits = useCallback(async () => {
    try {
      const row = rowsOf(await depositsApi.list({ entity_type: owner.kind, entity_id: owner.id, page: 1, page_size: 100 }))[0];
      setItems(row?.items ?? []);
    } catch {
      setItems([]);
    }
  }, [owner]);
  useEffect(() => {
    if (owner && allowed) void loadDeposits();
  }, [owner, allowed, loadDeposits]);

  if (!owner || !allowed || items === null) return null;
  const entity = owner ? { entity_type: owner.kind, entity_id: owner.id } : null;
  return (
    <div className="mb-4 rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold text-foreground">
          <PiggyBank size={15} className="text-primary" /> {t("ownerDeposits", { count: items.length })}
        </p>
        {can("Add") && entity && (
          <Button variant="outline" size="sm" icon={Plus} onClick={() => setOpening(true)}>
            {t("openDeposit")}
          </Button>
        )}
      </div>
      {items.length ? <DataTable columns={columns} rows={items} rowKey={(d) => d.id} title={t("depositsTitle")} compact /> : <p className="text-xs text-muted-foreground">{t("noDepositsForOwner")}</p>}
      {openId && (
        <Modal open size="full" title={t("depositsTitle")} onClose={() => setOpenId(null)}>
          <DepositView id={openId} embedded />
        </Modal>
      )}
      {opening && (
        <OpenDeposit
          entity={entity}
          onClose={() => setOpening(false)}
          onOpened={(deposit) => {
            setOpening(false);
            void loadDeposits();
            if (deposit?.id) setOpenId(deposit.id);
          }}
        />
      )}
    </div>
  );
}
