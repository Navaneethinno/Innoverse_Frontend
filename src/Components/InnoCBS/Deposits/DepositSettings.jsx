import { useEffect, useState } from "react";
import { CheckCircle2, FileCheck2, Play, Plus, ReceiptText, ShieldCheck, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/Components/Common/Button";
import { ListTable } from "@/Components/Common/ListView";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { Facts, Section, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { Field } from "@/Components/InnoCBS/Loans/loanShared";
import { OpDialog, PartyPick, RowsTable, byId, cell, codes, coded, dateCell, first, pct, splitParty, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { recordApi } from "@/Services/api/recordApi";
import { calls } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";

// InnoCBS > Deposits > Settings, and the record screens of Deposits (Admin 20).
const D = "/config/deposit";
export const rdProductApi = recordApi(`${D}/rd_product`);
const islamicApi = recordApi(`${D}/islamic_product`);
const ruleApi = recordApi(`${D}/product_rule`);
const chargeRuleApi = recordApi(`${D}/charge_rule`);
const chargeApi = calls(`${D}/charge`, ["list", "request", "approve", "reject", "run"]);
const prematureApi = recordApi(`${D}/premature_rule`);
const noticeTermsApi = recordApi(`${D}/notice_terms`);
const groupSchemeApi = recordApi(`${D}/group_scheme`);
const insuranceApi = { ...recordApi(`${D}/insurance`), ...calls(D, ["insurance_coverage"]) };
const sweepRuleApi = recordApi(`${D}/sweep_rule`);
const sweepApi = calls(`${D}/sweep`, ["links", "run"]);
const mandateApi = recordApi(`${D}/mandate`);
const instructionApi = calls(`${D}/mandate_instruction`, ["add", "evaluate", "execute", "signatory"]);
const taxProfileApi = recordApi(`${D}/tax_profile`);
const taxApi = calls(`${D}/tax`, ["certificate"]);

// A field spec, short: f("annual_rate", "rate", { required: true }).
const useF = () => {
  const L = useL();
  return (key, type = "text", extra = {}) => ({ key, label: L(key), type, ...extra });
};
const toNum = (keys) => (x) => ({ ...x, ...Object.fromEntries(keys.filter((k) => k in x).map((k) => [k, x[k] === "" || x[k] == null ? (k.startsWith("max_") && k.endsWith("_days") ? null : 0) : Number(x[k])])) });
const acctProducts = (key = "account_products") => byId(key);

export function RecurringDepositProducts() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={rdProductApi}
      title={L("recurringDepositProducts")}
      subtitle={L("Instalment limits, frequency, tenure, interest, late payment penalties, suspension, revival and pre-closure.")}
      effectiveDated
      columns={[
        { key: "frequency", label: L("frequency"), render: (r) => cell(words(sv(r, "frequency"))) },
        { key: "annual_rate", label: L("annual_rate"), render: (r) => cell(pct(sv(r, "annual_rate"))) },
        { key: "tenure", label: L("tenure"), sortable: false, render: (r) => cell(`${sv(r, "min_tenure_months") ?? "—"}–${sv(r, "max_tenure_months") ?? "—"} ${L("months")}`) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP_RD" }),
        f("name", "text", { required: true }),
        f("acct_product_id", "select", { required: true, options: acctProducts() }),
        f("currency", "select", { required: true, options: codes("currencies") }),
        f("frequency", "select", { required: true, options: codes("frequencies") }),
        f("due_day_rule", "select", { options: codes("due_day_rules") }),
        f("due_day", "int"),
        f("min_instalment", "amount", { required: true }),
        f("max_instalment", "amount"),
        f("instalment_multiple", "amount"),
        f("fixed_instalment", "bool"),
        f("variable_instalment", "bool"),
        f("partial_instalment_allowed", "bool"),
        f("advance_instalment_allowed", "bool"),
        f("max_advance_instalments", "int", { showIf: (x) => x.advance_instalment_allowed }),
        f("auto_debit", "bool"),
        f("min_tenure_months", "int", { required: true }),
        f("max_tenure_months", "int", { required: true }),
        f("scheme_code", "select", { options: coded("schemes"), hint: L("Leave empty to use the annual rate below.") }),
        f("annual_rate", "rate"),
        f("interest_method", "select", { options: codes("interest_methods") }),
        f("compounding_frequency", "select", { options: codes("compounding_frequencies") }),
        f("day_count", "select", { options: codes("day_counts") }),
        f("interest_payment", "select", { options: codes("interest_payments") }),
        f("maturity_instruction", "select", { options: codes("maturity_instructions") }),
        f("maturity_extension_allowed", "bool"),
        f("late_payment_allowed", "bool"),
        f("grace_period_days", "int"),
        f("penalty_methods", "multi", { options: codes("penalty_methods") }),
        f("penalty_fixed", "amount"),
        f("penalty_percent", "percent"),
        f("daily_charge_rate", "rate"),
        f("delayed_interest_rate", "rate"),
        f("penalty_frequency", "select", { options: codes("penalty_frequencies") }),
        f("max_penalty_amount", "amount"),
        f("max_penalty_percent", "percent"),
        f("recovery_mode", "select", { options: codes("recovery_modes") }),
        f("max_missed_instalments", "int"),
        f("suspend_after_missed", "int"),
        f("close_after_missed", "int"),
        f("revival_allowed", "bool"),
        f("revival_fee_type", "select", { options: codes("fee_types"), showIf: (x) => x.revival_allowed }),
        f("revival_fee_value", "amount", { showIf: (x) => x.revival_allowed }),
        f("preclosure_allowed", "bool"),
        f("preclosure_method", "select", { options: codes("preclosure_methods"), showIf: (x) => x.preclosure_allowed }),
        f("preclosure_penalty_rate", "rate", { showIf: (x) => x.preclosure_allowed }),
        f("preclosure_fixed_penalty", "amount", { showIf: (x) => x.preclosure_allowed }),
        f("min_completed_instalments", "int", { showIf: (x) => x.preclosure_allowed }),
        f("min_holding_months", "int", { showIf: (x) => x.preclosure_allowed }),
        f("effective_from", "date", { required: true }),
        f("description", "textarea"),
      ]}
      bodyOf={toNum(["acct_product_id", "due_day", "max_advance_instalments", "min_tenure_months", "max_tenure_months", "grace_period_days", "max_missed_instalments", "suspend_after_missed", "close_after_missed", "min_completed_instalments", "min_holding_months"])}
    />
  );
}

export function IslamicDepositProducts() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={islamicApi}
      title={L("islamicDepositProducts")}
      subtitle={L("Mudaraba savings and term, Wadiah, Qard current: profit sharing ratio, expected rate, Sharia approval.")}
      effectiveDated
      columns={[
        { key: "contract_type", label: L("contract_type"), render: (r) => cell(words(sv(r, "contract_type"))) },
        { key: "share", label: L("Depositor / mudarib"), sortable: false, render: (r) => cell(`${sv(r, "depositor_profit_share") || "—"} / ${sv(r, "mudarib_profit_share") || "—"}`) },
        { key: "expected_profit_rate", label: L("expected_profit_rate"), render: (r) => cell(pct(sv(r, "expected_profit_rate"))) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP_MUDARABA" }),
        f("name", "text", { required: true }),
        f("contract_type", "select", { required: true, options: codes("contract_types") }),
        f("acct_product_id", "select", { required: true, options: acctProducts("acct_products") }),
        f("currency", "text", { placeholder: "NGN" }),
        f("depositor_profit_share", "percent", { hint: L("Depositor and mudarib shares add up to 100.") }),
        f("mudarib_profit_share", "percent"),
        f("agency_fee_percent", "percent"),
        f("expected_profit_rate", "rate", { hint: L("Indicative only: depositors get the pool's actual profit.") }),
        f("profit_calculation_period", "select", { options: codes("profit_calculation_periods") }),
        f("profit_distribution_frequency", "select", { options: codes("profit_distribution_frequencies") }),
        f("loss_allocation", "select", { options: codes("loss_allocations") }),
        f("early_termination", "select", { options: codes("early_terminations") }),
        f("minimum_balance", "amount"),
        f("sharia_approval_reference", "text", { required: true }),
        f("effective_from", "date", { required: true }),
        f("withdrawal_rules", "textarea"),
      ]}
      bodyOf={(x, rec) => ({ ...x, acct_product_id: Number(x.acct_product_id), weightages: (rec?.setup ?? {}).weightages ?? [] })}
    />
  );
}

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

// On-request charges waiting for a checker, and the periodic charge run.
function ChargeRequests() {
  const L = useL();
  const { t } = useTranslation("common");
  const can = usePagePermission();
  const list = useServerList({ api: chargeApi.listPath, call: chargeApi.list, describe: false });
  const [dialog, setDialog] = useState(null);
  const decide = async (verb, id) => {
    try {
      const r = await chargeApi[verb]({ id });
      notifications.success(r?.message ?? L("Done"));
      list.reload();
    } catch (e) {
      notifications.error(e.message);
    }
  };
  const actions = (
    <div className="flex flex-wrap gap-2">
      {can("Authorize") && (
        <Button size="sm" variant="secondary" icon={Play} onClick={() => setDialog("run")}>
          {L("Run periodic charges")}
        </Button>
      )}
      {can("Add") && (
        <Button size="sm" icon={Plus} onClick={() => setDialog("request")}>
          {L("Request a charge")}
        </Button>
      )}
    </div>
  );
  return (
    <>
      <ListTable
        list={list}
        actions={actions}
        rowKey={(r) => r.id}
        title={L("Charge requests")}
        emptyTitle={L("No charge requests")}
        columns={[
          { key: "charge_code", label: L("charge_code"), render: (r) => cell(r.charge_code) },
          { key: "acct_num", label: L("account"), render: (r) => cell(r.acct_num ?? r.acct_id) },
          { key: "amount", label: L("amount"), render: (r) => cell(r.amount) },
          { key: "reason", label: L("reason"), render: (r) => cell(r.reason) },
          { key: "status", label: L("status"), render: (r) => cell(words(r.status)) },
          { key: "requested_by", label: L("requested_by"), render: (r) => cell(r.requested_by) },
          {
            key: "actions",
            label: t("actions"),
            sortable: false,
            render: (r) =>
              can("Authorize") && (r.actions?.approve ?? r.status === "PENDING") ? (
                <span className="flex gap-1">
                  <Button size="sm" variant="ghost" icon={CheckCircle2} onClick={() => decide("approve", r.id)}>
                    {L("approve")}
                  </Button>
                  <Button size="sm" variant="ghost" icon={XCircle} onClick={() => decide("reject", r.id)}>
                    {L("reject")}
                  </Button>
                </span>
              ) : null,
          },
        ]}
      />
      {dialog === "request" && (
        <OpDialog
          title={L("Request a charge")}
          hint={L("An on-request charge; a checker posts it.")}
          fields={[
            { key: "acct_id", label: L("Account ID"), type: "int", required: true },
            { key: "charge_code", label: L("charge_code"), type: "code", required: true, placeholder: "AP_CERT" },
            { key: "reason", label: L("reason"), type: "textarea", required: true },
          ]}
          run={(x) => chargeApi.request({ ...x, acct_id: Number(x.acct_id) })}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            list.reload();
          }}
        />
      )}
      {dialog === "run" && (
        <OpDialog
          title={L("Run periodic charges")}
          hint={L("Applies the periodic charges due on an account: maintenance, minimum balance, excess withdrawals.")}
          fields={[
            { key: "acct_id", label: L("Account ID"), type: "int", required: true },
            { key: "as_of", label: L("as_of"), type: "date", required: true },
          ]}
          initial={{ as_of: new Date().toISOString().slice(0, 10) }}
          run={(x) => chargeApi.run({ acct_id: Number(x.acct_id), as_of: x.as_of })}
          onClose={() => setDialog(null)}
          onDone={() => setDialog(null)}
        />
      )}
    </>
  );
}

export function DepositCharges() {
  const L = useL();
  const f = useF();
  const [view, setView] = useState("rules");
  const switcher = <SegmentedSwitch className="mb-3" value={view} onChange={setView} options={[{ value: "rules", label: L("Charge rules") }, { value: "requests", label: L("Charge requests") }]} />;
  if (view === "requests")
    return (
      <div className="pt-1 pb-6">
        {switcher}
        <ChargeRequests />
      </div>
    );
  return (
    <>
      <div className="pt-1">{switcher}</div>
      <RecordScreen
        api={chargeRuleApi}
        title={L("depositCharges")}
        subtitle={L("Maintenance, minimum balance penalty, excess withdrawals, certificate fees: how they are worked out and when collected.")}
        effectiveDated
        columns={[
          { key: "charge_type", label: L("charge_type"), render: (r) => cell(words(sv(r, "charge_type"))) },
          { key: "charge", label: L("charge"), sortable: false, render: (r) => cell(sv(r, "charge_amount") || pct(sv(r, "charge_rate"))) },
          { key: "collection_timing", label: L("collection_timing"), render: (r) => cell(words(sv(r, "collection_timing"))) },
        ]}
        fields={[
          f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP_CERT" }),
          f("name", "text", { required: true }),
          f("charge_type", "select", { required: true, options: codes("charge_types") }),
          f("applies_to", "multi", { options: codes("applies_to") }),
          f("acct_product_ids", "multi", { options: (c) => (c.account_products ?? []).map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` })), hint: L("Leave empty for every product of the types above.") }),
          f("calculation_method", "select", { required: true, options: codes("calculation_methods") }),
          f("calculation_base", "select", { options: codes("calculation_bases") }),
          f("charge_amount", "amount"),
          f("charge_rate", "rate"),
          f("minimum_charge", "amount"),
          f("maximum_charge", "amount"),
          f("tax_percent", "percent"),
          f("collection_timing", "select", { required: true, options: codes("collection_timings") }),
          f("gl_purpose", "text", { placeholder: "DEPOSIT_CHARGE_INCOME" }),
          f("waive_if_balance_at_least", "amount"),
          f("waivable", "bool"),
          f("refundable", "bool"),
          f("reversal_allowed", "bool"),
          f("effective_from", "date", { required: true }),
          f("description", "textarea"),
        ]}
      />
    </>
  );
}

export function PrematureClosureRules() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={prematureApi}
      title={L("prematureClosureRules")}
      subtitle={L("By closure reason: the rate used and the penalty when a term deposit closes early.")}
      effectiveDated
      columns={[
        { key: "closure_reasons", label: L("closure_reasons"), sortable: false, render: (r) => cell((sv(r, "closure_reasons") ?? []).map(words).join(", ")) },
        { key: "method", label: L("method"), render: (r) => cell(words(sv(r, "method"))) },
        { key: "priority", label: L("priority"), render: (r) => cell(sv(r, "priority")) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP_PC_MED" }),
        f("name", "text", { required: true }),
        f("product_codes", "multi", { options: (c) => (c.deposit_products ?? []).map((p) => ({ value: p.code, label: `${p.code} · ${p.name}` })) }),
        f("closure_reasons", "multi", { options: codes("closure_reasons") }),
        f("premature_allowed", "bool"),
        f("approval_required", "bool"),
        f("customer_segment"),
        f("priority", "int"),
        f("min_principal", "amount"),
        f("max_principal", "amount"),
        f("min_tenor_days", "int"),
        f("max_tenor_days", "int"),
        f("min_holding_days", "int"),
        f("below_min_holding", "select", { options: codes("below_min_holding") }),
        f("method", "select", { required: true, options: codes("methods") }),
        f("rate_selection", "select", { options: codes("rate_selections") }),
        f("special_rate", "rate"),
        f("penalty_type", "select", { options: codes("penalty_types") }),
        f("penalty_value", "rate"),
        f("penalty_base", "select", { options: codes("penalty_bases") }),
        f("deduct_from", "select", { options: codes("deduct_from") }),
        f("partial_closure_allowed", "bool"),
        f("partial_min_amount", "amount", { showIf: (x) => x.partial_closure_allowed }),
        f("partial_max_percent", "percent", { showIf: (x) => x.partial_closure_allowed }),
        f("max_partial_withdrawals", "int", { showIf: (x) => x.partial_closure_allowed }),
        f("min_remaining_deposit", "amount", { showIf: (x) => x.partial_closure_allowed }),
        f("remaining_deposit", "select", { options: codes("remaining_deposit"), showIf: (x) => x.partial_closure_allowed }),
        f("effective_from", "date", { required: true }),
        f("description", "textarea"),
      ]}
      bodyOf={(x) => ({ ...toNum(["priority", "min_holding_days", "max_partial_withdrawals"])(x), min_tenor_days: x.min_tenor_days === "" ? null : Number(x.min_tenor_days), max_tenor_days: x.max_tenor_days === "" ? null : Number(x.max_tenor_days) })}
    />
  );
}

export function NoticeDepositTerms() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={noticeTermsApi}
      title={L("noticeDepositTerms")}
      subtitle={L("Notice period, withdrawal window and early withdrawal charge of a savings product.")}
      columns={[{ key: "notice", label: L("Notice days"), sortable: false, render: (r) => cell(`${sv(r, "minimum_notice_days") ?? "—"}–${sv(r, "maximum_notice_days") ?? "—"}`) }]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP_NOTICE7" }),
        f("name", "text", { required: true }),
        f("acct_product_id", "int", { required: true, label: L("Account product ID"), hint: L("The savings product these terms belong to.") }),
        f("minimum_notice_days", "int", { required: true }),
        f("maximum_notice_days", "int"),
        f("withdrawal_window_days", "int"),
        f("early_withdrawal_allowed", "bool"),
        f("early_withdrawal_charge_percent", "percent", { showIf: (x) => x.early_withdrawal_allowed }),
        f("notice_cancellation_allowed", "bool"),
        f("partial_withdrawal_allowed", "bool"),
        f("effective_from", "date"),
      ]}
      bodyOf={toNum(["acct_product_id", "minimum_notice_days", "maximum_notice_days", "withdrawal_window_days"])}
    />
  );
}

export function GroupSavingsSchemes() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={groupSchemeApi}
      title={L("groupSavingsSchemes")}
      subtitle={L("Members, roles, contributions, late charges and the withdrawal rule of savings groups.")}
      effectiveDated
      columns={[
        { key: "members", label: L("Members"), sortable: false, render: (r) => cell(`${sv(r, "minimum_members") ?? "—"}–${sv(r, "maximum_members") ?? "—"}`) },
        { key: "contribution_amount", label: L("contribution_amount"), render: (r) => cell(`${sv(r, "contribution_amount") ?? "—"} · ${words(sv(r, "contribution_frequency"))}`) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP_SHG" }),
        f("name", "text", { required: true }),
        f("acct_product_id", "select", { required: true, options: acctProducts() }),
        f("minimum_members", "int", { required: true }),
        f("maximum_members", "int", { required: true }),
        f("contribution_amount", "amount", { required: true }),
        f("contribution_frequency", "select", { required: true, options: codes("frequencies") }),
        f("member_contribution", "select", { options: codes("contribution_kinds") }),
        f("min_contribution", "amount"),
        f("grace_period_days", "int"),
        f("late_contribution_charge", "amount"),
        f("max_missed_contributions", "int"),
        f("minimum_group_balance", "amount"),
        f("group_leader", "select", { options: codes("requirements") }),
        f("group_treasurer", "select", { options: codes("requirements") }),
        f("group_secretary", "select", { options: codes("requirements") }),
        f("group_withdrawal_rule", "select", { options: codes("operation_rules") }),
        f("group_interest", "select", { options: codes("levels") }),
        f("group_penalty", "select", { options: codes("levels") }),
        f("member_addition", "select", { options: codes("restrictions") }),
        f("member_removal", "select", { options: codes("restrictions") }),
        f("member_default", "select", { options: codes("restrictions") }),
        f("group_dissolution", "select", { options: codes("restrictions") }),
        f("share_requirement", "bool"),
        f("effective_from", "date", { required: true }),
        f("description", "textarea"),
      ]}
      bodyOf={toNum(["acct_product_id", "minimum_members", "maximum_members", "grace_period_days", "max_missed_contributions"])}
    />
  );
}

// What a scheme insures now: depositors, totals, the largest depositors.
function Coverage({ code }) {
  const L = useL();
  const [c, setC] = useState(null);
  useEffect(() => {
    insuranceApi
      .insurance_coverage({ scheme_code: code })
      .then((r) => setC(first(r) ?? {}))
      .catch((e) => notifications.error(e.message));
  }, [code]);
  if (!c) return null;
  return (
    <Section title={L("Coverage")}>
      <Facts
        className="mb-3"
        rows={[
          [L("depositors"), c.depositors],
          [L("fully_insured_depositors"), c.fully_insured_depositors],
          [L("total_deposits"), c.total_deposits],
          [L("total_insured"), c.total_insured],
          [L("total_uninsured"), c.total_uninsured],
          [L("annual_premium"), c.annual_premium],
        ]}
      />
      <p className="mb-2 text-xs font-black uppercase tracking-wider text-muted-foreground">{L("Largest depositors")}</p>
      <RowsTable
        rows={c.largest_depositors}
        columns={[
          { key: "name", label: L("name") },
          { key: "deposits", label: L("deposits"), numeric: true },
          { key: "insured", label: L("insured"), numeric: true },
          { key: "uninsured", label: L("uninsured"), numeric: true },
        ]}
      />
    </Section>
  );
}

export function DepositInsurance() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={insuranceApi}
      title={L("depositInsurance")}
      subtitle={L("Deposit insurance schemes: coverage per depositor and premium.")}
      columns={[
        { key: "insurer", label: L("insurer"), render: (r) => cell(sv(r, "insurer")) },
        { key: "coverage_limit_per_depositor", label: L("coverage_limit_per_depositor"), render: (r) => cell(sv(r, "coverage_limit_per_depositor")) },
        { key: "premium_rate", label: L("premium_rate"), render: (r) => cell(pct(sv(r, "premium_rate"))) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP_NDIC" }),
        f("name", "text", { required: true }),
        f("insurer", "text", { required: true, wide: true }),
        f("currency", "text", { placeholder: "NGN" }),
        f("coverage_limit_per_depositor", "amount", { required: true }),
        f("premium_rate", "rate"),
        f("covered_deposits", "multi", { options: codes("covered_deposits") }),
        f("effective_from", "date"),
      ]}
      extraTabs={[{ key: "coverage", label: L("Coverage"), render: (r) => <Coverage code={r.code ?? r.setup?.code} /> }]}
    />
  );
}

function SweepLinks({ acctId }) {
  const L = useL();
  const can = usePagePermission();
  const [links, setLinks] = useState(null);
  const load = () =>
    sweepApi
      .links({ acct_id: acctId })
      .then((r) => setLinks(first(r)?.items ?? []))
      .catch((e) => notifications.error(e.message));
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acctId]);
  const run = async () => {
    try {
      const r = await sweepApi.run({ acct_id: acctId });
      notifications.success(r?.message ?? L("Done"));
      void load();
    } catch (e) {
      notifications.error(e.message);
    }
  };
  return (
    <Section
      title={L("Linked deposits")}
      action={
        can("Authorize") && (
          <Button size="sm" variant="secondary" icon={Play} onClick={run}>
            {L("Run sweep now")}
          </Button>
        )
      }
    >
      <RowsTable
        rows={links ?? []}
        empty={L("No deposits are linked by this sweep.")}
        columns={[
          { key: "deposit_number", label: L("deposit_number"), render: (x) => x.deposit_number ?? x.reference_no ?? x.id },
          { key: "amount", label: L("amount"), numeric: true, render: (x) => x.amount ?? x.principal ?? "—" },
          { key: "maturity_date", label: L("maturity_date"), render: (x) => dateCell(x.maturity_date) },
          { key: "status", label: L("status"), render: (x) => words(x.status) },
        ]}
      />
    </Section>
  );
}

export function SweepFlexiDeposits() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={sweepRuleApi}
      title={L("Sweep & Flexi Deposits")}
      subtitle={L("Excess savings swept into fixed deposits, broken back when needed.")}
      columns={[
        { key: "acct_num", label: L("account"), render: (r) => cell(sv(r, "acct_num")) },
        { key: "mode", label: L("mode"), render: (r) => cell(words(sv(r, "mode"))) },
        { key: "sweep_threshold", label: L("sweep_threshold"), render: (r) => cell(sv(r, "sweep_threshold")) },
      ]}
      fields={[
        f("acct_id", "int", { required: true, fixedOnEdit: true, label: L("Account ID") }),
        f("mode", "select", { required: true, options: codes("modes") }),
        f("tenor_id", "select", { required: true, options: (c) => (c.deposit_tenors ?? []).map((x) => ({ value: String(x.tenor_id), label: `${x.product_name} · ${x.label}` })) }),
        f("sweep_threshold", "amount", { required: true }),
        f("minimum_savings_balance", "amount"),
        f("sweep_in_multiple", "amount"),
        f("minimum_fd_amount", "amount"),
        f("max_linked_deposits", "int", { hint: L("0 means no limit.") }),
        f("reverse_sweep_priority", "select", { options: codes("reverse_priorities") }),
        f("partial_liquidation", "bool"),
        f("code", "code", { fixedOnEdit: true, hint: L("Leave empty and the server gives one.") }),
        f("name"),
        f("effective_from", "date"),
      ]}
      bodyOf={toNum(["acct_id", "tenor_id", "max_linked_deposits"])}
      extraTabs={[{ key: "links", label: L("Linked deposits"), render: (r) => <SweepLinks acctId={r.acct_id ?? r.setup?.acct_id} /> }]}
    />
  );
}

// The signatories of a mandate.
function Signatories({ value, onChange, roles }) {
  const L = useL();
  const rows = value ?? [];
  const set = (i, patch) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="mt-1 grid gap-2">
      {rows.map((r, i) => (
        <div key={i} className="grid gap-2 rounded-xl border border-border p-2 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <PartyPick value={r.entity_id ? `${r.entity_type}:${r.entity_id}` : ""} preset={r.entity_id ? { value: `${r.entity_type}:${r.entity_id}`, label: r.name || `${r.entity_type} ${r.entity_id}` } : null} onChange={(v) => set(i, splitParty(v))} />
          </div>
          <Field field={{ type: "select", options: roles }} value={r.role} onChange={(v) => set(i, { role: v })} />
          <Field field={{ type: "int", placeholder: L("holder_order") }} value={r.holder_order} onChange={(v) => set(i, { holder_order: v })} />
          <Field field={{ type: "percent", placeholder: L("ownership_percentage") }} value={r.ownership_percentage} onChange={(v) => set(i, { ownership_percentage: v })} />
          <Field field={{ type: "amount", placeholder: L("limit_amount") }} value={r.limit_amount} onChange={(v) => set(i, { limit_amount: v })} />
          <Field field={{ type: "date" }} value={r.valid_from} onChange={(v) => set(i, { valid_from: v })} />
          <Field field={{ type: "date" }} value={r.valid_to} onChange={(v) => set(i, { valid_to: v })} />
          <div className="flex items-center gap-2 sm:col-span-4">
            <Field field={{ type: "bool", label: L("deceased") }} value={r.deceased} onChange={(v) => set(i, { deceased: v })} />
            <Button size="sm" variant="ghost" onClick={() => onChange(rows.filter((_, j) => j !== i))}>
              {L("remove")}
            </Button>
          </div>
        </div>
      ))}
      <Button size="sm" variant="secondary" className="justify-self-start" onClick={() => onChange([...rows, { entity_type: "", entity_id: 0, role: "", holder_order: rows.length + 1, ownership_percentage: "", limit_amount: "", valid_from: "", valid_to: "", deceased: false, signature_note: "" }])}>
        {L("Add signatory")}
      </Button>
    </div>
  );
}

function MandateActions() {
  const L = useL();
  const can = usePagePermission();
  const [dialog, setDialog] = useState(null);
  const [result, setResult] = useState(null);
  const close = () => setDialog(null);
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="secondary" icon={ShieldCheck} onClick={() => setDialog("evaluate")}>
        {L("Check signatories")}
      </Button>
      {can("Add") && (
        <Button size="sm" variant="secondary" icon={Plus} onClick={() => setDialog("add")}>
          {L("New instruction")}
        </Button>
      )}
      {can("Edit") && (
        <Button size="sm" variant="secondary" icon={FileCheck2} onClick={() => setDialog("signatory")}>
          {L("Sign an instruction")}
        </Button>
      )}
      {can("Authorize") && (
        <Button size="sm" variant="secondary" icon={CheckCircle2} onClick={() => setDialog("execute")}>
          {L("Pay an instruction")}
        </Button>
      )}
      {dialog === "evaluate" && (
        <OpDialog
          title={L("Check signatories")}
          hint={L("Would these signatories satisfy the account's mandate for this amount?")}
          confirmLabel={L("Check")}
          fields={[
            { key: "acct_id", label: L("Account ID"), type: "int", required: true },
            { key: "amount", label: L("amount"), type: "amount", required: true },
            { key: "approvers", label: L("Signatory ids (comma separated)"), required: true, wide: true, placeholder: "345, 343" },
          ]}
          run={(x) => instructionApi.evaluate({ acct_id: Number(x.acct_id), amount: x.amount, approvers: x.approvers.split(",").map((s) => Number(s.trim())).filter(Boolean) })}
          onClose={() => {
            close();
            setResult(null);
          }}
          onDone={(r) => setResult(first(r))}
        >
          {() =>
            result && (
              <div className={`mb-3 rounded-xl border px-3 py-2 text-xs ${result.mandate_met ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
                <b>{result.mandate_met ? L("The mandate is met") : L("The mandate is not met")}</b> · {words(result.operating_instruction)} · {L("approvals_needed")}: {result.approvals_needed} · {L("approved_by")}: {(result.approved_by ?? []).join(", ") || "—"} · {words(result.account_state)}
                {(result.problems ?? []).map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            )
          }
        </OpDialog>
      )}
      {dialog === "add" && (
        <OpDialog
          title={L("New instruction")}
          hint={L("A payment to be signed under the account's mandate.")}
          fields={[
            { key: "acct_id", label: L("Account ID"), type: "int", required: true },
            { key: "to_acct_id", label: L("To account ID"), type: "int", required: true },
            { key: "amount", label: L("amount"), type: "amount", required: true },
            { key: "purpose", label: L("purpose"), required: true },
          ]}
          run={(x) => instructionApi.add({ ...x, acct_id: Number(x.acct_id), to_acct_id: Number(x.to_acct_id) })}
          onClose={close}
          onDone={close}
        />
      )}
      {dialog === "signatory" && (
        <OpDialog
          title={L("Sign an instruction")}
          fields={[
            { key: "id", label: L("Instruction ID"), type: "int", required: true },
            { key: "party", label: L("Signatory"), type: "party", required: true },
          ]}
          run={(x) => instructionApi.signatory({ id: Number(x.id), entity_id: splitParty(x.party).entity_id })}
          onClose={close}
          onDone={(r) => {
            const met = first(r)?.mandate_met;
            if (met != null) notifications.info?.(met ? L("The mandate is met") : L("More signatures are needed"));
            close();
          }}
        />
      )}
      {dialog === "execute" && <OpDialog title={L("Pay an instruction")} hint={L("Pays once the mandate is met.")} fields={[{ key: "id", label: L("Instruction ID"), type: "int", required: true }]} run={(x) => instructionApi.execute({ id: Number(x.id) })} onClose={close} onDone={close} />}
    </div>
  );
}

export function AccountMandates() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={mandateApi}
      title={L("accountMandates")}
      subtitle={L("Who signs joint and corporate accounts, and how many signatures an instruction needs.")}
      pageActions={<MandateActions />}
      columns={[
        { key: "acct_num", label: L("account"), render: (r) => cell(sv(r, "acct_num")) },
        { key: "operating_instruction", label: L("operating_instruction"), render: (r) => cell(words(sv(r, "operating_instruction"))) },
        { key: "signatories", label: L("signatories"), sortable: false, render: (r) => cell((sv(r, "signatories") ?? []).length) },
      ]}
      fields={[
        f("acct_id", "int", { required: true, fixedOnEdit: true, label: L("Account ID") }),
        f("ownership_type", "select", { required: true, options: codes("ownership_types") }),
        f("operating_instruction", "select", { required: true, options: codes("operating_instructions") }),
        f("minimum_approvals", "int"),
        f("maximum_approvals", "int"),
        f("maker_checker", "bool"),
        f("survivor_instruction", "text", { wide: true }),
        f("board_resolution_reference"),
        f("board_resolution_date", "date"),
        f("effective_from", "date"),
        f("code", "code", { fixedOnEdit: true, hint: L("Leave empty and the server gives one.") }),
        f("name"),
        { key: "signatories", label: L("signatories"), type: "custom", render: (v, set, _form, c) => <Signatories value={v} onChange={set} roles={codes("roles")(c)} /> },
      ]}
      factsOf={(s) => [
        [L("account"), s.acct_num],
        [L("ownership_type"), words(s.ownership_type)],
        [L("operating_instruction"), words(s.operating_instruction)],
        [L("approvals"), `${s.minimum_approvals ?? "—"}–${s.maximum_approvals ?? "—"}`],
        [L("signatories"), (s.signatories ?? []).map((x) => `${x.name || x.entity_id} (${words(x.role)}${x.limit_amount ? ` ≤ ${x.limit_amount}` : ""}${x.deceased ? ", deceased" : ""})`).join(", ") || "—"],
        s.survivor_instruction && [L("survivor_instruction"), s.survivor_instruction],
        s.board_resolution_reference && [L("board_resolution_reference"), s.board_resolution_reference],
      ]}
      bodyOf={(x) => ({ ...toNum(["acct_id", "minimum_approvals", "maximum_approvals"])(x), signatories: (x.signatories ?? []).map((s) => ({ ...s, holder_order: Number(s.holder_order || 0) })) })}
    />
  );
}

function TaxCertificate({ record }) {
  const L = useL();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [c, setC] = useState(null);
  const s = record.setup ?? record;
  const run = () =>
    taxApi
      .certificate({ entity_type: s.entity_type, entity_id: s.entity_id, year: Number(year) })
      .then((r) => setC(first(r)))
      .catch((e) => notifications.error(e.message));
  return (
    <Section title={L("Tax certificate")}>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className={`${labelClass} w-32`}>
          {L("year")}
          <Field field={{ type: "int" }} value={year} onChange={setYear} />
        </label>
        <Button size="sm" icon={ReceiptText} disabled={!year} disabledReason={L("Enter a year.")} onClick={run}>
          {L("Show certificate")}
        </Button>
      </div>
      {c && (
        <>
          <Facts
            className="mb-3"
            rows={[
              [L("name"), c.name],
              [L("year"), c.year],
              [L("tax_identification_number"), c.tax_profile?.tax_identification_number],
              [L("total_gross_interest"), c.total_gross_interest],
              [L("total_tax_withheld"), c.total_tax_withheld],
              [L("total_net_interest"), c.total_net_interest],
            ]}
          />
          <RowsTable rows={c.lines} empty={L("No interest was paid in this year.")} columns={Object.keys(c.lines?.[0] ?? { account: 1 }).map((k) => ({ key: k, label: L(k) }))} />
        </>
      )}
    </Section>
  );
}

export function DepositorTaxProfiles() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={taxProfileApi}
      title={L("depositorTaxProfiles")}
      subtitle={L("TIN, residency and exemptions of depositors, and the yearly tax certificate.")}
      effectiveDated
      columns={[
        { key: "tax_identification_number", label: L("tax_identification_number"), render: (r) => cell(sv(r, "tax_identification_number")) },
        { key: "exemption_type", label: L("exemption_type"), render: (r) => cell(words(sv(r, "exemption_type"))) },
      ]}
      fields={[
        { key: "party", label: L("Depositor"), type: "custom", required: true, from: (s) => (s.entity_id ? `${s.entity_type}:${s.entity_id}` : ""), render: (v, set) => <PartyPick value={v} onChange={set} /> },
        f("tax_identification_number", "text", { required: true }),
        f("tax_residency", "text", { placeholder: "NG" }),
        f("exemption_type", "select", { options: codes("exemption_types") }),
        f("exemption_certificate"),
        f("withholding_rate", "rate", { hint: L("Leave empty for the standard rate.") }),
        f("treaty_country"),
        f("effective_from", "date", { required: true }),
        f("code", "code", { fixedOnEdit: true, hint: L("Leave empty and the server gives one.") }),
        f("name"),
        f("remarks", "textarea"),
      ]}
      bodyOf={({ party, ...x }) => ({ ...x, ...splitParty(party) })}
      extraTabs={[{ key: "certificate", label: L("Tax certificate"), render: (r) => <TaxCertificate record={r} /> }]}
    />
  );
}
