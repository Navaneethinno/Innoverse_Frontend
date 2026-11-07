import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock3, ListChecks, Plus, Send } from "lucide-react";
import { PageTitle } from "@/Components/Common/PageTitle";
import { Button } from "@/Components/Common/Button";
import { Modal } from "@/Components/Common/Modal";
import { DataTable } from "@/Components/Common/DataTable";
import { StatusFilterTabs } from "@/Components/Common/StatusFilterTabs";
import { RowActions } from "@/Components/Common/RowActions";
import { DigitChips } from "@/Components/Common/DigitChips";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { DateInput } from "@/Components/Common/DateInput";
import { Toggle } from "@/Components/Common/Toggle";
import { NoAccess } from "@/Components/Common/NoAccess";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { Facts } from "@/Components/InnoCBS/Deposits/depositShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { rewardsCampaignApi } from "@/Services/Campaigns/campaigns.api";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { firstOf, idsOf, usePagedList } from "./usePagedList";
import { NarrationDialog } from "./NarrationDialog";

const inputClass = "mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary";
const labelClass = "text-xs font-semibold text-slate-700";

// "all" is /list, "pending" is /pending (waiting for a checker).
const TABS = [
  ["all", "campaigns:tabAll", ListChecks],
  ["pending", "campaigns:tabPending", Clock3],
];
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
});

// The setup as a saved record carries it (under `setup`, or flat).
const setupOf = (rec) => rec?.setup ?? rec?.pending?.setup ?? rec ?? {};
function toForm(rec) {
  const s = setupOf(rec);
  const b = blank();
  return Object.fromEntries(
    Object.keys(b).map((k) => {
      const v = s[k];
      if (ID_LISTS.includes(k)) return [k, (v ?? []).map(String)];
      if (k === "tier_codes") return [k, v ?? []];
      if (k === "first_txn_only") return [k, Boolean(v)];
      return [k, v == null ? b[k] : String(v)];
    }),
  );
}

const amount = (v) => String(v).replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
const whole = (v) => String(v).replace(/\D/g, "").slice(0, 9);

function toSetup(f) {
  return {
    code: f.code.trim(),
    name: f.name.trim(),
    description: f.description.trim(),
    reward_kind: f.reward_kind,
    currency_id: Number(f.currency_id) || 0,
    txn_type_ids: idsOf(f.txn_type_ids),
    channel_ids: idsOf(f.channel_ids),
    digital_product_ids: idsOf(f.digital_product_ids),
    party: f.party,
    tier_codes: f.tier_codes,
    ...Object.fromEntries(AMOUNTS.map((k) => [k, f[k].trim()])),
    // Inclusive; "" leaves the end open.
    start_date: f.start_date,
    end_date: f.end_date,
    reward_mode: f.reward_mode,
    per_customer_count: Number(f.per_customer_count) || 0,
    first_txn_only: f.first_txn_only,
  };
}

function RewardForm({ record, onClose, onSaved }) {
  const { t } = useTranslation(["campaigns", "common"]);
  const [form, setForm] = useState(() => (record ? toForm(record) : blank()));
  const [narration, setNarration] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const missing = !form.code.trim() || !form.name.trim() || !form.reward_value.trim() || !form.start_date;
  const datesBad = form.end_date && form.start_date && form.end_date < form.start_date;
  const percentBad = form.reward_mode === "PERCENT" && Number(form.reward_value) > 100;
  const blocked = missing ? t("common:blockedFillRequired") : datesBad ? t("endBeforeStart") : percentBad ? t("percentOver100") : "";
  const save = async () => {
    setBusy(true);
    try {
      const body = { setup: toSetup(form), narration: narration.trim() };
      const r = record ? await rewardsCampaignApi.edit({ id: record.id, ...body }) : await rewardsCampaignApi.add(body);
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
  const money = (key, placeholder) => (
    <label className={labelClass}>
      {t(key)}
      <input className={inputClass} inputMode="decimal" value={form[key]} onChange={(e) => set({ [key]: amount(e.target.value) })} placeholder={placeholder} />
    </label>
  );
  return (
    <Modal
      open
      size="xl"
      onClose={onClose}
      title={record ? t("editReward", { name: setupOf(record).name ?? record.name ?? "" }) : t("addReward")}
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
          {t("currency_id")}
          <input className={inputClass} inputMode="numeric" value={form.currency_id} onChange={(e) => set({ currency_id: whole(e.target.value) })} placeholder="1" />
        </label>
        {select("party", PARTIES, t("party"))}
        <label className={labelClass}>
          {t("tier_codes")}
          <DigitChips className="mt-1.5" letters value={form.tier_codes} onChange={(tier_codes) => set({ tier_codes })} placeholder="GOLD" />
        </label>
        {ID_LISTS.map((k) => (
          <label key={k} className={labelClass}>
            {t(k)}
            <DigitChips className="mt-1.5" value={form[k]} onChange={(list) => set({ [k]: list })} placeholder="12" />
          </label>
        ))}
        <p className="text-[11px] text-muted-foreground md:col-span-3">{t("emptyMeansAll")}</p>
        {money("min_amount", "0.00")}
        {money("max_amount", "0.00")}
        {money("max_reward_per_txn", "0.00")}
        {money("budget_cap", "0.00")}
        {money("per_customer_cap", "0.00")}
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
        <p className="text-[11px] text-muted-foreground md:col-span-3">{t("zeroMeansNoLimit")}</p>
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
  const [rec, setRec] = useState(null);
  useEffect(() => {
    let cancelled = false;
    rewardsCampaignApi
      .get({ id })
      .then((r) => !cancelled && setRec(firstOf(r) ?? {}))
      .catch((e) => {
        notifications.error(e.message);
        onClose();
      });
    return () => {
      cancelled = true;
    };
  }, [id, onClose]);
  const s = setupOf(rec);
  const list = (v) => (v?.length ? v.join(", ") : t("anyone"));
  return (
    <Modal open size="xl" onClose={onClose} title={s.name ?? t("rewardCampaign")}>
      {!rec ? (
        <p className="text-sm text-muted-foreground">{t("common:loading", { defaultValue: "Loading…" })}</p>
      ) : (
        <div className="grid gap-3">
          <div className="flex items-center gap-2">
            {rec.status_name && <StatusBadge status={String(rec.status_name)} />}
            {rec.process_status_name && <StatusBadge status={String(rec.process_status_name)} variant="subtle" />}
          </div>
          {s.description && <p className="text-sm">{s.description}</p>}
          <Facts
            rows={[
              [t("code"), s.code],
              [t("rewardKind"), s.reward_kind && t(`reward_kind_${s.reward_kind}`)],
              [t("rewardMode"), s.reward_mode && t(`reward_mode_${s.reward_mode}`)],
              [t("reward_value"), s.reward_value],
              [t("currency_id"), s.currency_id],
              [t("party"), s.party && t(`party_${s.party}`)],
              [t("tier_codes"), list(s.tier_codes)],
              ...ID_LISTS.map((k) => [t(k), list(s[k])]),
              ...AMOUNTS.filter((k) => k !== "reward_value").map((k) => [t(k), s[k] || "—"]),
              [t("per_customer_count"), s.per_customer_count || "—"],
              [t("start_date"), s.start_date],
              [t("end_date"), s.end_date || t("openEnded")],
              [t("first_txn_only"), t(s.first_txn_only ? "yes" : "no")],
            ]}
          />
        </div>
      )}
    </Modal>
  );
}

// EPURSE > Campaigns (menu 226): cashback and points rules, maker-checker.
export function RewardsCampaigns() {
  const { t } = useTranslation(["campaigns", "common"]);
  const can = usePagePermission();
  const [tab, setTab] = useState("all");
  const call = useCallback((body) => (body.tab === "pending" ? rewardsCampaignApi.pending : rewardsCampaignApi.list)((({ tab: _tab, ...rest }) => rest)(body)), []);
  const list = usePagedList(call, { tab });
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [action, setAction] = useState(null);
  const closeView = useCallback(() => setViewing(null), []);
  if (!can("View")) return <NoAccess />;
  const open = async (row) => {
    try {
      setEditing(firstOf(await rewardsCampaignApi.get({ id: row.id })) ?? row);
    } catch (e) {
      notifications.error(e.message);
    }
  };
  const field = (r, k) => r[k] ?? r.setup?.[k];
  const columns = [
    { key: "name", label: t("name"), align: "left", render: (r) => <span className="font-semibold">{field(r, "name")}<span className="block font-mono text-[11px] font-normal text-muted-foreground">{field(r, "code")}</span></span> },
    { key: "reward_kind", label: t("rewardKind"), render: (r) => (field(r, "reward_kind") ? t(`reward_kind_${field(r, "reward_kind")}`) : "—") },
    { key: "reward_value", label: t("reward_value"), render: (r) => <span className="tabular-nums">{field(r, "reward_mode") === "PERCENT" ? `${field(r, "reward_value")}%` : (field(r, "reward_value") ?? "—")}</span> },
    { key: "period", label: t("period"), render: (r) => <span className="whitespace-nowrap text-xs">{`${field(r, "start_date") ?? "—"} – ${field(r, "end_date") || t("openEnded")}`}</span> },
    { key: "status", label: t("common:status"), render: (r) => <StatusBadge status={String(r.process_status_name || r.status_name || "-")} /> },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (r) => {
        // Only what the server says this user may do on this row.
        const a = r.actions ?? {};
        return (
          <RowActions
            buttons={{ view: true, edit: Boolean(a.edit), delete: Boolean(a.delete), deactivate: Boolean(a.deactivate), activate: Boolean(a.reactivate), authorize: Boolean(a.auth), deauthorize: Boolean(a.deauth) }}
            onView={() => setViewing(r.id)}
            onEdit={() => void open(r)}
            onDelete={() => setAction({ verb: "delete", row: r })}
            onDeactivate={() => setAction({ verb: "deactivate", row: r })}
            onReactivate={() => setAction({ verb: "reactivate", row: r })}
            onAuthorize={() => setAction({ verb: "auth", row: r })}
            onDeauthorize={() => setAction({ verb: "deauth", row: r })}
          />
        );
      },
    },
  ];
  const labels = { auth: t("common:authorize"), deauth: t("common:deauthorize"), delete: t("common:delete"), deactivate: t("common:deactivate"), reactivate: t("common:reactivate") };
  return (
    <div>
      <div className="mb-4">
        <PageTitle>{t("rewardsTitle")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("rewardsSubtitle")}</p>
      </div>
      <div className="mb-4 overflow-hidden rounded-2xl border border-border bg-card">
        <StatusFilterTabs
          tabs={TABS}
          serverFiltered
          total={list.total}
          rows={list.rows}
          value={tab}
          onChange={setTab}
          {...list.searchBind}
          searchPlaceholder={t("searchCampaigns")}
          actions={
            can("Add") && (
              <Button size="sm" icon={Plus} onClick={() => setEditing({})}>
                {t("addReward")}
              </Button>
            )
          }
          bare
        />
        <DataTable columns={columns} rows={list.rows} rowKey={(r) => r.id} isLoading={list.loading} title={t("rewardsTitle")} emptyTitle={t("noCampaigns")} serverPagination={list.serverPagination} />
      </div>
      {editing && (
        <RewardForm
          record={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.reload();
          }}
        />
      )}
      {viewing && <RewardView id={viewing} onClose={closeView} />}
      {action && (
        <NarrationDialog
          title={`${labels[action.verb]} · ${field(action.row, "name") ?? ""}`}
          confirmLabel={labels[action.verb]}
          destructive={action.verb !== "auth" && action.verb !== "reactivate"}
          needsNarration={action.verb === "deauth"}
          run={(narration) => rewardsCampaignApi[action.verb]({ id: action.row.id, narration })}
          onClose={() => setAction(null)}
          onDone={() => {
            setAction(null);
            list.reload();
          }}
        />
      )}
    </div>
  );
}
