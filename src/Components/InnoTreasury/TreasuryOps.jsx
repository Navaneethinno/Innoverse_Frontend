import { useEffect, useState } from "react";
import { ArrowLeftRight, Banknote, Bell, CheckCheck, CheckCircle2, FileUp, Link2, Play, Plus, RefreshCcw, Search, TrendingDown, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { CatalogueReports } from "@/Components/InnoCBS/Deposits/DepositOps";
import { Facts, Section, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { Field } from "@/Components/InnoCBS/Loans/loanShared";
import { OpDialog, RowsTable, cell, dateCell, first, pct, useL, words } from "@/Components/InnoCBS/cbsOps";
import { OpsList, Status, isPending, itemsOf, runCall } from "@/Components/InnoCBS/OpsList";
import { usePagePermission } from "@/Hooks/usePermission";
import { calls } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { CollateralMargin } from "./TreasuryRecords";
import { T, choices, glChoices, useTreasuryOptions, bankAccountApi, borrowingApi, counterpartyApi, dematApi, fixedAssetApi, mapText, securityApi, today, useActive } from "./treasuryShared";

const rateApi = calls(`${T}/rate`, ["list", "add"]);
const entryApi = calls(`${T}/entry`, ["list", "add"]);
const transferApi = calls(`${T}/transfer`, ["list", "add", "auth", "deauth"]);
const reconApi = calls(`${T}/reconciliation`, ["match", "run", "status"]);
const statementApi = calls(`${T}/statement`, ["import", "lines"]);
const tradeApi = calls(`${T}/trade`, ["list", "add", "auth", "deauth"]);
const holdingApi = calls(`${T}/holding`, ["list"]);
const priceApi = calls(`${T}/price`, ["list", "add"]);
const valuationApi = calls(`${T}/valuation`, ["history", "run"]);
const drawdownApi = calls(`${T}/drawdown`, ["list", "add", "auth", "deauth", "prepay"]);
const forexApi = calls(`${T}/forex_deal`, ["list", "add", "auth", "deauth"]);
const fxApi = calls(`${T}/fx`, ["position", "revalue"]);
const marginApi = calls(`${T}/margin_call`, ["list", "settle"]);
const exposureApi = calls(`${T}/exposure`, ["monitor"]);
const reserveApi = calls(`${T}/reserve`, ["calculate", "history"]);
const almApi = calls(`${T}/alm`, ["concentration", "forecast", "gap", "liquidity", "stress"]);
const eventApi = calls(`${T}/event`, ["list", "settle"]);
const accrualApi = calls(`${T}/accrual`, ["run"]);
const dashboardApi = calls(T, ["dashboard"]);
const alertApi = calls(`${T}/alert`, ["list", "acknowledge", "run"]);
const reportApi = calls(`${T}/report`, ["catalogue", "run"]);

// A list reply that is one object (not yet an array) as rows.
const rowsOrOne = (r) => (Array.isArray(r?.data) ? r.data : r?.data && typeof r.data === "object" ? (Array.isArray(r.data.items) ? r.data.items : [r.data]) : []);
const listOf = (call) => ({ listPath: "", list: call });
const n = (r, k) => Number(r[k]);
const warnCell = (v, bad) => <span className={`text-xs ${bad ? "font-bold text-red-700" : ""}`}>{v === "" || v == null ? "—" : v}</span>;
const pageHead = (L, title, sub) => (
  <>
    <h1 className="text-2xl font-black">{L(title)}</h1>
    <p className="mt-1 mb-3 text-sm text-muted-foreground">{L(sub)}</p>
  </>
);
const approveReject = (L, api) => (r) => [
  { key: "auth", label: L("approve"), icon: CheckCircle2, right: "Authorize", show: isPending, call: api.auth, body: { id: Number(r.id) } },
  { key: "deauth", label: L("reject"), icon: XCircle, right: "Authorize", show: isPending, call: api.deauth, body: { id: Number(r.id) } },
];

// ---------- Market rates ----------

export function MarketRates() {
  const L = useL();
  const topt = useTreasuryOptions();
  return (
    <OpsList
      api={rateApi}
      title="marketRates"
      sub="FX rates and benchmarks, with their source and time."
      columns={[
        { key: "rate_date", label: L("rate_date"), render: (r) => dateCell(r.rate_date) },
        { key: "rate_kind", label: L("kind"), render: (r) => cell(words(r.rate_kind)) },
        { key: "code", label: L("Rate"), render: (r) => cell(r.rate_kind === "FX" ? `${r.base_currency}/${r.quote_currency}` : r.code) },
        { key: "rate", label: L("rate"), render: (r) => cell(Number(r.rate).toString()) },
        { key: "source", label: L("source"), render: (r) => cell(r.source) },
        { key: "entered_by", label: L("entered_by"), render: (r) => cell(r.entered_by) },
        { key: "captured_at", label: L("captured_at"), render: (r) => dateCell(r.captured_at) },
      ]}
      toolbar={[
        {
          key: "add",
          label: L("Enter a rate"),
          icon: Plus,
          right: "Add",
          dialog: {
            title: L("Enter a rate"),
            fields: [
              { key: "rate_kind", label: L("kind"), type: "select", required: true, options: [{ value: "FX", label: "FX" }, { value: "BENCHMARK", label: L("Benchmark") }] },
              { key: "base_currency", label: L("base_currency"), type: "select", options: choices(topt.currencies), showIf: (x) => x.rate_kind === "FX" },
              { key: "quote_currency", label: L("quote_currency"), type: "select", options: choices(topt.currencies), showIf: (x) => x.rate_kind === "FX" },
              { key: "benchmark_code", label: L("benchmark_code"), placeholder: "NIBOR_3M", showIf: (x) => x.rate_kind === "BENCHMARK" },
              { key: "rate", label: L("rate"), type: "rate", required: true },
              { key: "rate_date", label: L("rate_date"), type: "date", required: true },
              { key: "source", label: L("source"), required: true },
            ],
            initial: { rate_kind: "FX", rate_date: today() },
            run: (x) => rateApi.add({ rates: [Object.fromEntries(Object.entries(x).filter(([, v]) => v !== ""))] }),
          },
        },
      ]}
    />
  );
}

// ---------- Interbank ----------

export function InterbankTransactions() {
  const L = useL();
  const topt = useTreasuryOptions();
  const accounts = useActive(bankAccountApi, { value: (r) => r.id ?? r.record_id });
  return (
    <OpsList
      api={entryApi}
      title="interbankTransactions"
      sub="The book of each interbank account: charges, interest, inward and outward amounts."
      columns={[
        { key: "entry_date", label: L("entry_date"), render: (r) => dateCell(r.entry_date) },
        { key: "account_code", label: L("account"), render: (r) => cell(r.account_code) },
        { key: "entry_type", label: L("entry_type"), render: (r) => cell(words(r.entry_type)) },
        { key: "amount", label: L("amount"), render: (r) => cell(r.amount) },
        { key: "narration", label: L("narration"), align: "left", render: (r) => cell(r.narration) },
        { key: "reference", label: L("reference"), render: (r) => cell(r.reference) },
        { key: "source", label: L("source"), render: (r) => cell(words(r.source)) },
        { key: "match_status", label: L("match_status"), render: (r) => <Status code={r.match_status} /> },
      ]}
      toolbar={[
        { key: "close", label: L("Close the day"), icon: CheckCheck, right: "Authorize", dialog: { title: L("Close the day"), hint: L("Records each account's opening and closing. The daily job does this too."), fields: [{ key: "date", label: L("date"), type: "date", required: true }], initial: { date: today() }, run: (x) => bankAccountApi.close_day(x) } },
        {
          key: "add",
          label: L("Book an entry"),
          icon: Plus,
          right: "Add",
          dialog: {
            title: L("Book an entry"),
            fields: [
              { key: "account_id", label: L("account"), type: "select", required: true, options: accounts },
              { key: "entry_type", label: L("entry_type"), type: "select", required: true, options: choices(topt.entry_types) },
              { key: "direction", label: L("direction"), type: "select", options: choices(topt.adjustment_directions ?? ["IN", "OUT"]), showIf: (x) => x.entry_type === "ADJUSTMENT" },
              { key: "contra_gl_id", label: L("Contra GL"), type: "select", options: glChoices(topt.gl_accounts), showIf: (x) => (topt.entry_types_needing_gl ?? ["INWARD", "OUTWARD", "ADJUSTMENT"]).includes(x.entry_type) },
              { key: "amount", label: L("amount"), type: "amount", required: true },
              { key: "entry_date", label: L("entry_date"), type: "date", required: true },
              { key: "statement_line_id", label: L("Statement line ID"), type: "int", hint: L("Matches it to a statement line.") },
              { key: "narration", label: L("narration"), wide: true, required: true },
            ],
            initial: { entry_date: today() },
            run: (x) => entryApi.add({ ...Object.fromEntries(Object.entries(x).filter(([, v]) => v !== "")), account_id: Number(x.account_id), ...(x.contra_gl_id ? { contra_gl_id: Number(x.contra_gl_id) } : {}), ...(x.statement_line_id ? { statement_line_id: Number(x.statement_line_id) } : {}) }),
          },
        },
      ]}
    />
  );
}

export function InterbankTransfers() {
  const L = useL();
  const accounts = useActive(bankAccountApi, { value: (r) => r.id ?? r.record_id });
  return (
    <OpsList
      api={transferApi}
      title="interbankTransfers"
      sub="Transfers between interbank accounts; a checker approves."
      columns={[
        { key: "created_time", label: L("when"), render: (r) => dateCell(r.created_time ?? r.requested_at) },
        { key: "route", label: L("From → to"), sortable: false, render: (r) => cell(`${r.from_account} → ${r.to_account}`) },
        { key: "transfer_date", label: L("transfer_date"), render: (r) => dateCell(r.transfer_date) },
        { key: "to_amount", label: L("to_amount"), render: (r) => cell(r.to_amount) },
        { key: "amount", label: L("amount"), render: (r) => cell(r.amount) },
        { key: "fx_rate", label: L("fx_rate"), render: (r) => cell(r.fx_rate) },
        { key: "reference", label: L("reference"), render: (r) => cell(r.reference) },
        { key: "purpose", label: L("purpose"), render: (r) => cell(r.purpose) },
        { key: "requested_by", label: L("requested_by"), render: (r) => cell(r.requested_by) },
        { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
      ]}
      toolbar={[
        {
          key: "add",
          label: L("New transfer"),
          icon: ArrowLeftRight,
          right: "Add",
          dialog: {
            title: L("New transfer"),
            hint: L("A checker approves it."),
            fields: [
              { key: "from_account_id", label: L("From account"), type: "select", required: true, options: accounts },
              { key: "to_account_id", label: L("To account"), type: "select", required: true, options: accounts },
              { key: "amount", label: L("amount"), type: "amount", required: true },
              { key: "fx_rate", label: L("fx_rate"), type: "rate", hint: L("Only when the currencies differ."), showIf: (x) => { const a = accounts.find((o) => o.value === x.from_account_id)?.row; const b = accounts.find((o) => o.value === x.to_account_id)?.row; return a && b && a.currency !== b.currency; } },
              { key: "reference", label: L("reference"), required: true },
              { key: "purpose", label: L("purpose"), required: true },
            ],
            run: (x) => transferApi.add({ ...x, from_account_id: Number(x.from_account_id), to_account_id: Number(x.to_account_id), ...(x.fx_rate ? {} : { fx_rate: undefined }) }),
          },
        },
      ]}
      rowActions={(r) => [
        { key: "auth", label: L("approve"), icon: CheckCircle2, right: "Authorize", show: isPending, call: transferApi.auth, body: { id: Number(r.id) } },
        { key: "deauth", label: L("reject"), icon: XCircle, right: "Authorize", show: isPending, dialog: { title: L("reject"), variant: "danger", fields: [{ key: "remarks", label: L("remarks"), type: "textarea", required: true }], run: (x) => transferApi.deauth({ id: Number(r.id), remarks: x.remarks }) } },
      ]}
    />
  );
}

function ReconStatus({ accountId, version }) {
  const L = useL();
  const [s, setS] = useState(null);
  useEffect(() => {
    if (!accountId) return;
    reconApi
      .status({ account_id: Number(accountId) })
      .then((r) => setS(first(r)))
      .catch(() => {});
  }, [accountId, version]);
  if (!s) return null;
  return <Facts className="mb-3" rows={[[L("matched"), s.matched], [L("unmatched_statement_lines"), s.unmatched_statement_lines, s.unmatched_statement_lines ? "text-amber-700" : undefined], [L("unmatched_book_entries"), s.unmatched_book_entries, s.unmatched_book_entries ? "text-amber-700" : undefined], [L("book_balance"), s.book_balance], [L("statement_balance"), s.statement_balance || "—"], [L("difference"), s.difference || "—", Number(s.difference) ? "text-red-700" : undefined]]} />;
}

// Unmatched book entries of the account with the line's amount (or near it).
function EntryFinder({ line, accountId, value, onChange }) {
  const L = useL();
  const [exact, setExact] = useState(true);
  const [rows, setRows] = useState(null);
  useEffect(() => {
    const amt = Math.abs(Number(line.amount));
    entryApi
      .list({ page: 1, limit: 25, filters: { account_id: Number(accountId), unmatched: true, ...(exact ? { amount: line.amount } : {}) }, ...(exact ? {} : { amount_min: String(amt * 0.9), amount_max: String(amt * 1.1) }) })
      .then((r) => setRows(itemsOf(r)))
      .catch((e) => notifications.error(e.message));
  }, [line, accountId, exact]);
  return (
    <div className="mb-3">
      <label className="mb-2 flex items-center gap-2 text-xs">
        <input type="checkbox" checked={exact} onChange={(e) => setExact(e.target.checked)} /> {L("Exact amount only")}
      </label>
      <RowsTable
        rows={rows ?? []}
        empty={L("No unmatched entries found.")}
        columns={[
          { key: "pick", label: "", render: (e) => <input type="radio" name="entry" aria-label={String(e.id)} checked={String(value) === String(e.id)} onChange={() => onChange(String(e.id))} /> },
          { key: "entry_date", label: L("entry_date"), render: (e) => dateCell(e.entry_date) },
          { key: "entry_type", label: L("entry_type"), render: (e) => words(e.entry_type) },
          { key: "amount", label: L("amount"), numeric: true },
          { key: "reference", label: L("reference") },
          { key: "narration", label: L("narration") },
        ]}
      />
    </div>
  );
}

export function BankReconciliation() {
  const L = useL();
  const can = usePagePermission();
  const accounts = useActive(bankAccountApi, { value: (r) => r.id ?? r.record_id });
  const [account, setAccount] = useState("");
  const [version, setVersion] = useState(0);
  const [importing, setImporting] = useState(false);
  const bump = () => setVersion((v) => v + 1);
  return (
    <div className="pt-1">
      {pageHead(L, "bankReconciliation", "Import a bank statement, reconcile automatically, then match what is left by hand.")}
      <Section title={L("account")} className="mb-4">
        <div className="flex flex-wrap items-end gap-2">
          <label className={`${labelClass} min-w-72`}>
            {L("account")}
            <Field field={{ type: "select", blank: L("choose"), options: accounts }} value={account} onChange={setAccount} />
          </label>
          {can("Add") && (
            <Button size="sm" variant="secondary" icon={FileUp} disabled={!account} disabledReason={L("Pick an account.")} onClick={() => setImporting(true)}>
              {L("Import statement")}
            </Button>
          )}
          {can("Edit") && (
            <Button size="sm" icon={RefreshCcw} disabled={!account} disabledReason={L("Pick an account.")} onClick={() => runCall(reconApi.run, { account_id: Number(account) }, bump)}>
              {L("Reconcile now")}
            </Button>
          )}
        </div>
      </Section>
      <ReconStatus accountId={account} version={version} />
      <OpsList
        key={`${account}:${version}`}
        api={listOf(statementApi.lines)}
        select={itemsOf}
        extra={account ? { account_id: Number(account) } : null}
        title="Statement lines"
        columns={[
          { key: "txn_date", label: L("txn_date"), render: (r) => dateCell(r.txn_date) },
          { key: "account_code", label: L("account"), render: (r) => cell(r.account_code) },
          { key: "description", label: L("description"), align: "left", render: (r) => cell(r.description) },
          { key: "reference", label: L("reference"), render: (r) => cell(r.reference) },
          { key: "amount", label: L("amount"), render: (r) => warnCell(r.amount, n(r, "amount") < 0) },
          { key: "matched_how", label: L("matched_how"), render: (r) => cell(words(r.matched_how)) },
          { key: "match_status", label: L("match_status"), render: (r) => <Status code={r.match_status} /> },
        ]}
        rowActions={(r) => [
          { key: "match", label: L("Match"), icon: Link2, right: "Edit", show: (x) => x.match_status !== "MATCHED", dialog: { size: "lg", title: `${L("Match to a book entry")} · ${r.description} · ${r.amount}`, fields: [], needs: (x) => Boolean(x.entry_id), children: (form, setForm) => <EntryFinder line={r} accountId={account} value={form.entry_id} onChange={(v) => setForm((x) => ({ ...x, entry_id: v }))} />, run: (x) => reconApi.match({ line_id: r.id, entry_id: Number(x.entry_id), unmatch: false }), after: bump } },
          { key: "unmatch", label: L("Unmatch"), icon: XCircle, right: "Edit", show: (x) => x.match_status === "MATCHED", call: reconApi.match, body: { line_id: Number(r.id), entry_id: Number(r.entry_id || 0), unmatch: true } },
        ]}
      />
      {importing && (
        <OpDialog
          size="lg"
          title={L("Import statement")}
          hint={L("Paste the CSV: date, value_date, description, reference, debit, credit, balance. Reconciliation runs after the import.")}
          fields={[
            { key: "from", label: L("from"), type: "date", required: true },
            { key: "to", label: L("to"), type: "date", required: true },
            { key: "file_name", label: L("file_name") },
            { key: "csv", label: "CSV", type: "textarea", required: true },
          ]}
          children={(_form, setForm) => (
            <label className={`${labelClass} mb-3 block`}>
              {L("Or pick a CSV file")}
              <input
                type="file"
                accept=".csv,text/csv"
                className="mt-1 block text-xs"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) file.text().then((text) => setForm((x) => ({ ...x, csv: text, file_name: x.file_name || file.name })));
                }}
              />
            </label>
          )}
          run={(x) => statementApi.import({ account_id: Number(account), ...x })}
          onClose={() => setImporting(false)}
          onDone={() => (setImporting(false), bump())}
        />
      )}
    </div>
  );
}

// ---------- Investments ----------

const TRADE_TYPES = ["BUY", "SELL", "RIGHTS", "BONUS", "SPLIT", "BUYBACK", "MERGER", "DEMERGER", "PLEDGE", "UNPLEDGE", "TRANSFER", "DIVIDEND"];

export function SecurityTransactions() {
  const L = useL();
  const topt = useTreasuryOptions();
  const securities = useActive(securityApi);
  const demats = useActive(dematApi);
  const accounts = useActive(bankAccountApi);
  const is = (...t) => (x) => t.includes(x.txn_type);
  return (
    <OpsList
      api={tradeApi}
      title="securityTransactions"
      sub="Trades and corporate actions; a checker approves."
      columns={[
        { key: "trade_date", label: L("trade_date"), render: (r) => dateCell(r.trade_date) },
        { key: "txn_type", label: L("txn_type"), render: (r) => cell(words(r.txn_type)) },
        { key: "security_code", label: L("security"), render: (r) => cell(r.security_code) },
        { key: "quantity", label: L("quantity"), render: (r) => cell(Number(r.quantity).toString()) },
        { key: "price", label: L("price"), render: (r) => cell(r.price) },
        { key: "amount", label: L("amount"), render: (r) => cell(r.amount) },
        { key: "realised_gain", label: L("realised_gain"), render: (r) => warnCell(r.realised_gain, n(r, "realised_gain") < 0) },
        { key: "reference", label: L("reference"), render: (r) => cell(r.reference) },
        { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
      ]}
      toolbar={[
        {
          key: "add",
          label: L("New transaction"),
          icon: Plus,
          right: "Add",
          dialog: {
            size: "lg",
            title: L("New transaction"),
            hint: L("A checker approves it."),
            fields: [
              { key: "txn_type", label: L("txn_type"), type: "select", required: true, options: topt.trade_types ? choices(topt.trade_types) : TRADE_TYPES.map((v) => ({ value: v, label: words(v) })) },
              { key: "security_code", label: L("security"), type: "select", required: true, options: securities },
              { key: "demat_code", label: L("demat"), type: "select", required: true, options: demats },
              { key: "quantity", label: L("quantity"), type: "amount", showIf: (x) => !is("BONUS", "SPLIT", "DIVIDEND")(x) },
              { key: "price", label: L("price"), type: "amount", showIf: is("BUY", "SELL", "RIGHTS", "BUYBACK") },
              { key: "charges", label: L("charges"), type: "amount", showIf: is("BUY", "SELL", "RIGHTS", "BUYBACK") },
              { key: "ratio_from", label: L("ratio_from"), type: "int", showIf: is("BONUS", "SPLIT") },
              { key: "ratio_to", label: L("ratio_to"), type: "int", showIf: is("BONUS", "SPLIT") },
              { key: "new_security_code", label: L("new_security_code"), type: "select", options: securities, showIf: is("MERGER", "DEMERGER") },
              { key: "ratio", label: L("ratio"), type: "amount", showIf: is("MERGER", "DEMERGER") },
              { key: "cost_percent", label: L("cost_percent"), type: "percent", showIf: is("MERGER", "DEMERGER") },
              { key: "to_demat_code", label: L("to_demat_code"), type: "select", options: demats, showIf: is("TRANSFER") },
              { key: "dividend_per_share", label: L("dividend_per_share"), type: "amount", showIf: is("DIVIDEND") },
              { key: "payment_date", label: L("payment_date"), type: "date", showIf: is("DIVIDEND") },
              { key: "settlement_account", label: L("settlement_account"), type: "select", options: accounts, showIf: is("BUY", "SELL", "RIGHTS", "BUYBACK", "DIVIDEND") },
              { key: "broker_code", label: L("broker_code"), showIf: is("BUY", "SELL") },
              { key: "reference", label: L("reference"), required: true },
            ],
            initial: { txn_type: "BUY" },
            run: (x) => tradeApi.add(Object.fromEntries(Object.entries(x).filter(([, v]) => v !== "").map(([k, v]) => [k, ["ratio_from", "ratio_to"].includes(k) ? Number(v) : v]))),
          },
        },
      ]}
      rowActions={approveReject(L, tradeApi)}
    />
  );
}

export function PortfolioValuation() {
  const L = useL();
  const securities = useActive(securityApi);
  const [tab, setTab] = useState("holdings");
  const runBtn = { key: "run", label: L("Run valuation"), icon: Play, right: "Authorize", dialog: { title: L("Run valuation"), hint: L("Values every holding; price movement, stop-loss and stale price alerts are raised."), fields: [{ key: "date", label: L("date"), type: "date", required: true }], initial: { date: today() }, run: (x) => valuationApi.run(x) } };
  return (
    <div className="pt-1">
      {pageHead(L, "portfolioValuation", "Holdings, prices and valuation: cost, carrying value, market value and unrealised gain.")}
      <SegmentedSwitch className="mb-3" value={tab} onChange={setTab} options={[{ value: "holdings", label: L("Holdings") }, { value: "prices", label: L("Prices") }, { value: "history", label: L("Valuations") }]} />
      {tab === "holdings" && (
        <OpsList
          api={holdingApi}
          toolbar={[runBtn]}
          columns={[
            { key: "security_code", label: L("security"), align: "left", render: (r) => <span className="text-xs"><b>{r.name}</b><span className="block font-mono text-[10px] text-muted-foreground">{r.security_code} · {words(r.instrument_type)}</span></span> },
            { key: "classification", label: L("classification"), render: (r) => cell(r.classification) },
            { key: "demat_code", label: L("demat"), render: (r) => cell(r.demat_code) },
            { key: "quantity", label: L("quantity"), render: (r) => cell(`${Number(r.quantity)}${Number(r.pledged_quantity) ? ` (${Number(r.pledged_quantity)} ${L("pledged")})` : ""}`) },
            { key: "average_cost", label: L("average_cost"), render: (r) => cell(Number(r.average_cost).toString()) },
            { key: "total_cost", label: L("total_cost"), render: (r) => cell(r.total_cost) },
            { key: "carrying_value", label: L("carrying_value"), render: (r) => cell(r.carrying_value) },
            { key: "accrued_income", label: L("accrued_income"), render: (r) => cell(r.accrued_income) },
            { key: "review_date", label: L("review_date"), render: (r) => dateCell(r.review_date) },
          ]}
        />
      )}
      {tab === "prices" && (
        <OpsList
          api={priceApi}
          prefix="pr_"
          columns={[
            { key: "price_date", label: L("price_date"), render: (r) => dateCell(r.price_date) },
            { key: "security_code", label: L("security"), render: (r) => cell(r.security_code) },
            { key: "price", label: L("price"), render: (r) => cell(Number(r.price).toString()) },
            { key: "source", label: L("source"), render: (r) => cell(r.source) },
            { key: "entered_by", label: L("entered_by"), render: (r) => cell(r.entered_by) },
          ]}
          toolbar={[
            {
              key: "add",
              label: L("Enter a price"),
              icon: Plus,
              right: "Add",
              dialog: {
                title: L("Enter a price"),
                fields: [
                  { key: "security_code", label: L("security"), type: "select", required: true, options: securities },
                  { key: "price", label: L("price"), type: "amount", required: true },
                  { key: "price_date", label: L("price_date"), type: "date", required: true },
                  { key: "source", label: L("source"), required: true },
                ],
                initial: { price_date: today() },
                run: (x) => priceApi.add({ prices: [x] }),
              },
            },
          ]}
        />
      )}
      {tab === "history" && (
        <OpsList
          api={listOf(valuationApi.history)}
          select={itemsOf}
          prefix="vh_"
          toolbar={[runBtn]}
          columns={[
            { key: "valuation_date", label: L("valuation_date"), render: (r) => dateCell(r.valuation_date) },
            { key: "security_code", label: L("security"), render: (r) => cell(r.security_code) },
            { key: "classification", label: L("classification"), render: (r) => cell(r.classification) },
            { key: "price", label: L("price"), render: (r) => cell(`${Number(r.price)} · ${r.price_source}`) },
            { key: "total_cost", label: L("total_cost"), render: (r) => cell(r.total_cost) },
            { key: "carrying_value", label: L("carrying_value"), render: (r) => cell(r.carrying_value) },
            { key: "market_value", label: L("market_value"), render: (r) => cell(r.market_value) },
            { key: "unrealised_gain", label: L("unrealised_gain"), render: (r) => warnCell(r.unrealised_gain, n(r, "unrealised_gain") < 0) },
            { key: "posted_to_income", label: L("posted_to_income"), render: (r) => cell(r.posted_to_income) },
          ]}
        />
      )}
    </div>
  );
}

// ---------- Borrowings ----------

export function DrawdownsUtilisation() {
  const L = useL();
  const facilities = useActive(borrowingApi, { value: (r) => r.id ?? r.record_id, label: (r) => `${r.code} · ${r.name} · ${r.facility_limit} ${r.currency}` });
  return (
    <OpsList
      api={drawdownApi}
      title="Drawdowns & Utilisation"
      sub="Drawdowns on borrowing facilities (a checker approves when the money is received) and prepayments."
      columns={[
        { key: "drawdown_number", label: L("drawdown"), align: "left", render: (r) => <span className="text-xs"><b>{r.drawdown_number || "—"}</b><span className="block text-[10px] text-muted-foreground">{r.borrowing_code}</span></span> },
        { key: "draw_date", label: L("draw_date"), render: (r) => dateCell(r.draw_date) },
        { key: "amount", label: L("amount"), render: (r) => cell(r.amount) },
        { key: "outstanding", label: L("outstanding"), render: (r) => cell(r.outstanding) },
        { key: "rate", label: L("rate"), render: (r) => cell(pct(r.rate)) },
        { key: "maturity_date", label: L("maturity_date"), render: (r) => dateCell(r.maturity_date) },
        { key: "reference", label: L("reference"), render: (r) => cell(r.reference) },
        { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
      ]}
      toolbar={[
        {
          key: "add",
          label: L("New drawdown"),
          icon: Banknote,
          right: "Add",
          dialog: {
            title: L("New drawdown"),
            hint: L("Within the available limit and before the facility expires; a checker approves."),
            fields: [
              { key: "borrowing_id", label: L("Facility"), type: "select", required: true, options: facilities },
              { key: "amount", label: L("amount"), type: "amount", required: true },
              { key: "draw_date", label: L("draw_date"), type: "date", required: true },
              { key: "reference", label: L("reference"), required: true },
            ],
            initial: { draw_date: today() },
            run: (x) => drawdownApi.add({ ...x, borrowing_id: Number(x.borrowing_id) }),
          },
        },
      ]}
      rowActions={(r) => [
        ...approveReject(L, drawdownApi)(r),
        {
          key: "prepay",
          label: L("Prepay"),
          icon: TrendingDown,
          right: "Authorize",
          show: (x) => x.status === "ACTIVE" && Number(x.outstanding) > 0,
          dialog: {
            title: `${L("Prepay")} · ${r.drawdown_number}`,
            fields: [
              { key: "amount", label: L("amount"), type: "amount", required: true, hint: `${L("outstanding")}: ${r.outstanding}` },
              { key: "repay_date", label: L("repay_date"), type: "date", required: true },
              { key: "reference", label: L("reference"), required: true },
            ],
            initial: { repay_date: today() },
            run: (x) => drawdownApi.prepay({ drawdown_id: Number(r.id), ...x }),
          },
        },
      ]}
    />
  );
}

// ---------- Forex ----------

export function ForexDeals() {
  const L = useL();
  const topt = useTreasuryOptions();
  const parties = useActive(counterpartyApi);
  const accounts = useActive(bankAccountApi);
  return (
    <OpsList
      api={forexApi}
      select={rowsOrOne}
      title="forexDeals"
      sub="Forex deals; on approval the settlement goes on the Treasury Schedule for the value date."
      columns={[
        { key: "deal_number", label: L("deal"), render: (r) => <span className="font-mono text-xs font-bold">{r.deal_number}</span> },
        { key: "deal_type", label: L("deal_type"), render: (r) => cell(words(r.deal_type)) },
        { key: "counterparty_code", label: L("counterparty"), render: (r) => cell(r.counterparty_code) },
        { key: "buy", label: L("Buy"), sortable: false, render: (r) => cell(`${r.buy_amount} ${r.buy_currency}`) },
        { key: "sell", label: L("Sell"), sortable: false, render: (r) => cell(`${r.sell_amount} ${r.sell_currency}`) },
        { key: "deal_rate", label: L("deal_rate"), render: (r) => cell(Number(r.deal_rate).toString()) },
        { key: "value_date", label: L("value_date"), render: (r) => dateCell(r.value_date) },
        { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
      ]}
      toolbar={[
        {
          key: "add",
          label: L("New deal"),
          icon: ArrowLeftRight,
          right: "Add",
          dialog: {
            title: L("New deal"),
            hint: L("A checker approves it."),
            fields: [
              { key: "deal_type", label: L("deal_type"), type: "select", required: true, options: choices(topt.deal_types) },
              { key: "linked_deal_id", label: L("Near leg deal ID"), type: "int", showIf: (x) => x.deal_type === "SWAP_FAR" },
              { key: "counterparty_code", label: L("counterparty"), type: "select", required: true, options: parties },
              { key: "buy_currency", label: L("buy_currency"), type: "select", required: true, options: choices(topt.currencies) },
              { key: "buy_amount", label: L("buy_amount"), type: "amount", required: true },
              { key: "sell_currency", label: L("sell_currency"), type: "select", required: true, options: choices(topt.currencies) },
              { key: "deal_rate", label: L("deal_rate"), type: "rate", required: true },
              { key: "value_date", label: L("value_date"), type: "date", required: true },
              { key: "buy_account", label: L("buy_account"), type: "select", required: true, options: (_c, x) => accounts.filter((a) => !x.buy_currency || a.row.currency === x.buy_currency) },
              { key: "sell_account", label: L("sell_account"), type: "select", required: true, options: (_c, x) => accounts.filter((a) => !x.sell_currency || a.row.currency === x.sell_currency) },
            ],
            initial: { deal_type: "SPOT", value_date: today() },
            run: (x) => forexApi.add(x),
          },
        },
      ]}
      rowActions={approveReject(L, forexApi)}
    />
  );
}

export function FxRevaluation() {
  const L = useL();
  const [preview, setPreview] = useState(null);
  return (
    <OpsList
      api={listOf(fxApi.position)}
      select={itemsOf}
      title="fxRevaluation"
      sub="The open position in each currency, and the revaluation at today's rates."
      rowKey={(r) => r.currency}
      above={() =>
        preview && (
          <Section title={L("Revaluation preview")} className="mb-3">
            <Facts rows={Object.entries(preview).filter(([, v]) => typeof v !== "object").map(([k, v]) => [L(k), String(v)])} />
            <RowsTable
              rows={preview.lines}
              columns={[
                { key: "source", label: L("source"), render: (x) => words(x.source) },
                { key: "code", label: L("code") },
                { key: "currency", label: L("currency") },
                { key: "amount", label: L("amount"), numeric: true },
                { key: "rate", label: L("rate"), render: (x) => (x.rate_missing ? <b className="text-red-700">{L("Missing")}</b> : `${Number(x.previous_rate)} → ${Number(x.rate)}`) },
                { key: "base_value", label: L("base_value"), numeric: true },
                { key: "gain_loss", label: L("gain_loss"), render: (x) => warnCell(x.gain_loss, Number(x.gain_loss) < 0) },
              ]}
            />
          </Section>
        )
      }
      columns={[
        { key: "currency", label: L("currency"), render: (r) => <b className="text-xs">{r.currency}</b> },
        { key: "assets", label: L("assets"), render: (r) => cell(r.assets) },
        { key: "liabilities", label: L("liabilities"), render: (r) => cell(r.liabilities) },
        { key: "net_position", label: L("net_position"), render: (r) => warnCell(r.net_position, n(r, "net_position") < 0) },
        { key: "rate", label: L("rate"), render: (r) => warnCell(r.rate_missing ? L("Missing") : Number(r.rate).toString(), r.rate_missing) },
        { key: "base_value", label: L("base_value"), render: (r) => cell(`${r.base_value} ${r.base_currency}`) },
      ]}
      toolbar={[
        { key: "preview", label: L("Preview revaluation"), icon: Search, right: "Authorize", dialog: { title: L("Preview revaluation"), hint: L("Works it out without posting."), fields: [{ key: "date", label: L("date"), type: "date", required: true }], initial: { date: today() }, run: (x) => fxApi.revalue({ date: x.date, post: false }), after: (r) => setPreview(first(r)) } },
        { key: "post", label: L("Revalue and post"), icon: Play, right: "Authorize", dialog: { title: L("Revalue and post"), hint: L("Posts the revaluation gain or loss to the GL."), fields: [{ key: "date", label: L("date"), type: "date", required: true }], initial: { date: today() }, run: (x) => fxApi.revalue({ date: x.date, post: true }), after: () => setPreview(null) } },
      ]}
    />
  );
}

// ---------- Collateral: records and margin calls ----------

export function CollateralAndMargin() {
  const L = useL();
  const [tab, setTab] = useState("collateral");
  const switcher = <SegmentedSwitch className="mb-3" value={tab} onChange={setTab} options={[{ value: "collateral", label: L("Collateral") }, { value: "calls", label: L("Margin calls") }]} />;
  if (tab === "collateral")
    return (
      <>
        <div className="pt-1">{switcher}</div>
        <CollateralMargin />
      </>
    );
  return (
    <div className="pt-1">
      {switcher}
      <OpsList
        api={marginApi}
        select={rowsOrOne}
        title="Margin calls"
        sub="Margin calls raised when cover falls below the threshold."
        columns={[
          { key: "call_date", label: L("call_date"), render: (r) => dateCell(r.call_date) },
          { key: "collateral_code", label: L("collateral"), render: (r) => cell(r.collateral_code) },
          { key: "direction", label: L("direction"), render: (r) => cell(words(r.direction)) },
          { key: "shortfall", label: L("shortfall"), render: (r) => warnCell(r.shortfall, true) },
          { key: "settled_amount", label: L("settled_amount"), render: (r) => cell(r.settled_amount) },
          { key: "settled_by", label: L("settled_by"), render: (r) => cell(r.settled_by) },
          { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
        ]}
        rowActions={(r) => [
          {
            key: "settle",
            label: L("Settle"),
            icon: CheckCircle2,
            right: "Authorize",
            show: (x) => x.status === "OPEN",
            dialog: {
              title: `${L("Settle the margin call")} · ${r.collateral_code}`,
              fields: [
                { key: "amount", label: L("amount"), type: "amount", required: true, hint: `${L("shortfall")}: ${r.shortfall}` },
                { key: "remarks", label: L("remarks"), type: "textarea", required: true },
              ],
              initial: { amount: r.shortfall },
              run: (x) => marginApi.settle({ id: Number(r.id), ...x }),
            },
          },
        ]}
      />
    </div>
  );
}

// ---------- Fixed assets ----------

export function DepreciationDisposal() {
  const L = useL();
  const topt = useTreasuryOptions();
  const assets = useActive(fixedAssetApi, { value: (r) => r.id ?? r.record_id });
  return (
    <OpsList
      api={listOf(fixedAssetApi.events)}
      select={itemsOf}
      title="Depreciation & Disposal"
      sub="Monthly depreciation, impairment, transfer, maintenance and disposal; every asset event."
      columns={[
        { key: "event_date", label: L("event_date"), render: (r) => dateCell(r.event_date) },
        { key: "asset_code", label: L("asset"), render: (r) => cell(r.asset_code) },
        { key: "event_type", label: L("event"), render: (r) => cell(words(r.event_type)) },
        { key: "amount", label: L("amount"), render: (r) => cell(r.amount) },
        { key: "book_value_after", label: L("book_value_after"), render: (r) => cell(r.book_value_after) },
        { key: "to_location", label: L("to_location"), render: (r) => cell(r.to_location) },
        { key: "remarks", label: L("remarks"), render: (r) => cell(r.remarks) },
        { key: "created_by", label: L("by"), render: (r) => cell(r.created_by) },
      ]}
      toolbar={[
        { key: "depreciate", label: L("Run depreciation"), icon: Play, right: "Authorize", dialog: { title: L("Run depreciation"), hint: L("Once a month per asset."), fields: [{ key: "month", label: L("Month end"), type: "date", required: true }], run: (x) => fixedAssetApi.depreciate(x) } },
        {
          key: "action",
          label: L("Asset action"),
          icon: Plus,
          right: "Authorize",
          dialog: {
            title: L("Asset action"),
            fields: [
              { key: "id", label: L("asset"), type: "select", required: true, options: assets },
              { key: "action", label: L("action"), type: "select", required: true, options: choices(topt.asset_actions) },
              { key: "amount", label: L("amount"), type: "amount", showIf: (x) => x.action !== "TRANSFER" },
              { key: "proceeds_gl_id", label: L("Proceeds GL"), type: "select", options: glChoices(topt.gl_accounts), showIf: (x) => x.action === "DISPOSAL" },
              { key: "to_branch_id", label: L("To branch"), type: "select", options: choices(topt.branches), showIf: (x) => x.action === "TRANSFER" },
              { key: "to_location", label: L("to_location"), showIf: (x) => x.action === "TRANSFER" },
              { key: "remarks", label: L("remarks"), type: "textarea", required: true },
            ],
            run: (x) => fixedAssetApi.action(Object.fromEntries(Object.entries(x).filter(([, v]) => v !== "").map(([k, v]) => [k, ["id", "proceeds_gl_id", "to_branch_id"].includes(k) ? Number(v) : v]))),
          },
        },
      ]}
    />
  );
}

// ---------- Risk & liquidity ----------

const utilTone = (s) => (["BREACH", "EXCEEDED", "BLOCKED"].includes(s) ? "text-red-700 font-bold" : s === "WARN" || s === "WARNING" ? "text-amber-700 font-bold" : "");

export function ExposureMonitor() {
  const L = useL();
  const [d, setD] = useState(null);
  useEffect(() => {
    exposureApi
      .monitor({})
      .then((r) => setD(first(r)))
      .catch((e) => notifications.error(e.message));
  }, []);
  return (
    <div className="pt-1 pb-6">
      {pageHead(L, "exposureMonitor", "Exposure to each counterparty against its limit, and concentration by group, country, currency, industry and instrument.")}
      {d && (
        <>
          <p className="mb-2 text-xs text-muted-foreground">{`${L("as_of")} ${d.as_of} · ${d.base_currency}`}</p>
          <Section title={L("Counterparties")} className="mb-4">
            <RowsTable
              rows={d.counterparties}
              columns={[
                { key: "name", label: L("counterparty"), render: (c) => <span><b>{c.name}</b> <span className="text-[10px] text-muted-foreground">{c.counterparty_code} · {c.rating} · {words(c.list_status)}</span></span> },
                { key: "placements", label: L("placements"), numeric: true },
                { key: "interbank_balances", label: L("interbank_balances"), numeric: true },
                { key: "securities", label: L("securities"), numeric: true },
                { key: "guarantees_received", label: L("guarantees_received"), numeric: true },
                { key: "current_exposure", label: L("current_exposure"), numeric: true },
                { key: "exposure_limit", label: L("exposure_limit"), numeric: true },
                { key: "utilisation_percent", label: L("utilisation"), render: (c) => <span className={utilTone(c.status)}>{pct(c.utilisation_percent)}</span> },
                { key: "status", label: L("status"), render: (c) => <Status code={c.status} /> },
              ]}
            />
          </Section>
          <Section title={L("Concentration")}>
            <RowsTable
              rows={d.concentrations}
              columns={[
                { key: "limit_kind", label: L("limit_kind"), render: (c) => `${words(c.limit_kind)} · ${c.limit_key}` },
                { key: "exposure", label: L("exposure"), numeric: true },
                { key: "limit_amount", label: L("limit_amount"), numeric: true },
                { key: "utilisation_percent", label: L("utilisation"), render: (c) => <span className={utilTone(c.status)}>{pct(c.utilisation_percent)}</span> },
                { key: "status", label: L("status"), render: (c) => <Status code={c.status} /> },
              ]}
            />
          </Section>
        </>
      )}
    </div>
  );
}

export function ReserveCompliance() {
  const L = useL();
  const [open, setOpen] = useState(null);
  const evidence = (e) => {
    try {
      return JSON.stringify(typeof e === "string" ? JSON.parse(e) : e, null, 2);
    } catch {
      return String(e ?? "");
    }
  };
  return (
    <>
      <OpsList
        api={listOf(reserveApi.history)}
        select={itemsOf}
        title="reserveCompliance"
        sub="Reserve calculations (daily) and their history with the evidence."
        columns={[
          { key: "calc_date", label: L("calc_date"), render: (r) => dateCell(r.calc_date) },
          { key: "requirement_code", label: L("requirement"), render: (r) => cell(`${r.requirement_code} · ${r.requirement_type} v${r.requirement_version}`) },
          { key: "liability_base", label: L("liability_base"), render: (r) => cell(r.liability_base) },
          { key: "required_reserve", label: L("required_reserve"), render: (r) => cell(`${r.required_reserve} (${pct(r.required_percent)})`) },
          { key: "eligible_reserve", label: L("eligible_reserve"), render: (r) => cell(r.eligible_reserve) },
          { key: "shortfall", label: L("shortfall"), render: (r) => warnCell(r.shortfall, Number(r.shortfall) > 0) },
          { key: "excess", label: L("excess"), render: (r) => cell(r.excess) },
          { key: "penalty_per_day", label: L("penalty_per_day"), render: (r) => cell(r.penalty_per_day) },
          { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
        ]}
        rowActions={(r) => [{ key: "evidence", label: L("Evidence"), icon: Search, onPress: () => setOpen(r) }]}
        toolbar={[
          {
            key: "calc",
            label: L("Calculate reserves"),
            icon: Play,
            right: "Authorize",
            dialog: {
              title: L("Calculate reserves"),
              hint: L("Leave the requirement empty for all. A manual base is needed for a MANUAL basis."),
              fields: [
                { key: "requirement_code", label: L("requirement_code"), placeholder: "CRR" },
                { key: "manual_base", label: L("manual_base"), type: "amount" },
              ],
              run: (x) => reserveApi.calculate(Object.fromEntries(Object.entries(x).filter(([, v]) => v !== ""))),
            },
          },
        ]}
      />
      {open && (
        <OpDialog size="lg" title={`${L("Evidence")} · ${open.requirement_code} · ${open.calc_date}`} fields={[]} confirmLabel={L("Close")} run={async () => null} onClose={() => setOpen(null)} onDone={() => setOpen(null)}>
          {() => <pre className="max-h-96 overflow-auto rounded-xl bg-muted/40 p-3 text-[11px]">{evidence(open.evidence)}</pre>}
        </OpDialog>
      )}
    </>
  );
}

export function AlmLiquidity() {
  const L = useL();
  const [tab, setTab] = useState("gap");
  const [mode, setMode] = useState("CONTRACTUAL");
  const [data, setData] = useState(null);
  useEffect(() => {
    setData(null);
    almApi[tab](tab === "gap" ? { mode } : {})
      .then((r) => setData(first(r)))
      .catch((e) => notifications.error(e.message));
  }, [tab, mode]);
  const d = data ?? {};
  return (
    <div className="pt-1 pb-6">
      {pageHead(L, "ALM & Liquidity", "Maturity gap, liquidity position, stress tests, funding concentration and the cash-flow forecast.")}
      <SegmentedSwitch className="mb-3" value={tab} onChange={setTab} options={[{ value: "gap", label: L("Maturity gap") }, { value: "liquidity", label: L("Liquidity") }, { value: "stress", label: L("Stress tests") }, { value: "concentration", label: L("Funding concentration") }, { value: "forecast", label: L("Forecast") }]} />
      {tab === "gap" && <SegmentedSwitch className="mb-3" value={mode} onChange={setMode} options={[{ value: "CONTRACTUAL", label: L("Contractual") }, { value: "BEHAVIOURAL", label: L("Behavioural") }]} />}
      {data && (
        <Section title={`${L(tab)}${d.as_of ? ` · ${d.as_of}` : ""}`}>
          {tab === "gap" && (
            <RowsTable
              rows={d.buckets}
              columns={[
                { key: "bucket", label: L("bucket") },
                { key: "expected_inflows", label: L("inflows"), numeric: true },
                { key: "expected_outflows", label: L("outflows"), numeric: true },
                { key: "gap", label: L("gap"), render: (b) => warnCell(b.gap, Number(b.gap) < 0) },
                { key: "cumulative_gap", label: L("cumulative_gap"), render: (b) => warnCell(b.cumulative_gap, Number(b.cumulative_gap) < 0) },
                { key: "gap_to_outflows_percent", label: L("Gap / outflows"), render: (b) => pct(b.gap_to_outflows_percent) },
                { key: "repricing_gap", label: L("repricing_gap"), numeric: true },
                { key: "sources", label: L("By source"), render: (b) => <span className="text-[10px]">{`${L("In")}: ${mapText(b.inflows_by_source)} | ${L("Out")}: ${mapText(b.outflows_by_source)}`}</span> },
              ]}
            />
          )}
          {tab === "liquidity" && <Facts rows={Object.entries(d).filter(([k]) => !["as_of"].includes(k)).map(([k, v]) => [L(k), String(v)])} />}
          {tab === "stress" && (
            <>
              <p className="mb-2 text-xs text-muted-foreground">{`${L("horizon_days")}: ${d.horizon_days}`}</p>
              <RowsTable rows={d.scenarios} columns={[{ key: "scenario", label: L("scenario") }, { key: "deposit_runoff", label: L("deposit_runoff"), numeric: true }, { key: "outflows", label: L("outflows"), numeric: true }, { key: "stressed_inflows", label: L("stressed_inflows"), numeric: true }, { key: "stressed_securities", label: L("stressed_securities"), numeric: true }, { key: "borrowing_lines", label: L("borrowing_lines"), numeric: true }, { key: "available", label: L("available"), numeric: true }, { key: "surplus", label: L("surplus"), render: (s) => warnCell(s.surplus, Number(s.surplus) < 0) }, { key: "status", label: L("status"), render: (s) => <Status code={s.status} /> }]} />
            </>
          )}
          {tab === "concentration" && (
            <>
              <Facts className="mb-3" rows={[[L("total_funding"), d.total_funding], [L("top_depositors_share_percent"), pct(d.top_depositors_share_percent)]]} />
              <div className="grid gap-4 lg:grid-cols-2">
                <RowsTable rows={d.lenders} columns={[{ key: "lender", label: L("lender") }, { key: "amount", label: L("amount"), numeric: true }, { key: "share_percent", label: L("share"), render: (x) => pct(x.share_percent) }]} />
                <RowsTable rows={d.top_depositors} columns={[{ key: "depositor", label: L("depositor") }, { key: "amount", label: L("amount"), numeric: true }, { key: "share_percent", label: L("share"), render: (x) => pct(x.share_percent) }]} />
              </div>
            </>
          )}
          {tab === "forecast" && <RowsTable rows={d.items} columns={[{ key: "date", label: L("date"), render: (x) => dateCell(x.date) }, { key: "contractual_inflows", label: L("contractual_inflows"), numeric: true }, { key: "contractual_outflows", label: L("contractual_outflows"), numeric: true }, { key: "contractual_cumulative", label: L("contractual_cumulative"), render: (x) => warnCell(x.contractual_cumulative, Number(x.contractual_cumulative) < 0) }, { key: "behavioural_inflows", label: L("behavioural_inflows"), numeric: true }, { key: "behavioural_outflows", label: L("behavioural_outflows"), numeric: true }, { key: "behavioural_cumulative", label: L("behavioural_cumulative"), render: (x) => warnCell(x.behavioural_cumulative, Number(x.behavioural_cumulative) < 0) }]} />}
        </Section>
      )}
    </div>
  );
}

// ---------- Schedule and alerts ----------

function TreasuryDashboard() {
  const L = useL();
  const [d, setD] = useState(null);
  useEffect(() => {
    dashboardApi
      .dashboard({})
      .then((r) => setD(first(r)))
      .catch(() => {});
  }, []);
  if (!d) return null;
  const t = d.totals ?? {};
  const a = d.alerts ?? {};
  return (
    <Section title={`${L("Overview")} · ${d.as_of} · ${d.base_currency}`} className="mb-4">
      <Facts
        className="mb-3"
        rows={[
          [L("total_investments"), t.total_investments],
          [L("placements"), t.placements],
          [L("securities"), t.securities],
          [L("interbank_balances"), t.interbank_balances],
          [L("total_borrowings"), t.total_borrowings],
          [L("contingent_liabilities"), t.contingent_liabilities],
          [L("interest_receivable"), t.interest_receivable],
          [L("projected_surplus"), d.liquidity?.projected_surplus],
          [L("Open alerts"), `${a.open ?? 0} (${a.critical ?? 0} ${L("critical")})`, a.critical ? "text-red-700" : undefined],
          [L("overdue_events"), a.overdue_events, a.overdue_events ? "text-red-700" : undefined],
          [L("accounts_below_minimum"), a.accounts_below_minimum, a.accounts_below_minimum ? "text-red-700" : undefined],
        ]}
      />
      {(d.reserves ?? []).length > 0 && <RowsTable rows={d.reserves} columns={[{ key: "requirement", label: L("requirement") }, { key: "date", label: L("date") }, { key: "required", label: L("required"), numeric: true }, { key: "eligible", label: L("eligible"), numeric: true }, { key: "shortfall", label: L("shortfall"), render: (x) => warnCell(x.shortfall, Number(x.shortfall) > 0) }, { key: "status", label: L("status"), render: (x) => <Status code={x.status} /> }]} />}
      {(d.limit_alerts ?? []).length > 0 && (
        <div className="mt-3">
          <RowsTable rows={d.limit_alerts} columns={Object.keys(d.limit_alerts[0]).map((k) => ({ key: k, label: L(k) }))} />
        </div>
      )}
    </Section>
  );
}

export function TreasurySchedule() {
  const L = useL();
  return (
    <OpsList
      api={eventApi}
      title="treasurySchedule"
      sub="Every contract's events, expected against actual. Settling an event posts it to the GL and books it on the interbank account."
      above={() => <TreasuryDashboard />}
      columns={[
        { key: "due_date", label: L("due_date"), render: (r) => dateCell(r.due_date) },
        { key: "ref_code", label: L("contract"), align: "left", render: (r) => <span className="text-xs"><b>{r.ref_code}</b><span className="block text-[10px] text-muted-foreground">{words(r.kind)}</span></span> },
        { key: "event_type", label: L("event"), render: (r) => cell(words(r.event_type)) },
        { key: "direction", label: L("direction"), render: (r) => cell(r.direction) },
        { key: "amount", label: L("amount"), render: (r) => cell(`${r.amount} ${r.currency}`) },
        { key: "actual_amount", label: L("actual_amount"), render: (r) => cell(r.actual_amount ? `${r.actual_amount} · ${r.actual_date}` : "") },
        { key: "variance", label: L("variance"), render: (r) => warnCell(r.variance, Number(r.variance) !== 0) },
        { key: "note", label: L("note"), render: (r) => cell(r.note) },
        { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
      ]}
      toolbar={[{ key: "accrual", label: L("Run accruals"), icon: Play, right: "Authorize", dialog: { title: L("Run accruals"), fields: [{ key: "to", label: L("Up to"), type: "date", required: true }], initial: { to: today() }, run: (x) => accrualApi.run(x) } }]}
      rowActions={(r) => [
        {
          key: "settle",
          label: L("Settle"),
          icon: CheckCircle2,
          right: "Authorize",
          show: (x) => x.status !== "DONE" && x.status !== "CANCELLED",
          dialog: {
            title: `${L("Settle")} · ${r.ref_code} · ${words(r.event_type)}`,
            hint: L("A different amount from the expected one raises a variance alert."),
            fields: [
              { key: "actual_amount", label: L("actual_amount"), type: "amount", required: true, hint: `${L("Expected")}: ${r.amount}` },
              { key: "actual_date", label: L("actual_date"), type: "date", required: true },
              { key: "reference", label: L("reference"), required: true },
              { key: "renew", label: L("Renew on maturity"), type: "bool", showIf: () => String(r.event_type).includes("MATURITY") },
              { key: "renew_rate", label: L("renew_rate"), type: "rate", showIf: (x) => x.renew },
            ],
            initial: { actual_amount: r.amount, actual_date: r.due_date },
            run: (x) => eventApi.settle({ id: Number(r.id), actual_amount: x.actual_amount, actual_date: x.actual_date, reference: x.reference, ...(x.renew ? { renew: true, renew_rate: x.renew_rate } : {}) }),
          },
        },
      ]}
    />
  );
}

export function AlertCentre() {
  const L = useL();
  const sev = (s) => (s === "CRITICAL" ? "FAILED" : s === "HIGH" || s === "WARNING" ? "OVERDUE" : s);
  return (
    <OpsList
      api={alertApi}
      title="alertCentre"
      sub="Treasury alerts raised daily (02:30) and on events: acknowledge and close them."
      columns={[
        { key: "raised_at", label: L("raised_at"), render: (r) => dateCell(r.raised_at) },
        { key: "severity", label: L("severity"), render: (r) => <Status code={sev(r.severity)} /> },
        { key: "title", label: L("alert"), align: "left", render: (r) => <span className="text-xs"><b>{r.title}</b><span className="block text-[10px] text-muted-foreground">{r.body}</span></span> },
        { key: "alert_type", label: L("alert_type"), render: (r) => cell(words(r.alert_type)) },
        { key: "due_date", label: L("due_date"), render: (r) => dateCell(r.due_date) },
        { key: "notified_roles", label: L("notified"), render: (r) => cell(`${words(r.notified_roles)} · L${r.level}`) },
        { key: "acknowledged_by", label: L("acknowledged_by"), render: (r) => cell(r.acknowledged_by) },
        { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
      ]}
      toolbar={[{ key: "run", label: L("Raise alerts now"), icon: Bell, right: "Authorize", call: alertApi.run, body: {} }]}
      rowActions={(r) => [
        { key: "ack", flag: "acknowledge", label: L("Acknowledge"), icon: CheckCircle2, right: "Edit", show: (x) => x.status === "OPEN", dialog: { title: L("Acknowledge"), fields: [{ key: "remarks", label: L("remarks"), type: "textarea", required: true }], run: (x) => alertApi.acknowledge({ ids: [Number(r.id)], close: false, remarks: x.remarks }) } },
        { key: "close", label: L("Close"), icon: CheckCheck, right: "Edit", show: (x) => x.status !== "CLOSED", dialog: { title: L("Close the alert"), fields: [{ key: "remarks", label: L("remarks"), type: "textarea", required: true }], run: (x) => alertApi.acknowledge({ ids: [Number(r.id)], close: true, remarks: x.remarks }) } },
      ]}
    />
  );
}

export function TreasuryReports() {
  return <CatalogueReports api={reportApi} title="treasuryReports" sub="Pick a treasury report from the catalogue and run it." />;
}
