import { RequiredMark } from "@/Components/Common/RequiredMark";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Send, UserRound } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { money } from "@/Components/Finance/Accounts/accountShared";
import { OwnerFinder } from "@/Components/Finance/Deposits/TermDeposits/OpenDeposit";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import {
  borrowerGroupsApi,
  loanApplicationsApi,
  loanFacilitiesApi,
  loanPurposesApi,
  recordOf,
} from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { Facts, Problems, dayDate, labelClass, ratePct } from "../../Deposits/depositShared";
import { officerOptions, useCoreBanking } from "../../coreBankingShared";
import { Field, MiniTable, ScheduleTable, loanLabel, useInstitutionScope } from "../loanShared";

const EMPTY = {
  loan_product_id: "",
  term_id: "",
  amount: "",
  purpose_code: "",
  purpose_description: "",
  application_channel: "BRANCH",
  disbursement_acct_id: "",
  credit_score: "",
  repayment_acct_id: "",
  monthly_income: "",
  operating_months: "",
  moratorium_days: "",
  officer_user_id: "",
  group_id: "",
  refinance_facility_id: "",
  savings_acct_id: "",
  narration: "",
};

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
    // Walk-in borrower (product allows it): no wallet, paid out in cash at a till.
    ...(f.disbursement_acct_id ? { disbursement_acct_id: Number(f.disbursement_acct_id) } : {}),
    // From the bureau report: picks the band priced by score.
    ...(f.credit_score ? { credit_score: Number(f.credit_score) } : {}),
    ...(f.repayment_acct_id ? { repayment_acct_id: Number(f.repayment_acct_id) } : {}),
    ...(f.purpose_description.trim() ? { purpose_description: f.purpose_description.trim() } : {}),
    ...(f.monthly_income ? { monthly_income: f.monthly_income } : {}),
    ...(f.operating_months ? { operating_months: Number(f.operating_months) } : {}),
    ...(f.moratorium_days ? { moratorium_days: Number(f.moratorium_days) } : {}),
    ...(f.officer_user_id ? { officer_user_id: Number(f.officer_user_id) } : {}),
    ...(f.group_id ? { group_id: Number(f.group_id) } : {}),
    ...(f.refinance_facility_id ? { refinance_facility_id: Number(f.refinance_facility_id) } : {}),
    ...(f.savings_acct_id ? { savings_acct_id: Number(f.savings_acct_id) } : {}),
    ...(f.narration.trim() ? { narration: f.narration.trim() } : {}),
  };
  return body;
}

// New application (or edit of an open one): pick the borrower, then
// product, term, amount and wallets; a live quote shows the offer, cost
// and schedule as the form changes. Submitting charges APPLICATION fees.
export function ApplicationForm({ application, onClose, onSaved }) {
  const { t } = useTranslation(["loans", "deposits"]);
  const [entity, setEntity] = useState(
    application ? { entity_type: application.owner?.kind, entity_id: application.owner?.id } : null,
  );
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
          disbursement_acct_id: Number(application.disbursement_acct_id) ? String(application.disbursement_acct_id) : "",
          credit_score: application.credit_score ? String(application.credit_score) : "",
          repayment_acct_id:
            application.repayment_acct_id &&
            application.repayment_acct_id !== application.disbursement_acct_id
              ? String(application.repayment_acct_id)
              : "",
          monthly_income:
            application.monthly_income != null ? String(application.monthly_income) : "",
          operating_months:
            application.operating_months != null ? String(application.operating_months) : "",
          officer_user_id: application.microfinance?.officer_user_id
            ? String(application.microfinance.officer_user_id)
            : "",
          group_id: application.microfinance?.group_id
            ? String(application.microfinance.group_id)
            : "",
          refinance_facility_id: application.microfinance?.refinance_facility_id
            ? String(application.microfinance.refinance_facility_id)
            : "",
          savings_acct_id: application.microfinance?.savings_acct_id
            ? String(application.microfinance.savings_acct_id)
            : "",
        }
      : EMPTY,
  );
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Core banking: loan officers, the borrower groups, and the borrower's
  // running loans (a top-up settles one of the same product).
  const { scope } = useInstitutionScope();
  const setup = useCoreBanking(scope);
  const [groups, setGroups] = useState([]);
  const [running, setRunning] = useState([]);
  // The institution's loan purposes: once there is one, the purpose is picked, not typed.
  const [purposes, setPurposes] = useState([]);
  useEffect(() => {
    loanPurposesApi
      .list(scope({ active_only: true }))
      .then((r) => setPurposes(Array.isArray(r?.data) ? r.data : []))
      .catch(() => setPurposes([]));
  }, [scope]);
  useEffect(() => {
    borrowerGroupsApi
      .list(scope({ status: "ACTIVE", limit: 200 }))
      .then((r) => setGroups(Array.isArray(r?.data) ? r.data : []))
      .catch(() => setGroups([]));
  }, [scope]);
  useEffect(() => {
    if (!entity) return;
    loanFacilitiesApi
      .list(scope({ ...entity, status: "ACTIVE", limit: 100 }))
      .then((r) =>
        setRunning(
          (Array.isArray(r?.data) ? r.data : []).filter(
            (x) =>
              String(x.entity_id) === String(entity.entity_id) &&
              x.entity_type === entity.entity_type,
          ),
        ),
      )
      .catch(() => setRunning([]));
  }, [entity, scope]);

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
          setForm((f) => ({
            ...f,
            loan_product_id: p ? String(p.loan_product_id) : "",
            term_id: p?.config?.terms?.[0]?.id ? String(p.config.terms[0].id) : "",
            disbursement_acct_id: w ? String(w.id) : "",
          }));
        }
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [entity, application]);

  const product = options?.products?.find(
    (p) => String(p.loan_product_id) === form.loan_product_id,
  );
  const cur = product?.currency_alpha_code ?? "";
  const term = product?.config?.terms?.find((x) => String(x.id) === form.term_id);
  const wallets = (options?.wallets ?? []).filter(
    (w) => !product || w.currency_id === product.currency_code,
  );
  const individual = String(entity?.entity_type ?? "").endsWith("INDV");
  const rules = product?.config?.eligibility_rules ?? {};
  const savingsPct = Number(product?.config?.collateral_policy?.compulsory_savings_percent ?? 0);
  const topUps = running.filter((x) => String(x.loan_product_id) === form.loan_product_id);
  const ready =
    entity &&
    form.loan_product_id &&
    form.term_id &&
    Number(form.amount) > 0 &&
    /^[A-Z0-9_]+$/.test(form.purpose_code) &&
    (form.disbursement_acct_id || rules.wallet_not_required) &&
    (!rules.group_only || form.group_id);
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
      const response = application
        ? await loanApplicationsApi.edit({ id: application.id, ...body })
        : await loanApplicationsApi.add(body);
      notifications.success(response?.message ?? t("applicationSubmitted"));
      onSaved(recordOf(response));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  // `required`: the API refuses the application without it (asterisk).
  const field = (label, node, hint, required = false) => (
    <label className={labelClass}>
      {label}
      {required && <RequiredMark />}
      {node}
      {hint && (
        <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{hint}</span>
      )}
    </label>
  );

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={
        application
          ? t("editApplicationX", { number: application.application_number })
          : t("newApplication")
      }
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
              <span className="text-xs font-medium text-muted-foreground">
                {loanLabel(t, options.owner?.kind)}
              </span>
            </p>
            <div className="flex items-center gap-3">
              <StatusBadge status={options.owner?.status_name ?? ""} variant="subtle" />
              {!application && (
                <button
                  type="button"
                  onClick={() => setEntity(null)}
                  className="text-xs font-bold text-primary hover:underline"
                >
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
                  field={{
                    type: "select",
                    options: options.products.map((p) => ({
                      value: String(p.loan_product_id),
                      label: `${p.config?.product_name ?? p.product_code} (${p.currency_alpha_code})`,
                    })),
                  }}
                  value={form.loan_product_id}
                  onChange={(v) => {
                    const p = options.products.find((x) => String(x.loan_product_id) === v);
                    setForm((f) => ({
                      ...f,
                      loan_product_id: v,
                      term_id: p?.config?.terms?.[0]?.id ? String(p.config.terms[0].id) : "",
                      disbursement_acct_id: "",
                      repayment_acct_id: "",
                    }));
                  }}
                />,
                null,
                true,
              )}
              {field(
                t("term"),
                <Field
                  field={{
                    type: "select",
                    options: (product?.config?.terms ?? []).map((x) => ({
                      value: String(x.id),
                      label: `${x.term_code} · ${x.term_value} ${loanLabel(t, x.term_unit)}`,
                    })),
                  }}
                  value={form.term_id}
                  onChange={set("term_id")}
                />,
                null,
                true,
              )}
              {field(
                t("amountIn", { currency: cur }),
                <Field
                  field={{ type: "amount" }}
                  decimals={product?.amount_decimals ?? 2}
                  value={form.amount}
                  onChange={set("amount")}
                />,
                term &&
                  t("termLimits", {
                    min: money(term.minimum_amount, cur),
                    max:
                      Number(term.maximum_amount) === 0
                        ? t("noLimit")
                        : money(term.maximum_amount, cur),
                  }),
              )}
              {purposes.length
                ? field(
                    t("purpose"),
                    <Field
                      field={{ type: "select", blank: t("choosePurpose"), options: purposes.map((x) => ({ value: x.code, label: x.name })) }}
                      value={form.purpose_code}
                      onChange={set("purpose_code")}
                    />,
                  )
                : field(
                    t("purposeCode"),
                    <Field
                      field={{ placeholder: "HOME_IMPROVEMENT" }}
                      value={form.purpose_code}
                      onChange={(v) => set("purpose_code")(v.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
                    />,
                  )}
              {field(
                t("creditScore"),
                <Field field={{ type: "int" }} value={form.credit_score} onChange={set("credit_score")} />,
                t("creditScoreHint"),
              )}
              {field(
                t("disbursementWallet"),
                <Field
                  field={{
                    type: "select",
                    blank: rules.wallet_not_required ? t("cashWalkIn") : wallets.length ? t("chooseWallet") : t("noWalletInCurrency"),
                    options: wallets.map((w) => ({
                      value: String(w.id),
                      label: `${w.acct_num} · ${money(w.avail_bal, w.currency_code)}`,
                    })),
                  }}
                  value={form.disbursement_acct_id}
                  onChange={set("disbursement_acct_id")}
                />,
              )}
              {field(
                t("repaymentWallet"),
                <Field
                  field={{
                    type: "select",
                    blank: t("sameAsDisbursement"),
                    options: wallets
                      .filter((w) => String(w.id) !== form.disbursement_acct_id)
                      .map((w) => ({ value: String(w.id), label: w.acct_num })),
                  }}
                  value={form.repayment_acct_id}
                  onChange={set("repayment_acct_id")}
                />,
              )}
              {field(
                t("channel"),
                <Field
                  field={{ type: "select", options: options.application_channels ?? ["BRANCH"] }}
                  value={form.application_channel}
                  onChange={set("application_channel")}
                />,
              )}
              {form.application_channel === "BRANCH" && <p className="self-end text-[11px] text-muted-foreground">{t("branchFromUser")}</p>}
              {individual
                ? field(
                    t("monthlyIncome"),
                    <Field
                      field={{ type: "amount" }}
                      value={form.monthly_income}
                      onChange={set("monthly_income")}
                    />,
                    t("monthlyIncomeHint"),
                  )
                : field(
                    t("operatingMonths"),
                    <Field
                      field={{ type: "int" }}
                      value={form.operating_months}
                      onChange={set("operating_months")}
                    />,
                  )}
              {officerOptions(setup).length > 0 &&
                field(
                  t("loanOfficer"),
                  <Field
                    field={{
                      type: "select",
                      blank: t("officerDefault"),
                      options: officerOptions(setup),
                    }}
                    value={form.officer_user_id}
                    onChange={set("officer_user_id")}
                  />,
                )}
              {(groups.length > 0 || rules.group_only) &&
                field(
                  t("borrowerGroup"),
                  <Field
                    field={{
                      type: "select",
                      blank: rules.group_only ? t("chooseGroup") : t("noGroup"),
                      options: groups.map((g) => ({
                        value: String(g.id),
                        label: `${g.code} · ${g.name}${g.blocked ? ` (${t("groupBlocked")})` : ""}`,
                      })),
                    }}
                    value={form.group_id}
                    onChange={set("group_id")}
                  />,
                  rules.group_only ? t("groupOnlyHint") : null,
                  Boolean(rules.group_only),
                )}
              {rules.top_up_allowed &&
                topUps.length > 0 &&
                field(
                  t("topUpOf"),
                  <Field
                    field={{
                      type: "select",
                      blank: t("noTopUp"),
                      options: topUps.map((x) => ({
                        value: String(x.id),
                        label: `${x.facility_number} · ${money(x.principal_outstanding ?? x.outstanding, cur)}`,
                      })),
                    }}
                    value={form.refinance_facility_id}
                    onChange={set("refinance_facility_id")}
                  />,
                  t("topUpHint"),
                )}
              {savingsPct > 0 &&
                field(
                  t("savingsWallet"),
                  <Field
                    field={{
                      type: "select",
                      blank: t("savingsDefault"),
                      options: (options.wallets ?? [])
                        .filter((w) => !product || w.currency_id === product.currency_code)
                        .map((w) => ({
                          value: String(w.id),
                          label: [w.acct_num, w.wallet_purpose].filter(Boolean).join(" · "),
                        })),
                    }}
                    value={form.savings_acct_id}
                    onChange={set("savings_acct_id")}
                  />,
                  t("savingsWalletHint", { pct: ratePct(savingsPct) }),
                )}
              {product?.config?.policy?.moratorium_allowed &&
                field(
                  t("moratoriumDays"),
                  <Field
                    field={{ type: "int" }}
                    value={form.moratorium_days}
                    onChange={set("moratorium_days")}
                  />,
                  t("upToDays", {
                    count: Number(product.config.policy.maximum_moratorium_days ?? 0),
                  }),
                )}
              <label className={cn(labelClass, "sm:col-span-2")}>
                {t("purposeDescription")}
                <Field
                  field={{}}
                  value={form.purpose_description}
                  onChange={set("purpose_description")}
                />
              </label>
              {field(
                t("narrationOptional"),
                <Field field={{}} value={form.narration} onChange={set("narration")} />,
              )}
            </div>
          )}

          {quoting && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Spinner size={12} /> {t("quoting")}
            </p>
          )}
          {quoteError && <Problems message={quoteError} />}
          {quote?.disclosure && (
            <Disclosure disclosure={quote.disclosure} eligibility={quote.eligibility} live />
          )}
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
    <div
      className={cn(
        "grid gap-3 rounded-2xl border p-4",
        live ? "border-emerald-200 bg-emerald-50" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-3xl font-black tabular-nums text-emerald-700">
          {ratePct(d.annual_rate)}{" "}
          <span className="text-sm font-bold text-muted-foreground">
            {loanLabel(t, d.calculation_method)}
          </span>
        </p>
        <p className="amount-fit text-sm font-semibold text-foreground">
          {m(d.amount)} · {d.term_value} {loanLabel(t, d.term_unit)} ·{" "}
          {loanLabel(t, d.repayment_frequency)}
        </p>
      </div>
      <Facts
        rows={[
          [t("netDisbursed"), m(d.net_disbursed), "text-emerald-700"],
          [
            t("installmentOf"),
            d.schedule?.installments?.[0] ? m(d.schedule.installments[0].total_due) : "—",
          ],
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
            {
              key: "collection_point",
              label: t("charged"),
              render: (f) => loanLabel(t, f.collection_point),
            },
            { key: "amount", label: t("amount"), align: "right", render: (f) => m(f.amount) },
            {
              key: "refundable",
              label: t("refundable"),
              render: (f) => t(f.refundable ? "yes" : "no"),
            },
          ]}
        />
      )}
      {e && (
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {e.debt_to_income != null && (
            <Chip>{t("dtiX", { value: ratePct(Number(e.debt_to_income) * 100) })}</Chip>
          )}
          {e.credit_check_required && <Chip>{t("needsCreditCheck")}</Chip>}
          {e.collateral_required && (
            <Chip>
              {t("needsCollateral", {
                amount: m(e.minimum_collateral),
                types: (e.accepted_collateral_types ?? []).map((x) => loanLabel(t, x)).join(", "),
              })}
            </Chip>
          )}
          <Chip>{t("needsApprovers", { count: Number(e.required_approvals ?? 1) })}</Chip>
          {Number(e.guarantors_required) > 0 && (
            <Chip>{t("needsGuarantors", { count: Number(e.guarantors_required) })}</Chip>
          )}
          {Number(e.compulsory_savings) > 0 && (
            <Chip>{t("holdsSavings", { amount: m(e.compulsory_savings) })}</Chip>
          )}
          {e.bureau_required && <Chip>{t("needsBureau")}</Chip>}
          {Number(e.top_up_settles) > 0 && (
            <Chip>{t("topUpSettles", { amount: m(e.top_up_settles) })}</Chip>
          )}
        </div>
      )}
      {d.schedule?.installments?.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1 text-xs font-bold text-primary"
          >
            <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />{" "}
            {t(open ? "hideSchedule" : "showSchedule", { count: d.schedule.installments.length })}
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
  return type === "FIXED"
    ? money(value, currency)
    : type === "PERCENT"
      ? ratePct(value)
      : `${ratePct(value)} · ${loanLabel(t, type)}`;
}

const Chip = ({ children }) => (
  <span className="rounded-full border border-border bg-card px-2 py-0.5 font-semibold">
    {children}
  </span>
);
