import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Send } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { cardsApi } from "@/Services/Cards/cards.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { transactionRequestsApi, transactionsApi } from "@/Services/Transactions/transactions.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { Problems, amountInput, inputClass, labelClass } from "../TermDeposits/depositShared";
import { PlanCard } from "./txnShared";

// What a type asks for, from its option: the wallets on the non-cash
// sides, the original transaction when needs_org_txn, and an amount unless
// it is a reversal (which returns the original's). A card load takes the
// holder's wallet and the card; an unload, the card and the wallet it pays.
const CARD_SIDE = { CARD_LOAD: "from", CARD_UNLOAD: "to" };
export function typeNeeds(option) {
  const reversal = option?.txn_type === "REVERSAL";
  const org = Boolean(option?.needs_org_txn) || reversal;
  const cardSide = CARD_SIDE[option?.txn_type];
  if (cardSide) return { from: cardSide === "from", to: cardSide === "to", org: false, amount: true, card: true };
  return {
    from: !org && option?.from !== "CASH",
    to: !org && option?.to !== "CASH",
    org,
    amount: !reversal,
    card: false,
  };
}

const EMPTY = { from_acct_num: "", to_acct_num: "", amount: "", org_rrn: "", reason: "", reference: "", client_reference: "", card: null };

// A staff transaction: pick the type, fill what it needs, see the quote
// (fee, tax, totals, limits) as you type, then send it for approval. A user
// with Self on the menu posts it at once; the reply then carries the
// result. `preset` opens it for a refund or reversal of a transaction.
export function NewRequest({ preset, onClose, onDone }) {
  const { t } = useTranslation("txn");
  const [types, setTypes] = useState(null);
  const [type, setType] = useState(preset?.txn_type ?? "");
  const [form, setForm] = useState({ ...EMPTY, org_rrn: preset?.org_rrn ?? "" });
  const [plan, setPlan] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    transactionsApi
      .options({})
      .then((r) => {
        const list = (rowsOf(r)[0]?.txn_types ?? []).filter((x) => x.active !== false);
        setTypes(list);
        setType((cur) => cur || list[0]?.txn_type || "");
      })
      .catch((e) => setError(e.message));
  }, []);

  const option = types?.find((x) => x.txn_type === type);
  const needs = typeNeeds(option);
  const complete = option && (!needs.from || form.from_acct_num) && (!needs.to || form.to_acct_num) && (!needs.org || form.org_rrn) && (!needs.amount || Number(form.amount) > 0) && (!needs.card || form.card);
  const body = complete
    ? {
        txn_type: type,
        ...(needs.card ? { card_id: form.card.id } : {}),
        ...(needs.from ? { from_acct_num: form.from_acct_num } : {}),
        ...(needs.to ? { to_acct_num: form.to_acct_num } : {}),
        ...(needs.org ? { org_rrn: form.org_rrn } : {}),
        ...(needs.amount ? { amount: form.amount } : {}),
      }
    : null;
  const bodyKey = JSON.stringify(body);

  // The quote as the form changes: every check, nothing posted.
  useEffect(() => {
    setPlan(null);
    setQuoteError("");
    if (!body) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setQuoting(true);
      transactionsApi
        .quote(JSON.parse(bodyKey))
        .then((r) => !cancelled && setPlan(rowsOf(r)[0] ?? null))
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

  const set = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: key === "amount" ? amountInput(value, plan?.amount_decimals ?? 2) : /acct_num|rrn/.test(key) ? value.replace(/\s/g, "") : value }));
  };

  const send = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await transactionRequestsApi.add({
        ...body,
        reason: form.reason.trim(),
        ...(form.reference.trim() ? { reference: form.reference.trim() } : {}),
        ...(form.client_reference.trim() ? { client_reference: form.client_reference.trim() } : {}),
      });
      const request = rowsOf(response)[0];
      notifications.success(response?.message ?? t("requestSent"));
      if (request?.result) setResult(request);
      else onDone(request);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <Modal open onClose={() => onDone(result)} size="md" title={t("posted")} footer={<Button onClick={() => onDone(result)}>{t("done")}</Button>}>
        <p className="mb-3 text-sm text-emerald-700">{t("postedAtOnce", { rrn: result.result.rrn })}</p>
        <PlanCard plan={result.result} />
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={t("newTransaction")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button icon={Send} loading={busy} disabled={!plan || !form.reason.trim()} onClick={send}>
            {t("sendForApproval")}
          </Button>
        </>
      }
    >
      {!types ? (
        <Spinner size={18} />
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={cn(labelClass, "sm:col-span-2")}>
              {t("type")}
              <FilterSelect
                className="mt-1.5"
                value={type}
                disabled={Boolean(preset)}
                onChange={(v) => {
                  setType(v);
                  setForm((f) => ({ ...EMPTY, reason: f.reason, reference: f.reference }));
                }}
                options={types.map((x) => ({ value: x.txn_type, label: `${x.name} (${x.from} → ${x.to})` }))}
              />
            </label>
            {needs.card && (
              <div className={cn(labelClass, "sm:col-span-2")}>
                {t("prepaidCard")}
                <CardPicker value={form.card} onChange={(card) => setForm((f) => ({ ...f, card }))} />
              </div>
            )}
            {needs.from && (
              <label className={labelClass}>
                {t(needs.card ? "holderWallet" : "fromWallet")}
                <input className={cn(inputClass, "mt-1.5 font-mono")} value={form.from_acct_num} onChange={set("from_acct_num")} placeholder="20784000000021" />
              </label>
            )}
            {needs.to && (
              <label className={labelClass}>
                {t(needs.card ? "holderWallet" : "toWallet")}
                <input className={cn(inputClass, "mt-1.5 font-mono")} value={form.to_acct_num} onChange={set("to_acct_num")} placeholder="20784000000013" />
              </label>
            )}
            {needs.org && (
              <label className={labelClass}>
                {t(type === "REVERSAL" ? "rrnToReverse" : "paymentRrn")}
                <input className={cn(inputClass, "mt-1.5 font-mono")} disabled={Boolean(preset?.org_rrn)} value={form.org_rrn} onChange={set("org_rrn")} />
              </label>
            )}
            {needs.amount && (
              <label className={labelClass}>
                {t("amountIn", { currency: plan?.currency_code ?? "" })}
                <input className={cn(inputClass, "mt-1.5 text-base font-bold tabular-nums")} inputMode="decimal" placeholder="0.00" value={form.amount} onChange={set("amount")} />
              </label>
            )}
            <label className={cn(labelClass, "sm:col-span-2")}>
              {t("reasonRequired")}
              <input className={cn(inputClass, "mt-1.5")} maxLength={255} value={form.reason} onChange={set("reason")} />
            </label>
            <label className={labelClass}>
              {t("voucher")}
              <input className={cn(inputClass, "mt-1.5")} maxLength={64} value={form.reference} onChange={set("reference")} />
            </label>
            <label className={labelClass}>
              {t("clientReference")}
              <input className={cn(inputClass, "mt-1.5")} maxLength={64} value={form.client_reference} onChange={set("client_reference")} />
              <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("clientReferenceHint")}</span>
            </label>
          </div>
          {type === "REVERSAL" && <p className="text-xs text-muted-foreground">{t("reversalHint")}</p>}
          {quoting && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Spinner size={12} /> {t("quoting")}
            </p>
          )}
          {quoteError && <Problems message={quoteError} />}
          {plan && <PlanCard plan={plan} />}
          {plan && <p className="text-[11px] text-muted-foreground">{t("checkedAgainOnApproval")}</p>}
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

// The prepaid card a load or unload is for: find it by its last 4 digits,
// the name on it or the holder's name. Only active cards are offered.
function CardPicker({ value, onChange }) {
  const { t } = useTranslation("txn");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);

  const find = async () => {
    setBusy(true);
    try {
      setRows(rowsOf(await cardsApi.list({ search: query.trim(), ops_status: "ACTIVE", page: 1, page_size: 10 }))[0]?.items ?? []);
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (value) {
    return (
      <div className="mt-1.5 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2">
        <span className="min-w-0 text-sm font-semibold">
          <span className="font-mono">{value.pan_masked}</span> · {value.holder_name} · {value.product_code}
        </span>
        <button type="button" onClick={() => onChange(null)} className="text-xs font-semibold text-muted-foreground transition-colors hover:text-primary">
          {t("change")}
        </button>
      </div>
    );
  }
  return (
    <div className="mt-1.5 grid gap-2">
      <div className="flex gap-2">
        <input className={inputClass} value={query} placeholder={t("findCardPlaceholder")} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), query.trim() && void find())} />
        <Button type="button" icon={Search} loading={busy} disabled={!query.trim()} onClick={find}>
          {t("find")}
        </Button>
      </div>
      {rows && (
        <div className="grid gap-1.5">
          {rows.map((c) => (
            <button key={c.id} type="button" onClick={() => onChange(c)} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 text-left text-xs transition-all hover:-translate-y-px hover:border-primary">
              <span className="font-mono font-bold">{c.pan_masked}</span>
              <span className="min-w-0 flex-1 truncate">{c.holder_name}</span>
              <span className="text-muted-foreground">{c.product_code} · {c.product_class}</span>
            </button>
          ))}
          {!rows.length && <p className="text-xs text-muted-foreground">{t("noCardsFound")}</p>}
        </div>
      )}
    </div>
  );
}
