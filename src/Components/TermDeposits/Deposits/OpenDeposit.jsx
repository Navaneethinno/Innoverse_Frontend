import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Send, UserRound } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { money } from "@/Components/Epurse/Accounts/accountShared";
import { accountsApi } from "@/Services/Epurse/accounts.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { depositsApi } from "@/Services/TermDeposits/termDeposits.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { Facts, Problems, amountInput, dayDate, inputClass, labelClass, ratePct } from "../depositShared";
import { earlyText, optionLabel } from "../DepositProducts/productShared";

// The owner of a wallet, as the deposit calls name it.
export const ownerEntity = (owner) => (owner?.kind && owner?.id ? { entity_type: owner.kind, entity_id: owner.id } : null);

// Open a deposit for a customer or merchant: find the owner (by name or
// wallet number, unless given), then options (wallets, products), a live
// quote as the form changes, and open. The rate is indicative: the checker's
// approval fixes it on the day.
export function OpenDeposit({ entity: given, onClose, onOpened }) {
  const { t } = useTranslation(["deposits", "accounts"]);
  const [entity, setEntity] = useState(given ?? null);
  const [options, setOptions] = useState(null);
  const [form, setForm] = useState({ acct_product_id: "", tenor_id: "", principal: "", funding_acct_id: "", payout_acct_id: "", narration: "" });
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!entity) return;
    let cancelled = false;
    setOptions(null);
    depositsApi
      .options(entity)
      .then((r) => {
        if (cancelled) return;
        const o = rowsOf(r)[0] ?? {};
        setOptions(o);
        const product = o.products?.[0];
        const wallet = o.wallets?.find((w) => !product || w.currency_code === product.currency_code);
        setForm((f) => ({ ...f, acct_product_id: product ? String(product.acct_product_id) : "", tenor_id: product?.config?.tenors?.[0]?.id ? String(product.config.tenors[0].id) : "", funding_acct_id: wallet ? String(wallet.id) : "", payout_acct_id: "" }));
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [entity]);

  const product = options?.products?.find((p) => String(p.acct_product_id) === form.acct_product_id);
  const wallets = (options?.wallets ?? []).filter((w) => !product || w.currency_code === product.currency_code);
  const funding = wallets.find((w) => String(w.id) === form.funding_acct_id);
  const body = entity && form.acct_product_id && form.tenor_id && Number(form.principal) > 0 && form.funding_acct_id
    ? { ...entity, acct_product_id: Number(form.acct_product_id), tenor_id: Number(form.tenor_id), principal: form.principal, funding_acct_id: Number(form.funding_acct_id), ...(form.payout_acct_id ? { payout_acct_id: Number(form.payout_acct_id) } : {}) }
    : null;
  const bodyKey = JSON.stringify(body);

  // Live quote: every check, nothing written. Debounced while typing.
  useEffect(() => {
    setQuote(null);
    setQuoteError("");
    if (!body) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setQuoting(true);
      depositsApi
        .quote(body)
        .then((r) => !cancelled && setQuote(rowsOf(r)[0] ?? null))
        .catch((e) => !cancelled && setQuoteError(e.message))
        .finally(() => !cancelled && setQuoting(false));
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // bodyKey stands for body.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyKey]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const open = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await depositsApi.open({ ...body, ...(form.narration.trim() ? { narration: form.narration.trim() } : {}) });
      notifications.success(response?.message ?? t("depositRequested"));
      onOpened(rowsOf(response)[0]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={t("openDeposit")}
      subtitle={options?.owner?.name}
      footer={
        entity && (
          <>
            <Button variant="ghost" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button icon={Send} loading={busy} disabled={!quote} onClick={open}>
              {t("requestDeposit")}
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
            </p>
            <div className="flex items-center gap-3">
              <StatusBadge status={options.owner?.status_name ?? ""} variant="subtle" />
              {!given && (
                <button type="button" onClick={() => setEntity(null)} className="text-xs font-bold text-primary hover:underline">
                  {t("change")}
                </button>
              )}
            </div>
          </div>

          {!options.products?.length ? (
            <p className="text-sm text-amber-700">{t("noDepositProductsForOwner")}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                {t("depositProduct")}
                <FilterSelect
                  className="mt-1.5"
                  value={form.acct_product_id}
                  onChange={(v) => {
                    const p = options.products.find((x) => String(x.acct_product_id) === v);
                    setForm((f) => ({ ...f, acct_product_id: v, tenor_id: p?.config?.tenors?.[0]?.id ? String(p.config.tenors[0].id) : "", funding_acct_id: "", payout_acct_id: "" }));
                  }}
                  options={options.products.map((p) => ({ value: String(p.acct_product_id), label: `${p.product_name} (${p.currency_code})` }))}
                />
              </label>
              <label className={labelClass}>
                {t("tenor")}
                <FilterSelect className="mt-1.5" value={form.tenor_id} onChange={set("tenor_id")} options={(product?.config?.tenors ?? []).map((x) => ({ value: String(x.id), label: `${x.label} · ${t("daysN", { count: x.tenor_days })}` }))} />
              </label>
              <label className={labelClass}>
                {t("principalIn", { currency: product?.currency_code ?? "" })}
                <input className={cn(inputClass, "mt-1.5 text-base font-bold tabular-nums")} inputMode="decimal" value={form.principal} placeholder="0.00" onChange={(e) => set("principal")(amountInput(e.target.value, product?.amount_decimals ?? 2))} />
                {product?.config && (
                  <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
                    {t("principalLimits", { min: money(product.config.minimum_principal, product.currency_code), max: Number(product.config.maximum_principal) === 0 ? t("noLimit") : money(product.config.maximum_principal, product.currency_code) })}
                  </span>
                )}
              </label>
              <label className={labelClass}>
                {t("fundingWallet")}
                <FilterSelect className="mt-1.5" value={form.funding_acct_id} onChange={set("funding_acct_id")} options={[{ value: "", label: wallets.length ? t("chooseWallet") : t("noWalletInCurrency") }, ...wallets.map((w) => ({ value: String(w.id), label: `${w.acct_num} · ${money(w.avail_bal, w.currency_code)}` }))]} />
              </label>
              <label className={labelClass}>
                {t("payoutWallet")}
                <FilterSelect className="mt-1.5" value={form.payout_acct_id} onChange={set("payout_acct_id")} options={[{ value: "", label: t("sameAsFunding") }, ...wallets.filter((w) => String(w.id) !== form.funding_acct_id).map((w) => ({ value: String(w.id), label: w.acct_num }))]} />
              </label>
              <label className={labelClass}>
                {t("narrationOptional")}
                <input className={cn(inputClass, "mt-1.5")} maxLength={200} value={form.narration} onChange={(e) => set("narration")(e.target.value)} />
              </label>
            </div>
          )}

          {funding && Number(form.principal) > Number(funding.avail_bal) && <p className="text-xs font-semibold text-red-700">{t("walletShort", { balance: money(funding.avail_bal, funding.currency_code) })}</p>}
          {quoting && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Spinner size={12} /> {t("quoting")}
            </p>
          )}
          {quoteError && <Problems message={quoteError} />}
          {quote && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 animate-in fade-in">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-3xl font-black tabular-nums text-emerald-700">{ratePct(quote.annual_rate)}</p>
                <p className="text-[11px] font-semibold text-emerald-700">{t("indicativeRate")}</p>
              </div>
              <Facts
                className="lg:grid-cols-3"
                rows={[
                  [t("tenor"), `${quote.tenor_label} · ${t("daysN", { count: quote.tenor_days })}`],
                  [t("maturityDate"), dayDate(quote.maturity_date)],
                  [t("band"), `${money(quote.band_minimum_principal, product?.currency_code)} – ${Number(quote.band_maximum_principal) === 0 ? t("noLimit") : money(quote.band_maximum_principal, product?.currency_code)}`],
                  [t("payoutFrequency"), optionLabel(t, product?.config?.interest_payout_frequency)],
                  [t("maturityInstruction"), optionLabel(t, product?.config?.maturity_instruction_default)],
                  product?.config?.early_withdrawal_allowed != null && [t("earlyWithdrawal"), product.config.early_withdrawal_allowed ? earlyText(t, product.config) : t("notAllowed")],
                ]}
              />
            </div>
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

// Find a customer or merchant by name or wallet number (their wallets in
// Accounts), and pick one.
export function OwnerFinder({ onPick }) {
  const { t } = useTranslation(["deposits", "accounts"]);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);

  const find = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setBusy(true);
    try {
      const byNumber = /^\d{6,}$/.test(q);
      const data = rowsOf(await accountsApi.list({ page: 1, limit: 20, acct_class: "CUSTOMER", ...(byNumber ? { acct_num: q } : { owner_name: q }) }))[0];
      // One row per owner.
      const seen = new Map();
      for (const a of data?.accounts ?? []) if (a.owner?.id && !seen.has(`${a.owner.kind}-${a.owner.id}`)) seen.set(`${a.owner.kind}-${a.owner.id}`, a);
      setRows([...seen.values()]);
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">{t("findOwnerHint")}</p>
      <form onSubmit={find} className="flex gap-2">
        <input className={inputClass} autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("findOwnerPlaceholder")} />
        <Button type="submit" icon={Search} loading={busy} disabled={!query.trim()}>
          {t("find")}
        </Button>
      </form>
      {rows && (
        <div className="mt-3 grid gap-2">
          {rows.map((a) => (
            <button
              key={`${a.owner.kind}-${a.owner.id}`}
              type="button"
              onClick={() => onPick(ownerEntity(a.owner))}
              className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-left transition-all hover:-translate-y-px hover:border-primary hover:shadow-sm"
            >
              <span>
                <span className="block text-sm font-bold text-foreground">{a.owner.name}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {t(a.owner.party === "MERCHANT" ? "accounts:merchant" : "accounts:customer")} · {t(a.owner.ownership === "CORPORATE" ? "accounts:corporate" : "accounts:individual")} · {a.inst_profile_name}
                </span>
              </span>
              <span className="amount-fit text-right font-mono text-xs">
                {a.acct_num}
                <span className="block font-sans text-[11px] font-semibold">{money(a.avail_bal, a.currency_code)}</span>
              </span>
            </button>
          ))}
          {!rows.length && <p className="py-4 text-center text-sm text-muted-foreground">{t("noOwnersFound")}</p>}
        </div>
      )}
    </div>
  );
}
