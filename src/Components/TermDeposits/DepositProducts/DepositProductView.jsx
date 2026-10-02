import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeft, Calculator, CheckCircle2, Pencil, Power, RotateCcw, Send, Trash2, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Spinner } from "@/Components/Common/Spinner";
import { accountDate, money } from "@/Components/Epurse/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { depositProductsApi } from "@/Services/TermDeposits/termDeposits.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { ActionButtons, Facts, NarrationDialog, Section, amountInput, dayDate, inputClass, labelClass, ratePct } from "../depositShared";
import { ConfigSummary, ProductStatus } from "./productShared";

// One deposit product: what is in effect, what waits for a checker (side
// by side, changes marked), its warnings, history and a "try a rate" box.
// Buttons come from `actions`, gated by the menu's permissions.
export function DepositProductView({ id, onBack, onEdit }) {
  const { t } = useTranslation(["deposits", "common"]);
  const can = usePagePermission();
  const [product, setProduct] = useState(null);
  const [audit, setAudit] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [got, history] = await Promise.all([depositProductsApi.get({ id }), depositProductsApi.audit({ id }).catch(() => null)]);
      setProduct(rowsOf(got)[0] ?? null);
      setAudit(history ? rowsOf(history) : []);
    } catch (error) {
      notifications.error(error.message);
    }
  }, [id]);
  useEffect(() => {
    void reload();
  }, [reload]);

  const act = async (verb, narration) => {
    setBusy(true);
    try {
      const response = await depositProductsApi[verb]({ id, ...(narration ? { narration } : {}) });
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      if (verb === "delete" && Number(product.status) === 9) return onBack();
      await reload();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!product) {
    return (
      <div className="flex items-center gap-2 pt-10 text-sm text-muted-foreground">
        <Spinner size={16} /> {t("loading")}
      </div>
    );
  }

  const a = product.actions ?? {};
  const currency = product.acct_product?.currency_code;
  const ask = (verb) => () => setDialog(verb);
  const buttons = [
    a.edit && can("Edit") && { key: "edit", label: t("edit"), icon: Pencil, run: () => onEdit(product) },
    a.submit && can("Add") && { key: "submit", label: t("submit"), icon: Send, variant: "outline", run: ask("submit") },
    a.deactivate && can("Deactivate") && { key: "deactivate", label: t("deactivate"), icon: Power, run: ask("deactivate") },
    a.reactivate && can("Reactivate") && { key: "reactivate", label: t("reactivate"), icon: RotateCcw, run: ask("reactivate") },
    a.delete && can("Delete") && { key: "delete", label: t("delete"), icon: Trash2, variant: "danger", run: ask("delete") },
    a.deauth && can("Authorize") && { key: "deauth", label: t("reject"), icon: XCircle, variant: "danger", run: ask("deauth") },
    a.auth && can("Authorize") && { key: "auth", label: t("approve"), icon: CheckCircle2, variant: "primary", run: ask("auth") },
  ];
  const pending = product.pending;
  const shown = product.draft ?? product.config;

  return (
    <div className="pb-8 pt-4">
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft size={15} /> {t("backToProducts")}
      </button>

      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black text-foreground">{product.acct_product?.product_name}</h1>
              <ProductStatus product={product} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {product.acct_product?.product_code} · {[currency, product.acct_product?.currency_name].filter(Boolean).join(" · ")} · {product.inst_profile_name}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {t("lastChange", { name: product.updated_by ?? product.created_by ?? "—", date: accountDate(product.updated_time ?? product.created_time) })}
            </p>
          </div>
          <ActionButtons buttons={buttons} busy={busy} />
        </div>
        {product.warnings?.length > 0 && (
          <ul className="mt-3 grid gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            {product.warnings.map((w) => (
              <li key={w} className="flex items-start gap-1.5">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {w}
              </li>
            ))}
          </ul>
        )}
      </div>

      {pending ? (
        <div className="mb-4 grid gap-4 xl:grid-cols-2">
          <Section title={t("inEffect")}>
            <ConfigSummary config={product.config} currency={currency} compact />
          </Section>
          <Section title={t("proposedBy", { action: t(`pending_${pending.action}`, { defaultValue: pending.action }), name: pending.proposed_by?.name ?? "—", date: accountDate(pending.proposed_at) })} className="border-amber-300 ring-1 ring-amber-200">
            {pending.config ? <ConfigSummary config={pending.config} other={product.config} currency={currency} compact /> : <p className="text-sm text-muted-foreground">{t(`pendingHint_${pending.action}`, { defaultValue: "" })}</p>}
          </Section>
        </div>
      ) : (
        <Section title={product.draft ? t("draftConfig") : t("inEffect")} className="mb-4">
          <ConfigSummary config={shown} currency={currency} />
        </Section>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {product.config && <RateQuote product={product} />}
        <Section title={t("history")}>
          <ol className="relative grid gap-3 border-l border-border pl-4">
            {audit.map((entry, i) => (
              <li key={`${entry.at}-${i}`} className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-[var(--primary-light)]" />
                <p className="text-xs font-bold text-foreground">
                  {t(`audit_${entry.action}`, { defaultValue: entry.action })} <span className="font-medium text-muted-foreground">· {entry.process_status_name ?? entry.status_name}</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {entry.actor} · {accountDate(entry.at)}
                </p>
                {entry.narration?.trim() && <p className="mt-0.5 text-xs italic text-foreground">“{entry.narration}”</p>}
              </li>
            ))}
            {!audit.length && <li className="text-sm text-muted-foreground">{t("noHistory")}</li>}
          </ol>
        </Section>
      </div>

      {dialog && (
        <NarrationDialog
          title={t(`confirm_${dialog}`)}
          hint={t(`confirmHint_${dialog}`)}
          confirmLabel={t(dialog === "auth" ? "approve" : dialog === "deauth" ? "reject" : dialog)}
          variant={["delete", "deauth", "deactivate"].includes(dialog) ? "danger" : "primary"}
          required={dialog === "deauth"}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(narration) => act(dialog, narration)}
        />
      )}
    </div>
  );
}

// "Try a rate": the rate, band and maturity date for an amount and tenor.
function RateQuote({ product }) {
  const { t } = useTranslation("deposits");
  const tenors = product.config?.tenors ?? [];
  const [tenorId, setTenorId] = useState(tenors[0]?.id ? String(tenors[0].id) : "");
  const [principal, setPrincipal] = useState("");
  const [onDate, setOnDate] = useState("");
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const currency = product.acct_product?.currency_code;

  const run = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await depositProductsApi.rate_quote({ acct_product_id: product.acct_product?.id, tenor_id: Number(tenorId), principal, ...(onDate ? { on_date: onDate } : {}) });
      setQuote(rowsOf(response)[0] ?? null);
    } catch (err) {
      setQuote(null);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title={t("tryARate")}>
      <form onSubmit={run} className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          {t("tenor")}
          <FilterSelect className="mt-1" value={tenorId} onChange={setTenorId} options={tenors.map((x) => ({ value: String(x.id), label: `${x.label} · ${t("daysN", { count: x.tenor_days })}` }))} />
        </label>
        <label className={labelClass}>
          {t("principalIn", { currency })}
          <input className={cn(inputClass, "mt-1 tabular-nums")} inputMode="decimal" value={principal} onChange={(e) => setPrincipal(amountInput(e.target.value, product.rules?.amount_decimals ?? 2))} />
        </label>
        <label className={labelClass}>
          {t("onDateOptional")}
          <input type="date" className={cn(inputClass, "mt-1")} value={onDate} onChange={(e) => setOnDate(e.target.value)} />
        </label>
        <div className="flex items-end">
          <Button type="submit" icon={Calculator} loading={busy} disabled={!tenorId || !(Number(principal) > 0)} className="w-full">
            {t("getRate")}
          </Button>
        </div>
      </form>
      {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
      {quote && (
        <div className="mt-3 animate-in fade-in">
          <p className="text-3xl font-black tabular-nums text-primary">{ratePct(quote.annual_rate)}</p>
          <Facts
            className="mt-2 sm:grid-cols-2 lg:grid-cols-2"
            rows={[
              [t("tenor"), quote.tenor_label],
              [t("maturityDate"), dayDate(quote.maturity_date)],
              [t("band"), `${money(quote.band_minimum_principal, currency)} – ${Number(quote.band_maximum_principal) === 0 ? t("noLimit") : money(quote.band_maximum_principal, currency)}`],
            ]}
          />
        </div>
      )}
    </Section>
  );
}
