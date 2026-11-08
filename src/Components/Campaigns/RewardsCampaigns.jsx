import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Send } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DateInput } from "@/Components/Common/DateInput";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { Toggle } from "@/Components/Common/Toggle";
import { Facts } from "@/Components/InnoCBS/Deposits/depositShared";
import { Field, useInstitutionScope } from "@/Components/InnoCBS/Loans/loanShared";
import { rewardsCampaignApi } from "@/Services/Campaigns/campaigns.api";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { idsOf } from "./usePagedList";
import { RecordDialogFrame, RewardRecords, amount, byCode, byId, editedSetup, inputClass, labelClass, labelsOf, shownSetup, useRewardOptions, useRewardRecord, whole } from "./rewardsShared";

const REWARD_KINDS = ["CASHBACK", "POINTS"];
const PARTIES = ["ANY", "CUSTOMER", "MERCHANT"];
const MODES = ["FIXED", "PERCENT"];
const ID_LISTS = ["txn_type_ids", "channel_ids", "digital_product_ids"];
const AMOUNTS = ["min_amount", "max_amount", "reward_value", "max_reward_per_txn", "budget_cap", "per_customer_cap"];

const blank = () => ({
  code: "",
  name: "",
  description: "",
  reward_kind: "CASHBACK",
  currency_id: "",
  txn_type_ids: [],
  channel_ids: [],
  digital_product_ids: [],
  party: "ANY",
  tier_codes: [],
  min_amount: "",
  max_amount: "",
  start_date: "",
  end_date: "",
  reward_mode: "FIXED",
  reward_value: "",
  max_reward_per_txn: "",
  budget_cap: "",
  per_customer_cap: "",
  per_customer_count: "",
  first_txn_only: false,
  priority: "",
});

function toForm(setup) {
  const b = blank();
  return Object.fromEntries(
    Object.keys(b).map((k) => {
      const v = setup[k];
      if (ID_LISTS.includes(k) || k === "tier_codes") return [k, v ?? []];
      if (k === "first_txn_only") return [k, Boolean(v)];
      return [k, v == null ? b[k] : String(v)];
    }),
  );
}

const toSetup = (f) => ({
  code: f.code.trim(),
  name: f.name.trim(),
  description: f.description.trim(),
  reward_kind: f.reward_kind,
  currency_id: Number(f.currency_id) || 0,
  ...Object.fromEntries(ID_LISTS.map((k) => [k, idsOf(f[k])])),
  party: f.party,
  tier_codes: f.tier_codes,
  ...Object.fromEntries(AMOUNTS.map((k) => [k, f[k].trim()])),
  // Inclusive; "" leaves the end open.
  start_date: f.start_date,
  end_date: f.end_date,
  reward_mode: f.reward_mode,
  per_customer_count: Number(f.per_customer_count) || 0,
  first_txn_only: f.first_txn_only,
  priority: Number(f.priority) || 0,
});

function RewardForm({ record, onClose, onSaved }) {
  const { t } = useTranslation(["campaigns", "common"]);
  const { scope } = useInstitutionScope();
  const options = useRewardOptions();
  const [form, setForm] = useState(() => (record ? toForm(editedSetup(record)) : blank()));
  const [narration, setNarration] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const missing = !form.code.trim() || !form.name.trim() || !form.reward_value.trim() || !form.start_date || !form.currency_id;
  const datesBad = form.end_date && form.start_date && form.end_date < form.start_date;
  const percentBad = form.reward_mode === "PERCENT" && Number(form.reward_value) > 100;
  const blocked = missing ? t("common:blockedFillRequired") : datesBad ? t("endBeforeStart") : percentBad ? t("percentOver100") : "";
  const save = async () => {
    setBusy(true);
    try {
      const body = { setup: toSetup(form), narration: narration.trim() };
      const r = record ? await rewardsCampaignApi.edit({ id: record.id, ...body }) : await rewardsCampaignApi.add(scope(body));
      notifications.success(apiMessage(r, t("saved")));
      onSaved();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const select = (key, values, label) => (
    <label className={labelClass}>
      {label}
      <FilterSelect className="mt-1.5" value={form[key]} onChange={(v) => set({ [key]: v })} options={values.map((v) => ({ value: v, label: t(`${key}_${v}`) }))} />
    </label>
  );
  const money = (key, placeholder, hint) => (
    <label className={labelClass}>
      {t(key)}
      <input className={inputClass} inputMode="decimal" value={form[key]} onChange={(e) => set({ [key]: amount(e.target.value) })} placeholder={placeholder} />
      {hint && <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{hint}</span>}
    </label>
  );
  const multi = (key, picks) => (
    <div className={labelClass}>
      {t(key)}
      <Field field={{ type: "multi", options: picks }} value={form[key]} onChange={(list) => set({ [key]: list })} />
    </div>
  );
  return (
    <Modal
      open
      size="xl"
      onClose={onClose}
      title={record ? t("editReward", { name: editedSetup(record).name ?? "" }) : t("addReward")}
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
      <div className="grid gap-3 md:grid-cols-3">
        <label className={labelClass}>
          {t("code")} <span className="text-red-500">*</span>
          <input className={`${inputClass} font-mono`} disabled={Boolean(record)} value={form.code} onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 32) })} placeholder="XMAS_CASHBACK" />
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          {t("name")} <span className="text-red-500">*</span>
          <input className={inputClass} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="December cashback" />
        </label>
        <label className={`${labelClass} md:col-span-3`}>
          {t("description")}
          <input className={inputClass} value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="5% back on bill payments in December" />
        </label>
        {select("reward_kind", REWARD_KINDS, t("rewardKind"))}
        {select("reward_mode", MODES, t("rewardMode"))}
        <label className={labelClass}>
          {t("reward_value")} <span className="text-red-500">*</span>
          <input className={inputClass} inputMode="decimal" value={form.reward_value} onChange={(e) => set({ reward_value: amount(e.target.value) })} placeholder={form.reward_mode === "PERCENT" ? "5" : "50.00"} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t(form.reward_mode === "PERCENT" ? "rewardValuePercentHint" : "rewardValueFixedHint")}</span>
        </label>
        <label className={labelClass}>
          {t("currency_id")} <span className="text-red-500">*</span>
          <FilterSelect className="mt-1.5" value={form.currency_id} onChange={(v) => set({ currency_id: String(v ?? "") })} options={[{ value: "", label: t("choose") }, ...byId(options.currencies).map((o) => ({ ...o, value: String(o.value) }))]} />
        </label>
        {select("party", PARTIES, t("party"))}
        <label className={labelClass}>
          {t("priority")}
          <input className={inputClass} inputMode="numeric" value={form.priority} onChange={(e) => set({ priority: whole(e.target.value) })} placeholder="0" />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("priorityHint")}</span>
        </label>
        {multi("txn_type_ids", byId(options.txn_types))}
        {multi("channel_ids", byId(options.channels))}
        {multi("digital_product_ids", byId(options.digital_products))}
        <div className={`${labelClass} md:col-span-3`}>
          {t("tier_codes")}
          <Field field={{ type: "multi", options: byCode(options.tiers) }} value={form.tier_codes} onChange={(tier_codes) => set({ tier_codes })} />
        </div>
        <p className="text-[11px] text-muted-foreground md:col-span-3">{t("emptyMeansAll")}</p>
        {money("min_amount", "0.00")}
        {money("max_amount", "0.00")}
        {money("max_reward_per_txn", "0.00")}
        {money("budget_cap", "0.00", t("emptyMeansNone"))}
        {money("per_customer_cap", "0.00", t("emptyMeansNone"))}
        <label className={labelClass}>
          {t("per_customer_count")}
          <input className={inputClass} inputMode="numeric" value={form.per_customer_count} onChange={(e) => set({ per_customer_count: whole(e.target.value) })} placeholder="0" />
        </label>
        <label className={labelClass}>
          {t("start_date")} <span className="text-red-500">*</span>
          <DateInput className={inputClass} value={form.start_date} max={form.end_date || undefined} onChange={(e) => set({ start_date: e.target.value })} />
        </label>
        <label className={labelClass}>
          {t("end_date")}
          <DateInput className={inputClass} value={form.end_date} min={form.start_date || undefined} onChange={(e) => set({ end_date: e.target.value })} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("endDateHint")}</span>
        </label>
        <div className="flex items-end">
          <Toggle showLabel label={t("first_txn_only")} checked={form.first_txn_only} onChange={(first_txn_only) => set({ first_txn_only })} />
        </div>
        <label className={`${labelClass} md:col-span-3`}>
          {t("narration")}
          <input className={inputClass} value={narration} onChange={(e) => setNarration(e.target.value)} />
        </label>
      </div>
    </Modal>
  );
}

function RewardView({ id, onClose }) {
  const { t } = useTranslation(["campaigns", "common"]);
  const options = useRewardOptions();
  const data = useRewardRecord(rewardsCampaignApi, id, onClose);
  const rec = data?.record;
  const s = shownSetup(rec);
  const list = (ids, picks) => (ids?.length ? labelsOf(ids, picks).join(", ") : t("anyone"));
  const currency = byId(options.currencies).find((c) => String(c.value) === String(s.currency_id))?.label ?? s.currency_id;
  return (
    <RecordDialogFrame title={s.name ?? t("rewardCampaign")} record={rec} history={data?.history} onClose={onClose}>
      {s.description && <p className="text-sm">{s.description}</p>}
      <Facts
        rows={[
          [t("code"), s.code],
          [t("rewardKind"), s.reward_kind && t(`reward_kind_${s.reward_kind}`)],
          [t("rewardMode"), s.reward_mode && t(`reward_mode_${s.reward_mode}`)],
          [t("reward_value"), s.reward_value],
          [t("currency_id"), currency],
          [t("party"), s.party && t(`party_${s.party}`)],
          [t("priority"), s.priority ?? 0],
          [t("tier_codes"), list(s.tier_codes, byCode(options.tiers))],
          [t("txn_type_ids"), list(s.txn_type_ids, byId(options.txn_types))],
          [t("channel_ids"), list(s.channel_ids, byId(options.channels))],
          [t("digital_product_ids"), list(s.digital_product_ids, byId(options.digital_products))],
          ...AMOUNTS.filter((k) => k !== "reward_value").map((k) => [t(k), s[k] || "—"]),
          [t("per_customer_count"), s.per_customer_count || "—"],
          [t("start_date"), s.start_date],
          [t("end_date"), s.end_date || t("openEnded")],
          [t("first_txn_only"), t(s.first_txn_only ? "yes" : "no")],
          [t("budgetUsed"), rec?.budget_used ?? "—"],
        ]}
      />
    </RecordDialogFrame>
  );
}

// EPURSE > Rewards Campaigns (menu 226): cashback and points rules,
// maker-checker. The most specific match wins, then the higher priority.
export function RewardsCampaigns() {
  const { t } = useTranslation(["campaigns", "common"]);
  const field = (r, k) => shownSetup(r)[k];
  const columns = [
    { key: "name", label: t("name"), align: "left", render: (r) => <span className="font-semibold">{field(r, "name")}<span className="block font-mono text-[11px] font-normal text-muted-foreground">{field(r, "code")}</span></span> },
    { key: "reward_kind", label: t("rewardKind"), render: (r) => (field(r, "reward_kind") ? t(`reward_kind_${field(r, "reward_kind")}`) : "—") },
    { key: "reward_value", label: t("reward_value"), render: (r) => <span className="tabular-nums">{field(r, "reward_mode") === "PERCENT" ? `${field(r, "reward_value")}%` : (field(r, "reward_value") ?? "—")}</span> },
    { key: "budget_used", label: t("budgetUsed"), render: (r) => <span className="tabular-nums">{r.budget_used ?? "—"}</span> },
    { key: "period", label: t("period"), render: (r) => <span className="whitespace-nowrap text-xs">{`${field(r, "start_date") ?? "—"} – ${field(r, "end_date") || t("openEnded")}`}</span> },
  ];
  return <RewardRecords api={rewardsCampaignApi} title={t("rewardsTitle")} subtitle={t("rewardsSubtitle")} addLabel={t("addReward")} searchPlaceholder={t("searchCampaigns")} emptyTitle={t("noCampaigns")} columns={columns} Form={RewardForm} View={RewardView} nameOf={(r) => field(r, "name") ?? ""} />;
}
