import { useVisiblePoll } from "@/Hooks/useVisiblePoll";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageTitle } from "@/Components/Common/PageTitle";
import { usePagePermission } from "@/Hooks/usePermission";
import { tellerApi } from "@/Services/Accounting/accounting.api";
import { Tabs, useInstitutionScope } from "../Loans/loanShared";
import { Desk } from "./Desk";
import { EndOfDay } from "./EndOfDay";
import { TillList } from "./Tills";
import { Transfers } from "./Transfers";
import { QUEUE_EVERY, readTransfers } from "./tellerShared";

// FINANCE › Teller (menu 196): tills and vaults per branch and currency, the
// teller's desk and the cash transfers between them. Working a till is the
// Self action, and the role (teller / vault custodian, from Core Banking
// Setup) is checked too: open with a count, serve customers, ask the vault
// for cash or send cash on (each waits for the other side's decision),
// close with a count (a difference posts a variance).
export function Teller() {
  const { t } = useTranslation("corebank");
  const can = usePagePermission();
  const [tab, setTab] = useState(can("Self") ? "desk" : "tills");
  const waiting = useWaitingForMe(can("Self"));
  const waitingCount = waiting.rows.length + waiting.closes.length;
  return (
    <div className="pb-8 pt-4">
      <div className="mb-5" data-tour="page-title">
        <PageTitle>{t("tellerTitle")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("tellerSubtitle")}</p>
      </div>
      <Tabs
        tabs={[{ key: "desk" }, { key: "transfers", count: waitingCount || undefined }, { key: "tills" }, { key: "eod" }]}
        value={tab}
        onChange={setTab}
        labelOf={(k) => t(`tellerTab_${k}`)}
      />
      {tab === "desk" && <Desk waiting={waiting} />}
      {tab === "transfers" && <Transfers waiting={waiting} />}
      {tab === "tills" && <TillList />}
      {tab === "eod" && <EndOfDay />}
    </div>
  );
}

// What only this user can complete, read every QUEUE_EVERY: transfers (as
// vault custodian, or as the teller cash is sent to), and the tills of their
// branch whose close waits for them as vault custodian.
function useWaitingForMe(enabled) {
  const { scope } = useInstitutionScope();
  const [rows, setRows] = useState([]);
  const [closes, setCloses] = useState([]);
  const reload = useCallback(async ({ force = true } = {}) => {
    if (!enabled) return;
    await Promise.all([
      readTransfers(scope({ awaits_me: true }), { force })
        .then((r) => setRows(Array.isArray(r?.data) ? r.data : []))
        .catch(() => {}),
      tellerApi
        .list(scope({ awaits_me: true, limit: 200 }))
        .then((r) => setCloses(Array.isArray(r?.data) ? r.data : []))
        .catch(() => {}),
    ]);
  }, [enabled, scope]);
  useEffect(() => {
    void reload({ force: false });
  }, [reload]);
  useVisiblePoll(reload, QUEUE_EVERY, enabled);
  return { rows, closes, reload };
}
