import { API_ENDPOINTS } from "@/Utils/Constant";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Ban, Banknote, Calculator, CheckCircle2, HandCoins, Play, Plus, RefreshCcw, XCircle } from "lucide-react";
import { BackButton } from "@/Components/Common/TextButtons";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { ListTable } from "@/Components/Common/ListView";
import { NoAccess } from "@/Components/Common/NoAccess";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { PageTitle } from "@/Components/Common/PageTitle";
import { RowActions } from "@/Components/Common/RowActions";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { ActionButtons, Facts, Section, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { CatalogueReports } from "@/Components/InnoCBS/Deposits/DepositOps";
import { Field } from "@/Components/InnoCBS/Loans/loanShared";
import { OpDialog, ownerOf, RowsInput, RowsTable, byId, cell, codes, dateCell, first, pct, splitParty, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { recordApi } from "@/Services/api/recordApi";
import { calls, rowsOf } from "@/Services/Epurse/onboarding.api";
import { loanFacilitiesApi } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";

// InnoCBS > Loans (Admin 21).
const LN = API_ENDPOINTS.CBS_MODULES.LOAN;
const IF = API_ENDPOINTS.CBS_MODULES.ISLAMIC_FINANCE;
const regRuleApi = recordApi(`${LN}/regulatory_rule`);
const structureApi = recordApi(`${LN}/repayment_structure`);
const servicingApi = recordApi(`${LN}/servicing_rule`);
const schemeApi = recordApi(`${LN}/scheme`);
const ifProductApi = recordApi(`${IF}/product`);
const calcApi = calls(`${LN}/calculator`, ["emi", "interest", "options", "schedule"]);
const prepayApi = calls(`${LN}/prepayment`, ["list", "quote", "add", "auth", "deauth"]);
const moratoriumApi = calls(`${LN}/moratorium`, ["list", "quote", "add", "auth", "deauth"]);
const penaltyApi = calls(`${LN}/penalty`, ["dpd", "list", "quote", "run"]);
const waiverApi = calls(`${LN}/penalty_waiver`, ["list", "add", "auth", "deauth"]);
const contractApi = { ...calls(`${IF}/contract`, ["list", "get", "options", "add", "auth", "deauth", "late_charges", "late_charges_run", "mudaraba_settle", "pay", "pay_charges", "rental_revision", "settle", "settlement_quote"]), ...calls(IF, ["calculate"]) };
const charityApi = calls(`${IF}/charity`, ["fund", "list", "remit"]);
const loanReportApi = calls(`${LN}/report`, ["catalogue", "run"]);

const useF = () => {
  const L = useL();
  return (key, type = "text", extra = {}) => ({ key, label: L(key), type, ...extra });
};
const toNum = (keys) => (x) => ({ ...x, ...Object.fromEntries(keys.filter((k) => k in x).map((k) => [k, x[k] === "" || x[k] == null ? 0 : Number(x[k])])) });
const Status = ({ code }) => <StatusBadge status={code} label={words(code)} variant="subtle" />;
const today = () => new Date().toISOString().slice(0, 10);
const header = (L, title, sub) => (
  <>
    <PageTitle>{L(title)}</PageTitle>
    <p className="mt-1 mb-4 text-sm text-muted-foreground">{L(sub)}</p>
  </>
);
const act = (call, body, after) =>
  call(body)
    .then((x) => {
      notifications.success(x?.message ?? "OK");
      after?.(x);
    })
    .catch((e) => notifications.error(e.message));
const factsOfObject = (L, o, skip = []) => Object.entries(o ?? {}).filter(([k, v]) => !skip.includes(k) && (typeof v !== "object" || v === null)).map(([k, v]) => [L(k), v === "" || v == null ? "—" : String(v)]);

// A loan facility, searched by number or borrower.
export function FacilityPick({ value, onChange }) {
  const L = useL();
  const [found, setFound] = useState([]);
  const latest = useRef(0);
  const search = (text) => {
    if (!text) return;
    const ticket = ++latest.current;
    loanFacilitiesApi
      .list({ search: text, page: 1, page_size: 20 })
      .then((r) => ticket === latest.current && setFound(rowsOf(r).map((f) => ({ value: String(f.id), label: [f.facility_number, f.borrower ?? f.borrower_name ?? f.owner_name, f.status].filter(Boolean).join(" · ") }))))
      .catch((e) => notifications.error(e.message));
  };
  return <FilterSelect className="mt-1" value={value ?? ""} onChange={(v) => onChange(String(v ?? ""))} onSearch={search} options={[{ value: "", label: L("Type a facility number or borrower") }, ...found]} />;
}

// ---------- Settings ----------

export function LendingRegulatoryRules() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={regRuleApi}
      title={L("lendingRegulatoryRules")}
      subtitle={L("Per country: rate cap, default interest cap, penalty cap and disclosure.")}
      effectiveDated
      columns={[
        { key: "country", label: L("country"), render: (r) => cell(sv(r, "country")) },
        { key: "maximum_annual_rate", label: L("maximum_annual_rate"), render: (r) => cell(pct(sv(r, "maximum_annual_rate"))) },
        { key: "rule_version", label: L("rule_version"), render: (r) => cell(sv(r, "rule_version")) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "NG_CONSUMER" }),
        f("name", "text", { required: true }),
        f("country", "text", { required: true, placeholder: "NG" }),
        f("regulator", "text", { required: true }),
        f("product_category", "select", { options: codes("product_categories"), hint: L("Leave empty for every category.") }),
        f("rule_version"),
        f("maximum_annual_rate", "rate"),
        f("default_interest_allowed", "bool"),
        f("maximum_default_interest_rate", "rate", { showIf: (x) => x.default_interest_allowed }),
        f("maximum_penalty_percent_of_instalment", "percent"),
        f("compounding_allowed", "bool"),
        f("effective_rate_disclosure_required", "bool"),
        f("islamic_late_charges_to_charity", "bool"),
        f("effective_from", "date", { required: true }),
        f("disclosure_requirements", "textarea"),
      ]}
    />
  );
}

export function RepaymentStructures() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={structureApi}
      title={L("repaymentStructures")}
      subtitle={L("How a loan product is repaid: EMI, equal principal, interest only, bullet, balloon, step up or down, custom.")}
      effectiveDated
      columns={[
        { key: "repayment_structure", label: L("repayment_structure"), render: (r) => cell(words(sv(r, "repayment_structure"))) },
        { key: "loan_product_id", label: L("product"), render: (r) => cell(r.loan_product_name ?? sv(r, "loan_product_id")) },
      ]}
      fields={[
        f("loan_product_id", "select", { required: true, options: byId("loan_products") }),
        f("repayment_structure", "select", { required: true, options: codes("repayment_structures") }),
        f("code", "code", { fixedOnEdit: true, hint: L("Leave empty and the server gives one.") }),
        f("name", "text", { wide: true }),
        f("interest_method", "select", { options: codes("interest_methods") }),
        f("interest_basis", "select", { options: codes("interest_bases") }),
        f("first_instalment_convention", "select", { options: codes("first_instalment_conventions") }),
        f("first_after_days", "int"),
        f("due_day", "int", { hint: L("0 keeps the disbursement day.") }),
        f("interest_only_periods", "int", { showIf: (x) => ["INTEREST_ONLY", "BALLOON", "BULLET"].includes(x.repayment_structure) }),
        f("balloon_percent", "percent", { showIf: (x) => x.repayment_structure === "BALLOON" }),
        f("step_percent", "percent", { showIf: (x) => String(x.repayment_structure).startsWith("STEP") }),
        f("step_every", "int", { showIf: (x) => String(x.repayment_structure).startsWith("STEP") }),
        {
          key: "principal_plan",
          label: L("principal_plan"),
          type: "custom",
          showIf: (x) => x.repayment_structure === "CUSTOM_PRINCIPAL",
          render: (v, set) => <RowsInput value={v} onChange={set} blank={() => ({ instalment: "", percent: "" })} columns={[{ key: "instalment", label: L("instalment"), type: "int" }, { key: "percent", label: L("percent"), type: "percent" }]} />,
        },
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={(x) => ({ ...toNum(["loan_product_id", "due_day", "first_after_days", "interest_only_periods", "step_every"])(x), principal_plan: (x.principal_plan ?? []).map((p) => ({ instalment: Number(p.instalment), percent: String(p.percent) })) })}
    />
  );
}

export function LoanServicingRules() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={servicingApi}
      title={L("loanServicingRules")}
      subtitle={L("Prepayment, moratorium, grace, penalties, allocation order and DPD buckets of a loan product.")}
      effectiveDated
      columns={[
        { key: "loan_product_id", label: L("product"), render: (r) => cell(r.loan_product_name ?? sv(r, "loan_product_id")) },
        { key: "grace_period_days", label: L("grace_period_days"), render: (r) => cell(sv(r, "grace_period_days")) },
        { key: "prepayment_allowed", label: L("prepayment_allowed"), render: (r) => cell(sv(r, "prepayment_allowed") ? "✓" : "—") },
      ]}
      fields={[
        f("loan_product_id", "select", { required: true, fixedOnEdit: true, options: byId("loan_products") }),
        f("code", "code", { fixedOnEdit: true, hint: L("Leave empty and the server gives one.") }),
        f("name", "text", { wide: true }),
        // Prepayment
        f("prepayment_allowed", "bool"),
        f("prepayment_type", "select", { options: codes("prepayment_types"), showIf: (x) => x.prepayment_allowed }),
        f("prepayment_effect", "select", { options: codes("prepayment_effects"), showIf: (x) => x.prepayment_allowed }),
        f("prepayment_approval", "select", { options: codes("approvals"), showIf: (x) => x.prepayment_allowed }),
        f("prepayment_on_overdue", "select", { options: codes("prepayment_on_overdue"), showIf: (x) => x.prepayment_allowed }),
        f("lock_in_months", "int", { showIf: (x) => x.prepayment_allowed }),
        f("lock_in_from", "select", { options: codes("lock_in_from"), showIf: (x) => x.prepayment_allowed }),
        f("minimum_prepayment_amount", "amount", { showIf: (x) => x.prepayment_allowed }),
        f("maximum_prepayment_amount", "amount", { showIf: (x) => x.prepayment_allowed }),
        f("minimum_prepayment_percent", "percent", { showIf: (x) => x.prepayment_allowed }),
        f("maximum_prepayment_percent", "percent", { showIf: (x) => x.prepayment_allowed }),
        f("maximum_prepayments", "int", { showIf: (x) => x.prepayment_allowed }),
        f("count_basis", "select", { options: codes("count_bases"), showIf: (x) => x.prepayment_allowed }),
        f("financial_year_start_month", "int", { showIf: (x) => x.prepayment_allowed && x.count_basis === "FINANCIAL_YEAR" }),
        f("minimum_interval_days", "int", { showIf: (x) => x.prepayment_allowed }),
        f("minimum_remaining_instalments", "int", { showIf: (x) => x.prepayment_allowed }),
        f("notice_days", "int", { showIf: (x) => x.prepayment_allowed }),
        f("multiple_prepayments_per_day", "bool", { showIf: (x) => x.prepayment_allowed }),
        f("prepayment_fee_type", "select", { options: codes("prepayment_fee_types"), showIf: (x) => x.prepayment_allowed }),
        f("prepayment_fee_value", "amount", { showIf: (x) => x.prepayment_allowed && x.prepayment_fee_type && x.prepayment_fee_type !== "NONE" }),
        {
          key: "prepayment_fee_tiers",
          label: L("prepayment_fee_tiers"),
          type: "custom",
          showIf: (x) => x.prepayment_allowed && x.prepayment_fee_type === "TIERED",
          render: (v, set) => <RowsInput value={v} onChange={set} blank={() => ({ from_month: "", percent: "" })} addLabel={L("Add a tier")} columns={[{ key: "from_month", label: L("From loan age (months)"), type: "int" }, { key: "percent", label: L("percent"), type: "percent" }]} />,
        },
        f("prepayment_fee_base", "select", { options: codes("prepayment_fee_bases"), showIf: (x) => x.prepayment_allowed && x.prepayment_fee_type && x.prepayment_fee_type !== "NONE" }),
        // Settlement
        f("settlement_fee_type", "select", { options: codes("settlement_fee_types") }),
        f("settlement_fee_value", "amount", { showIf: (x) => x.settlement_fee_type && x.settlement_fee_type !== "NONE" }),
        f("settlement_notice_days", "int"),
        f("minimum_loan_age_months_for_settlement", "int"),
        // Moratorium
        f("moratorium_allowed", "bool"),
        f("moratorium_type", "select", { options: codes("moratorium_types"), showIf: (x) => x.moratorium_allowed }),
        f("maximum_moratorium_months", "int", { showIf: (x) => x.moratorium_allowed }),
        f("maximum_moratorium_extensions", "int", { showIf: (x) => x.moratorium_allowed }),
        f("interest_during_moratorium", "select", { options: codes("interest_during_moratorium"), showIf: (x) => x.moratorium_allowed }),
        f("post_moratorium_repayment", "select", { options: codes("post_moratorium_repayment"), showIf: (x) => x.moratorium_allowed }),
        f("prepayment_during_moratorium", "bool", { showIf: (x) => x.moratorium_allowed }),
        // Grace, penalties, allocation
        f("grace_period_days", "int"),
        f("grace_period_kind", "select", { options: codes("grace_period_kinds") }),
        f("maximum_penalty_per_loan", "amount"),
        f("allocation_mode", "select", { options: codes("allocation_modes") }),
        f("allocation_order", "multi", { options: codes("allocation_parts"), hint: L("Pick in the order repayments pay them.") }),
        f("sharia_compliant", "bool"),
        {
          key: "penalties",
          label: L("penalties"),
          type: "custom",
          render: (v, set, _f, c) => (
            <RowsInput
              value={v}
              onChange={set}
              blank={() => ({ method: "", value: "", base: "", minimum: "", maximum_per_instalment: "", default_after_dpd: 0, charity: false })}
              columns={[
                { key: "method", label: L("method"), type: "select", options: codes("penalty_methods")(c) },
                { key: "value", label: L("value"), type: "amount" },
                { key: "base", label: L("base"), type: "select", options: codes("penalty_bases")(c) },
                { key: "minimum", label: L("minimum"), type: "amount" },
                { key: "maximum_per_instalment", label: L("maximum_per_instalment"), type: "amount" },
                { key: "default_after_dpd", label: L("default_after_dpd"), type: "int" },
                { key: "charity", label: L("charity"), type: "bool" },
              ]}
            />
          ),
        },
        {
          key: "dpd_buckets",
          label: L("dpd_buckets"),
          type: "custom",
          render: (v, set, _f, c) => (
            <>
              {!(v ?? []).length && (c?.default_dpd_buckets ?? []).length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => set(c.default_dpd_buckets)}>
                  {L("Use the standard buckets")}
                </Button>
              )}
              <RowsInput value={v} onChange={set} blank={() => ({ label: "", from_dpd: "", to_dpd: "" })} columns={[{ key: "label", label: L("label") }, { key: "from_dpd", label: L("from_dpd"), type: "int" }, { key: "to_dpd", label: L("to_dpd"), type: "int" }]} />
            </>
          ),
        },
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={(x) => ({
        ...toNum(["loan_product_id", "lock_in_months", "maximum_prepayments", "financial_year_start_month", "minimum_interval_days", "minimum_remaining_instalments", "notice_days", "settlement_notice_days", "minimum_loan_age_months_for_settlement", "maximum_moratorium_months", "maximum_moratorium_extensions", "grace_period_days"])(x),
        penalties: (x.penalties ?? []).map((p) => ({ ...p, default_after_dpd: Number(p.default_after_dpd || 0) })),
        dpd_buckets: (x.dpd_buckets ?? []).map((b) => ({ ...b, from_dpd: Number(b.from_dpd || 0), to_dpd: Number(b.to_dpd || 0) })),
        prepayment_fee_tiers: (x.prepayment_fee_tiers ?? []).map((t) => ({ from_month: Number(t.from_month || 0), percent: String(t.percent) })),
      })}
    />
  );
}

export function LoanSchemes() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={schemeApi}
      title={L("loanSchemes")}
      subtitle={L("Special pricing for a segment: rate override, maximum amount, fees waived.")}
      effectiveDated
      columns={[
        { key: "scheme_type", label: L("scheme_type"), render: (r) => cell(words(sv(r, "scheme_type"))) },
        { key: "rate_override", label: L("rate"), render: (r) => cell(sv(r, "rate_override") ? pct(sv(r, "rate_override")) : sv(r, "rate_discount") ? `−${pct(sv(r, "rate_discount"))}` : "—") },
        { key: "maximum_amount", label: L("maximum_amount"), render: (r) => cell(sv(r, "maximum_amount")) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP_WOMEN_SME" }),
        f("name", "text", { required: true }),
        f("loan_product_id", "select", { required: true, options: byId("loan_products") }),
        f("scheme_type", "select", { required: true, options: codes("scheme_types") }),
        f("customer_segments", "multi", { options: codes("customer_segments") }),
        f("rate_override", "rate", { hint: L("Or a discount below; not both.") }),
        f("rate_discount", "rate"),
        f("rate_floor", "rate"),
        f("minimum_amount", "amount"),
        f("maximum_amount", "amount"),
        f("maximum_tenure_months", "int"),
        f("fees_waived", "multi", { options: () => [], optionsFor: (c, x) => (c.product_fees ?? []).filter((p) => String(p.loan_product_id) === String(x.loan_product_id)).map((p) => ({ value: p.fee_code, label: p.fee_name })), hint: L("The fees of the chosen loan product.") }),
        f("fee_discount_percent", "percent"),
        f("override_approval_required", "bool"),
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={toNum(["loan_product_id", "maximum_tenure_months"])}
    />
  );
}

export function IslamicFinancingProducts() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={ifProductApi}
      title={L("islamicFinancingProducts")}
      subtitle={L("Murabaha, Ijara, Diminishing Musharaka, Qard Hasan and Mudaraba products with their late charge rules.")}
      effectiveDated
      columns={[
        { key: "contract_type", label: L("contract_type"), render: (r) => cell(words(sv(r, "contract_type"))) },
        { key: "indicative_profit_rate", label: L("indicative_profit_rate"), render: (r) => cell(pct(sv(r, "indicative_profit_rate"))) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP_MURABAHA" }),
        f("name", "text", { required: true }),
        f("contract_type", "select", { required: true, options: codes("contract_types") }),
        f("currency", "text", { placeholder: "NGN" }),
        f("indicative_profit_rate", "rate", { showIf: (x) => x.contract_type !== "QARD_HASAN" }),
        f("maximum_instalments", "int"),
        f("grace_period_days", "int"),
        f("tawidh_annual_rate", "rate", { hint: L("Ta'widh: compensation for actual loss, may be income.") }),
        f("tawidh_maximum_per_instalment", "amount"),
        f("gharamah_type", "select", { options: codes("gharamah_types"), hint: L("Gharamah goes to charity, never income.") }),
        f("gharamah_value", "amount", { showIf: (x) => x.gharamah_type && x.gharamah_type !== "NONE" }),
        f("ibra_percent", "percent", { hint: L("Rebate of unearned profit on early settlement.") }),
        f("rental_revision_months", "int", { showIf: (x) => x.contract_type === "IJARA" }),
        f("rental_revision_percent", "percent", { showIf: (x) => x.contract_type === "IJARA" }),
        f("sharia_reference", "text", { required: true }),
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={toNum(["maximum_instalments", "grace_period_days", "rental_revision_months"])}
    />
  );
}

// ---------- Calculator ----------

function ScheduleRows({ rows, cols }) {
  return <RowsTable rows={rows} columns={cols.map(([key, label, isDate]) => ({ key, label, numeric: !isDate, render: isDate ? (r) => dateCell(r[key]) : undefined }))} />;
}

export function LoanCalculator() {
  const L = useL();
  const can = usePagePermission();
  const [tab, setTab] = useState("schedule");
  const [choices, setChoices] = useState({});
  const [form, setForm] = useState({ principal: "", annual_rate: "", instalments: "", interest_method: "", repayment_structure: "EMI", disbursement_date: today(), repayment_frequency: "", method: "SIMPLE", from: today(), to: "", compounding: "", day_count: "" });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    calcApi
      .options({})
      .then((r) => setChoices(first(r) ?? {}))
      .catch(() => {});
  }, []);
  if (!can("View")) return <NoAccess />;
  const set = (k) => (v) => setForm((x) => ({ ...x, [k]: v }));
  const pick = (k, list) => (
    <label className={labelClass}>
      {L(k)}
      <Field field={{ type: "select", blank: L("Default"), options: codes(list)(choices) }} value={form[k]} onChange={set(k)} />
    </label>
  );
  const input = (k, type) => (
    <label className={labelClass}>
      {L(k)}
      <Field field={{ type }} value={form[k]} onChange={set(k)} />
    </label>
  );
  const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v != null));
  const run = async () => {
    setBusy(true);
    try {
      const body =
        tab === "emi"
          ? clean({ principal: form.principal, annual_rate: form.annual_rate, instalments: Number(form.instalments), repayment_frequency: form.repayment_frequency })
          : tab === "interest"
            ? clean({ method: form.method, principal: form.principal, annual_rate: form.annual_rate, from: form.from, to: form.to, compounding: form.compounding, day_count: form.day_count })
            : clean({ principal: form.principal, annual_rate: form.annual_rate, instalments: Number(form.instalments), interest_method: form.interest_method, repayment_structure: form.repayment_structure, disbursement_date: form.disbursement_date, repayment_frequency: form.repayment_frequency });
      setResult(first(await calcApi[tab](body)));
    } catch (e) {
      notifications.error(e.message);
      setResult(null);
    } finally {
      setBusy(false);
    }
  };
  const ready = form.principal && form.annual_rate && (tab === "interest" ? form.from && form.to : form.instalments);
  return (
    <div className="pt-1 pb-6">
      {header(L, "loanCalculator", "EMI, repayment schedules by structure, and interest by method. Nothing is saved.")}
      <SegmentedSwitch className="mb-3" value={tab} onChange={(v) => (setTab(v), setResult(null))} options={[{ value: "schedule", label: L("Schedule") }, { value: "emi", label: "EMI" }, { value: "interest", label: L("Interest") }]} />
      <Section title={L("Inputs")} className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {input("principal", "amount")}
          {input("annual_rate", "rate")}
          {tab !== "interest" && input("instalments", "int")}
          {tab !== "interest" && pick("repayment_frequency", "repayment_frequencies")}
          {tab === "schedule" && pick("repayment_structure", "repayment_structures")}
          {tab === "schedule" && pick("interest_method", "interest_methods")}
          {tab === "schedule" && input("disbursement_date", "date")}
          {tab === "interest" && pick("method", "interest_methods")}
          {tab === "interest" && input("from", "date")}
          {tab === "interest" && input("to", "date")}
          {tab === "interest" && form.method === "COMPOUND" && pick("compounding", "compounding")}
          {tab === "interest" && pick("day_count", "day_counts")}
        </div>
        <Button className="mt-3" icon={Calculator} loading={busy} disabled={!ready} disabledReason={L("Fill the amount, rate and instalments or dates.")} onClick={run}>
          {L("Calculate")}
        </Button>
      </Section>
      {result && (
        <Section title={L("Result")}>
          <Facts className="mb-3" rows={factsOfObject(L, result)} />
          {(result.notes ?? []).map((n) => (
            <p key={n} className="mb-2 text-xs text-muted-foreground">{n}</p>
          ))}
          {result.rows && <ScheduleRows rows={result.rows} cols={[["instalment_number", "#"], ["due_date", L("due_date"), true], ["days", L("days")], ["opening_principal", L("opening_principal")], ["principal_due", L("principal_due")], ["interest_due", L("interest_due")], ["total_due", L("total_due")], ["closing_principal", L("closing_principal")]]} />}
          {result.segments && <ScheduleRows rows={result.segments} cols={[["from", L("from"), true], ["to", L("to"), true], ["days", L("days")], ["principal", L("principal")], ["daily_interest", L("daily_interest")], ["interest", L("interest")]]} />}
        </Section>
      )}
    </div>
  );
}

// ---------- Prepayments and moratoriums ----------

const INSTALMENT_COLS = (L) => [["installment_number", "#"], ["due_date", L("due_date"), true], ["opening_principal", L("opening_principal")], ["principal_due", L("principal_due")], ["interest_due", L("interest_due")], ["fees_due", L("fees_due")], ["total_due", L("total_due")], ["closing_principal", L("closing_principal")]];

// A facility change (prepayment / moratorium): a list, a request with its
// quote, and a checker's approve / reject.
function FacilityChangeScreen({ api, title, sub, amountField, columns, addLabel }) {
  const L = useL();
  const { t } = useTranslation("common");
  const can = usePagePermission();
  const [adding, setAdding] = useState(false);
  const [quote, setQuote] = useState(null);
  const list = useServerList({ api: api.listPath, call: api.list });
  if (!can("View")) return <NoAccess />;
  const body = (x) => ({ facility_id: Number(x.facility_id), [amountField.key]: amountField.type === "int" ? Number(x[amountField.key]) : x[amountField.key] });
  return (
    <div className="pt-1 pb-6">
      {header(L, title, sub)}
      <ListTable
        list={list}
        rowKey={(r) => r.id}
        title={L(title)}
        emptyTitle={L("Nothing yet")}
        actions={
          can("Add") && (
            <Button size="sm" icon={Plus} onClick={() => setAdding(true)}>
              {L(addLabel)}
            </Button>
          )
        }
        columns={[
          { key: "facility_number", label: L("Facility"), align: "left", render: (r) => <span className="text-xs"><b>{r.facility_number}</b><span className="block text-[10px] text-muted-foreground">{r.borrower}</span></span> },
          ...columns,
          { key: "requested_by", label: L("requested_by"), render: (r) => cell(r.requested_by) },
          { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
          {
            key: "actions",
            label: t("actions"),
            sortable: false,
            render: (r) => (
              <RowActions
                buttons={{ authorize: Boolean(r.actions?.approve), deauthorize: Boolean(r.actions?.reject) }}
                onAuthorize={() => act(api.auth, { id: r.id }, list.reload)}
                onDeauthorize={() => act(api.deauth, { id: r.id }, list.reload)}
              />
            ),
          },
        ]}
      />
      {adding && (
        <OpDialog
          size="lg"
          title={L(addLabel)}
          hint={L("The servicing rule is checked; a checker approves the request.")}
          fields={[amountField, { key: "narration", label: L("narration"), wide: true }]}
          needs={(x) => Boolean(x.facility_id)}
          confirmLabel={L("Submit for approval")}
          run={(x) => api.add({ ...body(x), narration: x.narration })}
          onClose={() => (setAdding(false), setQuote(null))}
          onDone={() => (setAdding(false), setQuote(null), list.reload())}
        >
          {(form, setForm) => (
            <div className="mb-3">
              <div className={`${labelClass} mb-2`}>
                {L("Facility")}
                <FacilityPick value={form.facility_id} onChange={(v) => setForm((x) => ({ ...x, facility_id: v }))} />
              </div>
              <Button
                size="sm"
                variant="secondary"
                icon={Calculator}
                disabled={!form.facility_id || !form[amountField.key]}
                disabledReason={L("Pick the facility and fill the amount.")}
                onClick={() =>
                  api
                    .quote(body(form))
                    .then((r) => setQuote(first(r)))
                    .catch((e) => notifications.error(e.message))
                }
              >
                {L("Quote")}
              </Button>
              {quote && (
                <div className="mt-3">
                  <Facts className="mb-3" rows={factsOfObject(L, quote, ["facility_id"])} />
                  <ScheduleRows rows={quote.installments} cols={INSTALMENT_COLS(L)} />
                </div>
              )}
            </div>
          )}
        </OpDialog>
      )}
    </div>
  );
}

export function Prepayments() {
  const L = useL();
  return (
    <FacilityChangeScreen
      api={prepayApi}
      title="prepayments"
      sub="Quote, request and approve prepayments. Approval debits the repayment account and reschedules the loan."
      addLabel="Request a prepayment"
      amountField={{ key: "amount", label: L("amount"), type: "amount", required: true }}
      columns={[
        { key: "amount", label: L("amount"), render: (r) => cell(r.amount) },
        { key: "prepayment_effect", label: L("prepayment_effect"), render: (r) => cell(words(r.prepayment_effect)) },
        { key: "instalment", label: L("instalment"), sortable: false, render: (r) => cell(`${r.instalment_before} → ${r.instalment_after}`) },
        { key: "maturity", label: L("maturity"), sortable: false, render: (r) => cell(`${r.maturity_before} → ${r.maturity_after}`) },
        { key: "interest_saved", label: L("interest_saved"), render: (r) => cell(r.interest_saved) },
      ]}
    />
  );
}

export function Moratoriums() {
  const L = useL();
  return (
    <FacilityChangeScreen
      api={moratoriumApi}
      title="moratoriums"
      sub="Quote, request and approve repayment holidays."
      addLabel="Request a moratorium"
      amountField={{ key: "months", label: L("months"), type: "int", required: true }}
      columns={[
        { key: "months", label: L("months"), render: (r) => cell(r.months) },
        { key: "moratorium_type", label: L("moratorium_type"), render: (r) => cell(words(r.moratorium_type)) },
        { key: "period", label: L("period"), sortable: false, render: (r) => cell(`${r.from_date} → ${r.to_date}`) },
        { key: "maturity", label: L("maturity"), sortable: false, render: (r) => cell(`${r.maturity_before} → ${r.maturity_after}`) },
        { key: "deferred_interest", label: L("deferred_interest"), render: (r) => cell(r.deferred_interest) },
      ]}
    />
  );
}

// ---------- Penalties & waivers ----------

export function PenaltiesWaivers() {
  const L = useL();
  const { t } = useTranslation("common");
  const can = usePagePermission();
  const [tab, setTab] = useState("dpd");
  const [dpd, setDpd] = useState(null);
  const [facility, setFacility] = useState("");
  const [quote, setQuote] = useState(null);
  const [adding, setAdding] = useState(false);
  const penalties = useServerList({ api: penaltyApi.listPath, call: penaltyApi.list, enabled: tab === "penalties" });
  const waivers = useServerList({ api: waiverApi.listPath, call: waiverApi.list, prefix: "w_", enabled: tab === "waivers" });
  useEffect(() => {
    penaltyApi
      .dpd({})
      .then((r) => setDpd(first(r)?.items ?? []))
      .catch(() => setDpd([]));
  }, []);
  if (!can("View")) return <NoAccess />;
  const getQuote = () =>
    penaltyApi
      .quote({ facility_id: Number(facility) })
      .then((r) => setQuote(first(r)))
      .catch((e) => notifications.error(e.message));
  return (
    <div className="pt-1 pb-6">
      {header(L, "Penalties & Waivers", "Penalties due by the servicing rule, charging them, the DPD picture, and penalty waivers.")}
      <SegmentedSwitch className="mb-3" value={tab} onChange={setTab} options={[{ value: "dpd", label: L("DPD and quote") }, { value: "penalties", label: L("Penalties charged") }, { value: "waivers", label: L("Waivers") }]} />
      {tab === "dpd" && (
        <>
          <Section title={L("Days past due")} className="mb-4">
            <RowsTable rows={dpd ?? []} columns={[{ key: "bucket", label: L("bucket") }, { key: "loans", label: L("loans"), numeric: true }, { key: "principal_outstanding", label: L("principal_outstanding"), numeric: true }]} />
          </Section>
          <Section title={L("Penalties due on a facility")}>
            <div className="flex flex-wrap items-end gap-2">
              <div className={`${labelClass} min-w-64`}>
                {L("Facility")}
                <FacilityPick value={facility} onChange={(v) => (setFacility(v), setQuote(null))} />
              </div>
              <Button size="sm" variant="secondary" icon={Calculator} disabled={!facility} disabledReason={L("Pick a facility.")} onClick={getQuote}>
                {L("Quote")}
              </Button>
              {can("Authorize") && (
                <Button size="sm" icon={Play} disabled={!facility} disabledReason={L("Pick a facility.")} onClick={() => act(penaltyApi.run, { facility_id: Number(facility) }, getQuote)}>
                  {L("Charge now")}
                </Button>
              )}
            </div>
            {quote && (
              <div className="mt-3">
                <Facts className="mb-3" rows={[[L("as_of"), quote.as_of], [L("rule_code"), quote.rule_code], [L("grace"), `${quote.grace_period_days} · ${words(quote.grace_period_kind)}`], [L("total"), quote.total]]} />
                <RowsTable rows={quote.lines} empty={L("No penalties are due.")} columns={Object.keys(quote.lines?.[0] ?? { line: 1 }).map((k) => ({ key: k, label: L(k) }))} />
              </div>
            )}
          </Section>
        </>
      )}
      {tab === "penalties" && (
        <ListTable
          list={penalties}
          rowKey={(r) => r.id}
          title={L("Penalties charged")}
          emptyTitle={L("No penalties charged")}
          columns={[
            { key: "facility_number", label: L("Facility"), render: (r) => cell(r.facility_number ?? r.facility_id) },
            { key: "borrower", label: L("borrower"), render: (r) => cell(r.borrower) },
            { key: "installment_number", label: "#", render: (r) => cell(r.installment_number) },
            { key: "method", label: L("method"), render: (r) => cell(`${words(r.method)} · ${words(r.base)}`) },
            { key: "period", label: L("period"), sortable: false, render: (r) => cell(`${r.period_from} → ${r.period_to} (${r.days})`) },
            { key: "amount", label: L("amount"), render: (r) => cell(r.amount) },
            { key: "outstanding", label: L("outstanding"), render: (r) => cell(r.outstanding) },
            { key: "created_time", label: L("when"), render: (r) => dateCell(r.created_time) },
            { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
            { key: "_a", label: "", sortable: false, render: (r) => r.actions?.waive && <Button size="sm" variant="ghost" icon={HandCoins} onClick={() => setAdding({ facility_id: String(r.facility_id), schedule_id: r.schedule_id, amount: r.outstanding })}>{L("Waive")}</Button> },
          ]}
        />
      )}
      {tab === "waivers" && (
        <ListTable
          list={waivers}
          rowKey={(r) => r.id}
          title={L("Waivers")}
          emptyTitle={L("No waivers yet")}
          actions={
            can("Add") && (
              <Button size="sm" icon={HandCoins} onClick={() => setAdding(true)}>
                {L("Request a waiver")}
              </Button>
            )
          }
          columns={[
            { key: "facility_number", label: L("Facility"), render: (r) => cell(r.facility_number ?? r.facility_id) },
            { key: "borrower", label: L("borrower"), render: (r) => cell(r.borrower) },
            { key: "installment_number", label: "#", render: (r) => cell(r.installment_number) },
            { key: "original_amount", label: L("original_amount"), render: (r) => cell(r.original_amount) },
            { key: "waived_amount", label: L("waived_amount"), render: (r) => cell(r.waived_amount) },
            { key: "reason", label: L("reason"), render: (r) => cell(r.reason) },
            { key: "maker", label: L("maker"), render: (r) => cell(r.maker) },
            { key: "checker", label: L("checker"), render: (r) => cell(r.checker) },
            { key: "audit_reference", label: L("reference"), render: (r) => cell(r.audit_reference) },
            { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
            {
              key: "actions",
              label: t("actions"),
              sortable: false,
              render: (r) => {
                return <RowActions buttons={{ authorize: Boolean(r.actions?.approve), deauthorize: Boolean(r.actions?.reject) }} onAuthorize={() => act(waiverApi.auth, { id: r.id }, waivers.reload)} onDeauthorize={() => act(waiverApi.deauth, { id: r.id }, waivers.reload)} />;
              },
            },
          ]}
        />
      )}
      {adding && (
        <OpDialog
          title={L("Request a waiver")}
          hint={L("A checker approves the waiver.")}
          fields={[
            { key: "amount", label: L("amount"), type: "amount", required: true },
            { key: "reason", label: L("reason"), type: "textarea", required: true },
          ]}
          needs={(x) => Boolean(x.facility_id)}
          initial={typeof adding === "object" ? adding : {}}
          run={(x) => waiverApi.add({ facility_id: Number(x.facility_id), amount: x.amount, reason: x.reason, ...(x.schedule_id ? { schedule_id: x.schedule_id } : {}) })}
          onClose={() => setAdding(false)}
          onDone={() => (setAdding(false), waivers.reload())}
        >
          {(form, setForm) => (
            <div className={`${labelClass} mb-3`}>
              {L("Facility")}
              <FacilityPick value={form.facility_id} onChange={(v) => setForm((x) => ({ ...x, facility_id: v }))} />
            </div>
          )}
        </OpDialog>
      )}
    </div>
  );
}

// ---------- Islamic financing ----------

const TERM_KEYS = ["asset_cost", "agreed_profit", "profit_rate", "asset_value", "rental_amount", "residual_value", "rental_revision_months", "rental_revision_percent", "customer_contribution", "rental_rate", "principal", "customer_profit_share", "instalments", "frequency"];
const termType = (k) => (k === "instalments" || k === "rental_revision_months" ? "int" : k === "frequency" ? "select" : /rate|percent|share/.test(k) ? "rate" : "amount");

function ContractOpen({ onClose, onDone }) {
  const L = useL();
  const [c, setC] = useState(null);
  const [calc, setCalc] = useState(null);
  useEffect(() => {
    contractApi
      .options({})
      .then((r) => setC(first(r) ?? {}))
      .catch(() => setC({}));
  }, []);
  const product = (code) => (c?.products ?? []).find((p) => p.code === code);
  const spec = (code) => (c?.contract_types ?? []).find((t) => t.contract_type === product(code)?.contract_type) ?? { required: [], optional: [] };
  const terms = (x) => {
    const sp = spec(x.product_code);
    return Object.fromEntries(["start_date", ...sp.required, ...sp.optional].map((k) => [k, k === "instalments" || k === "rental_revision_months" ? (x[k] === "" ? "" : Number(x[k])) : x[k]]).filter(([, v]) => v !== "" && v != null));
  };
  return (
    <OpDialog
      size="lg"
      title={L("Open a contract")}
      hint={L("A checker approves the contract.")}
      choices={c}
      fields={[
        { key: "party", label: L("Customer"), type: "party", required: true },
        { key: "acct_id", label: L("Repayment account"), type: "acct", required: true, owner: (x) => ownerOf(x.party) },
        { key: "product_code", label: L("product"), type: "select", required: true, options: (c?.products ?? []).map((p) => ({ value: p.code, label: `${p.code} · ${p.name} · ${words(p.contract_type)}` })) },
        { key: "start_date", label: L("start_date"), type: "date" },
        ...TERM_KEYS.map((k) => ({
          key: k,
          label: L(k),
          type: termType(k),
          options: k === "frequency" ? (c?.frequencies ?? []).map((v) => ({ value: v, label: words(v) })) : undefined,
          showIf: (x) => [...spec(x.product_code).required, ...spec(x.product_code).optional].includes(k),
        })),
        { key: "asset_description", label: L("Asset"), wide: true, showIf: (x) => !["QARD_HASAN", "MUDARABA"].includes(product(x.product_code)?.contract_type) },
        { key: "asset_reference", label: L("Asset reference"), showIf: (x) => !["QARD_HASAN", "MUDARABA"].includes(product(x.product_code)?.contract_type) },
        { key: "supplier", label: L("supplier"), showIf: (x) => !["QARD_HASAN", "MUDARABA"].includes(product(x.product_code)?.contract_type) },
        { key: "supplier_invoice", label: L("supplier_invoice"), showIf: (x) => !["QARD_HASAN", "MUDARABA"].includes(product(x.product_code)?.contract_type) },
        { key: "purchase_date", label: L("purchase_date"), type: "date", showIf: (x) => !["QARD_HASAN", "MUDARABA"].includes(product(x.product_code)?.contract_type) },
      ]}
      initial={{ start_date: today() }}
      needs={(x) => x.product_code && spec(x.product_code).required.every((k) => x[k] !== "" && x[k] != null)}
      confirmLabel={L("Submit for approval")}
      run={(x) =>
        contractApi.add({
          ...splitParty(x.party),
          acct_id: Number(x.acct_id),
          product_code: x.product_code,
          terms: terms(x),
          ...(x.asset_description ? { asset: { description: x.asset_description, reference: x.asset_reference, supplier: x.supplier, supplier_invoice: x.supplier_invoice, purchase_date: x.purchase_date } } : {}),
        })
      }
      onClose={onClose}
      onDone={onDone}
    >
      {(form) => {
        const p = product(form.product_code);
        const sp = spec(form.product_code);
        return (
          <div className="mb-3">
            {p && <p className="mb-2 text-xs text-muted-foreground">{[words(p.contract_type), p.currency, p.indicative_profit_rate && `${L("indicative_profit_rate")} ${pct(p.indicative_profit_rate)}`, p.maximum_instalments && `${L("maximum_instalments")} ${p.maximum_instalments}`, sp.note].filter(Boolean).join(" · ")}</p>}
            <Button
              size="sm"
              variant="secondary"
              icon={Calculator}
              disabled={!form.product_code || !sp.required.every((k) => form[k] !== "" && form[k] != null)}
              disabledReason={L("Pick the product and fill its required terms.")}
              onClick={() =>
                contractApi
                  .calculate({ contract_type: p.contract_type, ...terms(form) })
                  .then((r) => setCalc(first(r)))
                  .catch((e) => notifications.error(e.message))
              }
            >
              {L("Calculate")}
            </Button>
            {calc && (
              <div className="mt-3">
                <Facts className="mb-2" rows={factsOfObject(L, calc)} />
                {(calc.notes ?? []).map((n) => (
                  <p key={n} className="text-xs text-muted-foreground">
                    {n}
                  </p>
                ))}
              </div>
            )}
          </div>
        );
      }}
    </OpDialog>
  );
}

function ContractView({ id, onBack }) {
  const L = useL();
  const [data, setData] = useState(null);
  const [late, setLate] = useState(null);
  const [settle, setSettle] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [tab, setTab] = useState("schedule");
  const reload = () =>
    contractApi
      .get({ id })
      .then((r) => setData(first(r)))
      .catch((e) => notifications.error(e.message));
  useEffect(() => {
    void reload();
    contractApi
      .late_charges({ id })
      .then((r) => setLate(first(r)))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  if (!data) return <PageSkeleton />;
  const c = data.contract ?? {};
  const a = data.actions ?? {};
  const close = () => setDialog(null);
  const done = () => (close(), reload());
  const buttons = [
    a.pay && { key: "pay", label: L("Pay instalments"), icon: Banknote, variant: "primary", run: () => setDialog("pay") },
    a.pay_charges && { key: "pay_charges", label: L("Pay late charges"), icon: HandCoins, run: () => act(contractApi.pay_charges, { id }, reload) },
    a.late_charges_run && { key: "late_run", label: L("Charge late charges"), icon: Play, run: () => act(contractApi.late_charges_run, { id }, reload) },
    a.rental_revision && { key: "rental", label: L("Revise rental"), icon: RefreshCcw, run: () => setDialog("rental") },
    a.mudaraba_settle && { key: "mudaraba", label: L("Settle Mudaraba"), icon: CheckCircle2, run: () => setDialog("mudaraba") },
    a.settle && {
      key: "settle",
      label: L("Early settlement"),
      icon: Ban,
      variant: "danger",
      run: () =>
        contractApi
          .settlement_quote({ id })
          .then((r) => setSettle(first(r)))
          .catch((e) => notifications.error(e.message)),
    },
    a.reject && { key: "deauth", label: L("reject"), icon: XCircle, variant: "danger", run: () => act(contractApi.deauth, { id }, reload) },
    a.approve && { key: "auth", label: L("approve"), icon: CheckCircle2, variant: "primary", run: () => act(contractApi.auth, { id }, reload) },
  ];
  return (
    <div className="pt-1 pb-6">
      <BackButton onClick={onBack}>
        <ArrowLeft size={15} /> {L("Back to contracts")}
      </BackButton>
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black">{c.contract_number}</h1>
              <Status code={c.status} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{[words(c.contract_type), c.product_code, c.currency_name, c.sharia_reference, c.inst_profile_name].filter(Boolean).join(" · ")}</p>
          </div>
          <ActionButtons buttons={buttons} />
        </div>
        <Facts
          className="mt-3"
          rows={[
            [L("outstanding"), c.outstanding],
            [L("paid_total"), c.paid_total],
            [L("paid_through"), c.paid_through],
            [L("sale_price"), c.schedule?.sale_price],
            [L("total_profit"), c.schedule?.total_profit],
            [L("instalment"), c.schedule?.instalment],
            [L("tawidh_due"), c.tawidh_due],
            [L("gharamah_due"), c.gharamah_due],
          ]}
        />
      </div>
      {settle && (
        <Section title={L("Early settlement quote")} className="mb-4">
          <Facts rows={factsOfObject(L, settle, ["contract_id"])} />
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSettle(null)}>
              {L("Close")}
            </Button>
            <Button size="sm" variant="danger" icon={Ban} onClick={() => act(contractApi.settle, { id }, () => (setSettle(null), reload()))}>
              {L("Settle now")}
            </Button>
          </div>
        </Section>
      )}
      <SegmentedSwitch className="mb-3" value={tab} onChange={setTab} options={["schedule", "transactions", "late charges", "asset", "terms"].map((v) => ({ value: v, label: L(v) }))} />
      <Section title={L(tab)}>
        {tab === "schedule" && <ScheduleRows rows={c.schedule?.rows} cols={[["instalment_number", "#"], ["due_date", L("due_date"), true], ["principal_due", L("principal_due")], ["profit_due", L("profit_due")], ["total_due", L("total_due")], ["outstanding_after", L("outstanding_after")]]} />}
        {tab === "transactions" && <RowsTable rows={data.transactions} columns={[{ key: "at", label: L("when"), render: (x) => dateCell(x.at) }, { key: "kind", label: L("kind"), render: (x) => words(x.kind) }, { key: "amount", label: L("amount"), numeric: true }, { key: "principal", label: L("principal"), numeric: true }, { key: "profit_or_rent", label: L("profit_or_rent"), numeric: true }, { key: "rrn", label: "RRN" }, { key: "actor", label: L("by") }]} />}
        {tab === "late charges" &&
          (late ? (
            <>
              <Facts className="mb-2" rows={[[L("tawidh"), late.tawidh], [L("gharamah_to_charity"), late.gharamah_to_charity]]} />
              <p className="mb-2 text-xs text-muted-foreground">{late.note}</p>
              <RowsTable rows={late.charges} empty={L("No late charges.")} columns={Object.keys(late.charges?.[0] ?? { charge: 1 }).map((k) => ({ key: k, label: L(k) }))} />
            </>
          ) : null)}
        {tab === "asset" && <Facts rows={factsOfObject(L, c.asset)} />}
        {tab === "terms" && <Facts rows={factsOfObject(L, c.terms)} />}
      </Section>
      {dialog === "pay" && <OpDialog title={L("Pay instalments")} fields={[{ key: "instalments", label: L("instalments"), type: "int", required: true }]} initial={{ instalments: "1" }} run={(x) => contractApi.pay({ id, instalments: Number(x.instalments) })} onClose={close} onDone={done} />}
      {dialog === "rental" && <OpDialog title={L("Revise rental")} fields={[{ key: "rental_amount", label: L("rental_amount"), type: "amount", required: true }]} run={(x) => contractApi.rental_revision({ id, rental_amount: x.rental_amount })} onClose={close} onDone={done} />}
      {dialog === "mudaraba" && <OpDialog title={L("Settle Mudaraba")} hint={L("The actual profit is shared by the agreed ratio.")} fields={[{ key: "actual_profit", label: L("actual_profit"), type: "amount", required: true }]} run={(x) => contractApi.mudaraba_settle({ id, actual_profit: x.actual_profit })} onClose={close} onDone={done} />}
    </div>
  );
}

export function IslamicFinancing() {
  const L = useL();
  const { t } = useTranslation("common");
  const can = usePagePermission();
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const list = useServerList({ api: contractApi.listPath, call: contractApi.list, enabled: !openId });
  if (!can("View")) return <NoAccess />;
  if (openId) return <ContractView id={openId} onBack={() => (setOpenId(null), list.reload())} />;
  return (
    <div className="pt-1 pb-6">
      {header(L, "islamicFinancing", "Islamic financing contracts: open with the asset, approve, pay, late charges, settlement with Ibra'.")}
      <ListTable
        list={list}
        rowKey={(r) => r.id}
        title={L("islamicFinancing")}
        emptyTitle={L("No contracts yet")}
        actions={
          can("Add") && (
            <Button size="sm" icon={Plus} onClick={() => setAdding(true)}>
              {L("Open a contract")}
            </Button>
          )
        }
        columns={[
          { key: "contract_number", label: L("contract"), align: "left", render: (r) => <button type="button" className="text-left text-xs font-bold text-primary hover:underline" onClick={() => setOpenId(r.id)}>{r.contract_number}<span className="block text-[10px] font-normal text-muted-foreground">{words(r.contract_type)}</span></button> },
          { key: "customer", label: L("customer"), render: (r) => cell(r.customer) },
          { key: "product_code", label: L("product"), render: (r) => cell(r.product_code) },
          { key: "financed", label: L("financed"), render: (r) => cell(`${r.financed} ${r.currency ?? ""}`) },
          { key: "outstanding", label: L("outstanding"), render: (r) => cell(r.outstanding) },
          { key: "paid", label: L("paid"), sortable: false, render: (r) => cell(`${r.paid_through}/${r.instalments}`) },
          { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
          { key: "actions", label: t("actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setOpenId(r.id)} /> },
        ]}
      />
      {adding && <ContractOpen onClose={() => setAdding(false)} onDone={() => (setAdding(false), list.reload())} />}
    </div>
  );
}

// ---------- Charity fund ----------

export function CharityFund() {
  const L = useL();
  const can = usePagePermission();
  const [fund, setFund] = useState(null);
  const [remitting, setRemitting] = useState(false);
  const list = useServerList({ api: charityApi.listPath, call: charityApi.list });
  const loadFund = () =>
    charityApi
      .fund({})
      .then((r) => setFund(first(r)?.items ?? []))
      .catch(() => setFund([]));
  useEffect(() => {
    void loadFund();
  }, []);
  if (!can("View")) return <NoAccess />;
  return (
    <div className="pt-1 pb-6">
      {header(L, "charityFund", "Gharamah collected from late payers, and what has been remitted to charities. It is never income.")}
      <Section title={L("Fund balance")} className="mb-4">
        <RowsTable rows={fund ?? []} empty={L("Nothing collected yet.")} columns={Object.keys(fund?.[0] ?? { currency: 1, balance: 1 }).map((k) => ({ key: k, label: L(k) }))} />
      </Section>
      <ListTable
        list={list}
        rowKey={(r) => r.id}
        title={L("Remittances")}
        emptyTitle={L("No remittances yet")}
        actions={
          can("Authorize") && (
            <Button size="sm" icon={HandCoins} onClick={() => setRemitting(true)}>
              {L("Remit to a charity")}
            </Button>
          )
        }
        columns={[
          { key: "beneficiary", label: L("beneficiary"), render: (r) => cell(r.beneficiary) },
          { key: "amount", label: L("amount"), render: (r) => cell(`${r.amount} ${r.currency ?? r.currency_name ?? ""}`) },
          { key: "remitted_at", label: L("when"), render: (r) => dateCell(r.remitted_at ?? r.created_time ?? r.at) },
          { key: "remitted_by", label: L("by"), render: (r) => cell(r.remitted_by ?? r.actor) },
          { key: "rrn", label: "RRN", render: (r) => cell(r.rrn) },
        ]}
      />
      {remitting && (
        <OpDialog
          title={L("Remit to a charity")}
          fields={[
            { key: "currency_id", label: L("currency"), type: "select", required: true, options: (fund ?? []).filter((x) => x.currency_id).map((x) => ({ value: String(x.currency_id), label: `${x.currency} · ${L("held")} ${x.held}` })) },
            { key: "amount", label: L("amount"), type: "amount", required: true },
            { key: "beneficiary", label: L("beneficiary"), required: true, wide: true },
          ]}
          run={(x) => charityApi.remit({ currency_id: Number(x.currency_id), amount: x.amount, beneficiary: x.beneficiary })}
          onClose={() => setRemitting(false)}
          onDone={() => (setRemitting(false), list.reload(), loadFund())}
        />
      )}
    </div>
  );
}

export function LoanReports() {
  return <CatalogueReports api={loanReportApi} title="loanReports" sub="Pick a loan report from the catalogue and run it." />;
}
