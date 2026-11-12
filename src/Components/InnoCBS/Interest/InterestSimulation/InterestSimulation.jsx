import { useEffect, useState } from "react";
import { Calculator } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { NoAccess } from "@/Components/Common/NoAccess";
import { PageTitle } from "@/Components/Common/PageTitle";
import { SimpleTable } from "@/Components/Common/SimpleTable";
import { accountDate } from "@/Components/InnoCBS/Accounts/accountShared";
import { Facts, Section, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { Field } from "@/Components/InnoCBS/Loans/loanShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { RateChoice, coded, codes, pct, simulateApi, useL, words } from "@/Components/InnoCBS/Interest/interestShared";

export function InterestSimulation() {
  const L = useL();
  const can = usePagePermission();
  const [by, setBy] = useState("scheme");
  const [form, setForm] = useState({ scheme_code: "", product_kind: "", product_id: "", amount: "", tenure_value: "", tenure_unit: "MONTHS", booking_date: new Date().toISOString().slice(0, 10), birth_date: "" });
  const [choices, setChoices] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    simulateApi
      .options({})
      .then((a) => setChoices(rowsOf(a)[0] ?? {}))
      .catch(() => setChoices({}));
  }, []);
  if (!can("View")) return <NoAccess />;
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const c = choices ?? {};
  const ready = form.amount && form.tenure_value && (by === "scheme" ? form.scheme_code : form.product_kind && form.product_id);
  const run = async () => {
    setBusy(true);
    try {
      const body = { amount: form.amount, tenure_value: Number(form.tenure_value), tenure_unit: form.tenure_unit, booking_date: form.booking_date, ...(form.birth_date ? { birth_date: form.birth_date } : {}), ...(by === "scheme" ? { scheme_code: form.scheme_code } : { product_kind: form.product_kind, product_id: Number(form.product_id) }) };
      const r = await simulateApi.simulate(body);
      setResult(rowsOf(r)[0] ?? r?.data ?? null);
    } catch (e) {
      notifications.error(e.message);
      setResult(null);
    } finally {
      setBusy(false);
    }
  };
  const calc = result?.calculation;
  return (
    <div className="pt-1 pb-6">
      <PageTitle>{L("interestSimulation")}</PageTitle>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">{L("The rate a booking would get, why, and the interest it earns. Nothing is saved.")}</p>
      <Section title={L("Booking")} className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className={labelClass}>
            {L("Price by")}
            <Field field={{ type: "select", options: [{ value: "scheme", label: L("scheme") }, { value: "product", label: L("product") }] }} value={by} onChange={setBy} />
          </label>
          {by === "scheme" ? (
            <label className={labelClass}>
              {L("scheme_code")}
              <Field field={{ type: "select", blank: L("choose"), options: coded("schemes")(c) }} value={form.scheme_code} onChange={set("scheme_code")} />
            </label>
          ) : (
            <>
              <label className={labelClass}>
                {L("product_kind")}
                <Field field={{ type: "select", blank: L("choose"), options: codes("product_kinds")(c) }} value={form.product_kind} onChange={(v) => setForm((f) => ({ ...f, product_kind: v, product_id: "" }))} />
              </label>
              <label className={labelClass}>
                {L("product")}
                <Field field={{ type: "select", blank: L("choose"), options: (c.products?.[form.product_kind] ?? []).map((p) => ({ value: String(p.id), label: `${p.code} · ${p.name}` })) }} value={form.product_id} onChange={set("product_id")} />
              </label>
            </>
          )}
          <label className={labelClass}>
            {L("amount")}
            <Field field={{ type: "amount", placeholder: "500000" }} value={form.amount} onChange={set("amount")} />
          </label>
          <label className={labelClass}>
            {L("tenure")}
            <Field field={{ type: "int", placeholder: "12" }} value={form.tenure_value} onChange={set("tenure_value")} />
          </label>
          <label className={labelClass}>
            {L("tenure_unit")}
            <Field field={{ type: "select", options: codes("tenure_units")(c).length ? codes("tenure_units")(c) : [{ value: "MONTHS", label: "Months" }] }} value={form.tenure_unit} onChange={set("tenure_unit")} />
          </label>
          <label className={labelClass}>
            {L("booking_date")}
            <Field field={{ type: "date" }} value={form.booking_date} onChange={set("booking_date")} />
          </label>
          <label className={labelClass}>
            {L("birth_date")}
            <Field field={{ type: "date" }} value={form.birth_date} onChange={set("birth_date")} />
          </label>
        </div>
        <Button className="mt-3" icon={Calculator} loading={busy} disabled={!ready} disabledReason={L("Fill the scheme or product, amount and tenure.")} onClick={run}>
          {L("Simulate")}
        </Button>
      </Section>
      {result && (
        <>
          {(result.problems ?? []).length > 0 && (
            <ul className="mb-4 list-disc rounded-xl border border-red-200 bg-red-50 px-3 py-2 pl-7 text-xs font-semibold text-red-700">
              {result.problems.map((p) => (
                <li key={String(p)}>{typeof p === "string" ? p : p.message}</li>
              ))}
            </ul>
          )}
          <Section title={L("Rate chosen")} className="mb-4">
            <RateChoice choice={result.rate_selection} />
            {(result.notes ?? []).map((n) => (
              <p key={n} className="mt-2 text-xs text-muted-foreground">{n}</p>
            ))}
          </Section>
          {calc && (
            <Section title={L("Interest")} className="mb-4">
              <Facts
                className="mb-3"
                rows={[
                  [L("principal"), calc.principal],
                  [L("interest"), calc.interest],
                  [L("maturity_value"), calc.maturity_value],
                  [L("method"), words(calc.method)],
                  [L("day_count"), calc.day_count],
                  [L("days"), calc.days],
                ]}
              />
              {(calc.periods ?? []).length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <SimpleTable columns={[L("from"), L("to"), L("days"), L("opening_balance"), L("rate"), L("interest"), L("capitalised"), L("closing_balance")]}>
                    <tbody>
                      {calc.periods.map((p) => (
                        <tr key={p.from} className="border-b border-border/50 text-xs tabular-nums last:border-0">
                          <td className="px-3 py-1.5 whitespace-nowrap">{accountDate(p.from)}</td>
                          <td className="px-3 py-1.5 whitespace-nowrap">{accountDate(p.to)}</td>
                          <td className="px-3 py-1.5">{p.days}</td>
                          <td className="px-3 py-1.5">{p.opening_balance}</td>
                          <td className="px-3 py-1.5">{pct(p.rate)}</td>
                          <td className="px-3 py-1.5">{p.interest}</td>
                          <td className="px-3 py-1.5">{p.capitalised}</td>
                          <td className="px-3 py-1.5">{p.closing_balance}</td>
                        </tr>
                      ))}
                    </tbody>
                  </SimpleTable>
                </div>
              )}
            </Section>
          )}
        </>
      )}
    </div>
  );
}
