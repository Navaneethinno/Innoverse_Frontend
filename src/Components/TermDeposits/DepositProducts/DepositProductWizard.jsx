import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Plus, Save, Send, Trash2 } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { HorizontalStepper } from "@/Components/Common/HorizontalStepper";
import { Spinner } from "@/Components/Common/Spinner";
import { Toggle } from "@/Components/Common/Toggle";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { depositProductsApi } from "@/Services/TermDeposits/termDeposits.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { Problems, Section, amountInput, inputClass, labelClass } from "../depositShared";
import { PERIOD_DAYS, optionLabel } from "./productShared";

const STEPS = ["policy", "tenors", "rates"];
const today = () => new Date().toISOString().slice(0, 10);
const emptyBand = (from = "0") => ({ minimum_principal: from, maximum_principal: "0", annual_rate: "", effective_from: today(), effective_to: "" });
const emptyTenor = () => ({ label: "", tenor_days: "", effective_from: today(), effective_to: "", rates: [emptyBand()] });
const rateInput = (v) => amountInput(v, 6);

// The configuration as the server takes it: amounts and rates as strings,
// days as numbers, ids kept on tenors and bands that already exist.
function toBody(config) {
  const str = (v) => String(v ?? "").trim();
  return {
    ...config,
    minimum_principal: str(config.minimum_principal) || "0",
    maximum_principal: str(config.maximum_principal) || "0",
    early_withdrawal_adjustment_value: str(config.early_withdrawal_adjustment_value) || "0",
    grace_period_days: Number(config.grace_period_days) || 0,
    additional_deposit_allowed: false,
    tenors: (config.tenors ?? []).map((tenor) => ({
      ...(tenor.id ? { id: tenor.id } : {}),
      label: str(tenor.label),
      tenor_days: Number(tenor.tenor_days) || 0,
      effective_from: tenor.effective_from ?? "",
      effective_to: tenor.effective_to ?? "",
      rates: (tenor.rates ?? []).map((b) => ({
        ...(b.id ? { id: b.id } : {}),
        minimum_principal: str(b.minimum_principal) || "0",
        maximum_principal: str(b.maximum_principal) || "0",
        annual_rate: str(b.annual_rate),
        effective_from: b.effective_from ?? "",
        effective_to: b.effective_to ?? "",
      })),
    })),
  };
}

// Deposit product wizard: Policy, Tenors, Rates per tenor. A new setup or a
// Draft / Rejected Add saves each page as a draft (is_draft) and is then
// submitted; an Active or Inactive one proposes its changes in one edit,
// for a checker to approve.
export function DepositProductWizard({ product, onClose, onSaved }) {
  const { t } = useTranslation(["deposits", "common"]);
  const [options, setOptions] = useState(null);
  const [step, setStep] = useState(0);
  const [id, setId] = useState(product?.id ?? null);
  const [productId, setProductId] = useState("");
  const [config, setConfig] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const drafting = !product || [9, 5].includes(Number(product.status));
  // The parent passes an inline onClose; a ref keeps it out of the load's deps.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    depositProductsApi
      .options(product?.inst_profile_id ? { inst_profile_id: product.inst_profile_id } : {})
      .then((r) => {
        const o = rowsOf(r)[0] ?? {};
        setOptions(o);
        setConfig(structuredClone(product ? (product.draft ?? product.config ?? o.defaults) : o.defaults) ?? { tenors: [] });
      })
      .catch((e) => {
        notifications.error(e.message);
        close.current();
      });
  }, [product]);

  const currency = product?.acct_product?.currency_code ?? options?.available_products?.find((p) => String(p.id ?? p.acct_product_id) === productId)?.currency_code ?? "";
  const decimals = options?.available_products?.find((p) => String(p.id ?? p.acct_product_id) === productId)?.amount_decimals ?? product?.rules?.amount_decimals ?? 2;
  const money = (v) => amountInput(v, decimals);
  const set = (patch) => setConfig((c) => ({ ...c, ...patch }));
  const setTenor = (i, patch) => setConfig((c) => ({ ...c, tenors: c.tenors.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const setBand = (i, k, patch) => setTenor(i, { rates: config.tenors[i].rates.map((b, j) => (j === k ? { ...b, ...patch } : b)) });

  const minDays = PERIOD_DAYS[config?.interest_payout_frequency] ?? 1;
  const stepProblem = useMemo(() => {
    if (!config) return "";
    if (step === 0 && !product && !productId) return t("pickProduct");
    if (step === 1) {
      if (!config.tenors?.length) return t("addOneTenor");
      if (config.tenors.some((x) => !String(x.label).trim() || !(Number(x.tenor_days) > 0))) return t("tenorNeedsLabelDays");
    }
    if (step === 2 && config.tenors.some((x) => !x.rates?.length || x.rates.some((b) => b.annual_rate === ""))) return t("bandNeedsRate");
    return "";
  }, [config, step, product, productId, t]);

  // Draft save (new: add; then edit). Returns the id, or null on a refusal.
  const saveDraft = async () => {
    setBusy(true);
    setError("");
    try {
      const body = { ...toBody(config), is_draft: true };
      const response = id ? await depositProductsApi.edit({ id, ...body }) : await depositProductsApi.add({ acct_product_id: Number(productId), ...body });
      const saved = rowsOf(response)[0];
      const newId = saved?.id ?? id;
      setId(newId);
      return newId;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const next = async () => {
    if (drafting && !(await saveDraft())) return;
    setStep((s) => s + 1);
  };

  const finish = async () => {
    setBusy(true);
    setError("");
    try {
      // A brand-new setup gets its id from the draft save just made.
      const savedId = drafting ? await saveDraft() : id;
      if (!savedId) return;
      setBusy(true);
      const response = drafting ? await depositProductsApi.submit({ id: savedId }) : await depositProductsApi.edit({ id: savedId, ...toBody(config) });
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
      <div className="flex items-center gap-2 pt-10 text-sm text-muted-foreground">
        <Spinner size={16} /> {t("loading")}
      </div>
    );
  }

  const select = (key, list) => <FilterSelect className="mt-1.5" value={config[key] ?? ""} onChange={(v) => set({ [key]: v })} options={(list ?? []).map((v) => ({ value: v, label: optionLabel(t, v) }))} />;

  return (
    <div className="pb-8 pt-4">
      <button type="button" onClick={onClose} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft size={15} /> {t("backToProducts")}
      </button>
      <h1 className="mb-1 text-2xl font-black tracking-tight text-slate-800">{product ? t("editProductX", { name: product.acct_product?.product_name }) : t("newDepositProduct")}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{drafting ? t("wizardDraftHint") : t("wizardProposeHint")}</p>

      <HorizontalStepper className="mb-4" steps={STEPS.map((s) => ({ id: s, label: t(`step_${s}`) }))} activeIndex={step} onStepClick={(i) => i < step && setStep(i)} />

      {step === 0 && (
        <div className="grid gap-4">
          <Section title={t("principalTitle")}>
            <div className="grid gap-3 md:grid-cols-3">
              {!product && (
                <label className={labelClass}>
                  {t("accountProduct")}
                  <FilterSelect
                    className="mt-1.5"
                    value={productId}
                    onChange={setProductId}
                    options={[{ value: "", label: options.available_products?.length ? t("chooseProduct") : t("noProductsAvailable") }, ...(options.available_products ?? []).map((p) => ({ value: String(p.id ?? p.acct_product_id), label: `${p.product_name} · ${p.product_code} (${p.currency_code})` }))]}
                  />
                </label>
              )}
              <label className={labelClass}>
                {t("minimumPrincipal")} {currency && `(${currency})`}
                <input className={cn(inputClass, "mt-1.5 tabular-nums")} inputMode="decimal" value={config.minimum_principal ?? ""} onChange={(e) => set({ minimum_principal: money(e.target.value) })} />
              </label>
              <label className={labelClass}>
                {t("maximumPrincipal")} {currency && `(${currency})`}
                <input className={cn(inputClass, "mt-1.5 tabular-nums")} inputMode="decimal" value={config.maximum_principal ?? ""} onChange={(e) => set({ maximum_principal: money(e.target.value) })} />
                <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("zeroNoLimit")}</span>
              </label>
            </div>
            {!product && !options.available_products?.length && <p className="mt-3 text-xs text-amber-700">{t("noProductsHint")}</p>}
          </Section>

          <Section title={t("interestTitle")}>
            <Toggle showLabel label={t("interestEnabled")} checked={config.interest_enabled} onChange={(v) => set({ interest_enabled: v })} className="mb-3" />
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <label className={labelClass}>
                {t("calculationMethod")}
                {select("interest_calculation_method", options.interest_calculation_methods)}
              </label>
              <label className={labelClass}>
                {t("dayCount")}
                {select("day_count_convention", options.day_count_conventions)}
              </label>
              <label className={labelClass}>
                {t("accrualFrequency")}
                {select("accrual_frequency", options.accrual_frequencies)}
              </label>
              <label className={labelClass}>
                {t("payoutFrequency")}
                <FilterSelect
                  className="mt-1.5"
                  value={config.interest_payout_frequency ?? ""}
                  onChange={(v) => set({ interest_payout_frequency: v, ...(v !== "AT_MATURITY" ? { compounding_enabled: false } : {}) })}
                  options={(options.interest_payout_frequencies ?? []).map((v) => ({ value: v, label: optionLabel(t, v) }))}
                />
              </label>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Toggle showLabel label={t("compoundingHint")} checked={config.compounding_enabled} disabled={config.interest_payout_frequency !== "AT_MATURITY"} onChange={(v) => set({ compounding_enabled: v })} />
            </div>
          </Section>

          <Section title={t("maturityTitle")}>
            <div className="grid gap-3 md:grid-cols-3">
              <label className={labelClass}>
                {t("maturityDefault")}
                {select("maturity_instruction_default", options.maturity_instructions)}
              </label>
              <label className={labelClass}>
                {t("graceDays")}
                <input className={cn(inputClass, "mt-1.5")} inputMode="numeric" value={config.grace_period_days ?? ""} onChange={(e) => set({ grace_period_days: e.target.value.replace(/\D/g, "") })} />
                <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("graceHint")}</span>
              </label>
              <Toggle showLabel label={t("payoutAccountRequired")} checked={config.payout_account_required} onChange={(v) => set({ payout_account_required: v })} className="self-start md:mt-5" />
            </div>
          </Section>

          <Section title={t("earlyTitle")}>
            <Toggle showLabel label={t("earlyAllowed")} checked={config.early_withdrawal_allowed} onChange={(v) => set({ early_withdrawal_allowed: v })} className="mb-3" />
            {config.early_withdrawal_allowed && (
              <div className="grid gap-3 md:grid-cols-3">
                <label className={labelClass}>
                  {t("adjustmentType")}
                  {select("early_withdrawal_adjustment_type", options.early_withdrawal_adjustment_types)}
                </label>
                <label className={labelClass}>
                  {t(config.early_withdrawal_adjustment_type === "REDUCED_RATE" ? "reducedRateValue" : "forfeitValue")}
                  <input className={cn(inputClass, "mt-1.5 tabular-nums")} inputMode="decimal" value={config.early_withdrawal_adjustment_value ?? ""} onChange={(e) => set({ early_withdrawal_adjustment_value: rateInput(e.target.value) })} />
                </label>
                <Toggle showLabel label={t("recoverPaidInterest")} checked={config.recover_previously_paid_interest} onChange={(v) => set({ recover_previously_paid_interest: v })} className="self-start md:mt-5" />
              </div>
            )}
          </Section>
        </div>
      )}

      {step === 1 && (
        <Section
          title={t("tenorsTitle")}
          action={
            <Button variant="outline" size="sm" icon={Plus} onClick={() => set({ tenors: [...config.tenors, emptyTenor()] })}>
              {t("addTenor")}
            </Button>
          }
        >
          <p className="mb-3 text-xs text-muted-foreground">{t("tenorsHint", { days: minDays, frequency: optionLabel(t, config.interest_payout_frequency) })}</p>
          <div className="grid gap-2">
            {config.tenors.map((tenor, i) => (
              <div key={tenor.id ?? `n${i}`} className="grid items-end gap-2 rounded-xl border border-border p-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                <label className={labelClass}>
                  {t("tenorLabel")}
                  <input className={cn(inputClass, "mt-1")} value={tenor.label} placeholder={t("tenorLabelPlaceholder")} onChange={(e) => setTenor(i, { label: e.target.value })} />
                </label>
                <label className={labelClass}>
                  {t("tenorDays")}
                  <input className={cn(inputClass, "mt-1", Number(tenor.tenor_days) > 0 && Number(tenor.tenor_days) < minDays && "border-red-400")} inputMode="numeric" value={tenor.tenor_days} onChange={(e) => setTenor(i, { tenor_days: e.target.value.replace(/\D/g, "") })} />
                </label>
                <label className={labelClass}>
                  {t("effectiveFrom")}
                  <input type="date" className={cn(inputClass, "mt-1")} value={tenor.effective_from ?? ""} onChange={(e) => setTenor(i, { effective_from: e.target.value })} />
                </label>
                <label className={labelClass}>
                  {t("effectiveTo")}
                  <input type="date" className={cn(inputClass, "mt-1")} value={tenor.effective_to ?? ""} onChange={(e) => setTenor(i, { effective_to: e.target.value })} />
                </label>
                <ActionIconButton label={t("removeTenor")} intent="delete" icon={Trash2} onClick={() => set({ tenors: config.tenors.filter((_, j) => j !== i) })} className="mb-1" />
              </div>
            ))}
            {!config.tenors.length && <p className="py-6 text-center text-sm text-muted-foreground">{t("noTenors")}</p>}
          </div>
        </Section>
      )}

      {step === 2 && (
        <div className="grid gap-4">
          <p className="text-xs text-muted-foreground">{t("bandsHint")}</p>
          {config.tenors.map((tenor, i) => (
            <Section
              key={tenor.id ?? `n${i}`}
              title={`${tenor.label} · ${t("daysN", { count: Number(tenor.tenor_days) })}`}
              action={
                <Button variant="outline" size="sm" icon={Plus} onClick={() => setTenor(i, { rates: [...tenor.rates, emptyBand(tenor.rates.at(-1)?.maximum_principal || "0")] })}>
                  {t("addBand")}
                </Button>
              }
            >
              <div className="grid gap-2">
                {tenor.rates.map((b, k) => (
                  <div key={b.id ?? `b${k}`} className="grid items-end gap-2 rounded-xl border border-border p-3 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] lg:border-0 lg:p-0">
                    <label className={labelClass}>
                      {t("amountFrom")}
                      <input className={cn(inputClass, "mt-1 tabular-nums")} inputMode="decimal" value={b.minimum_principal} onChange={(e) => setBand(i, k, { minimum_principal: money(e.target.value) })} />
                    </label>
                    <label className={labelClass}>
                      {t("amountUpTo")}
                      <input className={cn(inputClass, "mt-1 tabular-nums")} inputMode="decimal" value={b.maximum_principal} onChange={(e) => setBand(i, k, { maximum_principal: money(e.target.value) })} />
                    </label>
                    <label className={labelClass}>
                      {t("annualRatePct")}
                      <input className={cn(inputClass, "mt-1 tabular-nums font-bold")} inputMode="decimal" value={b.annual_rate} onChange={(e) => setBand(i, k, { annual_rate: rateInput(e.target.value) })} />
                    </label>
                    <label className={labelClass}>
                      {t("effectiveFrom")}
                      <input type="date" className={cn(inputClass, "mt-1")} value={b.effective_from ?? ""} onChange={(e) => setBand(i, k, { effective_from: e.target.value })} />
                    </label>
                    <label className={labelClass}>
                      {t("effectiveTo")}
                      <input type="date" className={cn(inputClass, "mt-1")} value={b.effective_to ?? ""} onChange={(e) => setBand(i, k, { effective_to: e.target.value })} />
                    </label>
                    <ActionIconButton label={t("removeBand")} intent="delete" icon={Trash2} onClick={() => setTenor(i, { rates: tenor.rates.filter((_, j) => j !== k) })} className="mb-1" />
                  </div>
                ))}
              </div>
            </Section>
          ))}
        </div>
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
            <Button variant="secondary" icon={Save} loading={busy} disabled={!product && !productId} onClick={async () => (await saveDraft()) && notifications.success(t("draftSaved"))}>
              {t("saveDraft")}
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button icon={ArrowRight} loading={busy} disabled={Boolean(stepProblem)} onClick={next}>
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
