import { ListTable } from "@/Components/Common/ListView";
import { useServerList } from "@/Hooks/useServerList";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Landmark, PlusCircle, ScrollText } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { Button } from "@/Components/Common/Button";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { Spinner } from "@/Components/Common/Spinner";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { accountsApi } from "@/Services/Epurse/accounts.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { AccountBalances, AccountClass, WalletPurposeBadge, accountDate, money, productLabel } from "./accountShared";
import { AccountStatement } from "./AccountStatement";
import { AccountParties, AccountRequests, AccountStatements, RestrictionBadge } from "./AccountActions";
import { Tabs } from "../Loans/loanShared";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { PhoneTransfers } from "./PhoneTransfers";
import { OpenAccount, OpeningRequests } from "./AccountOpening";
import { usePagePermission } from "@/Hooks/usePermission";
import { ownerEntity } from "../Deposits/TermDeposits/OpenDeposit";

// The filters as the list call takes them: blanks left out, ids as numbers.

// EPURSE > Accounts (menu 178): every customer's and merchant's account.
// The first opens automatically on approval, further ones by request
// (Open account, approved under Opening requests); freeze / block / close / reactivate /
// activate and parties go through maker-checker requests (AccountActions). A bank / fintech user sees its
// own institution's; a service provider sees every institution's. A second
// tab lists the money waiting for phone numbers (same menu).
export function Accounts() {
  const { t } = useTranslation("accounts");
  const can = usePagePermission();
  const [view, setView] = useState("accounts");
  const [opening, setOpening] = useState(false);
  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <Landmark size={22} className="text-primary" /> {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {can("Edit") && (
          <Button icon={PlusCircle} onClick={() => setOpening(true)}>
            {t("openAccount")}
          </Button>
        )}
      </div>
      <Tabs tabs={[{ key: "accounts" }, { key: "opening" }, { key: "phone" }]} value={view} onChange={setView} labelOf={(k) => t({ accounts: "title", opening: "openingRequests", phone: "ptTitle" }[k])} />
      {view === "accounts" && <AccountsList />}
      {view === "opening" && <OpeningRequests />}
      {view === "phone" && <PhoneTransfers />}
      {opening && <OpenAccount onClose={() => setOpening(false)} onDone={(made) => made?.status === "PENDING" && setView("opening")} />}
    </div>
  );
}

function AccountsList() {
  const { t } = useTranslation(["accounts", "common"]);
  // Account number, owner's name or reference, account or digital product.
  const [viewing, setViewing] = useState(null);
  const [statement, setStatement] = useState(null);

  const list = useServerList({ api: accountsApi.listPath, call: accountsApi.list });

  const load = list.reload;
  useLiveChannel("/config/account/list", () => load());

  const columns = [
    {
      key: "acct_num",
      label: t("accountNumber"),
      render: (r) => (
        <div className="flex flex-col items-start gap-1">
          <span className="font-mono text-xs font-bold">{r.acct_num}</span>
          <span className="flex flex-wrap gap-1">
            <AccountClass value={r.acct_class} />
            <WalletPurposeBadge value={r.wallet_purpose} />
          </span>
        </div>
      ),
    },
    {
      key: "owner",
      label: t("owner"),
      render: (r) => (
        <div>
          <p className="text-xs font-semibold">{r.owner?.name || "—"}</p>
          <p className="text-[10px] text-muted-foreground">
            {t(r.owner?.party === "MERCHANT" ? "merchant" : "customer")} · {t(r.owner?.ownership === "CORPORATE" ? "corporate" : "individual")}
          </p>
        </div>
      ),
    },
    { key: "acct_product_name", label: t("accountProduct"), render: (r) => <span className="text-xs">{productLabel(r.acct_product_code, r.acct_product_name)}</span> },
    { key: "digital_product_name", label: t("digitalProduct"), render: (r) => <span className="text-xs">{r.digital_product_name ?? "—"}</span> },
    { key: "avail_bal", label: t("availBal"), render: (r) => <span className="whitespace-nowrap text-xs font-semibold">{money(r.avail_bal, r.currency_code)}</span> },
    { key: "inst_profile_name", label: t("institution"), render: (r) => <span className="text-xs">{r.inst_profile_name ?? "—"}</span> },
    {
      key: "status",
      label: t("status"),
      render: (r) => (
        <span className="inline-flex flex-wrap items-center justify-center gap-1">
          <StatusBadge status={r.status_name ?? String(r.status ?? "")} variant="subtle" />
          <RestrictionBadge value={r.restriction} />
        </span>
      ),
    },
    { key: "opened_at", label: t("openedAt"), render: (r) => <span className="whitespace-nowrap text-xs">{accountDate(r.opened_at)}</span> },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (r) => (
        <div className="flex items-center justify-center gap-1">
          <RowActions buttons={{ view: true }} onView={() => setViewing(r)} />
          <ActionIconButton label={t("statement")} intent="statement" icon={ScrollText} onClick={() => setStatement(r)} />
        </div>
      ),
    },
  ];

  return (
    <>
      <ListTable list={list} columns={columns} rowKey={(r) => r.id} title={t("title")} emptyTitle={t("noAccounts")} emptyDescription={t("noAccountsHint")} />

      {viewing && (
        <AccountDetail
          account={viewing}
          onClose={() => setViewing(null)}
          onStatement={(a) => {
            setViewing(null);
            setStatement(a);
          }}
        />
      )}
      {statement && <AccountStatement account={statement} onClose={() => setStatement(null)} />}
    </>
  );
}

// One account, fetched fresh (/config/account/get) for its latest balances.
// Tabs: the account itself, its action requests, its parties, its statements.
function AccountDetail({ account, onClose, onStatement }) {
  const { t } = useTranslation("accounts");
  const can = usePagePermission();
  const [openingFor, setOpeningFor] = useState(null);
  const [full, setFull] = useState(null);
  const [tab, setTab] = useState("overview");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    accountsApi
      .get({ id: account.id })
      .then((r) => !cancelled && setFull(rowsOf(r)[0] ?? account))
      .catch((error) => {
        if (cancelled) return;
        notifications.error(error.message);
        setFull(account);
      });
    return () => {
      cancelled = true;
    };
  }, [account, version]);

  const a = full ?? account;
  const rows = [
    ["accountProduct", `${productLabel(a.acct_product_code, a.acct_product_name)}${a.acct_product_type ? ` (${a.acct_product_type})` : ""}`],
    ["digitalProduct", productLabel(a.digital_product_code, a.digital_product_name)],
    ["currency", [a.currency_code, a.currency_name].filter(Boolean).join(" · ") || "—"],
    ["priority", a.acct_priority ?? "—"],
    ["institution", a.inst_profile_name ?? "—"],
    ["openedAt", accountDate(a.opened_at)],
    ["updatedAt", accountDate(a.updated_at)],
  ];

  return (
    <Modal open onClose={onClose} size="xl" title={t("accountTitle", { number: a.acct_num })}>
      {!full && (
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner size={12} /> {t("refreshing")}
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-mono text-lg font-black text-foreground">
          {a.acct_num} <AccountClass value={a.acct_class} /> <WalletPurposeBadge value={a.wallet_purpose} />
        </p>
        <div className="flex items-center gap-3">
          <StatusBadge status={a.status_name ?? String(a.status ?? "")} variant="subtle" />
          <RestrictionBadge value={a.restriction} />
          <Button variant="outline" size="sm" icon={ScrollText} onClick={() => onStatement(a)}>
            {t("statement")}
          </Button>
        </div>
      </div>
      {a.acct_class !== "DEPOSIT" && <Tabs tabs={[{ key: "overview" }, { key: "requests" }, { key: "parties" }, { key: "statements" }]} value={tab} onChange={setTab} labelOf={(k) => t(`tab_${k}`)} />}
      {tab === "requests" && <AccountRequests account={a} onChanged={() => setVersion((n) => n + 1)} />}
      {tab === "parties" && <AccountParties account={a} />}
      {tab === "statements" && <AccountStatements account={a} />}
      {tab === "overview" && (
        <>
          <AccountBalances account={a} />
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {rows.map(([key, value]) => (
              <div key={key} className="rounded-xl border border-border bg-card p-3">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t(key)}</dt>
                <dd className="mt-0.5 text-sm font-semibold text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
          {a.owner && (
            <div className="mt-4 rounded-xl border border-border bg-card p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("owner")}</p>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-foreground">{a.owner.name || "—"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t(a.owner.party === "MERCHANT" ? "merchant" : "customer")} · {t(a.owner.ownership === "CORPORATE" ? "corporate" : "individual")}
                    {a.owner.reference_id ? ` · ${a.owner.reference_id}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {a.owner.status_name && <StatusBadge status={a.owner.status_name} variant="subtle" />}
                  {can("Edit") && a.acct_class !== "DEPOSIT" && ownerEntity(a.owner) && (
                    <Button variant="outline" size="sm" icon={PlusCircle} onClick={() => setOpeningFor(ownerEntity(a.owner))}>
                      {t("openAnotherAccount")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {openingFor && <OpenAccount entity={openingFor} onClose={() => setOpeningFor(null)} />}
    </Modal>
  );
}
