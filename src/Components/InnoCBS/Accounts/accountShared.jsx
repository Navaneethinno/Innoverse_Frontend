import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Landmark } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { DataTable } from "@/Components/Common/DataTable";
import { accountsApi } from "@/Services/Epurse/accounts.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { formatNumber } from "@/Utils/Lib/numberFormat";
import { formatDateTime, formatDay } from "@/Utils/Lib/dateFormat";

// Account display shared by the Accounts screen and the customer/merchant
// detail. Balances come rounded to the currency's decimals already.
// Amounts in the institution's number format (login formats.number_format).
export const money = (value, currency) => (value == null ? "—" : `${formatNumber(value, { min: 2, max: 6 })}${currency ? ` ${currency}` : ""}`);

// Dates in the institution's date format (login formats.date_format).
export const accountDate = formatDateTime;

// A date-only value (YYYY-MM-DD), as a local date without a time shift.
export const dayDate = formatDay;

export const productLabel = (code, name) => [name, code].filter(Boolean).join(" · ") || "—";

// The account's class: CUSTOMER is a wallet, DEPOSIT a term deposit's own
// account (internal GL accounts are never listed).
export function AccountClass({ value }) {
  const { t } = useTranslation("accounts");
  if (!value) return null;
  return (
    <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold", value === "DEPOSIT" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700")}>
      {t(`class_${value}`, { defaultValue: value })}
    </span>
  );
}

// An agent's float wallet (wallet_purpose AGENT_FLOAT): only for cash-in
// and cash-out, never for other transactions.
export function WalletPurposeBadge({ value }) {
  const { t } = useTranslation("accounts");
  if (value !== "AGENT_FLOAT") return null;
  return <span className="whitespace-nowrap rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">{t("agentWallet")}</span>;
}

// The balances, as label/value tiles.
export function AccountBalances({ account }) {
  const { t } = useTranslation("accounts");
  const tiles = [
    ["availBal", account.avail_bal],
    ["ledgerBal", account.ledger_bal],
    ["commission", account.commission],
    ["expense", account.expense],
    ["loyaltyPoint", account.loyalty_point, true],
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {tiles.map(([key, value, plain]) => (
        <div key={key} className="rounded-xl border border-border bg-card px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t(key)}</p>
          <p className="mt-0.5 text-sm font-bold text-foreground">{plain ? (value ?? "—") : money(value, account.currency_code)}</p>
        </div>
      ))}
    </div>
  );
}

// The accounts in a customer's or merchant's detail (get response):
// empty until they are approved. A table, 10 a page: a customer may hold many.
export function CustomerAccounts({ accounts }) {
  const { t } = useTranslation("accounts");
  if (!Array.isArray(accounts) || !accounts.length) return null;
  const amount = (key, label) => ({ key, label: t(label), render: (a) => <span className="whitespace-nowrap tabular-nums">{money(a[key], a.currency_code)}</span> });
  const columns = [
    {
      key: "acct_num",
      label: t("account"),
      align: "left",
      render: (a) => (
        <div>
          <p className="flex items-center gap-2 font-mono text-xs font-bold text-foreground">
            {a.acct_num} <AccountClass value={a.acct_class} />
          </p>
          <p className="text-[10px] text-muted-foreground">
            {productLabel(a.acct_product_code, a.acct_product_name)}
            {a.digital_product_name ? ` · ${t("underDigitalProduct", { name: a.digital_product_name })}` : ""}
          </p>
        </div>
      ),
    },
    { ...amount("avail_bal", "availBal"), render: (a) => <b className="whitespace-nowrap tabular-nums">{money(a.avail_bal, a.currency_code)}</b> },
    amount("ledger_bal", "ledgerBal"),
    amount("commission", "commission"),
    amount("expense", "expense"),
    { key: "loyalty_point", label: t("loyaltyPoint"), render: (a) => <span className="tabular-nums">{a.loyalty_point ?? "—"}</span> },
    { key: "status", label: t("common:status"), render: (a) => <StatusBadge status={a.status_name ?? String(a.status ?? "")} variant="subtle" /> },
  ];
  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-border bg-card">
      <p className="flex items-center gap-2 px-4 pt-4 text-sm font-bold text-foreground">
        <Landmark size={15} className="text-primary" /> {t("accountsTitle", { count: accounts.length })}
      </p>
      <DataTable bare rows={accounts} columns={columns} rowKey={(a) => a.id} title={t("accountsTitle", { count: accounts.length })} />
    </div>
  );
}

// The customer or merchant who owns these accounts ({kind, id, name, ...}),
// read from their first wallet: a customer's detail has their accounts but
// not the profile id that deposits, limits and history are keyed by.
export function useAccountsOwner(accounts) {
  const walletId = accounts?.find((a) => a.acct_class !== "DEPOSIT")?.id;
  const [owner, setOwner] = useState(null);
  useEffect(() => {
    if (!walletId) return undefined;
    let cancelled = false;
    accountsApi
      .get({ id: walletId })
      .then((r) => !cancelled && setOwner(rowsOf(r)[0]?.owner?.kind ? rowsOf(r)[0].owner : null))
      .catch(() => !cancelled && setOwner(null));
    return () => {
      cancelled = true;
    };
  }, [walletId]);
  return owner;
}
