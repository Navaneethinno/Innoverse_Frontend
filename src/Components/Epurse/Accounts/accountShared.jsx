import { useTranslation } from "react-i18next";
import { Landmark } from "lucide-react";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";

// Account display shared by the Accounts screen and the customer/merchant
// detail. Balances come rounded to the currency's decimals already.
export const money = (value, currency) =>
  value == null ? "—" : `${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}${currency ? ` ${currency}` : ""}`;

export const accountDate = (value) => (value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");

export const productLabel = (code, name) => [name, code].filter(Boolean).join(" · ") || "—";

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
// empty until they are approved.
export function CustomerAccounts({ accounts }) {
  const { t } = useTranslation("accounts");
  if (!Array.isArray(accounts) || !accounts.length) return null;
  return (
    <div className="mb-4 rounded-2xl border border-border p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
        <Landmark size={15} className="text-primary" /> {t("accountsTitle", { count: accounts.length })}
      </p>
      <div className="grid gap-3">
        {accounts.map((account) => (
          <div key={account.id} className="rounded-xl bg-muted/40 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-mono text-sm font-bold text-foreground">{account.acct_num}</p>
                <p className="text-[11px] text-muted-foreground">
                  {productLabel(account.acct_product_code, account.acct_product_name)}
                  {account.acct_product_type ? ` · ${account.acct_product_type}` : ""}
                  {account.digital_product_name ? ` · ${t("underDigitalProduct", { name: account.digital_product_name })}` : ""}
                </p>
              </div>
              <StatusBadge status={account.status_name ?? String(account.status ?? "")} variant="subtle" />
            </div>
            <AccountBalances account={account} />
          </div>
        ))}
      </div>
    </div>
  );
}
