import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight } from "lucide-react";
import { DataTable } from "@/Components/Common/DataTable";
import { DateInput } from "@/Components/Common/DateInput";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { ListPanel } from "@/Components/Common/ListPanel";
import { PageTitle } from "@/Components/Common/PageTitle";
import { Spinner } from "@/Components/Common/Spinner";
import { Toggle } from "@/Components/Common/Toggle";
import { accountDate } from "@/Components/Epurse/Accounts/accountShared";
import { glAccountsApi, glReportsApi } from "@/Services/Accounting/accounting.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { Tabs } from "../Loans/loanShared";
import { ExportButtons } from "../Reports/Shared/reportShared";
import { inputClass } from "../TermDeposits/depositShared";
import { GlType, glAmount, useGlAccounts } from "./accountingShared";

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 8)}01`;

// ACCOUNTING > GL Reports (menu 216): one GL account's statement for a
// period, and the trial balance at a date. Amounts are on each GL's normal
// side, so a positive balance is the usual case.
export function GlReports() {
  const { t } = useTranslation("accounting");
  const [tab, setTab] = useState("statement");
  const [currencies, setCurrencies] = useState([]);
  useEffect(() => {
    glAccountsApi
      .options({})
      .then((r) => setCurrencies(rowsOf(r)[0]?.currencies ?? []))
      .catch(() => setCurrencies([]));
  }, []);
  return (
    <div className="pb-8 pt-4">
      <div className="mb-4">
        <PageTitle>{t("repTitle")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("repSubtitle")}</p>
      </div>
      <Tabs tabs={[{ key: "statement" }, { key: "trial" }]} value={tab} onChange={setTab} labelOf={(k) => t(`repTab_${k}`)} />
      {tab === "statement" ? <Statement currencies={currencies} /> : <TrialBalance currencies={currencies} />}
    </div>
  );
}

const Figure = ({ label, value, currency, strong }) => (
  <div className="min-w-[9rem] rounded-2xl border border-border bg-card px-4 py-3">
    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className={cn("mt-0.5 tabular-nums", strong ? "text-xl font-black" : "text-base font-bold", Number(value) < 0 && "text-red-700")}>{glAmount(value, currency)}</p>
  </div>
);

function Statement({ currencies }) {
  const { t } = useTranslation("accounting");
  const accounts = useGlAccounts();
  const [q, setQ] = useState({ gl_account_id: "", currency_id: "", from: monthStart(), to: today() });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const set = (key) => (value) => {
    setQ((x) => ({ ...x, [key]: value?.target ? value.target.value : value }));
    setPage(1);
  };
  const gl = (accounts ?? []).find((g) => String(g.id) === q.gl_account_id);
  const body = useMemo(
    () => (q.gl_account_id ? { gl_account_id: Number(q.gl_account_id), ...(q.currency_id ? { currency_id: Number(q.currency_id) } : {}), ...(q.from ? { from: q.from } : {}), ...(q.to ? { to: q.to } : {}) } : null),
    [q],
  );

  useEffect(() => {
    if (!body) return undefined;
    let cancelled = false;
    setLoading(true);
    glReportsApi
      .statement({ ...body, page, page_size: limit })
      .then((r) => !cancelled && setData(rowsOf(r)[0] ?? null))
      .catch((e) => {
        if (!cancelled) {
          notifications.error(e.message);
          setData(null);
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [body, page, limit]);

  const cur = data?.currency_code;
  return (
    <div className="grid gap-4">
      <ListPanel
        tabs={[]}
        filters={
          <>
            <div className="min-w-[18rem]">
              <FilterSelect value={q.gl_account_id} onChange={set("gl_account_id")} options={[{ value: "", label: accounts ? t("pickGl") : t("loading") }, ...(accounts ?? []).map((g) => ({ value: String(g.id), label: `${g.name} · ${[g.gl_code, g.account_number].filter(Boolean).join(" · ")}` }))]} />
            </div>
            {gl?.multi_currency && <FilterSelect value={q.currency_id} onChange={set("currency_id")} options={[{ value: "", label: t("glCurrency") }, ...currencies.map((c) => ({ value: String(c.id), label: c.alpha_code }))]} />}
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              {t("from")}
              <DateInput className={cn(inputClass, "w-auto")} value={q.from} max={q.to || undefined} onChange={set("from")} />
            </label>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              {t("to")}
              <DateInput className={cn(inputClass, "w-auto")} value={q.to} min={q.from || undefined} onChange={set("to")} />
            </label>
            <ExportButtons disabled={!body} exportFile={(format) => glReportsApi.statementExport({ ...body, format })} />
          </>
        }
      >
        {!body ? (
          <p className="p-8 text-center text-sm text-muted-foreground">{t("pickGlHint")}</p>
        ) : (
          <>
            {data && (
              <div className="flex flex-wrap gap-3 border-b border-border p-3">
                <div className="mr-auto self-center text-xs">
                  <p className="font-bold">
                    {data.name} <span className="font-mono font-normal text-muted-foreground">{[data.gl_code, data.account_number].filter(Boolean).join(" · ")}</span>
                  </p>
                  <p className="text-muted-foreground">
                    <GlType value={data.gl_type} /> {t("normalSide", { side: data.normal_balance })} · {data.from} – {data.to}
                  </p>
                </div>
                <Figure label={t("opening")} value={data.opening} currency={cur} />
                <Figure label={t("debits")} value={data.debits} currency={cur} />
                <Figure label={t("credits")} value={data.credits} currency={cur} />
                <Figure label={t("closing")} value={data.closing} currency={cur} strong />
              </div>
            )}
            <DataTable
              bare
              columns={[
                { key: "tran_date_time", label: t("when"), render: (l) => <span className="whitespace-nowrap text-xs">{accountDate(l.tran_date_time)}</span> },
                { key: "rrn", label: "RRN", render: (l) => <span className="font-mono text-xs">{l.rrn}</span> },
                { key: "description", label: t("description"), align: "left", render: (l) => <span className="text-xs">{l.description}{l.narration ? <span className="text-muted-foreground"> · {l.narration}</span> : ""}</span> },
                { key: "debit", label: t("debit"), render: (l) => <span className="whitespace-nowrap text-xs tabular-nums">{Number(l.debit) ? glAmount(l.debit, cur) : ""}</span> },
                { key: "credit", label: t("credit"), render: (l) => <span className="whitespace-nowrap text-xs tabular-nums">{Number(l.credit) ? glAmount(l.credit, cur) : ""}</span> },
                { key: "balance", label: t("balance"), render: (l) => <span className={cn("whitespace-nowrap text-xs font-bold tabular-nums", Number(l.balance) < 0 && "text-red-700")}>{glAmount(l.balance, cur)}</span> },
              ]}
              rows={data?.lines ?? []}
              rowKey={(l, i) => `${l.txn_id}-${i}`}
              isLoading={loading}
              title={t("repTab_statement")}
              emptyTitle={t("noLines")}
              serverSorted
              serverPagination={{
                page,
                totalPages: Math.max(1, Math.ceil((data?.total ?? 0) / limit)),
                totalRecords: data?.total ?? 0,
                onPageChange: setPage,
                limit,
                onLimitChange: (n) => {
                  setLimit(Math.min(n, 1000));
                  setPage(1);
                },
              }}
            />
          </>
        )}
      </ListPanel>
    </div>
  );
}

function TrialBalance({ currencies }) {
  const { t } = useTranslation("accounting");
  const [q, setQ] = useState({ as_of: today(), currency_id: "", include_zero: false });
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(() => new Set());
  const body = useMemo(() => ({ ...(q.as_of ? { as_of: q.as_of } : {}), ...(q.currency_id ? { currency_id: Number(q.currency_id) } : {}), include_zero: q.include_zero }), [q]);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    glReportsApi
      .trial_balance(body)
      .then((r) => {
        if (cancelled) return;
        const d = rowsOf(r)[0] ?? null;
        setData(d);
        setOpen(new Set((d?.gls ?? []).map((n) => n.id)));
      })
      .catch((e) => {
        if (!cancelled) {
          notifications.error(e.message);
          setData({ gls: [] });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [body]);

  const cur = data?.currency_code;
  const rows = [];
  const walk = (nodes, depth) =>
    nodes.forEach((n) => {
      rows.push({ n, depth });
      if (open.has(n.id)) walk(n.children ?? [], depth + 1);
    });
  walk(data?.gls ?? [], 0);
  const toggle = (id) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const amt = (v) => (Number(v) ? glAmount(v, cur) : "");
  const diff = Number(data?.difference ?? 0);

  return (
    <ListPanel
      tabs={[]}
      filters={
        <>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            {t("asOf")}
            <DateInput className={cn(inputClass, "w-auto")} value={q.as_of} max={today()} onChange={(e) => setQ((x) => ({ ...x, as_of: e.target.value }))} />
          </label>
          <FilterSelect value={q.currency_id} onChange={(v) => setQ((x) => ({ ...x, currency_id: v }))} options={[{ value: "", label: t("baseCurrency") }, ...currencies.map((c) => ({ value: String(c.id), label: c.alpha_code }))]} />
          <Toggle showLabel label={t("includeZero")} checked={q.include_zero} onChange={(v) => setQ((x) => ({ ...x, include_zero: v }))} />
          <ExportButtons exportFile={(format) => glReportsApi.trialBalanceExport({ ...body, format })} />
        </>
      }
    >
      {!data ? (
        <div className="flex justify-center p-8">
          <Spinner size={18} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">{t("gl")}</th>
                <th className="px-3 py-2.5">{t("glCode")}</th>
                <th className="px-3 py-2.5">{t("glType")}</th>
                <th className="px-3 py-2.5 text-right">{t("debit")}</th>
                <th className="px-3 py-2.5 text-right">{t("credit")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ n, depth }) => (
                <tr key={n.id} className={cn("border-b border-border/60", !n.is_account && "bg-muted/30")}>
                  <td className="px-4 py-1.5">
                    <span className="flex items-center gap-1.5" style={{ paddingLeft: depth * 18 }}>
                      {n.children?.length ? (
                        <button type="button" onClick={() => toggle(n.id)} className="rounded p-0.5 text-muted-foreground hover:bg-muted" aria-label={t(open.has(n.id) ? "collapse" : "expand")}>
                          {open.has(n.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      ) : (
                        <span className="w-[18px]" />
                      )}
                      <span className={cn("text-xs", !n.is_account && "font-bold")}>{n.name}</span>
                      {n.account_number && <span className="font-mono text-[10px] text-muted-foreground">{n.account_number}</span>}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 font-mono text-xs">{n.gl_code || ""}</td>
                  <td className="px-3 py-1.5">
                    <GlType value={n.gl_type} />
                  </td>
                  <td className={cn("px-3 py-1.5 text-right text-xs tabular-nums", !n.is_account && "font-bold")}>{amt(n.debit)}</td>
                  <td className={cn("px-3 py-1.5 text-right text-xs tabular-nums", !n.is_account && "font-bold")}>{amt(n.credit)}</td>
                </tr>
              ))}
              {(data.other_accounts ?? []).map((o) => (
                <tr key={o.acct_class} className="border-b border-border/60 bg-muted/40">
                  <td className="px-4 py-1.5 text-xs font-semibold" colSpan={3}>
                    {t(`otherAccounts_${o.acct_class}`, { defaultValue: o.acct_class })} <span className="font-normal text-muted-foreground">· {t("notGls")}</span>
                  </td>
                  <td className="px-3 py-1.5 text-right text-xs tabular-nums">{amt(o.debit)}</td>
                  <td className="px-3 py-1.5 text-right text-xs tabular-nums">{amt(o.credit)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border">
                <td className="px-4 py-2.5 text-xs font-black" colSpan={3}>
                  {t("totals")} <span className="font-normal text-muted-foreground">· {data.as_of}</span>
                </td>
                <td className="px-3 py-2.5 text-right text-sm font-black tabular-nums">{glAmount(data.total_debit, cur)}</td>
                <td className="px-3 py-2.5 text-right text-sm font-black tabular-nums">{glAmount(data.total_credit, cur)}</td>
              </tr>
              <tr>
                <td colSpan={5} className="px-4 pb-3">
                  <span className={cn("inline-block rounded-xl px-3 py-1.5 text-xs font-bold", diff === 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                    {diff === 0 ? t("balanced") : t("differenceX", { value: glAmount(diff, cur) })}
                  </span>
                  {(data.by_type ?? []).length > 0 && (
                    <span className="ml-3 inline-flex flex-wrap gap-2 align-middle">
                      {data.by_type.map((x) => (
                        <span key={x.gl_type} className="text-[11px] text-muted-foreground">
                          <GlType value={x.gl_type} /> {glAmount(x.net, cur)}
                        </span>
                      ))}
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </ListPanel>
  );
}
