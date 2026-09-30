import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Plus, Trash2, XCircle } from "lucide-react";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { limitGroupOps, rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { currencyCode, useLimitLists } from "./useLimitLists";

// "Test a customer" (handoff: Try it, evaluate): what limits would apply to
// a customer / merchant, or to a group with the values typed in, and
// whether an amount would pass given what's already used this period.
const input = "mt-1.5 w-full rounded-xl border px-3 py-2 text-sm font-normal";
const num = (v) => (v === "" || v === undefined ? undefined : Number(v));

export function LimitEvaluate({ group, onClose }) {
  const { t } = useTranslation("limits");
  const lists = useLimitLists();
  const [form, setForm] = useState({ reference_id: "", direction: "", transaction_id: "", channel_id: "", kyc_level_no: "", registration_days: "", at: "", currency_code: "", amount: "" });
  const [used, setUsed] = useState([]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const run = async () => {
    setBusy(true);
    try {
      const body = {
        ...(form.reference_id.trim() ? { reference_id: form.reference_id.trim() } : { limit_group_id: group?.is_default ? 0 : group?.id }),
        ...(form.direction ? { direction: form.direction } : {}),
        ...(form.transaction_id ? { transaction_id: Number(form.transaction_id) } : {}),
        ...(form.channel_id ? { channel_id: Number(form.channel_id) } : {}),
        ...(form.kyc_level_no !== "" ? { kyc_level_no: Number(form.kyc_level_no) } : {}),
        ...(form.registration_days !== "" ? { registration_days: Number(form.registration_days) } : {}),
        ...(form.at ? { at: new Date(form.at).toISOString() } : {}),
        ...(form.currency_code ? { currency_code: form.currency_code } : {}),
        ...(form.amount !== "" ? { amount: Number(form.amount) } : {}),
      };
      const usedMap = Object.fromEntries(used.filter((u) => u.type).map((u) => [u.type, { ...(num(u.amount) !== undefined ? { amount: num(u.amount) } : {}), ...(num(u.count) !== undefined ? { count: num(u.count) } : {}) }]));
      if (Object.keys(usedMap).length) body.used = usedMap;
      setResult(rowsOf(await limitGroupOps.evaluate(body))[0] ?? {});
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const options = (key) => [{ value: "", label: t("any") }, ...(lists?.sources?.[key] ?? [])];
  const typeName = (code) => lists?.limitTypes?.find((l) => l.code === code)?.name ?? code;

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={t("evaluateTitle", { name: group?.name ?? "" })}
      footer={
        <>
          <button type="button" onClick={onClose} className="px-3 py-2 text-sm font-bold text-muted-foreground">
            {t("close")}
          </button>
          <button type="button" disabled={busy} onClick={() => void run()} className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {busy && <Spinner size={13} />} {t("evaluate")}
          </button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-slate-700">
            {t("referenceId")}
            <input className={`${input} font-mono`} value={form.reference_id} onChange={(e) => set({ reference_id: e.target.value })} placeholder={t("referenceIdHint")} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-700">
              {t("direction")}
              <FilterSelect className="mt-1.5" value={form.direction} onChange={(v) => set({ direction: v })} options={options("DIRECTION")} />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              {t("channel")}
              <FilterSelect className="mt-1.5" value={form.channel_id} onChange={(v) => set({ channel_id: v })} options={options("CHANNEL")} />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              {t("transaction")}
              <FilterSelect className="mt-1.5" value={form.transaction_id} onChange={(v) => set({ transaction_id: v })} options={options("TRANSACTION")} />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              {t("kycLevel")}
              <input type="number" min={0} className={input} value={form.kyc_level_no} onChange={(e) => set({ kyc_level_no: e.target.value })} />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              {t("registrationDays")}
              <input type="number" min={0} className={input} value={form.registration_days} onChange={(e) => set({ registration_days: e.target.value })} />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              {t("at")}
              <input type="datetime-local" className={input} value={form.at} onChange={(e) => set({ at: e.target.value })} />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              {t("currency")}
              <FilterSelect className="mt-1.5" value={form.currency_code} onChange={(v) => set({ currency_code: v })} options={[{ value: "", label: t("any") }, ...(lists?.currencies ?? []).map((c) => ({ value: currencyCode(c), label: currencyCode(c) }))]} />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              {t("amount")}
              <input type="number" min={0} className={input} value={form.amount} onChange={(e) => set({ amount: e.target.value })} />
            </label>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-slate-700">{t("alreadyUsed")}</p>
            {used.map((u, i) => (
              <div key={i} className="mb-2 grid grid-cols-[2fr_1fr_1fr_auto] gap-2">
                <FilterSelect value={u.type} onChange={(v) => setUsed(used.map((x, j) => (j === i ? { ...x, type: v } : x)))} options={[{ value: "", label: t("pick") }, ...(lists?.limitTypes ?? []).map((l) => ({ value: l.code, label: l.name ?? l.code }))]} />
                <input type="number" placeholder={t("amount")} className="rounded-xl border px-2 py-2 text-sm" value={u.amount} onChange={(e) => setUsed(used.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
                <input type="number" placeholder={t("count")} className="rounded-xl border px-2 py-2 text-sm" value={u.count} onChange={(e) => setUsed(used.map((x, j) => (j === i ? { ...x, count: e.target.value } : x)))} />
                <button type="button" onClick={() => setUsed(used.filter((_, j) => j !== i))} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label={t("remove")}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setUsed([...used, { type: "", amount: "", count: "" }])} className="flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-1.5 text-xs font-bold text-primary">
              <Plus size={13} /> {t("addUsed")}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {!result ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{t("evaluateHint")}</p>
          ) : (
            <>
              {result.allowed !== undefined && (
                <div className={`flex items-center gap-2 rounded-xl p-3 text-sm font-bold ${result.allowed ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  {result.allowed ? <CheckCircle2 size={16} /> : <XCircle size={16} />} {result.allowed ? t("allowed") : t("notAllowed")}
                </div>
              )}
              {(result.violations ?? []).map((v, i) => (
                <p key={i} className="rounded-lg bg-red-50 p-2 text-xs text-red-700">
                  {t("violation", { type: typeName(v.limit_type), limit: v.limit, used: v.used ?? 0, amount: v.amount ?? 0, rule: v.source })}
                  {v.ceiling && ` ${t("byDefaultCeiling")}`}
                </p>
              ))}
              <p className="text-xs text-muted-foreground">{t("matchedRules", { list: (result.matched_rules ?? []).join(", ") || "-" })}</p>
              <div className="overflow-hidden rounded-xl border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60 text-left text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">{t("limitType")}</th>
                      <th className="px-3 py-2">{t("limit")}</th>
                      <th className="px-3 py-2">{t("rule")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(result.limits ?? []).map((l, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-semibold">{typeName(l.limit_type)}</td>
                        <td className="px-3 py-2">
                          {l.max_amount != null && `${l.currency ?? ""} ${l.min_amount != null ? `${l.min_amount}–` : ""}${l.max_amount}`}
                          {l.max_count != null && ` ×${l.max_count}`}
                        </td>
                        <td className="px-3 py-2">
                          {l.source}
                          {l.ceiling && <span className="ml-1.5 rounded bg-sky-50 px-1.5 text-[10px] font-bold text-sky-700">{t("ceiling")}</span>}
                        </td>
                      </tr>
                    ))}
                    {!(result.limits ?? []).length && (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">
                          {t("noLimitsApply")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
