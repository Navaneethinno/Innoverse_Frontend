import { useEffect, useState } from "react";
import { Calculator } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { NoAccess } from "@/Components/Common/NoAccess";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { Facts, Section, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { Field } from "@/Components/InnoCBS/Loans/loanShared";
import { codes, first, useL } from "@/Components/InnoCBS/cbsOps";
import { usePagePermission } from "@/Hooks/usePermission";
import { notifications } from "@/Utils/Lib/notifications";
import { ScheduleRows, calcApi, factsOfObject, header, today } from "@/Components/InnoCBS/Loans/loanScreensShared";

export function LoanCalculator() {
  const L = useL();
  const can = usePagePermission();
  const [tab, setTab] = useState("schedule");
  const [choices, setChoices] = useState({});
  const [form, setForm] = useState({ principal: "", annual_rate: "", instalments: "", interest_method: "", repayment_structure: "EMI", disbursement_date: today(), repayment_frequency: "", method: "SIMPLE", from: today(), to: "", compounding: "", day_count: "" });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    calcApi
      .options({})
      .then((r) => setChoices(first(r) ?? {}))
      .catch(() => {});
  }, []);
  if (!can("View")) return <NoAccess />;
  const set = (k) => (v) => setForm((x) => ({ ...x, [k]: v }));
  const pick = (k, list) => (
    <label className={labelClass}>
      {L(k)}
      <Field field={{ type: "select", blank: L("Default"), options: codes(list)(choices) }} value={form[k]} onChange={set(k)} />
    </label>
  );
  const input = (k, type) => (
    <label className={labelClass}>
      {L(k)}
      <Field field={{ type }} value={form[k]} onChange={set(k)} />
    </label>
  );
  const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v != null));
  const run = async () => {
    setBusy(true);
    try {
      const body =
        tab === "emi"
          ? clean({ principal: form.principal, annual_rate: form.annual_rate, instalments: Number(form.instalments), repayment_frequency: form.repayment_frequency })
          : tab === "interest"
            ? clean({ method: form.method, principal: form.principal, annual_rate: form.annual_rate, from: form.from, to: form.to, compounding: form.compounding, day_count: form.day_count })
            : clean({ principal: form.principal, annual_rate: form.annual_rate, instalments: Number(form.instalments), interest_method: form.interest_method, repayment_structure: form.repayment_structure, disbursement_date: form.disbursement_date, repayment_frequency: form.repayment_frequency });
      setResult(first(await calcApi[tab](body)));
    } catch (e) {
      notifications.error(e.message);
      setResult(null);
    } finally {
      setBusy(false);
    }
  };
  const ready = form.principal && form.annual_rate && (tab === "interest" ? form.from && form.to : form.instalments);
  return (
    <div className="pt-1 pb-6">
      {header(L, "loanCalculator", "EMI, repayment schedules by structure, and interest by method. Nothing is saved.")}
      <SegmentedSwitch className="mb-3" value={tab} onChange={(v) => (setTab(v), setResult(null))} options={[{ value: "schedule", label: L("Schedule") }, { value: "emi", label: "EMI" }, { value: "interest", label: L("Interest") }]} />
      <Section title={L("Inputs")} className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {input("principal", "amount")}
          {input("annual_rate", "rate")}
          {tab !== "interest" && input("instalments", "int")}
          {tab !== "interest" && pick("repayment_frequency", "repayment_frequencies")}
          {tab === "schedule" && pick("repayment_structure", "repayment_structures")}
          {tab === "schedule" && pick("interest_method", "interest_methods")}
          {tab === "schedule" && input("disbursement_date", "date")}
          {tab === "interest" && pick("method", "interest_methods")}
          {tab === "interest" && input("from", "date")}
          {tab === "interest" && input("to", "date")}
          {tab === "interest" && form.method === "COMPOUND" && pick("compounding", "compounding")}
          {tab === "interest" && pick("day_count", "day_counts")}
        </div>
        <Button className="mt-3" icon={Calculator} loading={busy} disabled={!ready} disabledReason={L("Fill the amount, rate and instalments or dates.")} onClick={run}>
          {L("Calculate")}
        </Button>
      </Section>
      {result && (
        <Section title={L("Result")}>
          <Facts className="mb-3" rows={factsOfObject(L, result)} />
          {(result.notes ?? []).map((n) => (
            <p key={n} className="mb-2 text-xs text-muted-foreground">{n}</p>
          ))}
          {result.rows && <ScheduleRows rows={result.rows} cols={[["instalment_number", "#"], ["due_date", L("due_date"), true], ["days", L("days")], ["opening_principal", L("opening_principal")], ["principal_due", L("principal_due")], ["interest_due", L("interest_due")], ["total_due", L("total_due")], ["closing_principal", L("closing_principal")]]} />}
          {result.segments && <ScheduleRows rows={result.segments} cols={[["from", L("from"), true], ["to", L("to"), true], ["days", L("days")], ["principal", L("principal")], ["daily_interest", L("daily_interest")], ["interest", L("interest")]]} />}
        </Section>
      )}
    </div>
  );
}
