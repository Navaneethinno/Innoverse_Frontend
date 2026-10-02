import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Send, UserRound } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { money } from "@/Components/Epurse/Accounts/accountShared";
import { OwnerFinder } from "@/Components/TermDeposits/Deposits/OpenDeposit";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { loanApplicationsApi, recordOf } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { Facts, Problems, dayDate, labelClass, ratePct } from "../../TermDeposits/depositShared";
import { Field, MiniTable, ScheduleTable, loanLabel } from "../loanShared";

const EMPTY = { loan_product_id: "", term_id: "", amount: "", purpose_code: "", purpose_description: "", application_channel: "BRANCH", disbursement_acct_id: "", repayment_acct_id: "", monthly_income: "", operating_months: "", moratorium_days: "", narration: "" };

// The request as quote / add / edit take it: ids and counts as numbers,
// amounts as strings, blanks left out.
function toBody(entity, f) {
  const body = {
    ...entity,
    loan_product_id: Number(f.loan_product_id),
    term_id: Number(f.term_id),
    amount: f.amount,
    purpose_code: f.purpose_code,
    application_channel: f.application_channel,
    disbursement_acct_id: Number(f.disbursement_acct_id),
    ...(f.repayment_acct_id ? { repayment_acct_id: Number(f.repayment_acct_id) } : {}),
    ...(f.purpose_description.trim() ? { purpose_description: f.purpose_description.trim() } : {}),
    ...(f.monthly_income ? { monthly_income: f.monthly_income } : {}),
    ...(f.operating_months ? { operating_months: Number(f.operating_months) } : {}),
    ...(f.moratorium_days ? { moratorium_days: Number(f.moratorium_days) } : {}),
    ...(f.narration.trim() ? { narration: f.narration.trim() } : {}),
  };
  return body;
}

// New application (or edit of an open one): pick the borrower, then
// product, term, amount and wallets; a live quote shows the offer, cost
// and schedule as the form changes. Submitting charges APPLICATION fees.
export function ApplicationForm({ application, onClose, onSaved }) {
  const { t } = useTranslation(["loans", "deposits"]);
  const [entity, setEntity] = useState(application ? { entity_type: application.owner?.kind, entity_id: application.owner?.id } : null);
  const [options, setOptions] = useState(null);
  const [form, setForm] = useState(
    application
      ? {
          ...EMPTY,
          loan_product_id: String(application.loan_product_id),
          term_id: String(application.term_id),
          amount: String(application.requested_amount ?? ""),
          purpose_code: application.purpose_code ?? "",
          purpose_description: application.purpose_description ?? "",
          application_channel: application.application_channel ?? "BRANCH",
          disbursement_acct_id: String(application.disbursement_acct_id ?? ""),
          repayment_acct_id: application.repayment_acct_id && application.repayment_acct_id !== application.disbursement_acct_id ? String(application.repayment_acct_id) : "",
          monthly_income: application.monthly_income != null ? String(application.monthly_income) : "",
          operating_months: application.operating_months != null ? String(application.operating_months) : "",
        }
      : EMPTY,
  );
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!entity) return undefined;
    let cancelled = false;
    setOptions(null);
    loanApplicationsApi
      .options(entity)
      .then((r) => {
        if (cancelled) return;
        const o = rowsOf(r)[0] ?? {};
        setOptions(o);
        if (!application) {
          const p = o.products?.[0];
          const w = o.wallets?.find((x) => !p || x.currency_id === p.currency_code);
          setForm((f) => ({ ...f, loan_product_id: p ? String(p.loan_product_id) : "", term_id: p?.config?.terms?.[0]?.id ? String(p.config.terms[0].id) : "", disbursement_acct_id: w ? String(w.id) : "" }));
        }
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [entity, application]);

  const product = options?.products?.find((p) => String(p.loan_product_id) === form.loan_product_id);
  const cur = product?.currency_alpha_code ?? "";
  const term = product?.config?.terms?.find((x) => String(x.id) === form.term_id);
  const wallets = (options?.wallets ?? []).filter((w) => !product || w.currency_id === product.currency_code);
  const individual = String(entity?.entity_type ?? "").endsWith("INDV");
  const ready = entity && form.loan_product_id && form.term_id && Number(form.amount) > 0 && /^[A-Z0-9_]+$/.test(form.purpose_code) && form.disbursement_acct_id;
  const body = ready ? toBody(entity, form) : null;
  const { narration: _n, ...quoteBody } = body ?? {};
  const bodyKey = JSON.stringify(quoteBody);

  // Live quote, debounced while typing: nothing is saved.
  useEffect(() => {
    setQuote(null);
    setQuoteError("");
    if (!ready) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setQuoting(true);
      loanApplicationsApi
        .quote(JSON.parse(bodyKey))
        .then((r) => !cancelled && setQuote(recordOf(r)))
        .catch((e) => !cancelled && setQuoteError(e.message))
        .finally(() => !cancelled && setQuoting(false));
    }, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [bodyKey, ready]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const response = application ? await loanApplicationsApi.edit({ id: application.id, ...body }) : await loanApplicationsApi.add(body);
      notifications.success(response?.message ?? t("applicationSubmitted"));
      onSaved(recordOf(response));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const field = (label, node, hint) => (
    <label className={labelClass}>
      {label}
      {node}
      {hint && <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{hint}</span>}
    </label>
  );

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={application ? t("editApplicationX", { number: application.application_number }) : t("newApplication")}
      subtitle={options?.owner?.name}
      footer={
        entity && (
          <>
            <Button variant="ghost" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button icon={Send} loading={busy} disabled={!quote} onClick={save}>
              {application ? t("saveApplication") : t("submitApplication")}
            </Button>
          </>
        )
      }
    >
      {!entity && <OwnerFinder onPick={setEntity} />}
      {entity && !options && !error && (
        <div className="flex justify-center py-8">
          <Spinner size={20} />
        </div>
      )}
      {options && (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2">
            <p className="flex items-center gap-2 text-sm font-bold text-foreground">
              <UserRound size={15} className="text-primary" /> {options.owner?.name}
              <span className="text-xs font-medium text-muted-foreground">{loanLabel(t, options.owner?.kind)}</span>
            </p>
            <div className="flex items-center gap-3">
              <StatusBadge status={options.owner?.status_name ?? ""} variant="subtle" />
              {!application && (
                <button type="button" onClick={() => setEntity(null)} className="text-xs font-bold text-primary hover:underline">
                  {t("deposits:change")}
                </button>
              )}
            </div>
          </div>
          {!options.products?.length ? (
            <p className="text-sm text-amber-700">{t("noProductsForBorrower")}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {field(
                t("product"),
                <Field
                  field={{ type: "select", options: options.products.map((p) => ({ value: String(p.loan_product_id), label: `${p.config?.product_name ?? p.product_code} (${p.currency_alpha_code})` })) }}
                  value={form.loan_product_id}
                  onChange={(v) => {
                    const p = options.products.find((x) => String(x.loan_product_id) === v);
                    setForm((f) => ({ ...f, loan_product_id: v, term_id: p?.config?.terms?.[0]?.id ? String(p.config.terms[0].id) : "", disbursement_acct_id: "", repayment_acct_id: "" }));
                  }}
                />,
              )}
              {field(t("term"), <Field field={{ type: "select", options: (product?.config?.terms ?? []).map((x) => ({ value: String(x.id), label: `${x.term_code} · ${x.term_value} ${loanLabel(t, x.term_unit)}` })) }} value={form.term_id} onChange={set("term_id")} />)}
              {field(t("amountIn", { currency: cur }), <Field field={{ type: "amount" }} decimals={product?.amount_decimals ?? 2} value={form.amount} onChange={set("amount")} />, term && t("termLimits", { min: money(term.minimum_amount, cur), max: Number(term.maximum_amount) === 0 ? t("noLimit") : money(term.maximum_amount, cur) }))}
              {field(t("purposeCode"), <Field field={{ placeholder: "HOME_IMPROVEMENT" }} value={form.purpose_code} onChange={(v) => set("purpose_code")(v.toUpperCase().replace(/[^A-Z0-9_]/g, ""))} />)}
              {field(t("disbursementWallet"), <Field field={{ type: "select", blank: wallets.length ? t("chooseWallet") : t("noWalletInCurrency"), options: wallets.map((w) => ({ value: String(w.id), label: `${w.acct_num} · ${money(w.avail_bal, w.currency_code)}` })) }} value={form.disbursement_acct_id} onChange={set("disbursement_acct_id")} />)}
              {field(t("repaymentWallet"), <Field field={{ type: "select", blank: t("sameAsDisbursement"), options: wallets.filter((w) => String(w.id) !== form.disbursement_acct_id).map((w) => ({ value: String(w.id), label: w.acct_num })) }} value={form.repayment_acct_id} onChange={set("repayment_acct_id")} />)}
              {field(t("channel"), <Field field={{ type: "select", options: options.application_channels ?? ["BRANCH"] }} value={form.application_channel} onChange={set("application_channel")} />)}
              {individual
                ? field(t("monthlyIncome"), <Field field={{ type: "amount" }} value={form.monthly_income} onChange={set("monthly_income")} />, t("monthlyIncomeHint"))
                : field(t("operatingMonths"), <Field field={{ type: "int" }} value={form.operating_months} onChange={set("operating_months")} />)}
              {product?.config?.policy?.moratorium_allowed && field(t("moratoriumDays"), <Field field={{ type: "int" }} value={form.moratorium_days} onChange={set("moratorium_days")} />, t("upToDays", { count: Number(product.config.policy.maximum_moratorium_days ?? 0) }))}
              <label className={cn(labelClass, "sm:col-span-2")}>
                {t("purposeDescription")}
                <Field field={{}} value={form.purpose_description} onChange={set("purpose_description")} />
              </label>
              {field(t("narrationOptional"), <Field field={{}} value={form.narration} onChange={set("narration")} />)}
            </div>
          )}

          {quoting && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Spinner size={12} /> {t("quoting")}
            </p>
          )}
          {quoteError && <Problems message={quoteError} />}
          {quote?.disclosure && <Disclosure disclosure={quote.disclosure} eligibility={quote.eligibility} live />}
        </div>
      )}
      {error && (
        <div className="mt-3">
          <Problems message={error} />
        </div>
      )}
    </Modal>
  );
}

// The offer: rate, payout, cost, fees, what the borrower must meet, and the
// schedule (folded until opened).
export function Disclosure({ disclosure: d, eligibility: e, live = false }) {
  const { t } = useTranslation("loans");
  const [open, setOpen] = useState(false);
  const cur = d.currency;
  const m = (v) => money(v, cur);
  return (
    <div className={cn("grid gap-3 rounded-2xl border p-4", live ? "border-emerald-200 bg-emerald-50" : "border-border")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-3xl font-black tabular-nums text-emerald-700">
          {ratePct(d.annual_rate)} <span className="text-sm font-bold text-muted-foreground">{loanLabel(t, d.calculation_method)}</span>
        </p>
        <p className="text-sm font-semibold text-foreground">
          {m(d.amount)} · {d.term_value} {loanLabel(t, d.term_unit)} · {loanLabel(t, d.repayment_frequency)}
        </p>
      </div>
      <Facts
        rows={[
          [t("netDisbursed"), m(d.net_disbursed), "text-emerald-700"],
          [t("installmentOf"), d.schedule?.installments?.[0] ? m(d.schedule.installments[0].total_due) : "—"],
          [t("installments"), d.schedule?.installment_count ?? "—"],
          [t("totalPayable"), m(d.total_payable)],
          [t("costOfCredit"), m(d.total_cost_of_credit)],
          [t("upfrontFees"), m(d.upfront_fees)],
          [t("disbursementFees"), m(d.disbursement_fees)],
          [t("firstRepayment"), dayDate(d.schedule?.first_repayment_date)],
          [t("maturity"), dayDate(d.schedule?.maturity_date)],
          [t("prepaymentCharge"), chargeText(t, d.prepayment_charge, cur)],
          [t("lateCharge"), chargeText(t, d.late_charge, cur)],
          [t("gracePeriodDays"), t("daysN", { count: Number(d.grace_period_days ?? 0) })],
        ]}
      />
      {d.fees?.length > 0 && (
        <MiniTable
          rows={d.fees}
          rowKey={(f) => f.fee_code}
          columns={[
            { key: "fee_name", label: t("fee") },
            { key: "collection_point", label: t("charged"), render: (f) => loanLabel(t, f.collection_point) },
            { key: "amount", label: t("amount"), align: "right", render: (f) => m(f.amount) },
            { key: "refundable", label: t("refundable"), render: (f) => t(f.refundable ? "yes" : "no") },
          ]}
        />
      )}
      {e && (
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {e.debt_to_income != null && <Chip>{t("dtiX", { value: ratePct(Number(e.debt_to_income) * 100) })}</Chip>}
          {e.credit_check_required && <Chip>{t("needsCreditCheck")}</Chip>}
          {e.collateral_required && <Chip>{t("needsCollateral", { amount: m(e.minimum_collateral), types: (e.accepted_collateral_types ?? []).map((x) => loanLabel(t, x)).join(", ") })}</Chip>}
          <Chip>{t("needsApprovers", { count: Number(e.required_approvals ?? 1) })}</Chip>
        </div>
      )}
      {d.schedule?.installments?.length > 0 && (
        <div>
          <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-xs font-bold text-primary">
            <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} /> {t(open ? "hideSchedule" : "showSchedule", { count: d.schedule.installments.length })}
          </button>
          {open && (
            <div className="mt-2">
              <ScheduleTable installments={d.schedule.installments} currency={cur} />
            </div>
          )}
        </div>
      )}
      {live && <p className="text-[11px] text-muted-foreground">{t("quoteAsIfToday")}</p>}
    </div>
  );
}

// A charge as the disclosure gives it ("PERCENT 2", "FIXED 50", "NONE 0").
function chargeText(t, text, currency) {
  const [type, value] = String(text ?? "").split(" ");
  if (!type || type === "NONE") return t("none");
  return type === "FIXED" ? money(value, currency) : type === "PERCENT" ? ratePct(value) : `${ratePct(value)} · ${loanLabel(t, type)}`;
}

const Chip = ({ children }) => <span className="rounded-full border border-border bg-card px-2 py-0.5 font-semibold">{children}</span>;
