import { API_ENDPOINTS } from "@/Utils/Constant";
import { useEffect, useState } from "react";
import { ArrowLeft, Ban, Calculator, CheckCircle2, ClipboardCheck, FileSignature, Gavel, HandCoins, Lock, MailCheck, Package, PackageCheck, Play, Plus, RefreshCcw, ShieldAlert, ShieldCheck, Trash2, Truck, Undo2, XCircle } from "lucide-react";
import { BackButton } from "@/Components/Common/TextButtons";
import { Button } from "@/Components/Common/Button";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { ActionButtons, Facts, Section, inputClass, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { CatalogueReports } from "@/Components/InnoCBS/Deposits/DepositOps";
import { FacilityPick } from "@/Components/InnoCBS/Loans/LoanScreens";
import { Field, useInstitutionScope } from "@/Components/InnoCBS/Loans/loanShared";
import { OpDialog, RowsInput, RowsTable, byId, cell, codes, dateCell, first, pct, splitParty, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { OpsList, Status, isPending, runCall } from "@/Components/InnoCBS/OpsList";
import { usePagePermission } from "@/Hooks/usePermission";
import { recordApi } from "@/Services/api/recordApi";
import { calls, rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { downloadFile, uploadFile } from "@/Services/api/fileTransfer";

// InnoCBS > Gold Loan (Admin 23).
const G = API_ENDPOINTS.CBS_MODULES.GOLD;
const purityApi = recordApi(`${G}/purity`);
const ratePolicyApi = recordApi(`${G}/rate_policy`);
const rateApi = calls(`${G}/rate`, ["list", "add", "auth", "deauth", "status"]);
const productApi = recordApi(`${G}/product`);
const lockerApi = recordApi(`${G}/locker`);
const valuationApi = calls(`${G}/valuation`, ["list", "get", "quote", "add", "auth", "deauth", "acknowledge"]);
const loanApi = calls(`${G}/loan`, ["book"]);
const ornamentApi = calls(`${G}/ornament`, ["list"]);
const packetApi = calls(`${G}/packet`, ["list", "add", "verify"]);
const movementApi = calls(`${G}/movement`, ["list", "add", "auth", "deauth"]);
const accountApi = calls(`${G}/account`, ["list"]);
const dashboardApi = calls(G, ["dashboard"]);
const chargesApi = calls(`${G}/charges`, ["list"]);
const preclosureApi = calls(`${G}/preclosure`, ["quote", "settle"]);
const releaseApi = calls(`${G}/release`, ["list", "add", "auth", "deauth"]);
const holdApi = calls(`${G}/hold`, ["list", "get", "add", "resolve"]);
const noticeApi = calls(`${G}/notice`, ["list", "run", "delivery"]);
const revaluationApi = calls(`${G}/revaluation`, ["list", "run"]);
const auctionApi = calls(`${G}/auction`, ["list", "add", "auth", "deauth", "bid", "complete", "eligibility", "schedule", "surplus_refund"]);
const exceptionApi = calls(`${G}/exception`, ["list", "resolve"]);
const verificationApi = calls(`${G}/verification`, ["list", "add"]);
const goldReportApi = calls(`${G}/report`, ["catalogue", "run"]);

const goldOptionsApi = calls(G, ["options", "upload"]);
let goldOptions = null;
let goldOptionsLoad = null;
function useGoldOptions() {
  const [, bump] = useState(0);
  useEffect(() => {
    if (goldOptions) return;
    goldOptionsLoad ??= goldOptionsApi.options({}).then((r) => (goldOptions = first(r) ?? {}));
    goldOptionsLoad.then(() => bump((n) => n + 1)).catch(() => {});
  }, []);
}
const gl = (key, fallback = []) => (goldOptions?.[key] ?? fallback).map((v) => ({ value: v, label: words(v) }));

// Upload a file (photo, signature, proof) and keep its stored path.
function GoldUpload({ kind, value, onChange }) {
  const L = useL();
  useGoldOptions();
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      <input
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        className="text-xs"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          uploadFile(`${G}/upload`, { file, kind })
            .then((d) => onChange(d.path))
            .catch((err) => notifications.error(err.message))
            .finally(() => setBusy(false));
        }}
      />
      {value && (
        <button type="button" className="text-xs font-semibold text-primary underline" onClick={() => viewGoldFile(value)}>
          {L("View file")}
        </button>
      )}
    </div>
  );
}
const viewGoldFile = (path) =>
  downloadFile(`${G}/file`, { path })
    .then((blob) => window.open(URL.createObjectURL(blob), "_blank"))
    .catch((e) => notifications.error(e.message));
const uploadField = (L, key, kind, extra = {}) => ({ key, label: L(key), wide: true, render: (v, set) => <GoldUpload kind={kind} value={v} onChange={set} />, ...extra });

const useF = () => {
  const L = useL();
  useGoldOptions();
  return (key, type = "text", extra = {}) => ({ key, label: L(key), type, ...extra });
};
const toNum = (keys) => (x) => ({ ...x, ...Object.fromEntries(keys.filter((k) => k in x).map((k) => [k, x[k] === "" || x[k] == null ? 0 : Number(x[k])])) });
const grams = (v) => (v === "" || v == null ? "—" : `${v} g`);

// Active records of a master as choices.
function useActive(api, label = (r) => `${r.code} · ${r.name}`) {
  const [rows, setRows] = useState([]);
  const { scope, institution } = useInstitutionScope();
  useEffect(() => {
    api
      .active(scope({}))
      .then((r) => setRows(rowsOf(r).map((x) => ({ ...x, ...(x.setup ?? {}) }))))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, institution]);
  return rows.map((r) => ({ value: r.code, label: label(r), row: r }));
}

// A valuation, picked from the latest ones (number, customer).
function useValuations(filter, keep = () => true) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    valuationApi
      .list({ page: 1, limit: 100, ...(filter ? { filters: filter } : {}) })
      .then((r) => setRows(rowsOf(r)))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return rows.filter(keep).map((v) => ({ value: String(v.id), label: `${v.valuation_number} · ${v.customer ?? ""} · ${words(v.status)}` }));
}
const facilityInput = (L) => (form, setForm) => (
  <div className={`${labelClass} mb-3`}>
    {L("Facility")}
    <FacilityPick value={form.facility_id} onChange={(v) => setForm((x) => ({ ...x, facility_id: v }))} />
  </div>
);

// ---------- Settings ----------

export function PurityValuation() {
  const L = useL();
  useGoldOptions();
  const f = useF();
  return (
    <RecordScreen
      api={purityApi}
      title={L("Purity & Valuation")}
      subtitle={L("Purity master: karat, fineness and testing methods.")}
      effectiveDated
      columns={[
        { key: "karat", label: L("karat"), render: (r) => cell(sv(r, "karat")) },
        { key: "fineness", label: L("fineness"), render: (r) => cell(pct(sv(r, "fineness"))) },
        { key: "testing_methods", label: L("testing_methods"), sortable: false, render: (r) => cell((sv(r, "testing_methods") ?? []).join(", ")) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "22K" }),
        f("name", "text", { required: true }),
        f("karat", "amount", { required: true }),
        f("fineness", "percent", { required: true, hint: L("Pure gold share, e.g. 91.6 for 22K.") }),
        f("testing_methods", "multi", { options: codes("testing_methods") }),
        f("second_test_required", "bool"),
        f("effective_from", "date", { required: true }),
      ]}
    />
  );
}

// Today's rate slots, entries and the alert.
function RateStatus() {
  const L = useL();
  useGoldOptions();
  const [s, setS] = useState(null);
  useEffect(() => {
    rateApi
      .status({})
      .then((r) => setS(first(r)))
      .catch(() => {});
  }, []);
  if (!s) return null;
  return (
    <Section title={`${L("Today's rates")} · ${s.rate_date}`} className="mb-4">
      {s.alert && <p className="mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{s.alert}</p>}
      <Facts className="mb-3" rows={[[L("approved"), s.approved], [L("awaiting_approval"), s.awaiting_approval], [L("missing_slots"), (s.missing_slots ?? []).join(", ") || "—", (s.missing_slots ?? []).length ? "text-red-700" : undefined], [L("policy"), s.policy ? `${s.policy.code} · ${(s.policy.rate_times ?? []).join(", ")}` : "—"]]} />
      <RowsTable rows={s.entries} columns={[{ key: "rate_time", label: L("rate_time") }, { key: "purity_code", label: L("purity") }, { key: "rate_per_gram", label: L("rate_per_gram"), numeric: true }, { key: "lending_valuation_rate", label: L("lending_valuation_rate"), numeric: true }, { key: "entered_by", label: L("entered_by") }, { key: "approved_by", label: L("approved_by") }, { key: "status", label: L("status"), render: (x) => <Status code={x.status} /> }]} />
    </Section>
  );
}

function DailyRates() {
  const L = useL();
  useGoldOptions();
  const purities = useActive(purityApi);
  return (
    <OpsList
      api={rateApi}
      title="Daily rates"
      above={() => <RateStatus />}
      columns={[
        { key: "rate_date", label: L("rate_date"), render: (r) => dateCell(r.rate_date) },
        { key: "rate_time", label: L("rate_time"), render: (r) => cell(r.rate_time) },
        { key: "purity_code", label: L("purity"), render: (r) => cell(r.purity_code) },
        { key: "rate_per_gram", label: L("rate_per_gram"), render: (r) => cell(`${r.rate_per_gram} ${r.currency}`) },
        { key: "lending_valuation_rate", label: L("lending_valuation_rate"), render: (r) => cell(r.lending_valuation_rate) },
        { key: "entered_by", label: L("entered_by"), render: (r) => cell(r.entered_by) },
        { key: "approved_by", label: L("approved_by"), render: (r) => cell(r.approved_by) },
        { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
      ]}
      toolbar={[
        {
          key: "add",
          label: L("Enter a rate"),
          icon: Plus,
          right: "Add",
          dialog: {
            title: L("Enter a rate"),
            hint: L("A second user approves the rate."),
            fields: [
              { key: "purity_code", label: L("purity"), type: "select", required: true, options: purities },
              { key: "rate_time", label: L("rate_time"), required: true, placeholder: "14:00" },
              { key: "rate_per_gram", label: L("rate_per_gram"), type: "amount", required: true },
              { key: "currency", label: L("currency"), required: true, placeholder: "NGN" },
            ],
            run: (x) => rateApi.add(x),
          },
        },
      ]}
      rowActions={(r) => [
        { key: "auth", label: L("approve"), icon: CheckCircle2, right: "Authorize", show: isPending, call: rateApi.auth, body: { id: Number(r.id) } },
        { key: "deauth", label: L("reject"), icon: XCircle, right: "Authorize", show: isPending, call: rateApi.deauth, body: { id: Number(r.id) } },
      ]}
    />
  );
}

export function GoldRateManagement() {
  const L = useL();
  useGoldOptions();
  const f = useF();
  const [view, setView] = useState("rates");
  const switcher = <SegmentedSwitch className="mb-3" value={view} onChange={setView} options={[{ value: "rates", label: L("Daily rates") }, { value: "policy", label: L("Rate policy") }]} />;
  return (
    <>
      <div className="pt-1">{switcher}</div>
      {view === "rates" ? (
        <DailyRates />
      ) : (
        <RecordScreen
          api={ratePolicyApi}
          title={L("Gold Rate Management")}
          subtitle={L("How and when gold rates are entered, and what happens when one is missing.")}
          effectiveDated
          columns={[
            { key: "rate_basis", label: L("rate_basis"), render: (r) => cell(words(sv(r, "rate_basis"))) },
            { key: "rate_times", label: L("rate_times"), sortable: false, render: (r) => cell((sv(r, "rate_times") ?? []).join(", ")) },
            { key: "missing_rate_action", label: L("missing_rate_action"), render: (r) => cell(words(sv(r, "missing_rate_action"))) },
          ]}
          fields={[
            f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP_GOLD" }),
            f("name", "text", { required: true }),
            f("currency", "text", { required: true, placeholder: "NGN" }),
            f("rate_source", "select", { options: codes("rate_sources") }),
            f("rate_basis", "select", { required: true, options: codes("rate_bases") }),
            f("rate_unit", "select", { options: codes("rate_units") }),
            f("rate_entry_frequency", "select", { options: codes("frequencies") }),
            { key: "rate_times", label: L("rate_times"), type: "custom", from: (s) => (s.rate_times ?? []).join(", "), render: (v, set) => <input className={inputClass} placeholder="09:00, 14:00, 17:00" value={v ?? ""} onChange={(e) => set(e.target.value)} /> },
            f("valuation_rate_rule", "select", { options: codes("valuation_rate_rules") }),
            f("specific_rate_time", "text", { placeholder: "09:00", showIf: (x) => String(x.valuation_rate_rule).includes("SPECIFIC") }),
            f("missing_rate_action", "select", { options: codes("missing_rate_actions") }),
            f("fallback_rule", "select", { options: codes("fallback_rules") }),
            f("effective_from", "date", { required: true }),
          ]}
          bodyOf={(x) => ({ ...x, rate_times: String(x.rate_times ?? "").split(",").map((s) => s.trim()).filter(Boolean) })}
        />
      )}
    </>
  );
}

export function GoldLoanProducts() {
  const L = useL();
  useGoldOptions();
  const f = useF();
  return (
    <RecordScreen
      api={productApi}
      title={L("goldLoanProducts")}
      subtitle={L("The loan product used, LTV slabs, pre-closure, partial release, revaluation threshold and the auction timeline.")}
      effectiveDated
      columns={[
        { key: "maximum_ltv_percent", label: L("maximum_ltv_percent"), render: (r) => cell(pct(sv(r, "maximum_ltv_percent"))) },
        { key: "amount", label: L("Loan amount"), sortable: false, render: (r) => cell(`${sv(r, "minimum_loan_amount") || "—"}–${sv(r, "maximum_loan_amount") || "—"}`) },
        { key: "repayment_type", label: L("repayment_type"), render: (r) => cell(words(sv(r, "repayment_type"))) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP_GL01" }),
        f("name", "text", { required: true }),
        f("loan_product_id", "select", { required: true, options: byId("loan_products"), hint: L("Bookings become loan applications on this product.") }),
        f("repayment_type", "select", { options: codes("repayment_types") }),
        f("minimum_loan_amount", "amount"),
        f("maximum_loan_amount", "amount"),
        f("minimum_tenure_months", "int"),
        f("maximum_tenure_months", "int"),
        f("maximum_ltv_percent", "percent", { required: true }),
        {
          key: "ltv_slabs",
          label: L("ltv_slabs"),
          type: "custom",
          render: (v, set) => <RowsInput value={v} onChange={set} blank={() => ({ up_to_amount: "", ltv_percent: "" })} columns={[{ key: "up_to_amount", label: L("up_to_amount"), type: "amount" }, { key: "ltv_percent", label: L("ltv_percent"), type: "percent" }]} />,
        },
        f("revaluation_ltv_threshold", "percent"),
        f("valuation_max_age_days", "int"),
        f("packet_verification_max_age_days", "int"),
        f("grace_period_days", "int"),
        f("minimum_interest_days", "int"),
        f("partial_payment_allowed", "bool"),
        f("preclosure_allowed", "bool"),
        f("preclosure_lock_in_days", "int", { showIf: (x) => x.preclosure_allowed }),
        f("preclosure_charge_type", "select", { options: codes("preclosure_charge_types"), showIf: (x) => x.preclosure_allowed }),
        f("preclosure_charge_value", "amount", { showIf: (x) => x.preclosure_allowed && x.preclosure_charge_type !== "NONE" }),
        f("preclosure_interest_calculation", "select", { options: codes("preclosure_interest_calculations"), showIf: (x) => x.preclosure_allowed }),
        f("partial_release_allowed", "bool"),
        f("maximum_ltv_after_release", "percent", { showIf: (x) => x.partial_release_allowed }),
        f("minimum_remaining_collateral_value", "amount", { showIf: (x) => x.partial_release_allowed }),
        f("auction_applicable", "bool"),
        f("first_reminder_day", "int", { showIf: (x) => x.auction_applicable }),
        f("second_reminder_day", "int", { showIf: (x) => x.auction_applicable }),
        f("overdue_notice_day", "int", { showIf: (x) => x.auction_applicable }),
        f("demand_notice_day", "int", { showIf: (x) => x.auction_applicable }),
        f("final_notice_day", "int", { showIf: (x) => x.auction_applicable }),
        f("auction_review_day", "int", { showIf: (x) => x.auction_applicable }),
        f("minimum_auction_notice_days", "int", { showIf: (x) => x.auction_applicable }),
        f("reserve_price_percent", "percent", { showIf: (x) => x.auction_applicable }),
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={toNum(["loan_product_id", "minimum_tenure_months", "maximum_tenure_months", "valuation_max_age_days", "packet_verification_max_age_days", "grace_period_days", "minimum_interest_days", "preclosure_lock_in_days", "first_reminder_day", "second_reminder_day", "overdue_notice_day", "demand_notice_day", "final_notice_day", "auction_review_day", "minimum_auction_notice_days"])}
    />
  );
}

export function LockerManagement() {
  const L = useL();
  useGoldOptions();
  const f = useF();
  return (
    <RecordScreen
      api={lockerApi}
      title={L("lockerManagement")}
      subtitle={L("Vaults and safes holding the gold, each with two custodians and a capacity.")}
      effectiveDated
      columns={[
        { key: "locker_type", label: L("locker_type"), render: (r) => cell(words(sv(r, "locker_type"))) },
        { key: "location", label: L("location"), render: (r) => cell(sv(r, "location")) },
        { key: "capacity", label: L("capacity"), render: (r) => cell(sv(r, "capacity")) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP-LKR-01" }),
        f("name", "text", { required: true }),
        f("locker_number", "text", { required: true }),
        f("locker_type", "select", { required: true, options: codes("locker_types") }),
        f("location", "text", { wide: true }),
        f("branch_id", "select", { label: L("branch"), blank: L("Head office"), options: (c) => (c.branches ?? []).map((b) => ({ value: String(b.id), label: `${b.code} · ${b.name}` })) }),
        f("capacity", "int", { required: true }),
        f("custodian1_userid", "select", { required: true, label: L("First custodian"), options: (c) => (c.custodians ?? []).map((u) => ({ value: String(u.id), label: u.user_name })) }),
        f("custodian2_userid", "select", { required: true, label: L("Second custodian"), options: (c) => (c.custodians ?? []).map((u) => ({ value: String(u.id), label: u.user_name })) }),
        f("last_inspection_date", "date"),
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={toNum(["branch_id", "capacity", "custodian1_userid", "custodian2_userid"])}
    />
  );
}

// ---------- New gold loan ----------

const ORNAMENT_BLANK = () => ({ category: "", condition: "", description: "", gross_weight: "", stone_weight: "", other_weight: "", purity_code: "", testing_method: "", photos: [] });

function ValuationNew({ onClose, onDone, previous }) {
  const L = useL();
  useGoldOptions();
  const products = useActive(productApi);
  const purities = useActive(purityApi);
  const [quote, setQuote] = useState(null);
  const methods = [...new Set(purities.flatMap((p) => p.row.testing_methods ?? []))].map((m) => ({ value: m, label: m }));
  const body = (x) => ({ product_code: x.product_code, ...splitParty(x.party), ornaments: (x.ornaments ?? []).map((o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && !(Array.isArray(v) && !v.length)))) });
  return (
    <OpDialog
      size="lg"
      title={previous ? `${L("Revise valuation")} · ${previous.valuation_number}` : L("New valuation")}
      hint={L("Weigh and test each ornament. An independent appraiser (another user) approves the valuation.")}
      fields={[
        { key: "product_code", label: L("product"), type: "select", required: true, options: products },
        { key: "party", label: L("Customer"), type: "party", required: true },
        { key: "requested_amount", label: L("requested_amount"), type: "amount" },
      ]}
      initial={
        previous
          ? {
              product_code: previous.product_code,
              party: `${previous.entity_type}:${previous.entity_id}`,
              requested_amount: previous.requested_amount ?? "",
              ornaments: (previous.ornaments ?? []).map((o) => ({ category: o.category, condition: o.condition, description: o.description, gross_weight: o.gross_weight, stone_weight: o.stone_weight, other_weight: o.other_weight, purity_code: o.purity_code, testing_method: o.testing_method, photos: o.photos ?? [] })),
            }
          : { ornaments: [ORNAMENT_BLANK()] }
      }
      needs={(x) => (x.ornaments ?? []).length && x.ornaments.every((o) => o.gross_weight && o.purity_code)}
      confirmLabel={L("Save for approval")}
      run={(x) => valuationApi.add({ ...body(x), requested_amount: x.requested_amount, ...(previous ? { previous_id: previous.id } : {}) })}
      onClose={onClose}
      onDone={onDone}
    >
      {(form, setForm) => (
        <div className="mb-3">
          <div className={labelClass}>
            {L("Ornaments")}
            <RowsInput
              value={form.ornaments}
              onChange={(v) => setForm((x) => ({ ...x, ornaments: v }))}
              blank={ORNAMENT_BLANK}
              addLabel={L("Add ornament")}
              columns={[
                { key: "category", label: L("category"), type: "select", options: gl("ornament_categories", ["CHAIN"]) },
                { key: "condition", label: L("condition"), type: "select", options: gl("ornament_conditions", ["GOOD"]) },
                { key: "description", label: L("description") },
                { key: "purity_code", label: L("purity"), type: "select", options: purities },
                { key: "testing_method", label: L("testing_method"), type: "select", options: methods },
                { key: "gross_weight", label: L("gross_weight"), type: "amount" },
                { key: "stone_weight", label: L("stone_weight"), type: "amount" },
                { key: "other_weight", label: L("other_weight"), type: "amount" },
                {
                  key: "photos",
                  label: L("Photos"),
                  render: (v, set) => (
                    <div>
                      <GoldUpload kind="ORNAMENT_PHOTO" value="" onChange={(p) => set([...(v ?? []), p])} />
                      {(v ?? []).map((p) => (
                        <span key={p} className="mr-2 inline-flex items-center gap-1 text-[11px]">
                          <button type="button" className="text-primary underline" onClick={() => viewGoldFile(p)}>
                            {p.split("/").pop()}
                          </button>
                          <button type="button" aria-label={L("remove")} className="text-red-600" onClick={() => set((v ?? []).filter((x) => x !== p))}>
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  ),
                },
              ]}
            />
          </div>
          <Button
            className="mt-2"
            size="sm"
            variant="secondary"
            icon={Calculator}
            disabled={!form.product_code || !form.party}
            disabledReason={L("Pick the product and customer.")}
            onClick={() =>
              valuationApi
                .quote(body(form))
                .then((r) => setQuote(first(r)))
                .catch((e) => notifications.error(e.message))
            }
          >
            {L("Quote")}
          </Button>
          {quote && <ValuationTotals v={quote} />}
        </div>
      )}
    </OpDialog>
  );
}

function ValuationTotals({ v }) {
  const L = useL();
  useGoldOptions();
  return (
    <div className="mt-3">
      <Facts
        className="mb-3"
        rows={[
          [L("total_gross_weight"), grams(v.total_gross_weight)],
          [L("total_net_weight"), grams(v.total_net_weight)],
          [L("total_fine_weight"), grams(v.total_fine_weight)],
          [L("total_gold_value"), v.total_gold_value],
          [L("applicable_ltv"), pct(v.applicable_ltv)],
          [L("maximum_eligible_loan"), v.maximum_eligible_loan],
          v.requested_amount && [L("requested_amount"), v.requested_amount],
          v.requested_minus_eligible && [L("requested_minus_eligible"), v.requested_minus_eligible, "text-red-700"],
        ]}
      />
      <RowsTable
        rows={v.ornaments}
        columns={[
          { key: "ornament_ref", label: L("ref"), render: (o) => o.ornament_ref || "—" },
          { key: "description", label: L("description"), render: (o) => `${words(o.category)} · ${o.description}` },
          { key: "purity_code", label: L("purity") },
          { key: "net_weight", label: L("net_weight"), numeric: true },
          { key: "fine_weight", label: L("fine_weight"), numeric: true },
          { key: "rate_applied", label: L("rate_applied"), numeric: true },
          { key: "gold_value", label: L("gold_value"), numeric: true },
          { key: "eligible_value", label: L("eligible_value"), numeric: true },
          { key: "status", label: L("status"), render: (o) => <Status code={o.status} /> },
        ]}
      />
      {(v.notes ?? []).map((n) => (
        <p key={n} className="mt-2 text-xs text-muted-foreground">{n}</p>
      ))}
    </div>
  );
}

function ValuationView({ id, onBack }) {
  const L = useL();
  useGoldOptions();
  const [v, setV] = useState(null);
  const [dialog, setDialog] = useState(null);
  const reload = () =>
    valuationApi
      .get({ id })
      .then((r) => setV(first(r)))
      .catch((e) => notifications.error(e.message));
  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  if (!v) return <PageSkeleton />;
  const a = v.actions ?? {};
  const close = () => setDialog(null);
  const done = () => (close(), reload());
  const buttons = [
    a.deauth && { key: "deauth", label: L("reject"), icon: XCircle, variant: "danger", run: () => runCall(valuationApi.deauth, { id }, reload) },
    a.auth && { key: "auth", label: L("Approve valuation"), icon: CheckCircle2, variant: "primary", run: () => runCall(valuationApi.auth, { id }, reload) },
    a.acknowledge && { key: "ack", label: L("Customer acknowledges"), icon: FileSignature, run: () => setDialog("ack") },
    a.book && { key: "book", label: L("Book the loan"), icon: HandCoins, variant: "primary", run: () => setDialog("book") },
    a.pack && { key: "pack", label: L("Pack and seal"), icon: Package, run: () => setDialog("pack") },
    a.release && { key: "release", label: L("Request a release"), icon: Undo2, run: () => setDialog("release") },
    a.revise && { key: "revise", label: L("Revise"), icon: RefreshCcw, run: () => setDialog("revise") },
  ];
  return (
    <div className="pt-1 pb-6">
      <BackButton onClick={onBack}>
        <ArrowLeft size={15} /> {L("Back to valuations")}
      </BackButton>
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black">{v.valuation_number}</h1>
              <Status code={v.status} />
              {v.customer_acknowledged && <Status code="ACKNOWLEDGED" />}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{[v.product_code, `${words(v.entity_type)} #${v.entity_id}`, v.appraised_by && `${L("appraised_by")} ${v.appraised_by}`, v.approved_by && `${L("approved_by")} ${v.approved_by}`, v.loan_application_id && `${L("Application")} #${v.loan_application_id}`, v.facility_id && `${L("Facility")} #${v.facility_id}`].filter(Boolean).join(" · ")}</p>
          </div>
          <ActionButtons buttons={buttons} />
        </div>
      </div>
      <Section title={L("Valuation")} className="mb-4">
        <ValuationTotals v={v} />
      </Section>
      <Section title={L("Rates used")}>
        <RowsTable rows={v.rate_snapshot} columns={[{ key: "purity_code", label: L("purity") }, { key: "rate_per_gram", label: L("rate_per_gram"), numeric: true }, { key: "rate_date", label: L("rate_date"), render: (x) => `${x.rate_date} ${x.rate_time}` }, { key: "rule", label: L("rule"), render: (x) => `${words(x.rule)}${x.fallback ? " · fallback" : ""}${x.exception ? " · exception" : ""}` }]} />
      </Section>
      {dialog === "ack" && <OpDialog title={L("Customer acknowledges")} hint={L("The customer accepted the inventory and value.")} fields={[{ key: "acknowledgement_method", label: L("acknowledgement_method"), type: "select", required: true, options: gl("acknowledgement_methods", ["SIGNED_INVENTORY"]) }]} initial={{ acknowledgement_method: "SIGNED_INVENTORY" }} run={(x) => valuationApi.acknowledge({ id, ...x })} onClose={close} onDone={done} />}
      {dialog === "revise" && <ValuationNew previous={v} onClose={close} onDone={done} />}
      {dialog === "pack" && (
        <OpDialog
          title={L("Pack and seal")}
          fields={[
            { key: "packet_number", label: L("packet_number"), required: true, placeholder: "AP-PKT-0003" },
            { key: "seal_number", label: L("seal_number"), required: true, placeholder: "AP-SEAL-10023" },
            uploadField(L, "photo", "PACKET_PHOTO"),
          ]}
          run={(x) => packetApi.add({ valuation_id: id, ...x })}
          onClose={close}
          onDone={done}
        />
      )}
      {dialog === "release" && (
        <OpDialog
          title={L("Request a release")}
          hint={L("None picked releases everything (after settlement). The LTV after a partial release is checked.")}
          fields={[]}
          initial={{ ornament_ids: [] }}
          run={(x) => releaseApi.add({ valuation_id: id, ...(x.ornament_ids?.length ? { ornament_ids: x.ornament_ids.map(Number) } : {}) })}
          onClose={close}
          onDone={done}
        >
          {(form, setForm) => <ReleaseOrnaments valuationId={id} value={form.ornament_ids} onChange={(val) => setForm((x) => ({ ...x, ornament_ids: val }))} />}
        </OpDialog>
      )}
      {dialog === "book" && (
        <OpDialog
          title={L("Book the loan")}
          hint={L("Creates the loan application; the normal loan approval follows. Disbursement waits until the gold is in a locker.")}
          fields={[
            { key: "amount", label: L("amount"), type: "amount", required: true, hint: `${L("maximum_eligible_loan")}: ${v.maximum_eligible_loan}` },
            { key: "term_id", label: L("term"), type: "select", required: true, options: (v.booking?.terms ?? []).map((t0) => ({ value: String(t0.id), label: `${t0.term_code} · ${t0.term_value} ${words(t0.term_unit)}${Number(t0.maximum_amount) ? ` · ≤ ${t0.maximum_amount}` : ""}` })) },
            { key: "disbursement_acct_id", label: L("Disbursement account"), type: "acct", required: true, owner: () => (v.booking ? { owner_type: v.booking.owner_type, owner_id: v.booking.owner_id } : null) },
            { key: "purpose_code", label: L("purpose_code"), required: true, placeholder: "WORKING_CAPITAL" },
            { key: "monthly_income", label: L("monthly_income"), type: "amount" },
          ]}
          run={(x) => loanApi.book({ valuation_id: id, amount: x.amount, term_id: Number(x.term_id), disbursement_acct_id: Number(x.disbursement_acct_id), purpose_code: x.purpose_code, monthly_income: x.monthly_income })}
          onClose={close}
          onDone={done}
        />
      )}
    </div>
  );
}

export function NewGoldLoanApplication() {
  const L = useL();
  useGoldOptions();
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [key, setKey] = useState(0);
  if (openId) return <ValuationView id={openId} onBack={() => setOpenId(null)} />;
  return (
    <>
      <OpsList
        key={key}
        api={valuationApi}
        title="newGoldLoanApplication"
        sub="Value each ornament, an independent appraiser approves, the customer acknowledges, then the loan is booked."
        columns={[
          { key: "valuation_number", label: L("valuation"), align: "left", render: (r) => <button type="button" className="text-left text-xs font-bold text-primary hover:underline" onClick={() => setOpenId(Number(r.id))}>{r.valuation_number}<span className="block text-[10px] font-normal text-muted-foreground">{r.customer}</span></button> },
          { key: "product_code", label: L("product"), render: (r) => cell(r.product_code) },
          { key: "net_weight", label: L("net_weight"), render: (r) => cell(grams(r.net_weight)) },
          { key: "gold_value", label: L("gold_value"), render: (r) => cell(r.gold_value) },
          { key: "maximum_eligible_loan", label: L("maximum_eligible_loan"), render: (r) => cell(`${r.maximum_eligible_loan} · ${pct(r.ltv)}`) },
          { key: "requested_amount", label: L("requested_amount"), render: (r) => cell(r.requested_amount) },
          { key: "facility_number", label: L("Facility"), render: (r) => cell(r.facility_number) },
          { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
        ]}
        toolbar={[{ key: "new", label: L("New valuation"), icon: Plus, right: "Add", onPress: () => setAdding(true) }]}
      />
      {adding && <ValuationNew onClose={() => setAdding(false)} onDone={() => (setAdding(false), setKey((k) => k + 1))} />}
    </>
  );
}

// ---------- Inventory, packets, movements ----------

export function GoldOrnamentInventory() {
  const L = useL();
  useGoldOptions();
  return (
    <OpsList
      api={ornamentApi}
      title="goldOrnamentInventory"
      sub="Every pledged ornament, its weights, value and packet."
      columns={[
        { key: "ornament_ref", label: L("ref"), render: (r) => <span className="font-mono text-xs font-bold">{r.ornament_ref}</span> },
        { key: "description", label: L("description"), align: "left", render: (r) => cell(`${words(r.category)} · ${r.description}`) },
        { key: "customer", label: L("customer"), render: (r) => cell(r.customer) },
        { key: "purity_code", label: L("purity"), render: (r) => cell(r.purity_code) },
        { key: "weights", label: L("Gross / net / fine"), sortable: false, render: (r) => cell(`${r.gross_weight} / ${r.net_weight} / ${r.fine_weight} g`) },
        { key: "gold_value", label: L("gold_value"), render: (r) => cell(r.gold_value) },
        { key: "packet_number", label: L("packet"), render: (r) => cell(r.packet_number) },
        { key: "valuation_number", label: L("valuation"), render: (r) => cell(r.valuation_number) },
        { key: "ornament_status", label: L("status"), render: (r) => <Status code={r.ornament_status} /> },
      ]}
    />
  );
}

export function PacketManagement() {
  const L = useL();
  useGoldOptions();
  const valuations = useValuations(null, (v) => v.actions?.pack);
  return (
    <OpsList
      api={packetApi}
      title="packetManagement"
      sub="Ornaments packed under a seal; a second employee verifies the seal."
      columns={[
        { key: "packet_number", label: L("packet"), render: (r) => <span className="font-mono text-xs font-bold">{r.packet_number}</span> },
        { key: "seal_number", label: L("seal_number"), render: (r) => cell(r.seal_number) },
        { key: "valuation_number", label: L("valuation"), render: (r) => cell(r.valuation_number) },
        { key: "facility_number", label: L("Facility"), render: (r) => cell(r.facility_number) },
        { key: "ornaments", label: L("Ornaments"), render: (r) => cell(r.ornaments) },
        { key: "locker_code", label: L("locker"), render: (r) => cell(r.locker_code) },
        { key: "packed_by", label: L("packed_by"), render: (r) => cell(r.packed_by) },
        { key: "verified_by", label: L("verified_by"), render: (r) => cell(r.verified_by ? `${r.verified_by} · ${r.last_verified}` : "—") },
        { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
      ]}
      toolbar={[
        {
          key: "add",
          label: L("Pack and seal"),
          icon: Package,
          right: "Add",
          dialog: {
            title: L("Pack and seal"),
            fields: [
              { key: "valuation_id", label: L("valuation"), type: "select", required: true, options: valuations },
              { key: "packet_number", label: L("packet_number"), required: true, placeholder: "AP-PKT-0003" },
              { key: "seal_number", label: L("seal_number"), required: true, placeholder: "AP-SEAL-10023" },
              uploadField(L, "photo", "PACKET_PHOTO"),
            ],
            run: (x) => packetApi.add({ ...x, valuation_id: Number(x.valuation_id) }),
          },
        },
      ]}
      rowActions={(r) => [
        {
          key: "verify",
          label: L("Verify seal"),
          icon: ShieldCheck,
          right: "Authorize",
          show: (x) => !x.verified_by,
          dialog: { title: `${L("Verify seal")} · ${r.packet_number}`, hint: L("Another employee checks the seal."), fields: [{ key: "seal_condition", label: L("seal_condition"), type: "select", required: true, options: gl("seal_conditions", ["INTACT", "DAMAGED", "BROKEN", "REPLACED"]) }], run: (x) => packetApi.verify({ id: Number(r.id), ...x }) },
        },
      ]}
    />
  );
}

export function PacketMovement() {
  const L = useL();
  useGoldOptions();
  const lockers = useActive(lockerApi);
  const [packets, setPackets] = useState([]);
  useEffect(() => {
    packetApi
      .list({ page: 1, page_size: 100 })
      .then((r) => setPackets(rowsOf(r).map((p) => ({ value: String(p.id), label: `${p.packet_number} · ${p.locker_code || words(p.status)}` }))))
      .catch(() => {});
  }, []);
  return (
    <OpsList
      api={movementApi}
      title="packetMovement"
      sub="Packets deposited, withdrawn or transferred between lockers; a second employee approves."
      columns={[
        { key: "created_time", label: L("when"), render: (r) => dateCell(r.created_time) },
        { key: "packet_number", label: L("packet"), render: (r) => <span className="font-mono text-xs">{r.packet_number}</span> },
        { key: "kind", label: L("kind"), render: (r) => cell(words(r.kind)) },
        { key: "route", label: L("From → to"), sortable: false, render: (r) => cell(`${r.from_location || "—"} → ${r.to_location || "—"}`) },
        { key: "reason", label: L("reason"), render: (r) => cell(r.reason) },
        { key: "seal_condition", label: L("seal_condition"), render: (r) => cell(words(r.seal_condition)) },
        { key: "initiated_by", label: L("initiated_by"), render: (r) => cell(r.initiated_by) },
        { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
      ]}
      toolbar={[
        {
          key: "add",
          label: L("Move a packet"),
          icon: Truck,
          right: "Add",
          dialog: {
            title: L("Move a packet"),
            hint: L("Another employee approves the movement."),
            fields: [
              { key: "packet_id", label: L("packet"), type: "select", required: true, options: packets },
              { key: "kind", label: L("kind"), type: "select", required: true, options: gl("movement_kinds", ["DEPOSIT"]) },
              { key: "to_locker_code", label: L("To locker"), type: "select", options: lockers, showIf: (x) => ["DEPOSIT", "RETURN_TO_LOCKER", "TRANSFER_LOCKER", "TRANSFER_BRANCH", "RECEIVE_BRANCH"].includes(x.kind) },
              { key: "seal_condition", label: L("seal_condition"), type: "select", required: true, options: gl("seal_conditions", ["INTACT", "DAMAGED", "BROKEN", "REPLACED"]) },
              { key: "reason", label: L("reason"), required: true, wide: true },
              uploadField(L, "evidence", "MOVEMENT_EVIDENCE"),
            ],
            initial: { kind: "DEPOSIT", seal_condition: "INTACT" },
            run: (x) => movementApi.add({ ...x, packet_id: Number(x.packet_id) }),
          },
        },
      ]}
      rowActions={(r) => [
        { key: "auth", label: L("approve"), icon: CheckCircle2, right: "Authorize", show: isPending, call: movementApi.auth, body: { id: Number(r.id) } },
        { key: "deauth", label: L("reject"), icon: XCircle, right: "Authorize", show: isPending, call: movementApi.deauth, body: { id: Number(r.id) } },
      ]}
    />
  );
}

// ---------- Accounts, charges, pre-closure ----------

function GoldDashboard() {
  const L = useL();
  useGoldOptions();
  const [d, setD] = useState(null);
  useEffect(() => {
    dashboardApi
      .dashboard({})
      .then((r) => setD(first(r)))
      .catch(() => {});
  }, []);
  if (!d) return null;
  const warn = (n) => (Number(n) > 0 ? "text-red-700" : undefined);
  return (
    <Facts
      className="mb-4"
      rows={[
        [L("active_gold_loans"), d.active_gold_loans],
        [L("principal_outstanding"), d.principal_outstanding],
        [L("gold_held_grams"), grams(d.gold_held_grams)],
        [L("overdue_accounts"), d.overdue_accounts, warn(d.overdue_accounts)],
        [L("maturing_7_days"), d.maturing_7_days],
        [L("maturing_30_days"), d.maturing_30_days],
        [L("packets_awaiting_locker_deposit"), d.packets_awaiting_locker_deposit, warn(d.packets_awaiting_locker_deposit)],
        [L("packets_awaiting_release"), d.packets_awaiting_release],
        [L("packets_not_verified_30_days"), d.packets_not_verified_30_days, warn(d.packets_not_verified_30_days)],
        [L("custody_exceptions"), d.custody_exceptions, warn(d.custody_exceptions)],
        [L("auctions_awaiting_approval"), d.auctions_awaiting_approval],
        [L("surplus_pending_refund"), `${d.surplus_pending_refund} · ${d.surplus_pending_amount}`],
        [L("Today's rates"), `${d.todays_rate_status?.approved ?? 0} ${L("approved")} · ${d.todays_rate_status?.awaiting_approval ?? 0} ${L("waiting")}${(d.todays_rate_status?.missing_slots ?? []).length ? ` · ${L("missing")} ${d.todays_rate_status.missing_slots.join(", ")}` : ""}`, (d.todays_rate_status?.missing_slots ?? []).length ? "text-red-700" : undefined],
      ]}
    />
  );
}

export function GoldLoanAccounts() {
  const L = useL();
  useGoldOptions();
  return (
    <OpsList
      api={accountApi}
      title="goldLoanAccounts"
      sub="Gold loan facilities with their gold, LTV and dues."
      above={() => <GoldDashboard />}
      rowKey={(r) => r.facility_id}
      columns={[
        { key: "facility_number", label: L("Facility"), align: "left", render: (r) => <span className="text-xs"><b>{r.facility_number}</b><span className="block text-[10px] text-muted-foreground">{r.customer}</span></span> },
        { key: "disbursed", label: L("disbursed"), render: (r) => cell(r.disbursed) },
        { key: "principal_outstanding", label: L("principal_outstanding"), render: (r) => cell(r.principal_outstanding) },
        { key: "interest_accrued", label: L("interest_accrued"), render: (r) => cell(r.interest_accrued) },
        { key: "gold_value", label: L("gold_value"), render: (r) => cell(r.gold_value) },
        { key: "ltv", label: "LTV", render: (r) => cell(pct(r.ltv)) },
        { key: "annual_rate", label: L("annual_rate"), render: (r) => cell(pct(r.annual_rate)) },
        { key: "days_past_due", label: "DPD", render: (r) => <span className={`text-xs ${Number(r.days_past_due) > 0 ? "font-bold text-red-700" : ""}`}>{r.days_past_due}</span> },
        { key: "maturity_date", label: L("maturity_date"), render: (r) => dateCell(r.maturity_date) },
        { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
      ]}
    />
  );
}

export function GoldInterestCharges() {
  const L = useL();
  useGoldOptions();
  return (
    <OpsList
      api={chargesApi}
      title="Interest & Charges"
      sub="Interest and charges of gold loans."
      columns={[
        { key: "facility_number", label: L("Facility"), render: (r) => cell(r.facility_number ?? r.facility_id) },
        { key: "customer", label: L("customer"), render: (r) => cell(r.customer) },
        { key: "kind", label: L("kind"), render: (r) => cell(words(r.kind ?? r.charge_type)) },
        { key: "amount", label: L("amount"), render: (r) => cell(r.amount) },
        { key: "date", label: L("date"), render: (r) => dateCell(r.date ?? r.created_time) },
        { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
      ]}
    />
  );
}

export function GoldPreclosure() {
  const L = useL();
  useGoldOptions();
  const can = usePagePermission();
  const [facility, setFacility] = useState("");
  const [q, setQ] = useState(null);
  const [settling, setSettling] = useState(false);
  const quote = () =>
    preclosureApi
      .quote({ facility_id: Number(facility) })
      .then((r) => setQ(first(r)))
      .catch((e) => notifications.error(e.message));
  return (
    <div className="pt-1 pb-6">
      <h1 className="text-2xl font-black">{L("Repayment & Pre-closure")}</h1>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">{L("Quote what closes a gold loan today, then settle it.")}</p>
      <Section title={L("Facility")} className="mb-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className={`${labelClass} min-w-72`}>
            {L("Facility")}
            <FacilityPick value={facility} onChange={(v) => (setFacility(v), setQ(null))} />
          </div>
          <Button size="sm" icon={Calculator} disabled={!facility} disabledReason={L("Pick a facility.")} onClick={quote}>
            {L("Quote")}
          </Button>
        </div>
      </Section>
      {q && (
        <Section
          title={`${L("Pre-closure quote")} · ${q.facility_number}`}
          action={
            can("Authorize") && (
              <Button size="sm" variant="danger" icon={Ban} disabled={!q.preclosure_allowed} disabledReason={L("The product does not allow pre-closure now.")} onClick={() => setSettling(true)}>
                {L("Settle")}
              </Button>
            )
          }
        >
          <Facts className="mb-3" rows={[[L("amount_to_close"), q.amount_to_close], [L("preclosure_charge"), q.preclosure_charge], [L("days_held"), q.days_held], [L("preclosure_allowed"), q.preclosure_allowed ? "✓" : "✕"]]} />
          <Facts rows={Object.entries(q.settlement ?? {}).map(([k, v]) => [L(k), typeof v === "boolean" ? (v ? "✓" : "—") : String(v)])} />
        </Section>
      )}
      {settling && (
        <OpDialog
          title={L("Settle")}
          hint={L("Closes the loan; the gold can then be released.")}
          fields={[
            { key: "source", label: L("source"), type: "select", required: true, options: gl("settle_sources", ["WALLET", "CASH", "TILL"]) },
            { key: "narration", label: L("narration"), wide: true },
          ]}
          initial={{ source: "WALLET" }}
          run={(x) => preclosureApi.settle({ facility_id: Number(facility), settle: x })}
          onClose={() => setSettling(false)}
          onDone={() => (setSettling(false), quote())}
        />
      )}
    </div>
  );
}

// ---------- Release ----------

function ReleaseOrnaments({ valuationId, value, onChange }) {
  const L = useL();
  useGoldOptions();
  const [orn, setOrn] = useState([]);
  useEffect(() => {
    if (!valuationId) return;
    valuationApi
      .get({ id: Number(valuationId) })
      .then((r) => setOrn((first(r)?.ornaments ?? []).filter((o) => o.status === "PLEDGED")))
      .catch(() => {});
  }, [valuationId]);
  if (!valuationId) return null;
  return (
    <div className={`${labelClass} mb-3`}>
      {L("Ornaments to release")}
      <span className="mb-1 block text-[11px] font-normal text-muted-foreground">{L("None picked releases everything (after settlement).")}</span>
      <Field field={{ type: "multi", options: orn.map((o) => ({ value: o.id, label: `${o.ornament_ref} · ${o.description} · ${o.net_weight} g` })) }} value={value ?? []} onChange={onChange} />
    </div>
  );
}

export function GoldRelease() {
  const L = useL();
  useGoldOptions();
  const valuations = useValuations({ open_packet: true });
  return (
    <OpsList
      api={releaseApi}
      title="goldRelease"
      sub="Full or partial release of the gold with handover evidence; a second user approves."
      columns={[
        { key: "valuation_number", label: L("valuation"), render: (r) => cell(r.valuation_number ?? r.valuation_id) },
        { key: "customer", label: L("customer"), render: (r) => cell(r.customer) },
        { key: "kind", label: L("kind"), render: (r) => cell(words(r.kind ?? (r.ornament_ids?.length ? "PARTIAL" : "FULL"))) },
        { key: "ornaments", label: L("Ornaments"), render: (r) => cell(Array.isArray(r.ornament_ids) ? r.ornament_ids.length : r.ornaments) },
        { key: "ltv_after", label: L("LTV after"), render: (r) => cell(r.ltv_after ? pct(r.ltv_after) : "—") },
        { key: "requested_by", label: L("requested_by"), render: (r) => cell(r.requested_by) },
        { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
      ]}
      toolbar={[
        {
          key: "add",
          label: L("Request a release"),
          icon: Undo2,
          right: "Add",
          dialog: {
            title: L("Request a release"),
            hint: L("The LTV after a partial release is checked."),
            fields: [{ key: "valuation_id", label: L("valuation"), type: "select", required: true, options: valuations }],
            initial: { ornament_ids: [] },
            children: (form, setForm) => <ReleaseOrnaments valuationId={form.valuation_id} value={form.ornament_ids} onChange={(v) => setForm((x) => ({ ...x, ornament_ids: v }))} />,
            run: (x) => releaseApi.add({ valuation_id: Number(x.valuation_id), ...(x.ornament_ids?.length ? { ornament_ids: x.ornament_ids.map(Number) } : {}) }),
          },
        },
      ]}
      rowActions={(r) => [
        {
          key: "auth",
          label: L("Hand over"),
          icon: PackageCheck,
          right: "Authorize",
          show: isPending,
          dialog: {
            title: L("Hand over the gold"),
            hint: L("Record the handover evidence; this approves the release."),
            fields: [
              { key: "identity_verification", label: L("identity_verification"), required: true, placeholder: "NIN card" },
              { key: "packet_condition", label: L("packet_condition"), type: "select", required: true, options: gl("packet_conditions", ["INTACT", "DAMAGED", "BROKEN", "REPLACED"]) },
              uploadField(L, "customer_signature", "CUSTOMER_SIGNATURE"),
              { key: "new_seal", label: L("new_seal_number"), hint: L("When the packet is resealed (REPLACED)."), showIf: (x) => x.packet_condition === "REPLACED" },
            ],
            initial: { packet_condition: "INTACT" },
            run: (x) => releaseApi.auth({ id: Number(r.id), handover: x }),
          },
        },
        { key: "deauth", label: L("reject"), icon: XCircle, right: "Authorize", show: isPending, call: releaseApi.deauth, body: { id: Number(r.id) } },
      ]}
    />
  );
}

// ---------- Overdue ----------

export function OverdueManagement() {
  const L = useL();
  useGoldOptions();
  const can = usePagePermission();
  const [tab, setTab] = useState("notices");
  const [hold, setHold] = useState(null);
  const holdDialog = (
    <>
      {can("Add") && (
        <Button size="sm" variant="secondary" icon={ShieldAlert} onClick={() => setHold("add")}>
          {L("Place a hold")}
        </Button>
      )}
    </>
  );
  return (
    <div className="pt-1">
      <h1 className="text-2xl font-black">{L("overdueManagement")}</h1>
      <p className="mt-1 mb-3 text-sm text-muted-foreground">{L("Overdue notices and their delivery, holds that stop an auction, and revaluation at today's rates.")}</p>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <SegmentedSwitch value={tab} onChange={setTab} options={[{ value: "notices", label: L("Notices") }, { value: "holds", label: L("Holds") }, { value: "revaluation", label: L("Revaluation") }]} />
        <div className="flex gap-2">{holdDialog}</div>
      </div>
      {tab === "notices" && (
        <OpsList
          api={noticeApi}
          columns={[
            { key: "facility_number", label: L("Facility"), render: (r) => cell(r.facility_number ?? r.facility_id) },
            { key: "customer", label: L("customer"), render: (r) => cell(r.customer) },
            { key: "kind", label: L("notice"), render: (r) => cell(words(r.kind)) },
            { key: "channel", label: L("channel"), render: (r) => cell(words(r.channel)) },
            { key: "due_reference", label: L("Due"), render: (r) => dateCell(r.due_reference) },
            { key: "generated_at", label: L("generated"), render: (r) => dateCell(r.generated_at) },
            { key: "provider_reference", label: L("reference"), render: (r) => cell(r.provider_reference) },
            { key: "proof", label: L("proof"), render: (r) => (r.proof ? <button type="button" className="text-xs text-primary underline" onClick={() => viewGoldFile(r.proof)}>{L("View")}</button> : "—") },
            { key: "delivery_status", label: L("status"), render: (r) => <Status code={r.delivery_status} /> },
          ]}
          toolbar={[{ key: "run", label: L("Generate due notices"), icon: Play, right: "Authorize", call: noticeApi.run, body: {} }]}
          rowActions={(r) => [
            {
              key: "delivery",
              label: L("Record delivery"),
              icon: MailCheck,
              right: "Edit",
              show: (x) => x.status !== "SERVED",
              dialog: {
                title: L("Record delivery"),
                fields: [
                  { key: "status", label: L("status"), type: "select", required: true, options: gl("delivery_statuses", ["DISPATCHED", "SERVED", "FAILED", "RETURNED"]) },
                                    { key: "provider_reference", label: L("reference") },
                  uploadField(L, "proof", "NOTICE_PROOF"),
                ],
                initial: { status: "SERVED" },
                run: (x) => noticeApi.delivery({ id: Number(r.id), ...x }),
              },
            },
          ]}
        />
      )}
      {tab === "holds" && (
        <OpsList
          api={holdApi}
          prefix="hd_"
          columns={[
            { key: "created_time", label: L("when"), render: (r) => dateCell(r.created_time) },
            { key: "facility_number", label: L("Facility"), align: "left", render: (r) => <span className="text-xs"><b>{r.facility_number}</b><span className="block text-[10px] text-muted-foreground">{r.customer}</span></span> },
            { key: "kind", label: L("kind"), render: (r) => cell(words(r.kind)) },
            { key: "detail", label: L("detail"), render: (r) => cell(r.detail) },
            { key: "created_by", label: L("by"), render: (r) => cell(r.created_by) },
            { key: "resolved_by", label: L("resolved_by"), render: (r) => cell(r.resolved_by ? `${r.resolved_by} · ${r.resolved_at}` : "") },
            { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
          ]}
          rowActions={(r) => [{ key: "resolve", label: L("Resolve"), icon: CheckCircle2, right: "Edit", call: holdApi.resolve, body: { id: r.id } }]}
        />
      )}
      {tab === "revaluation" && (
        <OpsList
          api={revaluationApi}
          prefix="rv_"
          columns={[
            { key: "facility_number", label: L("Facility"), render: (r) => cell(r.facility_number ?? r.facility_id) },
            { key: "customer", label: L("customer"), render: (r) => cell(r.customer) },
            { key: "revalued_on", label: L("date"), render: (r) => dateCell(r.revalued_on ?? r.created_time) },
            { key: "old_value", label: L("old_value"), render: (r) => cell(r.old_value ?? r.previous_value) },
            { key: "new_value", label: L("new_value"), render: (r) => cell(r.new_value ?? r.gold_value) },
            { key: "ltv", label: "LTV", render: (r) => <span className={`text-xs ${r.flagged || r.breached ? "font-bold text-red-700" : ""}`}>{pct(r.ltv ?? r.new_ltv)}</span> },
            { key: "status", label: L("status"), render: (r) => <Status code={r.status ?? (r.flagged ? "FLAGGED" : "")} /> },
          ]}
          toolbar={[{ key: "run", label: L("Revalue at today's rates"), icon: RefreshCcw, right: "Authorize", call: revaluationApi.run, body: {} }]}
        />
      )}
      {hold === "add" && (
        <OpDialog
          title={L("Place a hold")}
          hint={L("A hold stops notices and auction until it is resolved.")}
          fields={[
            { key: "kind", label: L("kind"), type: "select", required: true, options: gl("hold_kinds", ["DISPUTE"]) },
            { key: "detail", label: L("detail"), type: "textarea", required: true },
          ]}
          needs={(x) => Boolean(x.facility_id)}
          run={(x) => holdApi.add({ facility_id: Number(x.facility_id), kind: x.kind, detail: x.detail })}
          onClose={() => setHold(null)}
          onDone={() => setHold(null)}
        >
          {facilityInput(L)}
        </OpDialog>
      )}
    </div>
  );
}

// ---------- Auction ----------

function EligibilityCheck() {
  const L = useL();
  useGoldOptions();
  const [open, setOpen] = useState(false);
  const [res, setRes] = useState(null);
  return (
    <>
      <Button size="sm" variant="secondary" icon={ClipboardCheck} onClick={() => setOpen(true)}>
        {L("Check eligibility")}
      </Button>
      {open && (
        <OpDialog
          size="lg"
          title={L("Auction eligibility")}
          hint={L("Every check: overdue per contract, notices served, revaluation, verification, no holds.")}
          fields={[]}
          confirmLabel={L("Check")}
          needs={(x) => Boolean(x.facility_id)}
          run={(x) => auctionApi.eligibility({ facility_id: Number(x.facility_id) })}
          onClose={() => (setOpen(false), setRes(null))}
          onDone={(r) => setRes(first(r))}
        >
          {(form, setForm) => (
            <>
              {facilityInput(L)(form, setForm)}
              {res && (
                <div className="mb-3">
                  <p className={`mb-2 rounded-xl border px-3 py-2 text-xs font-semibold ${res.eligible ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>{res.eligible ? L("Eligible for auction") : L("Not eligible for auction")}</p>
                  <RowsTable rows={res.checks} columns={[{ key: "check", label: L("check"), render: (c) => words(c.check) }, { key: "passed", label: L("passed"), render: (c) => (c.passed ? "✓" : "✕") }, { key: "detail", label: L("detail") }]} />
                </div>
              )}
            </>
          )}
        </OpDialog>
      )}
    </>
  );
}

export function AuctionManagement() {
  const L = useL();
  useGoldOptions();
  const st = (r, ...s) => s.includes(r.status);
  return (
    <OpsList
      api={auctionApi}
      title="auctionManagement"
      sub="Eligibility, approval, schedule, bids, completion and surplus refund."
      above={() => (
        <div className="mb-3">
          <EligibilityCheck />
        </div>
      )}
      columns={[
        { key: "facility_number", label: L("Facility"), render: (r) => cell(r.facility_number ?? r.facility_id) },
        { key: "customer", label: L("customer"), render: (r) => cell(r.customer) },
        { key: "auction_date", label: L("auction_date"), render: (r) => dateCell(r.auction_date) },
        { key: "reserve_price", label: L("reserve_price"), render: (r) => cell(r.reserve_price) },
        { key: "highest_bid", label: L("highest_bid"), render: (r) => cell(r.highest_bid ? `${r.highest_bid} · ${r.highest_bidder ?? ""}` : "—") },
        { key: "surplus", label: L("Surplus / shortfall"), render: (r) => cell(r.surplus || r.shortfall ? `${r.surplus ?? "0"} / ${r.shortfall ?? "0"}` : "—") },
        { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
      ]}
      toolbar={[{ key: "add", label: L("Propose an auction"), icon: Gavel, right: "Add", dialog: { title: L("Propose an auction"), hint: L("A checker approves it with the legal reference."), fields: [], needs: (x) => Boolean(x.facility_id), children: facilityInput(L), run: (x) => auctionApi.add({ facility_id: Number(x.facility_id) }) } }]}
      rowActions={(r) => [
        { key: "auth", label: L("approve"), icon: CheckCircle2, right: "Authorize", show: isPending, dialog: { title: L("Approve the auction"), fields: [{ key: "reference", label: L("reference"), required: true, placeholder: "LEGAL-2026-77" }], run: (x) => auctionApi.auth({ id: Number(r.id), ...x }) } },
        { key: "deauth", label: L("reject"), icon: XCircle, right: "Authorize", show: isPending, call: auctionApi.deauth, body: { id: Number(r.id) } },
        {
          key: "schedule",
          label: L("Schedule"),
          icon: Lock,
          right: "Edit",
          show: (x) => st(x, "APPROVED"),
          dialog: { title: L("Schedule the auction"), hint: L("Sets the reserve price from the latest value."), fields: [{ key: "auction_date", label: L("auction_date"), type: "date", required: true }, { key: "method", label: L("method"), type: "select", required: true, options: gl("auction_methods", ["PUBLIC", "SEALED_BID", "ONLINE"]) }], initial: { method: "PUBLIC" }, run: (x) => auctionApi.schedule({ id: Number(r.id), ...x }) },
        },
        { key: "bid", label: L("Record a bid"), icon: Plus, right: "Edit", show: (x) => st(x, "SCHEDULED", "OPEN"), dialog: { title: L("Record a bid"), fields: [{ key: "bidder", label: L("bidder"), required: true }, { key: "amount", label: L("amount"), type: "amount", required: true }], run: (x) => auctionApi.bid({ id: Number(r.id), ...x }) } },
        { key: "complete", label: L("Complete"), icon: CheckCircle2, right: "Authorize", show: (x) => st(x, "SCHEDULED", "OPEN"), dialog: { title: L("Complete the auction"), hint: L("The highest bid settles the loan; any surplus or shortfall is worked out."), fields: [{ key: "expenses", label: L("expenses"), type: "amount" }], run: (x) => auctionApi.complete({ id: Number(r.id), expenses: x.expenses || "0" }) } },
        { key: "refund", flag: "surplus_refund", label: L("Refund surplus"), icon: HandCoins, right: "Authorize", show: (x) => st(x, "COMPLETED") && Number(x.surplus) > 0 && !x.surplus_refunded, call: auctionApi.surplus_refund, body: { id: Number(r.id) } },
      ]}
    />
  );
}

// ---------- Physical verification ----------

export function PhysicalVerification() {
  const L = useL();
  useGoldOptions();
  const lockers = useActive(lockerApi);
  const [tab, setTab] = useState("verifications");
  return (
    <div className="pt-1">
      <h1 className="text-2xl font-black">{L("physicalVerification")}</h1>
      <p className="mt-1 mb-3 text-sm text-muted-foreground">{L("Count the packets in a locker; missing, unexpected or broken packets become custody exceptions.")}</p>
      <SegmentedSwitch className="mb-3" value={tab} onChange={setTab} options={[{ value: "verifications", label: L("Verifications") }, { value: "exceptions", label: L("Custody exceptions") }]} />
      {tab === "verifications" ? (
        <OpsList
          api={verificationApi}
          columns={[
            { key: "verified_at", label: L("when"), render: (r) => dateCell(r.verified_at) },
            { key: "locker_code", label: L("locker"), render: (r) => cell(r.locker_code) },
            { key: "expected", label: L("expected"), render: (r) => cell(r.expected) },
            { key: "found", label: L("found"), render: (r) => cell(r.found) },
            { key: "exceptions", label: L("exceptions"), render: (r) => <span className={`text-xs ${Number(r.exceptions) > 0 ? "font-bold text-red-700" : ""}`}>{r.exceptions}</span> },
            { key: "verified_by", label: L("verified_by"), render: (r) => cell(r.verified_by) },
            { key: "remarks", label: L("remarks"), render: (r) => cell(r.remarks) },
          ]}
          toolbar={[
            {
              key: "add",
              label: L("Record a count"),
              icon: ClipboardCheck,
              right: "Add",
              dialog: {
                size: "lg",
                title: L("Record a count"),
                fields: [{ key: "locker_code", label: L("locker"), type: "select", required: true, options: lockers }],
                initial: { found: [] },
                children: (form, setForm) => (
                  <div className={`${labelClass} mb-3`}>
                    {L("Packets found")}
                    <RowsInput value={form.found} onChange={(v) => setForm((x) => ({ ...x, found: v }))} blank={() => ({ packet_number: "", seal_number: "", seal_intact: true })} addLabel={L("Add packet")} columns={[{ key: "packet_number", label: L("packet_number") }, { key: "seal_number", label: L("seal_number") }, { key: "seal_intact", label: L("seal_intact"), type: "bool" }]} />
                  </div>
                ),
                run: (x) => verificationApi.add({ locker_code: x.locker_code, found: x.found }),
              },
            },
          ]}
        />
      ) : (
        <OpsList
          api={exceptionApi}
          prefix="ex_"
          columns={[
            { key: "created_time", label: L("when"), render: (r) => dateCell(r.created_time ?? r.raised_at) },
            { key: "locker_code", label: L("locker"), render: (r) => cell(r.locker_code) },
            { key: "packet_number", label: L("packet"), render: (r) => cell(r.packet_number) },
            { key: "kind", label: L("kind"), render: (r) => cell(words(r.kind ?? r.exception_type)) },
            { key: "detail", label: L("detail"), render: (r) => cell(r.detail) },
            { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
          ]}
          rowActions={(r) => [{ key: "resolve", label: L("Resolve"), icon: Trash2, right: "Authorize", show: (x) => x.status !== "RESOLVED", dialog: { title: L("Resolve the exception"), fields: [{ key: "remarks", label: L("remarks"), type: "textarea", required: true }], run: (x) => exceptionApi.resolve({ id: Number(r.id), remarks: x.remarks }) } }]}
        />
      )}
    </div>
  );
}

export function GoldLoanReports() {
  return <CatalogueReports api={goldReportApi} title="goldLoanReports" sub="Pick a gold loan report from the catalogue and run it." />;
}

