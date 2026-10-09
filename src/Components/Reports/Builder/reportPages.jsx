import { useTranslation } from "react-i18next";
import { AlertOctagon, BarChart3, Coins, CreditCard, Undo2 } from "lucide-react";
import { ReportBuilder } from "./ReportBuilder";

// The report menus that were fixed screens, each now the builder opened on
// the run that screen showed (Transaction Summary 191, Fee Income 192,
// Failed Transactions 193, Reversals 194, Card Summary 202).
const thisMonth = (field) => ({ field, op: "period", value: "THIS_MONTH" });
const PRESETS = {
  summary: {
    icon: BarChart3,
    definition: {
      source: "transactions",
      group_by: ["tran_day", "txn_type"],
      aggregates: [
        { fn: "count" },
        { fn: "sum", field: "amount" },
        { fn: "sum", field: "fee_amount" },
      ],
      filters: { rules: [thisMonth("tran_date_time")] },
    },
  },
  feeIncome: {
    icon: Coins,
    definition: {
      source: "fee_income",
      group_by: ["tran_day", "fee_rule", "account_purpose"],
      aggregates: [{ fn: "sum", field: "amount" }],
      filters: { rules: [thisMonth("tran_date_time")] },
    },
  },
  failed: {
    icon: AlertOctagon,
    definition: {
      source: "transactions",
      columns: [
        "tran_date_time",
        "rrn",
        "txn_type",
        "amount",
        "currency_code",
        "error_code",
        "reason",
        "channel",
        "initiator_type",
        "user_name",
      ],
      filters: {
        rules: [thisMonth("tran_date_time"), { field: "status", op: "in", value: ["FAILED"] }],
      },
    },
  },
  reversals: {
    icon: Undo2,
    definition: {
      source: "transactions",
      columns: [
        "tran_date_time",
        "rrn",
        "amount",
        "fee_amount",
        "currency_code",
        "reversed_rrn",
        "reversed_type",
        "reversed_at",
        "description",
        "user_name",
      ],
      filters: {
        rules: [thisMonth("tran_date_time"), { field: "txn_type", op: "in", value: ["REVERSAL"] }],
      },
    },
  },
  cardSummary: {
    icon: CreditCard,
    definition: {
      source: "cards",
      group_by: ["product", "form_factor", "ops_status"],
      aggregates: [{ fn: "count" }],
    },
  },
};

function PresetReport({ kind }) {
  const { t } = useTranslation("builder");
  const { icon, definition } = PRESETS[kind];
  return (
    <ReportBuilder
      preset={definition}
      icon={icon}
      title={t(`title_${kind}`)}
      subtitle={t(`subtitle_${kind}`)}
    />
  );
}

export const TransactionSummary = () => <PresetReport kind="summary" />;
export const FeeIncome = () => <PresetReport kind="feeIncome" />;
export const FailedTransactions = () => <PresetReport kind="failed" />;
export const Reversals = () => <PresetReport kind="reversals" />;
export const CardSummary = () => <PresetReport kind="cardSummary" />;
