import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Send } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DateInput } from "@/Components/Common/DateInput";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { Facts } from "@/Components/InnoCBS/Deposits/depositShared";
import { useInstitutionScope } from "@/Components/InnoCBS/Loans/loanShared";
import { rewardsVoucherApi } from "@/Services/Campaigns/campaigns.api";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { RecordDialogFrame, RewardRecords, amount, byId, editedSetup, inputClass, labelClass, shownSetup, useRewardOptions, useRewardRecord, whole } from "./rewardsShared";

const text = (v) => (v == null ? "" : String(v));
const toForm = (s) => ({ code: text(s.code), name: text(s.name), points_cost: text(s.points_cost), value: text(s.value), currency_id: text(s.currency_id), stock: text(s.stock), start_date: text(s.start_date), end_date: text(s.end_date) });

const toSetup = (f) => ({
  code: f.code.trim(),
  name: f.name.trim(),
  points_cost: Number(f.points_cost) || 0,
  value: f.value.trim(),
  currency_id: Number(f.currency_id) || 0,
  // null is unlimited.
  stock: f.stock === "" ? null : Number(f.stock),
  start_date: f.start_date,
  end_date: f.end_date,
});

function VoucherForm({ record, onClose, onSaved }) {
  const { t } = useTranslation(["campaigns", "common"]);
  const { scope } = useInstitutionScope();
  const options = useRewardOptions();
  const [form, setForm] = useState(() => toForm(record ? editedSetup(record) : {}));
  const [narration, setNarration] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const missing = !form.code.trim() || !form.name.trim() || !form.points_cost || !form.value.trim() || !form.currency_id || !form.start_date;
  const blocked = missing ? t("common:blockedFillRequired") : form.end_date && form.end_date < form.start_date ? t("endBeforeStart") : "";
  const save = async () => {
    setBusy(true);
    try {
      const body = { setup: toSetup(form), narration: narration.trim() };
      const r = record ? await rewardsVoucherApi.edit({ id: record.id, ...body }) : await rewardsVoucherApi.add(scope(body));
      notifications.success(apiMessage(r, t("saved")));
      onSaved();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title={record ? t("editVoucher", { name: editedSetup(record).name ?? "" }) : t("addVoucher")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common:cancel")}
          </Button>
          <Button icon={Send} loading={busy} disabled={Boolean(blocked) || busy} disabledReason={blocked || undefined} onClick={() => void save()}>
            {t("submitForApproval")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        <label className={labelClass}>
          {t("code")} <span className="text-red-500">*</span>
          <input className={`${inputClass} font-mono`} disabled={Boolean(record)} value={form.code} onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 32) })} placeholder="AIRTIME_50" />
        </label>
        <label className={labelClass}>
          {t("name")} <span className="text-red-500">*</span>
          <input className={inputClass} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Airtime voucher 50" />
        </label>
        <label className={labelClass}>
          {t("points_cost")} <span className="text-red-500">*</span>
          <input className={inputClass} inputMode="numeric" value={form.points_cost} onChange={(e) => set({ points_cost: whole(e.target.value) })} placeholder="500" />
        </label>
        <label className={labelClass}>
          {t("voucher_value")} <span className="text-red-500">*</span>
          <input className={inputClass} inputMode="decimal" value={form.value} onChange={(e) => set({ value: amount(e.target.value) })} placeholder="50.00" />
        </label>
        <label className={labelClass}>
          {t("currency_id")} <span className="text-red-500">*</span>
          <FilterSelect className="mt-1.5" value={form.currency_id} onChange={(v) => set({ currency_id: String(v ?? "") })} options={[{ value: "", label: t("choose") }, ...byId(options.currencies).map((o) => ({ ...o, value: String(o.value) }))]} />
        </label>
        <label className={labelClass}>
          {t("stock")}
          <input className={inputClass} inputMode="numeric" value={form.stock} onChange={(e) => set({ stock: whole(e.target.value) })} placeholder="1000" />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("stockHint")}</span>
        </label>
        <label className={labelClass}>
          {t("start_date")} <span className="text-red-500">*</span>
          <DateInput className={inputClass} value={form.start_date} max={form.end_date || undefined} onChange={(e) => set({ start_date: e.target.value })} />
        </label>
        <label className={labelClass}>
          {t("end_date")}
          <DateInput className={inputClass} value={form.end_date} min={form.start_date || undefined} onChange={(e) => set({ end_date: e.target.value })} />
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          {t("narration")}
          <input className={inputClass} value={narration} onChange={(e) => setNarration(e.target.value)} />
        </label>
      </div>
    </Modal>
  );
}

function VoucherView({ id, onClose }) {
  const { t } = useTranslation(["campaigns", "common"]);
  const options = useRewardOptions();
  const data = useRewardRecord(rewardsVoucherApi, id, onClose);
  const rec = data?.record;
  const s = shownSetup(rec);
  const currency = byId(options.currencies).find((c) => String(c.value) === String(s.currency_id))?.label ?? s.currency_id;
  return (
    <RecordDialogFrame title={s.name ?? t("vouchersTitle")} record={rec} history={data?.history} onClose={onClose}>
      <Facts
        rows={[
          [t("code"), s.code],
          [t("points_cost"), s.points_cost],
          [t("voucher_value"), s.value],
          [t("currency_id"), currency],
          [t("stock"), s.stock ?? t("unlimited")],
          [t("issued"), rec?.issued ?? 0],
          [t("start_date"), s.start_date],
          [t("end_date"), s.end_date || t("openEnded")],
        ]}
      />
    </RecordDialogFrame>
  );
}

// EPURSE > Vouchers (menu 228): what customers can buy with points,
// maker-checker.
export function Vouchers() {
  const { t } = useTranslation(["campaigns", "common"]);
  const field = (r, k) => shownSetup(r)[k];
  const columns = [
    { key: "name", label: t("name"), align: "left", render: (r) => <span className="font-semibold">{field(r, "name")}<span className="block font-mono text-[11px] font-normal text-muted-foreground">{field(r, "code")}</span></span> },
    { key: "points_cost", label: t("points_cost"), render: (r) => <span className="tabular-nums">{field(r, "points_cost") ?? "—"}</span> },
    { key: "value", label: t("voucher_value"), render: (r) => <span className="tabular-nums">{field(r, "value") ?? "—"}</span> },
    { key: "stock", label: t("stock"), render: (r) => <span className="tabular-nums">{field(r, "stock") ?? t("unlimited")}</span> },
    { key: "issued", label: t("issued"), render: (r) => <span className="tabular-nums">{r.issued ?? 0}</span> },
    { key: "period", label: t("period"), render: (r) => <span className="whitespace-nowrap text-xs">{`${field(r, "start_date") ?? "—"} – ${field(r, "end_date") || t("openEnded")}`}</span> },
  ];
  return <RewardRecords api={rewardsVoucherApi} title={t("vouchersTitle")} subtitle={t("vouchersSubtitle")} addLabel={t("addVoucher")} searchPlaceholder={t("searchVouchers")} emptyTitle={t("noVouchers")} columns={columns} Form={VoucherForm} View={VoucherView} nameOf={(r) => field(r, "name") ?? ""} />;
}
