import { API_ENDPOINTS } from "@/Utils/Constant";
import { useEffect, useState } from "react";
import { ArrowLeft, Calculator, CheckCircle2, ClipboardCheck, FileSignature, HandCoins, Package, Plus, RefreshCcw, Undo2, XCircle } from "lucide-react";
import { BackButton } from "@/Components/Common/TextButtons";
import { Button } from "@/Components/Common/Button";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { ActionButtons, Facts, Section, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { FacilityPick } from "@/Components/InnoCBS/Loans/loanScreensShared";
import { Field, useInstitutionScope } from "@/Components/InnoCBS/Loans/loanShared";
import { OpDialog, RowsInput, RowsTable, cell, dateCell, first, fmtNum, pct, splitParty, useL, words } from "@/Components/InnoCBS/cbsOps";
import { OpsList, Status, isPending, runCall } from "@/Components/InnoCBS/OpsList";
import { recordApi } from "@/Services/api/recordApi";
import { calls, rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { downloadFile, uploadFile } from "@/Services/api/fileTransfer";

// InnoCBS > Gold Loan (Admin 23).
export const G = API_ENDPOINTS.CBS_MODULES.GOLD;

export const purityApi = recordApi(`${G}/purity`);

export const ratePolicyApi = recordApi(`${G}/rate_policy`);

export const rateApi = calls(`${G}/rate`, ["list", "add", "auth", "deauth", "status"]);

export const productApi = recordApi(`${G}/product`);

export const lockerApi = recordApi(`${G}/locker`);

export const valuationApi = calls(`${G}/valuation`, ["list", "get", "quote", "add", "auth", "deauth", "acknowledge"]);

export const loanApi = calls(`${G}/loan`, ["book"]);

export const ornamentApi = calls(`${G}/ornament`, ["list"]);

export const packetApi = calls(`${G}/packet`, ["list", "add", "verify"]);

export const movementApi = calls(`${G}/movement`, ["list", "add", "auth", "deauth"]);

export const accountApi = calls(`${G}/account`, ["list"]);

export const dashboardApi = calls(G, ["dashboard"]);

export const chargesApi = calls(`${G}/charges`, ["list"]);

export const preclosureApi = calls(`${G}/preclosure`, ["quote", "settle"]);

export const releaseApi = calls(`${G}/release`, ["list", "add", "auth", "deauth"]);

export const holdApi = calls(`${G}/hold`, ["list", "get", "add", "resolve"]);

export const noticeApi = calls(`${G}/notice`, ["list", "run", "delivery"]);

export const revaluationApi = calls(`${G}/revaluation`, ["list", "run"]);

export const auctionApi = calls(`${G}/auction`, ["list", "add", "auth", "deauth", "bid", "complete", "eligibility", "schedule", "surplus_refund"]);

export const exceptionApi = calls(`${G}/exception`, ["list", "resolve"]);

export const verificationApi = calls(`${G}/verification`, ["list", "add"]);

export const goldReportApi = calls(`${G}/report`, ["catalogue", "run"]);

export const goldOptionsApi = calls(G, ["options", "upload"]);

export let goldOptions = null;

export let goldOptionsLoad = null;

export function useGoldOptions() {
  const [, bump] = useState(0);
  useEffect(() => {
    if (goldOptions) return;
    goldOptionsLoad ??= goldOptionsApi.options({}).then((r) => (goldOptions = first(r) ?? {}));
    goldOptionsLoad.then(() => bump((n) => n + 1)).catch(() => {});
  }, []);
}

export const gl = (key, fallback = []) => (goldOptions?.[key] ?? fallback).map((v) => ({ value: v, label: words(v) }));

// Upload a file (photo, signature, proof) and keep its stored path.
export function GoldUpload({ kind, value, onChange }) {
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

export const viewGoldFile = (path) =>
  downloadFile(`${G}/file`, { path })
    .then((blob) => window.open(URL.createObjectURL(blob), "_blank"))
    .catch((e) => notifications.error(e.message));

export const uploadField = (L, key, kind, extra = {}) => ({ key, label: L(key), wide: true, render: (v, set) => <GoldUpload kind={kind} value={v} onChange={set} />, ...extra });

export const useF = () => {
  const L = useL();
  useGoldOptions();
  return (key, type = "text", extra = {}) => ({ key, label: L(key), type, ...extra });
};

export const toNum = (keys) => (x) => ({ ...x, ...Object.fromEntries(keys.filter((k) => k in x).map((k) => [k, x[k] === "" || x[k] == null ? 0 : Number(x[k])])) });

export const grams = (v) => (v === "" || v == null ? "—" : `${v} g`);

// Active records of a master as choices.
export function useActive(api, label = (r) => `${r.code} · ${r.name}`) {
  const [rows, setRows] = useState([]);
  const { scope, institution } = useInstitutionScope();
  useEffect(() => {
    api
      .active(scope({}))
      .then((r) => setRows((rowsOf(r)[0]?.items ?? rowsOf(r)).map((x) => ({ ...x, ...(x.setup ?? {}) }))))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, institution]);
  return rows.map((r) => ({ value: r.code, label: label(r), row: r }));
}

// A valuation, picked from the latest ones (number, customer).
export function useValuations(filter, keep = () => true) {
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

export const facilityInput = (L) => (form, setForm) => (
  <div className={`${labelClass} mb-3`}>
    {L("Facility")}
    <FacilityPick value={form.facility_id} onChange={(v) => setForm((x) => ({ ...x, facility_id: v }))} />
  </div>
);

// Today's rate slots, entries and the alert.
export function RateStatus() {
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

export function DailyRates() {
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

// ---------- New gold loan ----------

export const ORNAMENT_BLANK = () => ({ category: "", condition: "", description: "", gross_weight: "", stone_weight: "", other_weight: "", purity_code: "", testing_method: "", photos: [] });

export function ValuationNew({ onClose, onDone, previous }) {
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

export function ValuationTotals({ v }) {
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

export function ValuationView({ id, onBack }) {
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

// ---------- Accounts, charges, pre-closure ----------

export function GoldDashboard() {
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
        [L("surplus_pending_refund"), Number(d.surplus_pending_refund) > 0 ? `${d.surplus_pending_refund} · ${fmtNum(d.surplus_pending_amount)}` : (d.surplus_pending_refund ?? 0)],
        [L("Today's rates"), `${d.todays_rate_status?.approved ?? 0} ${L("approved")} · ${d.todays_rate_status?.awaiting_approval ?? 0} ${L("waiting")}${(d.todays_rate_status?.missing_slots ?? []).length ? ` · ${L("missing")} ${d.todays_rate_status.missing_slots.join(", ")}` : ""}`, (d.todays_rate_status?.missing_slots ?? []).length ? "text-red-700" : undefined],
      ]}
    />
  );
}

// ---------- Release ----------

export function ReleaseOrnaments({ valuationId, value, onChange }) {
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

// ---------- Auction ----------

export function EligibilityCheck() {
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
