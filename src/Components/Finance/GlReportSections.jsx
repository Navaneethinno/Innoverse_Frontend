import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/Components/Common/DataTable";
import { DateInput } from "@/Components/Common/DateInput";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { ListPanel } from "@/Components/Common/ListPanel";
import { SearchBox } from "@/Components/Common/SearchBox";
import { Spinner } from "@/Components/Common/Spinner";
import { Toggle } from "@/Components/Common/Toggle";
import { accountDate } from "@/Components/Finance/Accounts/accountShared";
import { glReportsApi } from "@/Services/Accounting/accounting.api";
import { request } from "@/Services/Epurse/onboarding.api";

// F3: the active account products for the filter.
const acctProductsApi = { getActive: (body) => request("/config/acct/product/get_active", body) };
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { ExportButtons } from "../Reports/Shared/reportShared";
import { glAmount } from "./accountingShared";
import { branchOptions, useCoreBanking } from "./coreBankingShared";
import { inputClass } from "./Deposits/depositShared";
import { useInstitutionScope } from "./Loans/loanShared";

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 8)}01`;

// Loads one GL report call whenever `body` changes.
function useReport(call, body) {
  const [data, setData] = useState(null);
  const key = JSON.stringify(body);
  useEffect(() => {
    let cancelled = false;
    setData(null);
    glReportsApi[call](JSON.parse(key))
      .then((r) => !cancelled && setData(rowsOf(r)[0] ?? {}))
      .catch((e) => {
        if (cancelled) return;
        notifications.error(e.message);
        setData({});
      });
    return () => {
      cancelled = true;
    };
  }, [call, key]);
  return data;
}

const DateField = ({ label, ...props }) => (
  <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
    {label}
    <DateInput className={cn(inputClass, "w-auto")} {...props} />
  </label>
);

// Green "The books balance" when `difference` is 0, else red with it.
export function BalanceCheck({ difference, currency, okKey = "balanced" }) {
  const { t } = useTranslation("accounting");
  const diff = Number(difference ?? 0);
  return (
    <span className={cn("inline-block rounded-xl px-3 py-1.5 text-xs font-bold", diff === 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
      {diff === 0 ? t(okKey) : t("differenceX", { value: glAmount(diff, currency) })}
    </span>
  );
}

// The trial balance and GL movement, drawn from the backend's `sections`:
// per section a heading row, its GROUP / ACCOUNT / GROUP_TOTAL / CLASS rows
// (indented by depth) and the section total. `amounts`: [[field, label]],
// with `sectionField` mapping a row field to the section's total field.
export function SectionsTable({ sections, amounts, currency, footer }) {
  const { t } = useTranslation("accounting");
  const cols = 3 + amounts.length;
  const amt = (v) => (v == null || v === "" ? "" : glAmount(v, currency));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5">{t("glCode")}</th>
            <th className="px-3 py-2.5">{t("gl")}</th>
            <th className="px-3 py-2.5">{t("accountNumber")}</th>
            {amounts.map(([, label]) => (
              <th key={label} className="px-3 py-2.5 text-right">
                {t(label)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sections.map((s) => (
            <SectionRows key={s.gl_type} section={s} amounts={amounts} amt={amt} cols={cols} />
          ))}
        </tbody>
        {footer && <tfoot>{footer}</tfoot>}
      </table>
    </div>
  );
}

function SectionRows({ section: s, amounts, amt, cols }) {
  const { t } = useTranslation("accounting");
  return (
    <>
      <tr className="border-b border-border bg-muted/50">
        <td colSpan={cols} className="px-4 py-2 text-xs font-black uppercase tracking-wider">
          {s.label}
        </td>
      </tr>
      {(s.rows ?? []).map((r, i) => {
        const pad = { paddingLeft: 12 + (r.depth ?? 0) * 16 };
        if (r.kind === "GROUP") {
          return (
            <tr key={i} className="border-b border-border/40">
              <td className="px-4 py-1.5 font-mono text-xs">{r.gl_code || ""}</td>
              <td className="py-1.5 pr-3 text-xs font-bold" style={pad} colSpan={cols - 1}>
                {r.name}
              </td>
            </tr>
          );
        }
        const total = r.kind === "GROUP_TOTAL";
        return (
          <tr key={i} className={cn("border-b border-border/40", total && "border-t border-t-border", r.kind === "CLASS" && "bg-muted/20")}>
            <td className="px-4 py-1.5 font-mono text-xs">{total ? "" : r.gl_code || ""}</td>
            <td className={cn("py-1.5 pr-3 text-xs", total && "italic font-semibold")} style={pad}>
              <span className="inline-flex items-center gap-1.5">
                {r.name}
                {r.kind === "CLASS" && <span className="text-[10px] font-normal text-muted-foreground">· {t("notGls")}</span>}
                {r.wrong_side && <span title={t("wrongSide")} className="inline-block h-2 w-2 rounded-full bg-amber-500" />}
              </span>
            </td>
            <td className="px-3 py-1.5 font-mono text-[11px] text-muted-foreground">{r.account_number || ""}</td>
            {amounts.map(([field]) => (
              <td key={field} className={cn("px-3 py-1.5 text-right text-xs tabular-nums", total && "italic font-semibold")}>
                {amt(r[field])}
              </td>
            ))}
          </tr>
        );
      })}
      <tr className="border-b-2 border-border">
        <td />
        <td colSpan={2} className="px-3 py-2 text-xs font-black">
          {t("totalOfSection", { label: s.label.toLowerCase() })}
        </td>
        {amounts.map(([field, , sectionField]) => (
          <td key={field} className="px-3 py-2 text-right text-xs font-black tabular-nums">
            {amt(s[sectionField ?? field])}
          </td>
        ))}
      </tr>
    </>
  );
}

// GL Reports › GL movement: every GL between two dates, opening, debits,
// credits and closing (on the GL's normal side), to check two trial
// balances against each other.
export function GlMovement({ currencies }) {
  const { t } = useTranslation("accounting");
  const branches = branchOptions(useCoreBanking(useInstitutionScope().scope));
  const [q, setQ] = useState({ from: monthStart(), to: today(), currency_id: "", branch_id: "", include_zero: false });
  const body = useMemo(
    () => ({ from: q.from, to: q.to, currency_id: Number(q.currency_id || 0), branch_id: Number(q.branch_id || 0), include_zero: q.include_zero }),
    [q],
  );
  const data = useReport("movement", body);
  const set = (key) => (v) => setQ((x) => ({ ...x, [key]: v?.target ? v.target.value : v }));
  const cur = data?.currency_code;
  return (
    <ListPanel
      tabs={[]}
      filters={
        <>
          <DateField label={t("from")} value={q.from} max={q.to || today()} onChange={set("from")} />
          <DateField label={t("to")} value={q.to} min={q.from} max={today()} onChange={set("to")} />
          <FilterSelect value={q.currency_id} onChange={set("currency_id")} options={[{ value: "", label: t("baseCurrency") }, ...currencies.map((c) => ({ value: String(c.id), label: c.alpha_code }))]} />
          {branches.length > 0 && <FilterSelect value={q.branch_id} onChange={set("branch_id")} options={[{ value: "", label: t("allBranches") }, ...branches]} />}
          <Toggle showLabel label={t("showNoMovement")} checked={q.include_zero} onChange={set("include_zero")} />
          <ExportButtons exportFile={(format) => glReportsApi.movementExport({ ...body, format })} />
        </>
      }
    >
      {!data ? (
        <div className="flex justify-center p-8">
          <Spinner size={18} />
        </div>
      ) : (
        <SectionsTable
          sections={data.sections ?? []}
          currency={cur}
          amounts={[
            ["opening", "opening"],
            ["debits", "debits"],
            ["credits", "credits"],
            ["closing", "closing"],
          ]}
          footer={
            <>
              <tr>
                <td colSpan={4} className="px-4 py-2.5 text-xs font-black">
                  {t("totals")} <span className="font-normal text-muted-foreground">· {data.from} – {data.to}</span>
                </td>
                <td className="px-3 py-2.5 text-right text-sm font-black tabular-nums">{glAmount(data.total_debits, cur)}</td>
                <td className="px-3 py-2.5 text-right text-sm font-black tabular-nums">{glAmount(data.total_credits, cur)}</td>
                <td />
              </tr>
              <tr>
                <td colSpan={7} className="px-4 pb-3">
                  <BalanceCheck difference={data.difference} currency={cur} />
                </td>
              </tr>
            </>
          }
        />
      )}
    </ListPanel>
  );
}

const PARTIES = ["ALL", "CUSTOMER", "MERCHANT"];

// GL Reports › Customer balances: every customer's and merchant's account
// on a date; with a start date also opening, credits and debits.
export function CustomerBalances({ currencies }) {
  const { t } = useTranslation("accounting");
  const [q, setQ] = useState({ as_of: today(), from: "", party: "ALL", currency_id: "", acct_product_id: "", search: "", include_zero: false });
  const [products, setProducts] = useState([]);
  useEffect(() => {
    acctProductsApi
      .getActive({ view: "dropdown" })
      .then((r) => setProducts(Array.isArray(r?.data) ? r.data : []))
      .catch(() => setProducts([]));
  }, []);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const body = useMemo(
    () => ({
      as_of: q.as_of,
      ...(q.from ? { from: q.from } : {}),
      party: q.party,
      acct_product_id: Number(q.acct_product_id || 0),
      currency_id: Number(q.currency_id || 0),
      search: q.search.trim(),
      include_zero: q.include_zero,
    }),
    [q],
  );
  const data = useReport("customer_balance", { ...body, page, page_size: limit });
  const set = (key) => (v) => {
    setQ((x) => ({ ...x, [key]: v?.target ? v.target.value : v }));
    setPage(1);
  };
  const ranged = Boolean(data?.from);
  const amount = (field) => ({
    key: field,
    label: t(`cb_${field}`),
    render: (a) => <span className={cn("whitespace-nowrap text-xs tabular-nums", field === "balance" && "font-bold", Number(a[field]) < 0 && "text-red-700")}>{glAmount(a[field], a.currency_code)}</span>,
  });
  return (
    <ListPanel
      tabs={[]}
      filters={
        <>
          <SearchBox search={q.search} onSearch={set("search")} placeholder={t("cbSearch")} />
          <DateField label={t("asOf")} value={q.as_of} max={today()} onChange={set("as_of")} />
          <DateField label={t("fromOptional")} value={q.from} max={q.as_of} onChange={set("from")} />
          <FilterSelect value={q.party} onChange={set("party")} options={PARTIES.map((p) => ({ value: p, label: t(`cbParty_${p}`) }))} />
          {products.length > 0 && <FilterSelect value={q.acct_product_id} onChange={set("acct_product_id")} options={[{ value: "", label: t("anyAccountProduct") }, ...products.map((p) => ({ value: String(p.id), label: p.name }))]} />}
          <FilterSelect value={q.currency_id} onChange={set("currency_id")} options={[{ value: "", label: t("allCurrencies") }, ...currencies.map((c) => ({ value: String(c.id), label: c.alpha_code }))]} />
          <Toggle showLabel label={t("includeZeroBalances")} checked={q.include_zero} onChange={set("include_zero")} />
          <ExportButtons exportFile={(format) => glReportsApi.customerBalanceExport({ ...body, format })} />
        </>
      }
    >
      <DataTable
        bare
        columns={[
          { key: "acct_num", label: t("accountNumber"), render: (a) => <span className="font-mono text-xs font-bold">{a.acct_num}</span> },
          {
            key: "owner_name",
            label: t("owner"),
            align: "left",
            render: (a) => (
              <span className="text-xs">
                <span className="font-semibold">{a.owner_name}</span>
                <span className="block text-[10px] text-muted-foreground">{t(`ownerType_${a.entity_type}`, { defaultValue: a.entity_type })}</span>
              </span>
            ),
          },
          { key: "acct_product_name", label: t("accountProduct"), render: (a) => <span className="text-xs">{a.acct_product_name}</span> },
          { key: "currency_code", label: t("currency"), render: (a) => <span className="text-xs">{a.currency_code}</span> },
          ...(ranged ? [amount("opening_balance"), amount("credits"), amount("debits")] : []),
          amount("balance"),
        ]}
        rows={data?.items ?? []}
        rowKey={(a) => a.acct_id}
        isLoading={!data}
        title={t("repTab_customer_balance")}
        emptyTitle={t("noAccounts")}
        serverSorted
        serverPagination={{
          page,
          totalPages: Math.max(1, Math.ceil((data?.total ?? 0) / limit)),
          totalRecords: data?.total ?? 0,
          onPageChange: setPage,
          limit,
          onLimitChange: (n) => {
            setLimit(n);
            setPage(1);
          },
        }}
      />
      {(data?.totals ?? []).length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-border p-3">
          {data.totals.map((x) => (
            <div key={x.currency_code} className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs">
              <p className="font-black">
                {x.currency_code} · {t("accountsCount", { count: x.accounts })}
              </p>
              <p className="tabular-nums text-muted-foreground">
                {ranged && `${t("cb_opening_balance")} ${glAmount(x.opening_balance, x.currency_code)} · ${t("cb_credits")} ${glAmount(x.credits, x.currency_code)} · ${t("cb_debits")} ${glAmount(x.debits, x.currency_code)} · `}
                <b className="text-foreground">
                  {t("cb_balance")} {glAmount(x.balance, x.currency_code)}
                </b>
              </p>
            </div>
          ))}
        </div>
      )}
    </ListPanel>
  );
}

// Net profit in green or net loss in red (`result`: { kind, amount }).
export function ResultRow({ result, currency }) {
  const { t } = useTranslation("statements");
  if (!result) return null;
  const loss = result.kind === "LOSS";
  return (
    <div className={cn("flex justify-between gap-3 rounded-xl px-3 py-2 text-sm font-black", loss ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")}>
      <span>{t(loss ? "resultLoss" : "resultProfit")}</span>
      <span className="tabular-nums">{glAmount(result.amount, currency)}</span>
    </div>
  );
}

// A negative amount is a reversal or correction: shown in brackets.
const bracketed = (v, currency) => (Number(v) < 0 ? `(${glAmount(Math.abs(Number(v)), currency)})` : Number(v) ? glAmount(v, currency) : "");

// Profit and loss, Detailed: every income and expense entry of the period.
export function ProfitLossDetail({ body, currency }) {
  const { t } = useTranslation("statements");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const data = useReport("profit_loss", { ...body, detail: true, page, page_size: limit });
  const cur = data?.currency_code ?? currency;
  return (
    <div className="grid min-w-0 gap-3">
      <div className="min-w-0 overflow-x-auto">
      <DataTable
        bare
        columns={[
          { key: "tran_date_time", label: t("date"), render: (e) => <span className="whitespace-nowrap text-xs">{accountDate(e.tran_date_time)}</span> },
          { key: "rrn", label: "RRN", render: (e) => <span className="font-mono text-xs">{e.rrn}</span> },
          { key: "txn_type", label: t("type"), render: (e) => <span className="text-xs">{e.txn_type}</span> },
          { key: "description", label: t("description"), align: "left", render: (e) => <span className="line-clamp-2 block max-w-72 text-xs">{e.description}</span> },
          { key: "gl_name", label: t("gl"), align: "left", render: (e) => <span className="text-xs">{[e.gl_code, e.gl_name].filter(Boolean).join(" · ")}</span> },
          { key: "income_amount", label: t("income"), render: (e) => <span className="whitespace-nowrap text-xs tabular-nums text-emerald-700">{bracketed(e.income_amount, cur)}</span> },
          { key: "expense_amount", label: t("expense"), render: (e) => <span className="whitespace-nowrap text-xs tabular-nums text-red-700">{bracketed(e.expense_amount, cur)}</span> },
        ]}
        rows={data?.entries ?? []}
        rowKey={(e, i) => `${e.rrn}-${e.gl_account_id}-${i}`}
        isLoading={!data}
        title={t("plDetailed")}
        emptyTitle={t("noLines")}
        serverSorted
        serverPagination={{
          page,
          totalPages: Math.max(1, Math.ceil((data?.entries_total ?? 0) / limit)),
          totalRecords: data?.entries_total ?? 0,
          onPageChange: setPage,
          limit,
          onLimitChange: (n) => {
            setLimit(n);
            setPage(1);
          },
        }}
      />
      </div>
      {data && <PlTotals data={data} currency={cur} />}
    </div>
  );
}

// Profit and loss, By day: income, expenses and net per day.
export function ProfitLossByDay({ body, currency }) {
  const { t } = useTranslation("statements");
  const data = useReport("profit_loss", { ...body, by_day: true });
  if (!data) return <Spinner size={18} />;
  const cur = data.currency_code ?? currency;
  const days = data.days ?? [];
  return (
    <div className="grid gap-3">
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5">{t("date")}</th>
              <th className="px-3 py-2.5 text-right">{t("income")}</th>
              <th className="px-3 py-2.5 text-right">{t("expenses")}</th>
              <th className="px-3 py-2.5 text-right">{t("net")}</th>
            </tr>
          </thead>
          <tbody>
            {!days.length && (
              <tr>
                <td colSpan={4} className="px-4 py-3 text-muted-foreground">
                  {t("noLines")}
                </td>
              </tr>
            )}
            {days.map((d) => (
              <tr key={d.date} className="border-b border-border/50">
                <td className="px-4 py-1.5 text-xs">{d.date}</td>
                <td className="px-3 py-1.5 text-right text-xs tabular-nums">{glAmount(d.income, cur)}</td>
                <td className="px-3 py-1.5 text-right text-xs tabular-nums">{glAmount(d.expenses, cur)}</td>
                <td className={cn("px-3 py-1.5 text-right text-xs font-bold tabular-nums", Number(d.net) < 0 && "text-red-700")}>{glAmount(d.net, cur)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border font-black">
              <td className="px-4 py-2 text-xs">{t("totals")}</td>
              <td className="px-3 py-2 text-right text-xs tabular-nums">{glAmount(data.income?.total, cur)}</td>
              <td className="px-3 py-2 text-right text-xs tabular-nums">{glAmount(data.expenses?.total, cur)}</td>
              <td className="px-3 py-2 text-right text-xs tabular-nums">{glAmount(days.reduce((s, d) => s + Number(d.net || 0), 0), cur)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <ResultRow result={data.result} currency={cur} />
    </div>
  );
}

function PlTotals({ data, currency }) {
  const { t } = useTranslation("statements");
  return (
    <div className="grid gap-1 rounded-2xl border border-border bg-muted/30 p-4 text-sm">
      <div className="flex justify-between">
        <b>{t("totalIncome")}</b>
        <b className="tabular-nums">{glAmount(data.income?.total, currency)}</b>
      </div>
      <div className="flex justify-between">
        <b>{t("totalExpenditure")}</b>
        <b className="tabular-nums">{glAmount(data.expenses?.total, currency)}</b>
      </div>
      <ResultRow result={data.result} currency={currency} />
    </div>
  );
}

// Cash flow, Direct: cash at the start, received and paid by kind of
// transaction, the net change, cash at the end, and the reconciliation.
export function DirectCashFlow({ data }) {
  const { t } = useTranslation("statements");
  const cur = data.currency_code;
  const block = (title, part) => (
    <section>
      <h3 className="mb-1.5 text-xs font-black uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="overflow-hidden rounded-2xl border border-border">
        {!(part?.lines ?? []).length && <p className="px-4 py-3 text-sm text-muted-foreground">{t("noLines")}</p>}
        {(part?.lines ?? []).map((l) => (
          <div key={l.code} className="flex justify-between gap-3 border-b border-border px-4 py-2 text-sm last:border-b-0">
            <span className="font-semibold">{l.label}</span>
            <span className="tabular-nums">{glAmount(l.amount, cur)}</span>
          </div>
        ))}
        <div className="flex justify-between gap-3 bg-muted/40 px-4 py-2 text-sm font-black">
          <span>{t("totalOf", { title })}</span>
          <span className="tabular-nums">{glAmount(part?.total ?? "0", cur)}</span>
        </div>
      </div>
    </section>
  );
  const diff = Number(data.difference ?? 0);
  return (
    <div className="grid gap-4">
      <div className="flex justify-between rounded-2xl border border-border px-4 py-2.5 text-sm">
        <b>{t("cashAtStart")}</b>
        <b className="tabular-nums">{glAmount(data.opening_cash, cur)}</b>
      </div>
      {block(t("cashReceived"), data.receipts)}
      {block(t("cashPaid"), data.payments)}
      <div className="grid gap-1 rounded-2xl border border-border bg-muted/30 p-4 text-sm">
        <div className="flex justify-between">
          <b>{t("netChange")}</b>
          <b className={cn("tabular-nums", Number(data.net_change) < 0 && "text-red-700")}>{glAmount(data.net_change, cur)}</b>
        </div>
        <div className="flex justify-between">
          <b>{t("cashAtEnd")}</b>
          <b className="tabular-nums">{glAmount(data.closing_cash, cur)}</b>
        </div>
        <span className={cn("mt-1 inline-block justify-self-start rounded-xl px-3 py-1.5 text-xs font-bold", diff === 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
          {diff === 0 ? t("reconciles") : `${t("difference")}: ${glAmount(diff, cur)}`}
        </span>
      </div>
    </div>
  );
}
