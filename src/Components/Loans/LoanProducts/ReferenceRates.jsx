import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Plus, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { dayDate } from "@/Components/Epurse/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { useOwnIds } from "@/Hooks/useInstitutionScope";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { loanReferenceRatesApi } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { ActionButtons, Problems, inputClass, labelClass, ratePct } from "../../TermDeposits/depositShared";
import { Field, MiniTable } from "../loanShared";

const today = () => new Date().toISOString().slice(0, 10);

// Reference rates (Loan Products menu): a VARIABLE rate band is the latest
// approved rate of its code on or before the day, plus the band's spread.
// A new rate waits for a checker (Self: active at once).
export function ReferenceRates({ scope, onClose }) {
  const { t } = useTranslation("loans");
  const can = usePagePermission();
  const own = useOwnIds();
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState({ code: "BASE", annual_rate: "", effective_from: today() });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setRows(rowsOf(await loanReferenceRatesApi.list(scope({}))));
    } catch (e) {
      setError(e.message);
      setRows([]);
    }
  }, [scope]);
  useEffect(() => {
    void load();
  }, [load]);

  const act = async (call) => {
    setBusy(true);
    setError("");
    try {
      const response = await call();
      if (response?.message) notifications.success(response.message);
      await load();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (await act(() => loanReferenceRatesApi.add(scope({ code: form.code.trim().toUpperCase(), annual_rate: form.annual_rate, effective_from: form.effective_from })))) setForm((f) => ({ ...f, annual_rate: "" }));
  };

  return (
    <Modal open onClose={onClose} size="lg" title={t("referenceRates")}>
      <p className="mb-3 text-sm text-muted-foreground">{t("referenceRatesHint")}</p>
      {can("Add") && (
        <div className="mb-4 grid gap-3 rounded-2xl border border-border bg-card p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <label className={labelClass}>
            {t("referenceRate")}
            <input className={cn(inputClass, "mt-1 font-mono uppercase")} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") }))} />
          </label>
          <label className={labelClass}>
            {t("ratePct")}
            <Field field={{ type: "rate" }} value={form.annual_rate} onChange={(v) => setForm((f) => ({ ...f, annual_rate: v }))} />
          </label>
          <label className={labelClass}>
            {t("effectiveFrom")}
            <Field field={{ type: "date" }} value={form.effective_from} onChange={(v) => setForm((f) => ({ ...f, effective_from: v }))} />
          </label>
          <Button icon={Plus} loading={busy} disabled={!form.code || form.annual_rate === "" || !form.effective_from} onClick={add}>
            {t("addRate")}
          </Button>
        </div>
      )}
      <Problems message={error} />
      {!rows ? (
        <Spinner size={16} />
      ) : (
        <MiniTable
          rows={rows}
          rowKey={(r) => r.id}
          empty={t("noReferenceRates")}
          columns={[
            { key: "code", label: t("referenceRate"), render: (r) => <span className="font-mono text-xs font-bold">{r.code}</span> },
            { key: "annual_rate", label: t("ratePct"), align: "right", render: (r) => <b className="text-primary">{ratePct(r.annual_rate)}</b> },
            { key: "effective_from", label: t("effectiveFrom"), render: (r) => <span className="text-xs">{dayDate(r.effective_from)}</span> },
            { key: "status", label: t("status"), render: (r) => <span className="text-xs font-bold">{t(`rateStatus_${r.status}`, { defaultValue: r.status })}</span> },
            {
              key: "x",
              label: "",
              render: (r) =>
                // A checker decides; the requester only with Self.
                r.status === "PENDING" &&
                can("Authorise") &&
                (String(r.requested_userid) !== own.userId || can("Self")) && (
                  <ActionButtons
                    busy={busy}
                    buttons={[
                      { key: "auth", label: t("approve"), icon: CheckCircle2, variant: "primary", run: () => void act(() => loanReferenceRatesApi.auth({ id: r.id })) },
                      { key: "deauth", label: t("reject"), icon: XCircle, variant: "danger", run: () => void act(() => loanReferenceRatesApi.deauth({ id: r.id })) },
                    ]}
                  />
                ),
            },
          ]}
        />
      )}
    </Modal>
  );
}
