import { useEffect, useState } from "react";
import { Section } from "@/Components/InnoCBS/Deposits/depositShared";
import { RowsInput, RowsTable, cell, codes, dateCell, pct, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { Status } from "@/Components/InnoCBS/OpsList";
import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { calls, rowsOf } from "@/Services/Epurse/onboarding.api";
import { T, alertRuleApi, almApi, bankAccountApi, borrowingApi, collateralApi, counterpartyApi, dematApi, exposureLimitApi, fixedAssetApi, guaranteeApi, placementApi, policyApi, reserveReqApi, securityApi, toNum, useActive, useF } from "./treasuryShared";

const eventApi = calls(`${T}/event`, ["list"]);
const csv = (v) =>
  String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const csvField = (L, key, placeholder) => ({ key, label: L(key), type: "text", from: (s) => (s[key] ?? []).join(", "), placeholder, hint: L("Comma separated.") });

// The events a contract wrote into the Treasury Schedule.
function ContractEvents({ code }) {
  const L = useL();
  const [rows, setRows] = useState(null);
  useEffect(() => {
    eventApi
      .list({ search: code, filters: { ref_code: code }, page: 1, page_size: 200 })
      .then((r) => setRows(rowsOf(r).filter((e) => !e.ref_code || e.ref_code === code)))
      .catch(() => setRows([]));
  }, [code]);
  return (
    <Section title={L("Schedule")}>
      <RowsTable
        rows={rows ?? []}
        empty={L("No events yet; they are written when the contract is approved.")}
        columns={[
          { key: "due_date", label: L("due_date"), render: (e) => dateCell(e.due_date) },
          { key: "event_type", label: L("event"), render: (e) => words(e.event_type) },
          { key: "direction", label: L("direction") },
          { key: "amount", label: L("amount"), numeric: true },
          { key: "actual_amount", label: L("actual_amount"), numeric: true, render: (e) => e.actual_amount || "—" },
          { key: "variance", label: L("variance"), numeric: true },
          { key: "status", label: L("status"), render: (e) => <Status code={e.status} /> },
        ]}
      />
    </Section>
  );
}
const scheduleTab = (L) => [{ key: "schedule", label: L("Schedule"), render: (r) => <ContractEvents code={r.code ?? r.setup?.code} /> }];

export function Counterparties() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={counterpartyApi}
      title={L("counterparties")}
      subtitle={L("Banks, institutions, companies and brokers: rating, list status and exposure limit. A downgrade raises an alert.")}
      effectiveDated
      columns={[
        { key: "counterparty_type", label: L("counterparty_type"), render: (r) => cell(words(sv(r, "counterparty_type"))) },
        { key: "rating", label: L("rating"), render: (r) => cell(sv(r, "rating")) },
        { key: "list_status", label: L("list_status"), render: (r) => <Status code={sv(r, "list_status")} /> },
        { key: "exposure_limit", label: L("exposure_limit"), render: (r) => cell(sv(r, "exposure_limit")) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "ZENITH" }),
        f("name", "text", { required: true }),
        f("counterparty_type", "select", { required: true, options: codes("counterparty_types") }),
        f("roles", "multi", { options: codes("roles") }),
        f("list_status", "select", { required: true, options: codes("list_statuses") }),
        f("group_code", "text"),
        f("country", "text", { placeholder: "NG" }),
        f("industry", "text"),
        f("currency", "text"),
        f("swift_code", "text"),
        f("rating", "text"),
        f("rating_rank", "int", { hint: L("1 is the best; a higher number is a downgrade.") }),
        f("rating_agency", "text"),
        f("rating_date", "date"),
        f("exposure_limit", "amount"),
        f("warn_percent", "percent"),
        f("contact_email", "text"),
        f("contact_phone", "text"),
        f("branch_details", "textarea"),
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={toNum(["rating_rank"])}
    />
  );
}

export function ExposureLimits() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={exposureLimitApi}
      title={L("exposureLimits")}
      subtitle={L("Limits by group, country, currency, industry, instrument and the equity book. BLOCK refuses a booking over it; ALERT only warns.")}
      effectiveDated
      columns={[
        { key: "limit_kind", label: L("limit_kind"), render: (r) => cell(`${words(sv(r, "limit_kind"))} · ${sv(r, "limit_key") ?? ""}`) },
        { key: "limit_amount", label: L("limit_amount"), render: (r) => cell(sv(r, "limit_amount")) },
        { key: "breach_action", label: L("breach_action"), render: (r) => cell(words(sv(r, "breach_action"))) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "CCY-USD" }),
        f("name", "text", { required: true }),
        f("limit_kind", "select", { required: true, options: codes("limit_kinds") }),
        f("limit_key", "text", { required: true, hint: L("The group, country, currency, industry or instrument code.") }),
        f("limit_amount", "amount", { required: true }),
        f("warn_percent", "percent"),
        f("breach_action", "select", { required: true, options: codes("breach_actions") }),
        f("effective_from", "date", { required: true }),
      ]}
    />
  );
}

export function InvestmentPolicy() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={policyApi}
      title={L("investmentPolicy")}
      subtitle={L("Approval limit (above it a board reference is needed), caps per issuer, industry and equity, price alerts, stop-loss and review.")}
      effectiveDated
      columns={[{ key: "approval_limit", label: L("approval_limit"), render: (r) => cell(sv(r, "approval_limit")) }]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP_POLICY" }),
        f("name", "text", { required: true }),
        f("approval_limit", "amount", { required: true }),
        f("max_per_counterparty", "amount", { hint: L("0 means no cap.") }),
        f("max_per_issuer", "amount"),
        f("max_per_industry", "amount"),
        f("max_equity_exposure", "amount"),
        f("valuation_frequency", "select", { options: codes("valuation_frequencies") }),
        f("price_alert_percent", "percent"),
        f("price_max_age_days", "int"),
        f("stop_loss_percent", "percent"),
        f("review_months", "int"),
        f("post_fair_value_changes", "bool"),
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={toNum(["price_max_age_days", "review_months"])}
    />
  );
}

export function InterbankAccounts() {
  const L = useL();
  const f = useF();
  const parties = useActive(counterpartyApi);
  return (
    <RecordScreen
      api={bankAccountApi}
      title={L("interbankAccounts")}
      subtitle={L("Accounts held with other banks. Balances are kept from bookings, statements and transfers.")}
      effectiveDated
      columns={[
        { key: "counterparty_code", label: L("bank"), render: (r) => cell(sv(r, "counterparty_code")) },
        { key: "account_number", label: L("account_number"), render: (r) => cell(`${sv(r, "account_number") ?? ""} · ${sv(r, "currency") ?? ""}`) },
        { key: "account_type", label: L("account_type"), render: (r) => cell(words(sv(r, "account_type"))) },
        { key: "balance", label: L("balance"), sortable: false, render: (r) => cell(r.balance ?? r.book_balance) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "ZEN-USD" }),
        f("name", "text", { required: true }),
        f("counterparty_code", "select", { required: true, options: parties }),
        f("account_number", "text", { required: true }),
        f("currency", "text", { required: true, placeholder: "NGN" }),
        f("account_type", "select", { required: true, options: codes("account_types") }),
        f("account_purpose", "select", { options: codes("account_purposes") }),
        f("account_status", "select", { options: codes("account_statuses") }),
        f("branch", "text"),
        f("gl_account_id", "int", { required: true, label: L("GL account ID") }),
        f("opening_balance", "amount"),
        f("opening_date", "date"),
        f("minimum_balance", "amount"),
        f("target_balance", "amount"),
        f("overdraft_facility", "bool"),
        f("overdraft_limit", "amount", { showIf: (x) => x.overdraft_facility }),
        f("interest_applicable", "bool"),
        f("interest_rate", "rate", { showIf: (x) => x.interest_applicable }),
        f("interest_scheme", "text", { showIf: (x) => x.interest_applicable }),
        f("reconciliation_frequency", "select", { options: codes("reconciliation_frequencies") }),
        f("match_tolerance_days", "int"),
        f("reserve_eligible", "bool"),
        f("reserve_types", "multi", { options: codes("reserve_types"), showIf: (x) => x.reserve_eligible }),
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={toNum(["gl_account_id", "match_tolerance_days"])}
    />
  );
}

export function DematAccounts() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={dematApi}
      title={L("dematAccounts")}
      subtitle={L("Demat and custody accounts holding the securities.")}
      effectiveDated
      columns={[
        { key: "depository", label: L("depository"), render: (r) => cell(sv(r, "depository")) },
        { key: "account_number", label: L("account_number"), render: (r) => cell(sv(r, "account_number")) },
        { key: "participant", label: L("participant"), render: (r) => cell(sv(r, "participant")) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "CSCS-01" }),
        f("name", "text", { required: true }),
        f("depository", "text", { required: true }),
        f("participant", "text"),
        f("account_number", "text", { required: true }),
        f("broker_code", "text"),
        f("effective_from", "date", { required: true }),
      ]}
    />
  );
}

export function Securities() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={securityApi}
      title={L("securities")}
      subtitle={L("Security master: equity, bonds, T-bills, CP, CD; coupon, maturity and accounting classification.")}
      effectiveDated
      columns={[
        { key: "instrument_type", label: L("instrument_type"), render: (r) => cell(words(sv(r, "instrument_type"))) },
        { key: "classification", label: L("classification"), render: (r) => cell(sv(r, "classification")) },
        { key: "coupon_rate", label: L("coupon_rate"), render: (r) => cell(pct(sv(r, "coupon_rate"))) },
        { key: "maturity_date", label: L("maturity_date"), render: (r) => dateCell(sv(r, "maturity_date")) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "NTB-182" }),
        f("name", "text", { required: true }),
        f("instrument_type", "select", { required: true, options: codes("instrument_types") }),
        f("classification", "select", { required: true, options: codes("classifications") }),
        f("isin", "text"),
        f("issuer_code", "text"),
        f("currency", "text", { required: true, placeholder: "NGN" }),
        f("face_value", "amount"),
        f("coupon_rate", "rate"),
        f("coupon_frequency", "select", { options: codes("coupon_frequencies") }),
        f("day_count", "select", { options: codes("day_counts") }),
        f("issue_date", "date"),
        f("maturity_date", "date"),
        f("listed", "bool"),
        f("exchange", "text", { showIf: (x) => x.listed }),
        f("rating", "text"),
        f("industry", "text"),
        f("list_status", "select", { options: codes("list_statuses") }),
        f("gl_account_id", "int", { label: L("GL account ID") }),
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={toNum(["gl_account_id"])}
    />
  );
}

export function StatutoryReserves() {
  const L = useL();
  const f = useF();
  const ids = (key) => ({ key, label: L(key), type: "text", from: (s) => (s[key] ?? []).join(", "), hint: L("GL account IDs, comma separated.") });
  return (
    <RecordScreen
      api={reserveReqApi}
      title={L("statutoryReserves")}
      subtitle={L("Reserve requirements (CRR, SLR...): basis, percentage, eligible assets, tolerance and penalty.")}
      effectiveDated
      columns={[
        { key: "requirement_type", label: L("requirement_type"), render: (r) => cell(sv(r, "requirement_type")) },
        { key: "required_percent", label: L("required_percent"), render: (r) => cell(pct(sv(r, "required_percent"))) },
        { key: "maintenance_period", label: L("maintenance_period"), render: (r) => cell(words(sv(r, "maintenance_period"))) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "CRR" }),
        f("name", "text", { required: true }),
        f("requirement_type", "select", { required: true, options: codes("requirement_types") }),
        f("regulatory_authority", "text"),
        f("required_percent", "percent", { required: true }),
        f("basis_source", "select", { required: true, options: codes("basis_sources") }),
        ids("basis_gl_ids"),
        ids("exempt_gl_ids"),
        f("exempt_amount", "amount"),
        f("eligible_assets", "multi", { options: codes("eligible_assets") }),
        ids("eligible_cash_gl_ids"),
        f("eligible_security_types", "multi", { options: codes("security_types") }),
        f("maintenance_period", "select", { options: codes("maintenance_periods") }),
        f("reporting_day", "text"),
        f("shortfall_tolerance_percent", "percent"),
        f("alert_buffer_percent", "percent"),
        f("penalty_rate", "rate"),
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={(x) => ({ ...x, ...Object.fromEntries(["basis_gl_ids", "exempt_gl_ids", "eligible_cash_gl_ids"].map((k) => [k, csv(x[k]).map(Number)])) })}
    />
  );
}

export function AlmAssumptions() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={almApi}
      title={L("almAssumptions")}
      subtitle={L("Maturity buckets, behavioural run-off and renewals, prepayments, haircuts and stress scenarios.")}
      effectiveDated
      columns={[{ key: "buckets", label: L("buckets"), sortable: false, render: (r) => cell((sv(r, "buckets") ?? []).length) }]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP_ALM" }),
        f("name", "text", { required: true }),
        f("demand_stable_percent", "percent"),
        csvField(L, "demand_runoff_spread", "40, 30, 20, 10"),
        f("td_renewal_percent", "percent"),
        f("td_premature_percent", "percent"),
        f("loan_prepayment_percent", "percent"),
        f("liquid_security_haircut_percent", "percent"),
        {
          key: "buckets",
          label: L("buckets"),
          type: "custom",
          render: (v, set, _x, c) => (
            <>
              {!(v ?? []).length && (c?.default_buckets ?? []).length > 0 && (
                <button type="button" className="mb-1 text-xs font-semibold text-primary underline" onClick={() => set(c.default_buckets)}>
                  {L("Use the standard buckets")}
                </button>
              )}
              <RowsInput value={v} onChange={set} blank={() => ({ label: "", from_days: "", to_days: "" })} columns={[{ key: "label", label: L("label") }, { key: "from_days", label: L("from_days"), type: "int" }, { key: "to_days", label: L("to_days"), type: "int" }]} />
            </>
          ),
        },
        {
          key: "scenarios",
          label: L("scenarios"),
          type: "custom",
          render: (v, set) => (
            <RowsInput
              value={v}
              onChange={set}
              blank={() => ({ name: "", deposit_runoff_percent: "", loan_inflow_haircut_percent: "", investment_haircut_percent: "", facility_freeze: false })}
              columns={[
                { key: "name", label: L("name") },
                { key: "deposit_runoff_percent", label: L("deposit_runoff_percent"), type: "percent" },
                { key: "loan_inflow_haircut_percent", label: L("loan_inflow_haircut_percent"), type: "percent" },
                { key: "investment_haircut_percent", label: L("investment_haircut_percent"), type: "percent" },
                { key: "facility_freeze", label: L("facility_freeze"), type: "bool" },
              ]}
            />
          ),
        },
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={(x) => ({ ...x, demand_runoff_spread: csv(x.demand_runoff_spread), buckets: (x.buckets ?? []).map((b) => ({ ...b, from_days: Number(b.from_days || 0), to_days: Number(b.to_days || 0) })) })}
    />
  );
}

export function AlertRules() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={alertRuleApi}
      title={L("alertRules")}
      subtitle={L("Which events alert, how many days before, on which channels, and who is told at each escalation level.")}
      effectiveDated
      columns={[
        { key: "kind", label: L("kind"), render: (r) => cell(words(sv(r, "kind"))) },
        { key: "offsets", label: L("Days before"), sortable: false, render: (r) => cell((sv(r, "offsets") ?? []).join(", ")) },
        { key: "channels", label: L("channels"), sortable: false, render: (r) => cell((sv(r, "channels") ?? []).map(words).join(", ")) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "MATURITIES" }),
        f("name", "text", { required: true }),
        f("kind", "select", { required: true, options: codes("kinds") }),
        csvField(L, "event_types", "MATURITY, INTEREST_PAYMENT"),
        { ...csvField(L, "offsets", "90, 30, 7, 1, 0"), hint: L("Days before the event, comma separated.") },
        f("channels", "multi", { options: codes("channels") }),
        f("escalate_after_days", "int"),
        {
          key: "recipients",
          label: L("recipients"),
          type: "custom",
          render: (v, set, _x, c) => (
            <RowsInput
              value={(v ?? []).map((r) => ({ ...r, user_ids: Array.isArray(r.user_ids) ? r.user_ids.join(", ") : r.user_ids }))}
              onChange={set}
              blank={() => ({ level: "0", role: "", user_ids: "" })}
              columns={[
                { key: "level", label: L("level"), type: "int" },
                { key: "role", label: L("role"), type: "select", options: codes("escalation_roles")(c) },
                { key: "user_ids", label: L("User IDs (comma separated)") },
              ]}
            />
          ),
        },
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={(x) => ({
        ...toNum(["escalate_after_days"])(x),
        event_types: csv(x.event_types),
        offsets: csv(x.offsets).map(Number),
        recipients: (x.recipients ?? []).map((r) => ({ level: Number(r.level || 0), role: r.role, user_ids: csv(r.user_ids).map(Number) })),
      })}
    />
  );
}

// ---------- Contracts ----------

export function FdMoneyMarket() {
  const L = useL();
  const f = useF();
  const parties = useActive(counterpartyApi);
  const accounts = useActive(bankAccountApi);
  return (
    <RecordScreen
      api={placementApi}
      title={L("FD & Money Market")}
      subtitle={L("Fixed deposits and money market placements. On approval the schedule is written; settle its events in the Treasury Schedule.")}
      effectiveDated
      extraTabs={scheduleTab(L)}
      columns={[
        { key: "counterparty_code", label: L("counterparty"), render: (r) => cell(sv(r, "counterparty_code")) },
        { key: "instrument", label: L("instrument"), render: (r) => cell(words(sv(r, "instrument"))) },
        { key: "amount", label: L("amount"), render: (r) => cell(`${sv(r, "amount") ?? ""} ${sv(r, "currency") ?? ""}`) },
        { key: "interest_rate", label: L("interest_rate"), render: (r) => cell(pct(sv(r, "interest_rate"))) },
        { key: "maturity_date", label: L("maturity_date"), render: (r) => dateCell(sv(r, "maturity_date")) },
      ]}
      fields={[
        f("counterparty_code", "select", { required: true, options: parties }),
        f("instrument", "select", { required: true, options: codes("instruments") }),
        f("amount", "amount", { required: true }),
        f("currency", "text", { required: true, placeholder: "NGN" }),
        f("booking_date", "date", { required: true }),
        f("value_date", "date", { required: true }),
        f("maturity_date", "date", { required: true }),
        f("rate_type", "select", { options: codes("rate_types") }),
        f("interest_rate", "rate", { required: true }),
        f("benchmark", "text", { showIf: (x) => x.rate_type === "FLOATING" }),
        f("spread", "rate", { showIf: (x) => x.rate_type === "FLOATING" }),
        f("reset_frequency", "select", { options: codes("reset_frequencies"), showIf: (x) => x.rate_type === "FLOATING" }),
        f("interest_calculation", "select", { options: codes("interest_calculations") }),
        f("day_count", "select", { options: codes("day_counts") }),
        f("interest_payment_frequency", "select", { options: codes("payment_frequencies") }),
        f("maturity_instruction", "select", { options: codes("maturity_instructions") }),
        f("settlement_account", "select", { required: true, options: accounts }),
        f("premature_closure_allowed", "bool"),
        f("premature_penalty_percent", "percent", { showIf: (x) => x.premature_closure_allowed }),
        f("external_reference", "text"),
        f("board_reference", "text", { hint: L("Needed above the policy's approval limit.") }),
        f("collateral_code", "text"),
        f("confirmation_received", "bool"),
        f("instruction_confirmed", "bool"),
        f("investment_gl_id", "int", { label: L("Investment GL ID") }),
        f("interest_income_gl_id", "int", { label: L("Interest income GL ID") }),
        f("code", "code", { fixedOnEdit: true, hint: L("Leave empty and the server gives one.") }),
        f("name", "text"),
        f("effective_from", "date", { required: true }),
        f("remarks", "textarea"),
      ]}
      bodyOf={toNum(["investment_gl_id", "interest_income_gl_id"])}
    />
  );
}

export function BorrowingFacilities() {
  const L = useL();
  const f = useF();
  const parties = useActive(counterpartyApi);
  const accounts = useActive(bankAccountApi);
  return (
    <RecordScreen
      api={borrowingApi}
      title={L("borrowingFacilities")}
      subtitle={L("Facilities the bank borrows on: limit, terms, security, covenants, and their utilisation.")}
      effectiveDated
      extraTabs={scheduleTab(L)}
      columns={[
        { key: "lender_code", label: L("lender"), render: (r) => cell(sv(r, "lender_code")) },
        { key: "facility_limit", label: L("facility_limit"), render: (r) => cell(`${sv(r, "facility_limit") ?? ""} ${sv(r, "currency") ?? ""}`) },
        { key: "utilised", label: L("utilised"), sortable: false, render: (r) => cell(r.utilised ?? r.outstanding) },
        { key: "interest_rate", label: L("interest_rate"), render: (r) => cell(pct(sv(r, "interest_rate"))) },
        { key: "facility_expiry_date", label: L("facility_expiry_date"), render: (r) => dateCell(sv(r, "facility_expiry_date")) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "BOR-DBN-01" }),
        f("name", "text", { required: true }),
        f("lender_code", "select", { required: true, options: parties }),
        f("facility_type", "select", { required: true, options: codes("facility_types") }),
        f("facility_limit", "amount", { required: true }),
        f("currency", "text", { required: true, placeholder: "NGN" }),
        f("revolving", "bool"),
        f("sanction_date", "date", { required: true }),
        f("facility_expiry_date", "date", { required: true }),
        f("maturity_date", "date", { required: true }),
        f("rate_type", "select", { options: codes("rate_types") }),
        f("interest_rate", "rate", { required: true }),
        f("benchmark", "text", { showIf: (x) => x.rate_type === "FLOATING" }),
        f("spread", "rate", { showIf: (x) => x.rate_type === "FLOATING" }),
        f("reset_frequency", "select", { options: codes("reset_frequencies"), showIf: (x) => x.rate_type === "FLOATING" }),
        f("interest_scheme", "text"),
        f("day_count", "select", { options: codes("day_counts") }),
        f("interest_frequency", "select", { options: codes("interest_frequencies") }),
        f("repayment_type", "select", { options: codes("repayment_types") }),
        f("principal_frequency", "select", { options: codes("principal_frequencies") }),
        f("settlement_account", "select", { required: true, options: accounts }),
        f("utilisation_warn_percent", "percent"),
        f("security", "text", { wide: true }),
        csvField(L, "collateral_codes", "COL-000001"),
        f("collateral_valuation_due", "date"),
        f("insurance_expiry", "date"),
        f("lender_confirmation_frequency", "select", { options: codes("interest_frequencies") }),
        {
          key: "covenants",
          label: L("covenants"),
          type: "custom",
          render: (v, set, _x, c) => <RowsInput value={v} onChange={set} blank={() => ({ name: "", condition: "", review_frequency: "", next_review: "" })} columns={[{ key: "name", label: L("name") }, { key: "condition", label: L("condition") }, { key: "review_frequency", label: L("review_frequency"), type: "select", options: codes("interest_frequencies")(c) }, { key: "next_review", label: L("next_review"), type: "date" }]} />,
        },
        f("liability_gl_id", "int", { label: L("Liability GL ID") }),
        f("interest_expense_gl_id", "int", { label: L("Interest expense GL ID") }),
        f("effective_from", "date", { required: true }),
        f("remarks", "textarea"),
      ]}
      bodyOf={(x, rec) => ({ ...toNum(["liability_gl_id", "interest_expense_gl_id"])(x), collateral_codes: csv(x.collateral_codes), custom_schedule: (rec?.setup ?? {}).custom_schedule ?? [] })}
    />
  );
}

export function CollateralMargin() {
  const L = useL();
  const f = useF();
  const parties = useActive(counterpartyApi);
  const securities = useActive(securityApi);
  return (
    <RecordScreen
      api={collateralApi}
      title={L("Collateral & Margin")}
      subtitle={L("Collateral pledged or received: valuations, cover after haircut, margin calls.")}
      effectiveDated
      columns={[
        { key: "direction", label: L("direction"), render: (r) => cell(words(sv(r, "direction"))) },
        { key: "counterparty_code", label: L("counterparty"), render: (r) => cell(sv(r, "counterparty_code")) },
        { key: "market_value", label: L("market_value"), render: (r) => cell(sv(r, "market_value")) },
        { key: "required_cover", label: L("required_cover"), render: (r) => cell(sv(r, "required_cover")) },
      ]}
      fields={[
        f("direction", "select", { required: true, options: codes("directions") }),
        f("collateral_type", "select", { required: true, options: codes("collateral_types") }),
        f("counterparty_code", "select", { required: true, options: parties }),
        f("linked_to", "text", { hint: L("The contract code it secures.") }),
        f("security_code", "select", { options: securities, showIf: (x) => x.collateral_type === "SECURITY" }),
        f("quantity", "amount", { showIf: (x) => x.collateral_type === "SECURITY" }),
        f("currency", "text", { required: true, placeholder: "NGN" }),
        f("market_value", "amount", { required: true }),
        f("haircut_percent", "percent"),
        f("required_cover", "amount"),
        f("margin_call_threshold_percent", "percent"),
        f("valuation_frequency", "select", { options: codes("valuation_frequencies") }),
        f("next_valuation_date", "date"),
        f("maturity_date", "date"),
        f("insurance_expiry", "date"),
        f("code", "code", { fixedOnEdit: true, hint: L("Leave empty and the server gives one.") }),
        f("name", "text"),
        f("effective_from", "date", { required: true }),
      ]}
    />
  );
}

export function GuaranteesLcs() {
  const L = useL();
  const f = useF();
  const parties = useActive(counterpartyApi);
  const accounts = useActive(bankAccountApi);
  return (
    <RecordScreen
      api={guaranteeApi}
      title={L("Guarantees & LCs")}
      subtitle={L("Bank guarantees and letters of credit issued or received: commission schedule, claims and release.")}
      effectiveDated
      extraTabs={scheduleTab(L)}
      columns={[
        { key: "guarantee_kind", label: L("guarantee_kind"), render: (r) => cell(words(sv(r, "guarantee_kind"))) },
        { key: "beneficiary", label: L("beneficiary"), render: (r) => cell(sv(r, "beneficiary")) },
        { key: "amount", label: L("amount"), render: (r) => cell(`${sv(r, "amount") ?? ""} ${sv(r, "currency") ?? ""}`) },
        { key: "expiry_date", label: L("expiry_date"), render: (r) => dateCell(sv(r, "expiry_date")) },
      ]}
      fields={[
        f("guarantee_kind", "select", { required: true, options: codes("guarantee_kinds") }),
        f("counterparty_code", "select", { required: true, options: parties }),
        f("applicant", "text", { required: true }),
        f("beneficiary", "text", { required: true }),
        f("amount", "amount", { required: true }),
        f("currency", "text", { required: true, placeholder: "NGN" }),
        f("issue_date", "date", { required: true }),
        f("expiry_date", "date", { required: true }),
        f("claim_expiry_date", "date"),
        f("commission_percent", "percent"),
        f("commission_frequency", "select", { options: codes("commission_frequencies") }),
        f("margin_percent", "percent"),
        f("collateral_code", "text"),
        f("settlement_account", "select", { options: accounts }),
        f("renewal_notice_days", "int"),
        f("purpose", "textarea"),
        f("code", "code", { fixedOnEdit: true, hint: L("Leave empty and the server gives one.") }),
        f("name", "text"),
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={toNum(["renewal_notice_days"])}
    />
  );
}

export function AssetRegister() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={fixedAssetApi}
      title={L("assetRegister")}
      subtitle={L("Fixed assets: acquisition, depreciation method, insurance, maintenance and lease.")}
      effectiveDated
      columns={[
        { key: "category", label: L("category"), render: (r) => cell(words(sv(r, "category"))) },
        { key: "cost", label: L("cost"), render: (r) => cell(sv(r, "cost")) },
        { key: "book_value", label: L("book_value"), sortable: false, render: (r) => cell(r.book_value ?? r.net_book_value) },
        { key: "location", label: L("location"), render: (r) => cell(sv(r, "location")) },
      ]}
      fields={[
        f("name", "text", { required: true }),
        f("category", "select", { required: true, options: codes("categories") }),
        f("ownership", "select", { required: true, options: codes("ownership") }),
        f("acquisition_date", "date", { required: true }),
        f("cost", "amount", { required: true }),
        f("currency", "text", { required: true, placeholder: "NGN" }),
        f("salvage_value", "amount"),
        f("depreciation_method", "select", { required: true, options: codes("depreciation_methods") }),
        f("useful_life_months", "int"),
        f("wdv_rate_percent", "percent", { showIf: (x) => String(x.depreciation_method).includes("WDV") || String(x.depreciation_method).includes("DECLINING") }),
        f("lease_end_date", "date", { showIf: (x) => x.ownership === "LEASED" }),
        f("location", "text"),
        f("branch_id", "int", { label: L("Branch ID") }),
        f("serial_number", "text"),
        f("supplier", "text"),
        f("insurance_policy", "text"),
        f("insurance_expiry", "date"),
        f("maintenance_interval_months", "int"),
        f("maintenance_due", "date"),
        f("asset_gl_id", "int", { label: L("Asset GL ID") }),
        f("paid_from_gl_id", "int", { label: L("Paid from GL ID") }),
        f("code", "code", { fixedOnEdit: true, hint: L("Leave empty and the server gives one.") }),
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={toNum(["useful_life_months", "branch_id", "maintenance_interval_months", "asset_gl_id", "paid_from_gl_id"])}
    />
  );
}
