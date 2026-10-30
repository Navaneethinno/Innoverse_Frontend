import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Calculator, CheckCircle2, Circle, Download, HandCoins, Paperclip, Plus, Trash2 } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { accountDate, money } from "@/Components/Finance/Accounts/accountShared";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { saveBlob } from "@/Services/api/fileTransfer";
import { tellerApi } from "@/Services/Accounting/accounting.api";
import { downloadLoanDocument, loanFacilitiesApi, uploadLoanDocument } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { inputClass, labelClass, ratePct } from "../../Deposits/depositShared";
import { Field, RowsEditor } from "../loanShared";

// A loan facility's newer parts: paying out (in cash at the user's open till
// when the borrower has no wallet), repricing a variable-rate loan, paying
// out in parts, and a borrower who dies. Every button follows `actions`.

// The till the signed-in user has open now (walk-in payouts, payout parts).
export function useMyTill(enabled) {
  const [till, setTill] = useState(undefined);
  useEffect(() => {
    if (!enabled) return;
    tellerApi
      .list({ open_by_me: true })
      .then((r) => setTill(rowsOf(r)[0] ?? null))
      .catch(() => setTill(null));
  }, [enabled]);
  return till;
}

const fileOf = (stored) => {
  const row = Array.isArray(stored?.data) ? stored.data[0] : (stored?.data ?? stored);
  return { path: row?.path ?? stored?.path, name: row?.file_name ?? stored?.file_name };
};

// Pay out the loan (part 1 and the payout fees) or its next part. Without a
// wallet the cash is paid at the user's open till; with one it may still be.
export function PayoutDialog({ verb, facility, amount, onClose, onDone }) {
  const { t } = useTranslation("loans");
  const walkIn = !Number(facility.disbursement_acct_id);
  const till = useMyTill(true);
  const [cash, setCash] = useState(walkIn);
  const [narration, setNarration] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await loanFacilitiesApi[verb]({ id: facility.id, narration: narration.trim(), ...(cash && till ? { till_id: till.id } : {}) });
      notifications.success(r?.message ?? t("done"));
      onDone();
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
      title={t(verb === "disburse" ? "disburse" : "payNextPart")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button loading={busy} disabled={cash && !till} onClick={() => void save()}>
            {t(verb === "disburse" ? "disburse" : "payNextPart")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 text-sm">
        <p>{t("payoutHint", { amount: money(amount, facility.currency_alpha_code) })}</p>
        {walkIn ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">{t("walkInPayout")}</p>
        ) : (
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input type="checkbox" checked={cash} onChange={(e) => setCash(e.target.checked)} /> {t("payInCash")}
          </label>
        )}
        {cash && (till === undefined ? <Spinner size={14} /> : till ? <p className="text-xs">{t("atYourTill", { code: till.code, name: till.name })}</p> : <p className="text-xs font-semibold text-red-700">{t("openTillFirst")}</p>)}
        <label className={labelClass}>
          {t("narration")}
          <input className={cn(inputClass, "mt-1")} value={narration} onChange={(e) => setNarration(e.target.value)} />
        </label>
        {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
      </div>
    </Modal>
  );
}

// ---------- Repricing ----------
export function Repricing({ loan, onChanged }) {
  const { t } = useTranslation("loans");
  const f = loan.facility ?? {};
  const a = loan.actions ?? {};
  const cur = f.currency_alpha_code;
  const [history, setHistory] = useState(null);
  const [quote, setQuote] = useState(null);
  const [rate, setRate] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    loanFacilitiesApi
      .reprices({ id: f.id })
      .then((r) => setHistory(rowsOf(r)))
      .catch(() => setHistory([]));
  }, [f.id]);
  useEffect(() => load(), [load]);
  const run = async (verb, body) => {
    setBusy(true);
    try {
      const r = await loanFacilitiesApi[verb]({ id: f.id, ...body });
      if (verb === "reprice_quote") setQuote(rowsOf(r)[0] ?? r?.data ?? null);
      else {
        notifications.success(r?.message ?? t("done"));
        setQuote(null);
        load();
        onChanged();
      }
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const mode = f.reprice_mode ?? "KEEP_TERM";
  return (
    <div className="grid gap-4 rounded-2xl border border-border bg-card p-4">
      <p className="text-sm">
        {(loan.rate_type ?? f.rate_type) === "VARIABLE"
          ? t("variableRateLine", { rate: ratePct(f.annual_rate), code: f.reference_rate_code ?? "—", spread: ratePct(f.spread ?? 0) })
          : t("fixedRateLine", { rate: ratePct(f.annual_rate) })}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          {t("whenRateChanges")}
          <Field
            field={{ type: "select", options: [{ value: "KEEP_TERM", label: t("keepTerm") }, { value: "KEEP_INSTALLMENT", label: t("keepInstallment") }] }}
            disabled={!a.reprice_mode || busy}
            value={mode}
            onChange={(v) => void run("reprice_mode", { mode: v })}
          />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t(mode === "KEEP_TERM" ? "keepTermHint" : "keepInstallmentHint")}</span>
        </label>
        {a.reprice && (
          <div className="grid gap-2">
            <label className={labelClass}>
              {t("newRateOptional")}
              <Field field={{ type: "percent" }} value={rate} onChange={setRate} />
              <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("newRateHint")}</span>
            </label>
            <Button size="sm" variant="outline" icon={Calculator} loading={busy} onClick={() => void run("reprice_quote", { annual_rate: rate, mode: "" })}>
              {t("previewNewRate")}
            </Button>
          </div>
        )}
      </div>
      {quote && (
        <div className="rounded-xl border border-border p-3">
          {quote.skipped ? (
            <p className="text-sm text-amber-800">{t(`repriceSkipped_${String(quote.skipped).replace("loan.", "")}`, { defaultValue: quote.skipped })}</p>
          ) : (
            <>
              <table className="w-full text-xs">
                <thead className="text-left text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="py-1" />
                    <th className="py-1">{t("before")}</th>
                    <th className="py-1">{t("after")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [t("rate"), ratePct(quote.from_rate), ratePct(quote.to_rate)],
                    [t("installmentAmount"), money(quote.installment_before, cur), money(quote.installment_after, cur)],
                    [t("installments"), quote.installments_before, quote.installments_after],
                    [t("maturity"), quote.maturity_before, quote.maturity_after],
                  ].map(([label, x, y]) => (
                    <tr key={label} className="border-t border-border/50">
                      <td className="py-1 font-semibold">{label}</td>
                      <td className="py-1">{x}</td>
                      <td className={cn("py-1 font-bold", x !== y && "text-primary")}>{y}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[11px] text-muted-foreground">{t("repriceFrom", { date: quote.effective_date })}</p>
              <div className="mt-2 flex justify-end">
                <Button size="sm" loading={busy} onClick={() => void run("reprice", { annual_rate: rate, mode: "" })}>
                  {t("applyNewRate")}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
      <div>
        <p className="mb-1 text-xs font-black uppercase tracking-wider text-muted-foreground">{t("repricingHistory")}</p>
        {!history ? (
          <Spinner size={14} />
        ) : !history.length ? (
          <p className="text-xs text-muted-foreground">{t("noReprices")}</p>
        ) : (
          <ul className="grid gap-1 text-xs">
            {history.map((h, i) => (
              <li key={h.id ?? i} className="rounded-lg border border-border px-3 py-1.5">
                {h.effective_date ?? accountDate(h.created_at)} · {ratePct(h.from_rate)} → <b>{ratePct(h.to_rate)}</b> · {t(h.mode === "KEEP_INSTALLMENT" ? "keepInstallment" : "keepTerm")}
                {h.installment_after && ` · ${money(h.installment_after, cur)}`}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------- Payout in parts ----------
export function Tranches({ loan, onChanged }) {
  const { t } = useTranslation("loans");
  const f = loan.facility ?? {};
  const a = loan.actions ?? {};
  const cur = f.currency_alpha_code;
  const [rows, setRows] = useState(loan.tranches ?? null);
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const load = useCallback(() => {
    loanFacilitiesApi
      .tranches({ id: f.id })
      .then((r) => setRows(rowsOf(r)))
      .catch(() => setRows([]));
  }, [f.id]);
  useEffect(() => load(), [load]);
  const total = (plan ?? []).reduce((s, x) => s + Number(x.amount || 0), 0);
  const approved = Number(f.principal_approved || 0);
  const savePlan = async (tranches) => {
    setBusy(true);
    setError("");
    try {
      const r = await loanFacilitiesApi.tranche_plan({ id: f.id, tranches });
      notifications.success(r?.message ?? t("done"));
      setPlan(null);
      load();
      onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const attach = async (part, file) => {
    try {
      const stored = fileOf(await uploadLoanDocument({ facility_id: f.id, file }));
      await loanFacilitiesApi.tranche_proof({ id: f.id, seq: part.seq, file_path: stored.path, file_name: stored.name ?? file.name });
      notifications.success(t("proofAttached"));
      load();
    } catch (e) {
      notifications.error(e.message);
    }
  };
  const next = (rows ?? []).find((x) => x.status === "PLANNED");
  return (
    <div className="grid gap-4 rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{t("tranchesHint")}</p>
      {f.principal_disbursed != null && <p className="text-sm font-semibold">{t("paidOutOf", { paid: money(f.principal_disbursed, cur), of: money(approved, cur) })}</p>}
      {plan ? (
        <div className="grid gap-2">
          <RowsEditor
            rows={plan}
            onChange={setPlan}
            blank={() => ({ amount: "", condition: "", proof_required: false })}
            addLabel={t("addPart")}
            columns="lg:grid-cols-3"
            fields={[
              { key: "amount", label: t("amount"), type: "amount" },
              { key: "condition", label: t("partCondition") },
              { key: "proof_required", label: t("proofRequired"), type: "bool" },
            ]}
          />
          <p className={cn("text-xs font-semibold", Math.abs(total - approved) < 0.005 ? "text-emerald-700" : "text-amber-800")}>{t("partsTotal", { total: money(total, cur), approved: money(approved, cur) })}</p>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setPlan(null)}>
              {t("cancel")}
            </Button>
            <Button size="sm" loading={busy} disabled={plan.length < 2 || plan.length > 24 || Math.abs(total - approved) >= 0.005} onClick={() => void savePlan(plan.map((x) => ({ amount: String(x.amount), condition: String(x.condition ?? "").trim(), proof_required: Boolean(x.proof_required) })))}>
              {t("savePlan")}
            </Button>
          </div>
        </div>
      ) : !rows ? (
        <Spinner size={14} />
      ) : !rows.length ? (
        <p className="text-sm text-muted-foreground">{t("noPayoutPlan")}</p>
      ) : (
        <ol className="grid gap-2">
          {rows.map((x) => (
            <li key={x.id ?? x.seq} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                {x.status === "DISBURSED" ? <CheckCircle2 size={15} className="text-emerald-600" /> : <Circle size={15} className="text-muted-foreground" />}
                <b>
                  {t("partN", { n: x.seq })} · {money(x.amount, cur)}
                </b>
                <span className="text-xs text-muted-foreground">{x.condition}</span>
              </span>
              <span className="flex flex-wrap items-center gap-2 text-xs">
                {x.status === "DISBURSED" ? (
                  <span className="text-muted-foreground">
                    {x.disbursed_date} · {x.rrn}
                  </span>
                ) : (
                  x.proof_required &&
                  (x.proof_name ? (
                    <span className="text-emerald-700">{t("proofAttachedName", { name: x.proof_name })}</span>
                  ) : a.tranche_proof ? (
                    <label className="flex cursor-pointer items-center gap-1 font-bold text-primary">
                      <Paperclip size={13} /> {t("attachProof")}
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => e.target.files?.[0] && void attach(x, e.target.files[0])} />
                    </label>
                  ) : (
                    <span className="text-amber-800">{t("proofNeeded")}</span>
                  ))
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
      <div className="flex flex-wrap gap-2">
        {a.tranche_plan && !plan && (
          <Button size="sm" variant="outline" icon={Plus} onClick={() => setPlan(rows?.length ? rows.map((x) => ({ amount: x.amount, condition: x.condition, proof_required: x.proof_required })) : [{ amount: "", condition: "", proof_required: false }, { amount: "", condition: "", proof_required: false }])}>
            {t(rows?.length ? "editPayoutPlan" : "setPayoutPlan")}
          </Button>
        )}
        {a.tranche_plan && rows?.length > 0 && !plan && (
          <Button size="sm" variant="ghost" icon={Trash2} onClick={() => void savePlan([])}>
            {t("removePlan")}
          </Button>
        )}
        {a.tranche_disburse && next && (
          <Button size="sm" icon={HandCoins} onClick={() => setPaying(true)}>
            {t("payNextPart")}
          </Button>
        )}
      </div>
      {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
      {paying && next && (
        <PayoutDialog
          verb="tranche_disburse"
          facility={f}
          amount={next.amount}
          onClose={() => setPaying(false)}
          onDone={() => {
            setPaying(false);
            load();
            onChanged();
          }}
        />
      )}
    </div>
  );
}

// ---------- A borrower who dies ----------
const SOURCES = ["CO_BORROWER", "GUARANTOR", "ESTATE"];

export function DeceasedBanner({ loan }) {
  const { t } = useTranslation("loans");
  const d = loan.deceased ?? loan.facility?.deceased;
  if (!d) return null;
  const download = async () => {
    try {
      saveBlob(await downloadLoanDocument({ id: d.application_id, item_id: d.certificate_document_id }), d.certificate_name || "death-certificate.pdf");
    } catch (e) {
      notifications.error(e.message);
    }
  };
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800">
      {t("borrowerDeceasedOn", { date: d.deceased_on })}
      {d.certificate_document_id && (
        <button type="button" onClick={() => void download()} className="flex items-center gap-1 text-xs font-bold underline">
          <Download size={12} /> {t("certificate")}
        </button>
      )}
      <span className="text-xs font-normal">· {t("deceasedEffects")}</span>
    </div>
  );
}

export function DeceasedDialog({ facility, onClose, onDone }) {
  const { t } = useTranslation("loans");
  const [form, setForm] = useState({ deceased_on: "", note: "" });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const stored = fileOf(await uploadLoanDocument({ facility_id: facility.id, file }));
      const r = await loanFacilitiesApi.deceased({ id: facility.id, deceased_on: form.deceased_on, file_path: stored.path, file_name: stored.name ?? file.name, note: form.note.trim() });
      notifications.success(r?.message ?? t("done"));
      onDone();
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
      title={t("borrowerDeceased")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button variant="danger" loading={busy} disabled={!form.deceased_on || form.deceased_on > today || !file} onClick={() => void save()}>
            {t("borrowerDeceased")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">{t("deceasedWarning")}</p>
        <label className={labelClass}>
          {t("dateOfDeath")}
          <input type="date" max={today} className={cn(inputClass, "mt-1")} value={form.deceased_on} onChange={(e) => setForm((f) => ({ ...f, deceased_on: e.target.value }))} />
        </label>
        <label className={labelClass}>
          {t("deathCertificate")}
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="mt-1 block text-xs" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <label className={labelClass}>
          {t("noteOptional")}
          <input className={cn(inputClass, "mt-1")} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
        </label>
        {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
      </div>
    </Modal>
  );
}

// Who can be claimed, in order (co-borrowers, guarantors, the estate), the
// claims with their outcome, and adding a claim / recording an outcome.
export function RecoveryAfterDeath({ loan, onChanged }) {
  const { t } = useTranslation("loans");
  const f = loan.facility ?? {};
  const a = loan.actions ?? {};
  const d = loan.deceased ?? f.deceased ?? {};
  const cur = f.currency_alpha_code;
  const claims = d.claims ?? [];
  const [adding, setAdding] = useState(false);
  const [outcome, setOutcome] = useState(null);
  return (
    <div className="grid gap-4 rounded-2xl border border-border bg-card p-4">
      <div>
        <p className="mb-1 text-xs font-black uppercase tracking-wider text-muted-foreground">{t("claimOrder")}</p>
        <ol className="grid gap-1 text-sm">
          {SOURCES.map((s, i) => (
            <li key={s}>
              <b>
                {i + 1}. {t(`source_${s}`)}
              </b>
              <span className="text-muted-foreground"> · {(d.obligors ?? []).filter((o) => o.source === s).map((o) => o.name).join(", ") || "—"}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead className="border-b border-border text-left text-[10px] font-bold uppercase text-muted-foreground">
            <tr>
              {["source", "party", "claimed", "recovered", "status", "note", "updated", ""].map((k) => (
                <th key={k} className="px-3 py-2">
                  {k && t(`claim_${k}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!claims.length && (
              <tr>
                <td colSpan={8} className="px-3 py-3 text-muted-foreground">
                  {t("noClaims")}
                </td>
              </tr>
            )}
            {claims.map((c) => (
              <tr key={c.id} className="border-b border-border/50 last:border-0">
                <td className="px-3 py-1.5">{t(`source_${c.source}`)}</td>
                <td className="px-3 py-1.5 font-semibold">{c.party_name}</td>
                <td className="px-3 py-1.5 tabular-nums">{money(c.amount, cur)}</td>
                <td className="px-3 py-1.5 tabular-nums">{money(c.recovered, cur)}</td>
                <td className="px-3 py-1.5">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", c.status === "PAID" ? "bg-emerald-50 text-emerald-700" : c.status === "REFUSED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800")}>{t(`claimStatus_${c.status}`)}</span>
                </td>
                <td className="px-3 py-1.5">{c.note || "—"}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{accountDate(c.updated_at ?? c.created_at)}</td>
                <td className="px-3 py-1.5">
                  {a.deceased_claim && (
                    <button type="button" className="font-bold text-primary hover:underline" onClick={() => setOutcome(c)}>
                      {t("recordOutcome")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{t("claimsExhaustedHint")}</p>
      {a.deceased_claim && (
        <div>
          <Button size="sm" variant="outline" icon={Plus} onClick={() => setAdding(true)}>
            {t("addClaim")}
          </Button>
        </div>
      )}
      {adding && (
        <ClaimDialog
          loan={loan}
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            onChanged();
          }}
        />
      )}
      {outcome && (
        <OutcomeDialog
          facilityId={f.id}
          claim={outcome}
          currency={cur}
          onClose={() => setOutcome(null)}
          onDone={() => {
            setOutcome(null);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function ClaimDialog({ loan, onClose, onDone }) {
  const { t } = useTranslation("loans");
  const f = loan.facility ?? {};
  const d = loan.deceased ?? f.deceased ?? {};
  const claims = d.claims ?? [];
  // The next step whose earlier claims are settled (the backend enforces it).
  const open = (s) => claims.some((c) => c.source === s && c.status === "OPEN");
  const allowed = SOURCES.filter((s, i) => SOURCES.slice(0, i).every((x) => !open(x)));
  const recovered = claims.reduce((sum, c) => sum + Number(c.recovered || 0), 0);
  const outstanding = Math.max(0, Number(loan.due?.total_outstanding ?? f.due?.total_outstanding ?? 0) - recovered);
  const [form, setForm] = useState({ source: allowed[0] ?? "ESTATE", party: "", party_name: "", amount: outstanding ? outstanding.toFixed(2) : "", note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const obligors = (d.obligors ?? []).filter((o) => o.source === form.source);
  const picked = obligors[Number(form.party)] ?? null;
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await loanFacilitiesApi.deceased_claim_add({
        id: f.id,
        source: form.source,
        ...(picked ? { entity_type: picked.entity_type, entity_id: picked.entity_id, party_name: picked.name } : { party_name: form.party_name.trim() }),
        amount: String(form.amount),
        note: form.note.trim(),
      });
      onDone();
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
      title={t("addClaim")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button loading={busy} disabled={!Number(form.amount) || !(picked || form.party_name.trim())} onClick={() => void save()}>
            {t("addClaim")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <label className={labelClass}>
          {t("claim_source")}
          <Field field={{ type: "select", options: allowed.map((s) => ({ value: s, label: t(`source_${s}`) })) }} value={form.source} onChange={(source) => setForm((x) => ({ ...x, source, party: "", party_name: "" }))} />
        </label>
        {obligors.length > 0 && (
          <label className={labelClass}>
            {t("claim_party")}
            <Field field={{ type: "select", blank: form.source === "ESTATE" ? t("typeName") : t("choose"), options: obligors.map((o, i) => ({ value: String(i), label: o.name })) }} value={form.party} onChange={(party) => setForm((x) => ({ ...x, party }))} />
          </label>
        )}
        {!picked && (
          <label className={labelClass}>
            {t("partyName")}
            <input className={cn(inputClass, "mt-1")} value={form.party_name} onChange={(e) => setForm((x) => ({ ...x, party_name: e.target.value }))} />
          </label>
        )}
        <label className={labelClass}>
          {t("claim_claimed")}
          <Field field={{ type: "amount" }} value={form.amount} onChange={(amount) => setForm((x) => ({ ...x, amount }))} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("claimAmountHint")}</span>
        </label>
        <label className={labelClass}>
          {t("noteOptional")}
          <input className={cn(inputClass, "mt-1")} value={form.note} onChange={(e) => setForm((x) => ({ ...x, note: e.target.value }))} />
        </label>
        {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
      </div>
    </Modal>
  );
}

function OutcomeDialog({ facilityId, claim, currency, onClose, onDone }) {
  const { t } = useTranslation("loans");
  const [form, setForm] = useState({ claim_status: claim.status === "OPEN" ? "PAID" : claim.status, recovered: String(Number(claim.recovered) || ""), note: claim.note ?? "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await loanFacilitiesApi.deceased_claim_update({ id: facilityId, item_id: claim.id, claim_status: form.claim_status, recovered: String(form.recovered || "0"), note: form.note.trim() });
      onDone();
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
      title={t("recordOutcome")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button loading={busy} onClick={() => void save()}>
            {t("save")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <p className="text-sm">
          {claim.party_name} · {money(claim.amount, currency)}
        </p>
        <label className={labelClass}>
          {t("claim_status")}
          <Field field={{ type: "select", options: ["PAID", "PARTLY", "REFUSED", "OPEN"].map((s) => ({ value: s, label: t(`claimStatus_${s}`) })) }} value={form.claim_status} onChange={(claim_status) => setForm((x) => ({ ...x, claim_status }))} />
        </label>
        <label className={labelClass}>
          {t("claim_recovered")}
          <Field field={{ type: "amount" }} value={form.recovered} onChange={(recovered) => setForm((x) => ({ ...x, recovered }))} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("recoveredHint")}</span>
        </label>
        <label className={labelClass}>
          {t("noteOptional")}
          <input className={cn(inputClass, "mt-1")} value={form.note} onChange={(e) => setForm((x) => ({ ...x, note: e.target.value }))} />
        </label>
        {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
      </div>
    </Modal>
  );
}
