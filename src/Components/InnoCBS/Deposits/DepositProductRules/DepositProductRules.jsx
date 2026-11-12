import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { cell, codes, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { acctProducts, ruleApi, toNum, useF } from "@/Components/InnoCBS/Deposits/depositSettingsShared";

export function DepositProductRules() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={ruleApi}
      title={L("depositProductRules")}
      subtitle={L("One set of rules per deposit product: account types, balances, channels, withdrawals, dormancy.")}
      effectiveDated
      columns={[
        { key: "deposit_category", label: L("deposit_category"), render: (r) => cell(words(sv(r, "deposit_category"))) },
        { key: "min_opening_balance", label: L("min_opening_balance"), render: (r) => cell(sv(r, "min_opening_balance")) },
      ]}
      fields={[
        f("acct_product_id", "select", { required: true, fixedOnEdit: true, options: acctProducts() }),
        f("deposit_category", "select", { required: true, options: codes("deposit_categories") }),
        f("code", "code", { fixedOnEdit: true, hint: L("Leave empty and the server gives one.") }),
        f("name"),
        f("account_types", "multi", { options: codes("account_types") }),
        f("operating_modes", "multi", { options: codes("operating_modes") }),
        f("opening_channels", "multi", { options: codes("opening_channels") }),
        f("multiple_accounts_per_customer", "select", { options: codes("multiple_accounts") }),
        f("transaction_authorization", "select", { options: codes("transaction_authorizations") }),
        f("min_opening_balance", "amount"),
        f("min_balance_mandatory", "bool"),
        f("min_average_balance", "amount"),
        f("average_balance_period", "select", { options: codes("average_balance_periods") }),
        f("max_balance", "amount"),
        f("min_deposit_amount", "amount"),
        f("max_deposit_amount", "amount"),
        f("cash_deposit_limit", "amount"),
        f("min_withdrawal_amount", "amount"),
        f("max_withdrawal_amount", "amount"),
        f("daily_cash_withdrawal_limit", "amount"),
        f("atm_withdrawal_limit", "amount"),
        f("daily_transfer_limit", "amount"),
        f("free_withdrawals", "int"),
        f("monthly_withdrawal_count", "int"),
        f("max_transactions_per_month", "int"),
        f("dormancy_days", "int"),
        f("statement_frequency", "select", { options: codes("statement_frequencies") }),
        f("loan_to_deposit_ratio", "percent"),
        f("interest_applicable", "bool"),
        f("negative_balance_allowed", "bool"),
        f("cheque_book", "bool"),
        f("nomination_facility", "bool"),
        f("multiple_signatories", "bool"),
        f("third_party_deposits_allowed", "bool"),
        f("international_withdrawal_allowed", "bool"),
        f("lien_marking_allowed", "bool"),
        f("loan_against_deposit_allowed", "bool"),
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={toNum(["acct_product_id", "free_withdrawals", "monthly_withdrawal_count", "max_transactions_per_month", "dormancy_days"])}
    />
  );
}
