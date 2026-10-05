import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Calculator, Save, Send } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { HorizontalStepper } from "@/Components/Common/HorizontalStepper";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { Toggle } from "@/Components/Common/Toggle";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { loanProductsApi } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { Problems, Section, inputClass, labelClass, ratePct } from "../../TermDeposits/depositShared";
import { Field, RowsEditor, loanLabel } from "../loanShared";

const STEPS = ["product", "terms", "fees", "repayment", "eligibility", "approvals", "collateral"];
const today = () => new Date().toISOString().slice(0, 10);
const blankBand = (from = "0") => ({ minimum_amount: from, maximum_amount: "0", pricing_type: "FIXED", annual_rate: "", calculation_method: "REDUCING_BALANCE", day_count_convention: "ACT_365", effective_from: today() });
const blankTerm = () => ({ term_code: "", term_value: "", term_unit: "MONTHS", minimum_amount: "", maximum_amount: "", effective_from: today(), pricing: [blankBand()] });
const blankFee = () => ({ fee_code: "", fee_name: "", calculation_type: "FIXED", fee_value: "", maximum_fee: "0", collection_point: "DISBURSEMENT", refundable: false });
const blankApproval = () => ({ minimum_amount: "0", maximum_amount: "0", required_approvals: "1", profile_ids: [] });

const str = (v, fallback = "0") => String(v ?? "").trim() || fallback;
const optional = (v) => (String(v ?? "").trim() === "" ? undefined : String(v).trim());
const optionalInt = (v) => (String(v ?? "").trim() === "" ? undefined : Number(v));
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
const keepId = (x) => (x.id ? { id: x.id } : {});

// The configuration as the server takes it: amounts and rates as strings,
// counts as numbers, ids kept on items that already exist; empty optional
// eligibility rules left out.
function toBody(c) {
  const e = c.eligibility_rules ?? {};
  const individual = clean({ minimum_age: optionalInt(e.individual?.minimum_age), maximum_age: optionalInt(e.individual?.maximum_age), minimum_monthly_income: optional(e.individual?.minimum_monthly_income) });
  const corporate = clean({ minimum_operating_months: optionalInt(e.corporate?.minimum_operating_months) });
  const p = c.policy ?? {};
  return {
    product_name: str(c.product_name, ""),
    description: str(c.description, ""),
    product_category: c.product_category,
    effective_from: c.effective_from ?? "",
    effective_to: c.effective_to ?? "",
    eligibility_rules: clean({
      ...(Object.keys(individual).length ? { individual } : {}),
      ...(Object.keys(corporate).length ? { corporate } : {}),
      maximum_debt_to_income_ratio: optional(e.maximum_debt_to_income_ratio),
      credit_check_required: Boolean(e.credit_check_required),
    }),
    approval_matrix: (c.approval_matrix ?? []).map((r) => ({ ...keepId(r), minimum_amount: str(r.minimum_amount), maximum_amount: str(r.maximum_amount), required_approvals: Number(r.required_approvals) || 1, ...(r.profile_ids?.length ? { profile_ids: r.profile_ids.map(Number) } : {}) })),
    collateral_policy: { required: Boolean(c.collateral_policy?.required), minimum_coverage_ratio: str(c.collateral_policy?.minimum_coverage_ratio), accepted_types: c.collateral_policy?.accepted_types ?? [] },
    policy: {
      ...p,
      grace_period_days: Number(p.grace_period_days) || 0,
      maximum_moratorium_days: p.moratorium_allowed ? Number(p.maximum_moratorium_days) || 0 : 0,
      prepayment_charge_value: str(p.prepayment_charge_value),
      late_charge_value: str(p.late_charge_value),
    },
    terms: (c.terms ?? []).map((term) => ({
      ...keepId(term),
      term_code: str(term.term_code, "").toUpperCase(),
      term_value: Number(term.term_value) || 0,
      term_unit: term.term_unit,
      minimum_amount: str(term.minimum_amount),
      maximum_amount: str(term.maximum_amount),
      effective_from: term.effective_from ?? "",
      ...(term.effective_to ? { effective_to: term.effective_to } : {}),
      // A VARIABLE band is the reference rate in force on the day plus the
      // spread (annual_rate is then ignored); FIXED carries its own rate.
      pricing: (term.pricing ?? []).map(({ reference_rate_code, spread, annual_rate, ...b }) =>
        b.pricing_type === "VARIABLE"
          ? { ...keepId(b), ...b, minimum_amount: str(b.minimum_amount), maximum_amount: str(b.maximum_amount), reference_rate_code: str(reference_rate_code, "").toUpperCase(), spread: str(spread, "0") }
          : { ...keepId(b), ...b, minimum_amount: str(b.minimum_amount), maximum_amount: str(b.maximum_amount), annual_rate: str(annual_rate, ""), pricing_type: "FIXED" },
      ),
    })),
    fees: (c.fees ?? []).map((f) => ({ ...keepId(f), fee_code: str(f.fee_code, "").toUpperCase(), fee_name: str(f.fee_name, ""), calculation_type: f.calculation_type, fee_value: str(f.fee_value), maximum_fee: str(f.maximum_fee), collection_point: f.collection_point, refundable: Boolean(f.refundable) })),
  };
}

// Loan product wizard: product and currency, terms and rate bands, fees,
// repayment policy, eligibility, approval matrix, collateral. A new product
// or a Draft / Rejected Add saves each page as a draft and is then
// submitted; an approved one proposes its changes in one edit.
export function LoanProductWizard({ product, scope, onClose, onSaved }) {
  const { t } = useTranslation(["loans", "common"]);
  const [options, setOptions] = useState(null);
  const [step, setStep] = useState(0);
  const [id, setId] = useState(product?.id ?? null);
  const [head, setHead] = useState({ product_code: "", currency_code: "" });
  const [config, setConfig] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const drafting = !product || [9, 5].includes(Number(product.status));
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    loanProductsApi
      .options(product?.inst_profile_id ? { inst_profile_id: product.inst_profile_id } : scope())
      .then((r) => {
        const o = rowsOf(r)[0] ?? {};
        setOptions(o);
        setConfig(structuredClone(product ? (product.draft ?? product.pending?.config ?? product.config ?? o.defaults) : o.defaults));
      })
      .catch((e) => {
        notifications.error(e.message);
        close.current();
      });
  }, [product, scope]);

  const currencyId = product?.currency_code ?? head.currency_code;
  const currency = options?.currencies?.find((c) => String(c.id) === String(currencyId));
  const cur = product?.currency_alpha_code ?? currency?.alpha_code ?? "";
  const decimals = currency?.amount_decimals ?? product?.rules?.amount_decimals ?? 2;
  const set = (patch) => setConfig((c) => ({ ...c, ...patch }));
  const setIn = (key) => (patch) => setConfig((c) => ({ ...c, [key]: { ...(c[key] ?? {}), ...patch } }));
  const setPolicy = setIn("policy");
  const setElig = setIn("eligibility_rules");
  const setColl = setIn("collateral_policy");

  const stepProblem = useMemo(() => {
    if (!config) return "";
    const key = STEPS[step];
    if (key === "product" && (!str(config.product_name, "") || (!product && (!/^[A-Z0-9_]+$/.test(head.product_code) || !head.currency_code)))) return t("productNeedsBasics");
    if (key === "terms") {
      if (!config.terms?.length) return t("addOneTerm");
      if (config.terms.some((x) => !x.term_code || !(Number(x.term_value) > 0) || !x.pricing?.length || x.pricing.some((b) => (b.pricing_type === "VARIABLE" ? !b.reference_rate_code || b.spread === "" : b.annual_rate === "")))) return t("termNeedsParts");
    }
    if (key === "fees" && config.fees?.some((f) => !f.fee_code || !f.fee_name || f.fee_value === "")) return t("feeNeedsParts");
    if (key === "approvals" && !config.approval_matrix?.length) return t("addOneApprovalRow");
    return "";
  }, [config, step, product, head, t]);

  const saveDraft = async () => {
    setBusy(true);
    setError("");
    try {
      const body = { ...toBody(config), is_draft: true };
      const response = id ? await loanProductsApi.edit({ id, ...body }) : await loanProductsApi.add(scope({ product_code: head.product_code, currency_code: Number(head.currency_code), ...body }));
      const newId = rowsOf(response)[0]?.id ?? id;
      setId(newId);
      return newId;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    setBusy(true);
    setError("");
    try {
      const savedId = drafting ? await saveDraft() : id;
      if (!savedId) return;
      setBusy(true);
      const response = drafting ? await loanProductsApi.submit({ id: savedId }) : await loanProductsApi.edit({ id: savedId, ...toBody(config) });
      notifications.success(response?.message ?? t("submitted"));
      onSaved(savedId);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!config || !options) {
    return (
      <PageSkeleton />
    );
  }

  const p = config.policy ?? {};
  const e = config.eligibility_rules ?? {};
  const col = config.collateral_policy ?? {};
  const field = (label, node, hint) => (
    <label className={labelClass}>
      {label}
      {node}
      {hint && <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{hint}</span>}
    </label>
  );
  const sel = (list) => ({ type: "select", options: list ?? [] });

  return (
    <div className="pb-8 pt-4">
      <button type="button" onClick={onClose} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft size={15} /> {t("backToProducts")}
      </button>
      <h1 className="mb-1 text-2xl font-black tracking-tight text-slate-800">{product ? t("editProductX", { name: product.product_name }) : t("newLoanProduct")}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{drafting ? t("wizardDraftHint") : t("wizardProposeHint")}</p>
      <HorizontalStepper className="mb-4" steps={STEPS.map((s) => ({ id: s, label: t(`step_${s}`) }))} activeIndex={step} onStepClick={(i) => i < step && setStep(i)} />

      {STEPS[step] === "product" && (
        <Section title={t("step_product")}>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {field(t("productCode"), <Field field={{ placeholder: "PL_AED" }} disabled={Boolean(product)} value={product?.product_code ?? head.product_code} onChange={(v) => setHead((h) => ({ ...h, product_code: v.toUpperCase().replace(/[^A-Z0-9_]/g, "") }))} />, !product && t("codeFixedHint"))}
            {field(t("currency"), <Field field={{ type: "select", blank: t("chooseCurrency"), options: (options.currencies ?? []).map((c) => ({ value: String(c.id), label: `${c.alpha_code} · ${c.name}` })) }} disabled={Boolean(product)} value={String(currencyId ?? "")} onChange={(v) => setHead((h) => ({ ...h, currency_code: v }))} />)}
            {field(t("productCategory"), <Field field={sel(options.product_categories)} value={config.product_category} onChange={(v) => set({ product_category: v })} />)}
            {field(t("productName"), <Field field={{}} value={config.product_name} onChange={(v) => set({ product_name: v })} />)}
            {field(t("effectiveFrom"), <Field field={{ type: "date" }} value={config.effective_from} onChange={(v) => set({ effective_from: v })} />)}
            {field(t("effectiveTo"), <Field field={{ type: "date" }} value={config.effective_to} onChange={(v) => set({ effective_to: v })} />)}
            <label className={cn(labelClass, "md:col-span-2 lg:col-span-3")}>
              {t("description")}
              <textarea className={cn(inputClass, "mt-1 min-h-16")} value={config.description ?? ""} onChange={(ev) => set({ description: ev.target.value })} />
            </label>
          </div>
        </Section>
      )}

      {STEPS[step] === "terms" && (
        <Section title={t("termsAndRates")}>
          <p className="mb-3 text-xs text-muted-foreground">{t("termsHint")}</p>
          <RowsEditor
            rows={config.terms ?? []}
            onChange={(terms) => set({ terms })}
            blank={blankTerm}
            addLabel={t("addTerm")}
            decimals={decimals}
            columns="lg:grid-cols-6"
            fields={[
              { key: "term_code", label: t("termCode"), placeholder: "12M" },
              { key: "term_value", label: t("termLength"), type: "int" },
              { key: "term_unit", label: t("termUnit"), ...sel(options.term_units) },
              { key: "minimum_amount", label: t("amountFrom"), type: "amount" },
              { key: "maximum_amount", label: t("upToZero"), type: "amount" },
              { key: "effective_from", label: t("effectiveFrom"), type: "date" },
            ]}
            renderExtra={(term, patch) => (
              <div className="mt-3 border-t border-dashed border-border pt-3">
                <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t("rateBands")}</p>
                <RowsEditor
                  rows={term.pricing ?? []}
                  onChange={(pricing) => patch({ pricing })}
                  blank={() => blankBand(term.pricing?.at(-1)?.maximum_amount || term.minimum_amount || "0")}
                  addLabel={t("addBand")}
                  decimals={decimals}
                  columns="lg:grid-cols-6"
                  fields={[
                    { key: "minimum_amount", label: t("amountFrom"), type: "amount" },
                    { key: "maximum_amount", label: t("upToZero"), type: "amount" },
                    { key: "pricing_type", label: t("pricingType"), type: "select", options: [{ value: "FIXED", label: t("pricingFixed") }, { value: "VARIABLE", label: t("pricingVariable") }] },
                    { key: "annual_rate", label: t("ratePct"), type: "rate", showIf: (b) => b.pricing_type !== "VARIABLE" },
                    { key: "reference_rate_code", label: t("referenceRate"), placeholder: "BASE", showIf: (b) => b.pricing_type === "VARIABLE" },
                    { key: "spread", label: t("spreadPct"), type: "rate", showIf: (b) => b.pricing_type === "VARIABLE" },
                    { key: "calculation_method", label: t("calculationMethod"), ...sel(options.calculation_methods) },
                    { key: "day_count_convention", label: t("dayCount"), ...sel(options.day_count_conventions) },
                    { key: "effective_from", label: t("effectiveFrom"), type: "date" },
                  ]}
                />
              </div>
            )}
          />
          {id && product?.config && <RateCheck product={product} decimals={decimals} />}
        </Section>
      )}

      {STEPS[step] === "fees" && (
        <Section title={t("fees")}>
          <p className="mb-3 text-xs text-muted-foreground">{t("feesHint")}</p>
          <RowsEditor
            rows={config.fees ?? []}
            onChange={(fees) => set({ fees })}
            blank={blankFee}
            addLabel={t("addFee")}
            decimals={decimals}
            columns="lg:grid-cols-7"
            fields={[
              { key: "fee_code", label: t("feeCode"), placeholder: "PROCESSING" },
              { key: "fee_name", label: t("feeName") },
              { key: "calculation_type", label: t("calculation"), ...sel(options.fee_calculation_types) },
              { key: "fee_value", label: t("valueAmountOrPct"), type: "rate" },
              { key: "maximum_fee", label: t("maximumFee"), type: "amount" },
              { key: "collection_point", label: t("charged"), ...sel(options.fee_collection_points) },
              { key: "refundable", label: t("refundable"), type: "bool" },
            ]}
          />
        </Section>
      )}

      {STEPS[step] === "repayment" && (
        <Section title={t("groupRepayment")}>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {field(t("repaymentFrequency"), <Field field={sel(options.repayment_frequencies)} value={p.repayment_frequency} onChange={(v) => setPolicy({ repayment_frequency: v, ...(v === "BULLET" ? { installment_method: "BULLET" } : {}) })} />)}
            {field(t("installmentMethod"), <Field field={sel(options.installment_methods)} value={p.installment_method} onChange={(v) => setPolicy({ installment_method: v })} />, p.repayment_frequency === "BULLET" && t("bulletHint"))}
            {field(t("gracePeriodDays"), <Field field={{ type: "int" }} value={p.grace_period_days} onChange={(v) => setPolicy({ grace_period_days: v })} />, t("graceHint"))}
            {field(t("prepaymentChargeType"), <Field field={sel(options.prepayment_charge_types)} value={p.prepayment_charge_type} onChange={(v) => setPolicy({ prepayment_charge_type: v })} />)}
            {p.prepayment_charge_type !== "NONE" && field(t(p.prepayment_charge_type === "PERCENT" ? "valuePct" : "valueAmount"), <Field field={{ type: "rate" }} value={p.prepayment_charge_value} onChange={(v) => setPolicy({ prepayment_charge_value: v })} />)}
            {field(t("lateChargeType"), <Field field={sel(options.late_charge_types)} value={p.late_charge_type} onChange={(v) => setPolicy({ late_charge_type: v })} />)}
            {p.late_charge_type !== "NONE" && field(t(p.late_charge_type === "PERCENT_OVERDUE" ? "valuePct" : "valueAmount"), <Field field={{ type: "rate" }} value={p.late_charge_value} onChange={(v) => setPolicy({ late_charge_value: v })} />)}
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <Toggle showLabel label={t("earlySettlement")} checked={p.early_settlement_allowed} onChange={(v) => setPolicy({ early_settlement_allowed: v })} />
            <Toggle showLabel label={t("autoDebit")} checked={p.auto_debit_enabled} onChange={(v) => setPolicy({ auto_debit_enabled: v })} />
            <Toggle showLabel label={t("moratoriumAllowed")} checked={p.moratorium_allowed} onChange={(v) => setPolicy({ moratorium_allowed: v })} />
            {p.moratorium_allowed && field(t("maximumMoratoriumDays"), <Field field={{ type: "int" }} value={p.maximum_moratorium_days} onChange={(v) => setPolicy({ maximum_moratorium_days: v })} />)}
          </div>
          <AllocationOrder value={p.repayment_allocation_order ?? options.repayment_allocation_parts ?? []} onChange={(v) => setPolicy({ repayment_allocation_order: v })} />
        </Section>
      )}

      {STEPS[step] === "eligibility" && (
        <Section title={t("groupEligibility")}>
          <p className="mb-3 text-xs text-muted-foreground">{t("eligibilityHint")}</p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {field(t("minimumAge"), <Field field={{ type: "int" }} value={e.individual?.minimum_age} onChange={(v) => setElig({ individual: { ...e.individual, minimum_age: v } })} />)}
            {field(t("maximumAge"), <Field field={{ type: "int" }} value={e.individual?.maximum_age} onChange={(v) => setElig({ individual: { ...e.individual, maximum_age: v } })} />)}
            {field(`${t("minimumMonthlyIncome")} ${cur && `(${cur})`}`, <Field field={{ type: "amount" }} decimals={decimals} value={e.individual?.minimum_monthly_income} onChange={(v) => setElig({ individual: { ...e.individual, minimum_monthly_income: v } })} />)}
            {field(t("maximumDtiRatio"), <Field field={{ type: "rate", placeholder: "0.5" }} value={e.maximum_debt_to_income_ratio} onChange={(v) => setElig({ maximum_debt_to_income_ratio: v })} />, t("dtiHint"))}
            {field(t("minimumOperatingMonths"), <Field field={{ type: "int" }} value={e.corporate?.minimum_operating_months} onChange={(v) => setElig({ corporate: { ...e.corporate, minimum_operating_months: v } })} />)}
            <Toggle showLabel label={t("creditCheckRequired")} checked={e.credit_check_required} onChange={(v) => setElig({ credit_check_required: v })} className="self-end" />
          </div>
          {(e.individual?.minimum_age || e.individual?.maximum_age) && <p className="mt-3 text-xs text-amber-700">{t("ageRuleHint")}</p>}
        </Section>
      )}

      {STEPS[step] === "approvals" && (
        <Section title={t("approvalMatrix")}>
          <p className="mb-3 text-xs text-muted-foreground">{t("approvalHint")}</p>
          <RowsEditor
            rows={config.approval_matrix ?? []}
            onChange={(approval_matrix) => set({ approval_matrix })}
            blank={blankApproval}
            addLabel={t("addApprovalRow")}
            decimals={decimals}
            fields={[
              { key: "minimum_amount", label: t("amountFrom"), type: "amount" },
              { key: "maximum_amount", label: t("upToZero"), type: "amount" },
              { key: "required_approvals", label: t("approvers"), type: "select", options: ["1", "2", "3"].map((v) => ({ value: v, label: v })) },
              { key: "profile_ids", label: t("approverProfiles"), type: "multi", options: (options.user_profiles ?? []).map((u) => ({ value: u.id, label: u.name })) },
            ]}
          />
        </Section>
      )}

      {STEPS[step] === "collateral" && (
        <Section title={t("groupCollateral")}>
          <Toggle showLabel label={t("collateralRequired")} checked={col.required} onChange={(v) => setColl({ required: v })} className="mb-3 max-w-md" />
          {col.required && field(t("coverageRatio"), <Field field={{ type: "rate", placeholder: "0.5" }} value={col.minimum_coverage_ratio} onChange={(v) => setColl({ minimum_coverage_ratio: v })} />, t("coverageHint"))}
          <div className="mt-3">
            <p className={labelClass}>{t("acceptedTypes")}</p>
            <Field field={{ type: "multi", options: options.collateral_types ?? [] }} value={col.accepted_types} onChange={(v) => setColl({ accepted_types: v })} />
            <p className="mt-1 text-[11px] text-muted-foreground">{t("acceptedTypesHint")}</p>
          </div>
        </Section>
      )}

      {error ? (
        <div className="mt-4">
          <Problems message={error} />
        </div>
      ) : (
        stepProblem && <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">{stepProblem}</p>
      )}

      <div className="sticky bottom-0 mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-[var(--background)] py-3">
        <Button variant="ghost" icon={ArrowLeft} disabled={step === 0 || busy} onClick={() => setStep((s) => s - 1)}>
          {t("back")}
        </Button>
        <div className="flex gap-2">
          {drafting && (
            <Button variant="secondary" icon={Save} loading={busy} disabled={STEPS[step] === "product" && Boolean(stepProblem)} onClick={async () => (await saveDraft()) && notifications.success(t("draftSaved"))}>
              {t("saveDraft")}
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button icon={ArrowRight} loading={busy} disabled={Boolean(stepProblem)} onClick={async () => (!drafting || (await saveDraft())) && setStep((s) => s + 1)}>
              {t("next")}
            </Button>
          ) : (
            <Button icon={Send} loading={busy} disabled={Boolean(stepProblem)} onClick={finish}>
              {drafting ? t("submitForApproval") : t("proposeChanges")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// The order a repayment pays the parts in: move a part up or down.
function AllocationOrder({ value, onChange }) {
  const { t } = useTranslation("loans");
  const move = (i, d) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <div className="mt-4">
      <p className={labelClass}>{t("allocationOrder")}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {value.map((part, i) => (
          <span key={part} className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-bold">
            <span className="text-muted-foreground">{i + 1}.</span> {loanLabel(t, part)}
            <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="px-1 text-muted-foreground hover:text-primary disabled:opacity-30" aria-label={t("moveUp")}>
              ‹
            </button>
            <button type="button" disabled={i === value.length - 1} onClick={() => move(i, 1)} className="px-1 text-muted-foreground hover:text-primary disabled:opacity-30" aria-label={t("moveDown")}>
              ›
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

// rate_quote as a check: the term and band an amount gets, from the setup
// in effect.
export function RateCheck({ product, decimals = 2 }) {
  const { t } = useTranslation("loans");
  const terms = product.config?.terms ?? [];
  const [termId, setTermId] = useState(terms[0]?.id ? String(terms[0].id) : "");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setError("");
    try {
      setQuote(rowsOf(await loanProductsApi.rate_quote({ loan_product_id: product.id, term_id: Number(termId), amount }))[0] ?? null);
    } catch (err) {
      setQuote(null);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-dashed border-border p-3">
      <p className="mb-2 text-xs font-bold text-foreground">{t("tryARate")}</p>
      <div className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <label className={labelClass}>
          {t("term")}
          <Field field={{ type: "select", options: terms.map((x) => ({ value: String(x.id), label: `${x.term_code} · ${x.term_value} ${loanLabel(t, x.term_unit)}` })) }} value={termId} onChange={setTermId} />
        </label>
        <label className={labelClass}>
          {t("amount")}
          <Field field={{ type: "amount" }} decimals={decimals} value={amount} onChange={setAmount} />
        </label>
        <Button icon={Calculator} loading={busy} disabled={!termId || !(Number(amount) > 0)} onClick={run}>
          {t("getRate")}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-red-700">{error}</p>}
      {quote && (
        <p className="mt-2 text-sm">
          <b className="text-lg text-primary">{ratePct(quote.annual_rate)}</b>
          {quote.reference_rate_code && <span className="text-xs text-muted-foreground"> ({quote.reference_rate_code} {ratePct(quote.reference_rate)} + {ratePct(quote.spread)})</span>} · {quote.term_code} · {loanLabel(t, quote.calculation_method)} · {loanLabel(t, quote.day_count_convention)}
        </p>
      )}
    </div>
  );
}
