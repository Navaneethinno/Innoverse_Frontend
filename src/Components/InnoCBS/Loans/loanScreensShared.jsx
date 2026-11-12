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
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { ActionButtons, Facts, Section, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { OpDialog, ownerOf, RowsTable, cell, dateCell, first, pct, splitParty, useL, words } from "@/Components/InnoCBS/cbsOps";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { recordApi } from "@/Services/api/recordApi";
import { calls, rowsOf } from "@/Services/Epurse/onboarding.api";
import { loanFacilitiesApi } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";

// InnoCBS > Loans (Admin 21).
export const LN = API_ENDPOINTS.CBS_MODULES.LOAN;

export const IF = API_ENDPOINTS.CBS_MODULES.ISLAMIC_FINANCE;

export const regRuleApi = recordApi(`${LN}/regulatory_rule`);

export const structureApi = recordApi(`${LN}/repayment_structure`);

export const servicingApi = recordApi(`${LN}/servicing_rule`);

export const schemeApi = recordApi(`${LN}/scheme`);

export const ifProductApi = recordApi(`${IF}/product`);

export const calcApi = calls(`${LN}/calculator`, ["emi", "interest", "options", "schedule"]);

export const prepayApi = calls(`${LN}/prepayment`, ["list", "quote", "add", "auth", "deauth"]);

export const moratoriumApi = calls(`${LN}/moratorium`, ["list", "quote", "add", "auth", "deauth"]);

export const penaltyApi = calls(`${LN}/penalty`, ["dpd", "list", "quote", "run"]);

export const waiverApi = calls(`${LN}/penalty_waiver`, ["list", "add", "auth", "deauth"]);

export const contractApi = { ...calls(`${IF}/contract`, ["list", "get", "options", "add", "auth", "deauth", "late_charges", "late_charges_run", "mudaraba_settle", "pay", "pay_charges", "rental_revision", "settle", "settlement_quote"]), ...calls(IF, ["calculate"]) };

export const charityApi = calls(`${IF}/charity`, ["fund", "list", "remit"]);

export const loanReportApi = calls(`${LN}/report`, ["catalogue", "run"]);

export const useF = () => {
  const L = useL();
  return (key, type = "text", extra = {}) => ({ key, label: L(key), type, ...extra });
};

export const toNum = (keys) => (x) => ({ ...x, ...Object.fromEntries(keys.filter((k) => k in x).map((k) => [k, x[k] === "" || x[k] == null ? 0 : Number(x[k])])) });

export const Status = ({ code }) => <StatusBadge status={code} label={words(code)} variant="subtle" />;

export const today = () => new Date().toISOString().slice(0, 10);

export const header = (L, title, sub) => (
  <>
    <PageTitle>{L(title)}</PageTitle>
    <p className="mt-1 mb-4 text-sm text-muted-foreground">{L(sub)}</p>
  </>
);

export const act = (call, body, after) =>
  call(body)
    .then((x) => {
      notifications.success(x?.message ?? "OK");
      after?.(x);
    })
    .catch((e) => notifications.error(e.message));

export const factsOfObject = (L, o, skip = []) => Object.entries(o ?? {}).filter(([k, v]) => !skip.includes(k) && (typeof v !== "object" || v === null)).map(([k, v]) => [L(k), v === "" || v == null ? "—" : String(v)]);

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

// ---------- Calculator ----------

export function ScheduleRows({ rows, cols }) {
  return <RowsTable rows={rows} columns={cols.map(([key, label, isDate]) => ({ key, label, numeric: !isDate, render: isDate ? (r) => dateCell(r[key]) : undefined }))} />;
}

// ---------- Prepayments and moratoriums ----------

export const INSTALMENT_COLS = (L) => [["installment_number", "#"], ["due_date", L("due_date"), true], ["opening_principal", L("opening_principal")], ["principal_due", L("principal_due")], ["interest_due", L("interest_due")], ["fees_due", L("fees_due")], ["total_due", L("total_due")], ["closing_principal", L("closing_principal")]];

// A facility change (prepayment / moratorium): a list, a request with its
// quote, and a checker's approve / reject.
export function FacilityChangeScreen({ api, title, sub, amountField, columns, addLabel }) {
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

// ---------- Islamic financing ----------

export const TERM_KEYS = ["asset_cost", "agreed_profit", "profit_rate", "asset_value", "rental_amount", "residual_value", "rental_revision_months", "rental_revision_percent", "customer_contribution", "rental_rate", "principal", "customer_profit_share", "instalments", "frequency"];

export const termType = (k) => (k === "instalments" || k === "rental_revision_months" ? "int" : k === "frequency" ? "select" : /rate|percent|share/.test(k) ? "rate" : "amount");

export function ContractOpen({ onClose, onDone }) {
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

export function ContractView({ id, onBack }) {
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
