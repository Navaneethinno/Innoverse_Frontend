import { ListTable } from "@/Components/Common/ListView";
import { useServerList } from "@/Hooks/useServerList";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Power, RotateCcw, Store, XCircle } from "lucide-react";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { Spinner } from "@/Components/Common/Spinner";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { useMenuPermission, usePagePermission } from "@/Hooks/usePermission";
import { storesApi } from "@/Services/Merchant/mms.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { ActionButtons, NarrationDialog } from "../../Finance/Deposits/depositShared";
import { MiniTable, Tabs } from "../../Finance/Loans/loanShared";
import { MmsStatus, mmsDate, partyRef } from "../mmsShared";


// MMS › Stores (menu 208): merchants add stores in their portal; the bank
// approves each new one before it trades, and can close or reopen it.
export function Stores() {
  const { t } = useTranslation("mms");
  const [tab, setTab] = useState("all");
  return (
    <div className="pb-8 pt-4">
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
          <Store size={22} className="text-primary" /> {t("storesTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("storesSubtitle")}</p>
      </div>
      <Tabs tabs={[{ key: "all" }, { key: "pending" }]} value={tab} onChange={setTab} labelOf={(k) => t(`storesTab_${k}`)} />
      <StoreList key={tab} pendingOnly={tab === "pending"} />
    </div>
  );
}

// The stores list; `merchant` limits it to one merchant's (its page).
function StoreList({ pendingOnly = false, merchant = null, permission }) {
  const { t } = useTranslation(["mms", "common"]);
  const [viewing, setViewing] = useState(null);
  // Store code or name, merchant.

  const list = useServerList({ api: storesApi.listPath, call: storesApi.list });

  const load = list.reload;
  useLiveChannel(storesApi.listPath, () => load());

  const columns = [
    { key: "code", label: t("code"), render: (r) => <span className="font-mono text-xs font-bold">{r.code}</span> },
    { key: "name", label: t("storeName"), render: (r) => <span className="text-xs font-semibold">{r.name}</span> },
    ...(merchant ? [] : [{ key: "merchant", label: t("merchant"), render: (r) => <span className="text-xs">{r.merchant?.name ?? "—"}</span> }]),
    { key: "province", label: t("province"), render: (r) => <span className="text-xs">{r.province || "—"}</span> },
    { key: "status", label: t("status"), render: (r) => <MmsStatus value={r.status} /> },
    { key: "created_at", label: t("added"), render: (r) => <span className="whitespace-nowrap text-xs">{mmsDate(r.created_at)}</span> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setViewing(r)} /> },
  ];

  return (
    <>
      <ListTable list={list} columns={columns} rowKey={(r) => r.id} title={t("storesTitle")} emptyTitle={pendingOnly ? t("noPendingStores") : t("noStores")} />
      {viewing && <StoreDetail store={viewing} permission={permission} onClose={() => setViewing(null)} onChanged={load} />}
    </>
  );
}

const DECISIONS = {
  approve: { icon: CheckCircle2, variant: "primary", action: "Authorise", required: true },
  reject: { icon: XCircle, variant: "danger", action: "Authorise", required: true },
  deactivate: { icon: Power, variant: "danger", action: "Change Status" },
  reactivate: { icon: RotateCcw, variant: "secondary", action: "Change Status" },
};
const OFFERED = { PENDING: ["approve", "reject"], ACTIVE: ["deactivate"], INACTIVE: ["reactivate"] };

// Opening hours as the merchant set them (day 1 is Monday), e.g.
// "Mon–Fri 08:00–18:00, Sat 09:00–13:00".
function hoursText(hours, locale) {
  if (!Array.isArray(hours) || !hours.length) return null;
  const day = (n) => new Date(Date.UTC(2024, 0, n)).toLocaleDateString(locale, { timeZone: "UTC", weekday: "short" });
  const runs = (days) => {
    const sorted = [...new Set(days.map(Number))].sort((a, b) => a - b);
    const out = [];
    sorted.forEach((d) => (out.length && out.at(-1)[1] === d - 1 ? (out.at(-1)[1] = d) : out.push([d, d])));
    return out.map(([a, b]) => (a === b ? day(a) : `${day(a)}–${day(b)}`)).join(", ");
  };
  return hours.map((h) => `${runs(h.days ?? [])} ${h.opens}–${h.closes}`).join(" · ");
}

function StoreDetail({ store, permission, onClose, onChanged }) {
  const { t, i18n } = useTranslation("mms");
  const pageCan = usePagePermission();
  const can = permission ?? pageCan;
  const [full, setFull] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  const load = useCallback(async () => {
    try {
      setFull(rowsOf(await storesApi.get({ id: store.id }))[0] ?? store);
    } catch (error) {
      notifications.error(error.message);
      close.current();
    }
  }, [store]);
  useEffect(() => {
    load();
  }, [load]);

  const s = full ?? store;
  const decide = async (kind, narration) => {
    setBusy(true);
    try {
      const response = await storesApi[kind]({ id: s.id, narration });
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      await load();
      onChanged();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  const buttons = (OFFERED[s.status] ?? []).map((kind) => can(DECISIONS[kind].action) && { key: kind, label: t(`store_${kind}`), icon: DECISIONS[kind].icon, variant: DECISIONS[kind].variant, run: () => setDialog(kind) });
  const hasMap = s.latitude != null && s.longitude != null;
  const rows = [
    ["merchant", s.merchant?.name],
    ["address", s.address],
    ["province", s.province],
    ["phone", s.phone_number],
    ["whatsapp", s.whatsapp_number],
    ["openingHours", hoursText(s.opening_hours, i18n.language)],
    ["added", mmsDate(s.created_at)],
    ["decided", s.decided_at ? `${mmsDate(s.decided_at)}${s.decision_note ? ` · ${s.decision_note}` : ""}` : null],
  ];

  return (
    <Modal open onClose={onClose} size="xl" title={`${s.name} (${s.code})`}>
      {!full && (
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner size={12} /> {t("loading")}
        </div>
      )}
      <div className="grid gap-4 [&>*]:min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <MmsStatus value={s.status} />
          <ActionButtons busy={busy} buttons={buttons} />
        </div>
        <dl className="grid gap-3 sm:grid-cols-2">
          {rows.map(([key, value]) => (
            <div key={key} className="rounded-xl border border-border bg-card p-3">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t(key)}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-foreground">{value || "—"}</dd>
            </div>
          ))}
        </dl>
        {hasMap && <StoreMap latitude={Number(s.latitude)} longitude={Number(s.longitude)} />}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("storeUsers")}</p>
          <MiniTable
            rows={full?.users}
            empty={t("noStoreUsers")}
            columns={[
              { key: "name", label: t("name") },
              { key: "role", label: t("role"), render: (u) => t(`storeRole_${u.role}`, { defaultValue: u.role }) },
              { key: "phone_number", label: t("phone") },
              { key: "status", label: t("status"), render: (u) => <MmsStatus value={u.status} /> },
              { key: "refund_limit", label: t("refundLimit"), render: (u) => u.refund_limit ?? "—" },
              ...POS_USER_COLUMNS(t),
              { key: "last_sign_in_at", label: t("lastSignIn"), render: (u) => mmsDate(u.last_sign_in_at) },
            ]}
          />
        </div>
        {s.merchant && <StoreWalletsCard merchant={s.merchant} permission={can} />}
        {s.merchant && <TerminalUsersCard merchant={s.merchant} />}
      </div>
      {dialog && (
        <NarrationDialog
          title={t(`store_${dialog}Title`, { name: s.name })}
          confirmLabel={t(`store_${dialog}`)}
          variant={DECISIONS[dialog].variant === "danger" ? "danger" : "primary"}
          required={DECISIONS[dialog].required}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(narration) => decide(dialog, narration)}
        />
      )}
    </Modal>
  );
}

// The store's location on an OpenStreetMap tile, with a link to the full map.
function StoreMap({ latitude, longitude }) {
  const { t } = useTranslation("mms");
  const d = 0.004;
  const bbox = [longitude - d, latitude - d, longitude + d, latitude + d].join(",");
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <iframe
        title={t("location")}
        className="h-56 w-full"
        loading="lazy"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`}
      />
      <a
        className="block px-3 py-1.5 text-[11px] font-semibold text-primary hover:underline"
        href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`}
        target="_blank"
        rel="noreferrer"
      >
        {t("openMap")} · {latitude.toFixed(5)}, {longitude.toFixed(5)}
      </a>
    </div>
  );
}

// A store user's terminal fields: operator ID, profile and shift (with
// "Inactive" when switched off), and whether a manager manages cashiers.
const POS_USER_COLUMNS = (t) => [
  { key: "operator_id", label: t("operatorId"), render: (u) => (u.operator_id ? <span className="font-mono">{u.operator_id}</span> : "—") },
  { key: "pos_profile", label: t("posProfile"), render: (u) => <PosRef item={u.pos_profile} /> },
  { key: "pos_shift", label: t("posShift"), render: (u) => <PosRef item={u.pos_shift} /> },
  { key: "can_manage_cashiers", label: t("managesCashiers"), render: (u) => (u.role === "STORE_MANAGER" ? t(u.can_manage_cashiers ? "common:yes" : "common:no") : "—") },
];

function PosInactive() {
  const { t } = useTranslation("mms");
  return <span className="whitespace-nowrap rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">{t("posInactive")}</span>;
}

function PosRef({ item }) {
  if (!item) return "—";
  return (
    <span>
      {item.name}
      {item.status !== "ACTIVE" && (
        <>
          {" "}
          <PosInactive />
        </>
      )}
    </span>
  );
}

// "Mon–Fri 20:00–04:00 (next day)": a window past midnight says so.
const windowsText = (windows, locale, nextDay) => hoursText((windows ?? []).map((w) => (w.closes < w.opens ? { ...w, closes: `${w.closes} ${nextDay}` } : w)), locale);
// "5,000.00 each · 2,000.00 a day · 50 a day" for one allowed transaction.
const limitsOf = (t, row) =>
  [
    row.max_amount != null && t("posMaxEach", { amount: row.max_amount }),
    row.daily_amount != null && t("posDailyAmount", { amount: row.daily_amount }),
    row.daily_count != null && t("posDailyCount", { count: row.daily_count }),
  ]
    .filter(Boolean)
    .join(" · ") || t("posNoLimit");

// A merchant's terminal users (read only): its idle timeout, terminal
// profiles (what a user may do on a terminal), shifts (when) and users.
function TerminalUsersCard({ merchant }) {
  const { t, i18n } = useTranslation(["mms", "common"]);
  const [data, setData] = useState(null);

  useEffect(() => {
    storesApi
      .posUsers({ merchant: partyRef(merchant) })
      .then((r) => setData(rowsOf(r)[0] ?? {}))
      .catch((error) => {
        setData({});
        notifications.error(error.message);
      });
  }, [merchant]);

  const minutes = (seconds) => (seconds == null ? null : Math.round(seconds / 60));
  const settings = data?.settings;
  const limit = (value, currency) => (value == null ? t("posNoLimit") : `${value} ${currency ?? ""}`.trim());
  return (
    <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 [&>*]:min-w-0">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("terminalUsers")}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {!data
            ? t("loading")
            : settings
              ? t(settings.idle_seconds == null ? "posIdleBank" : "posIdleOwn", { minutes: minutes(settings.effective_idle_seconds), bank: minutes(settings.institution_idle_seconds) })
              : "—"}
        </p>
      </div>
      {data && (
        <>
          <div>
            <p className="mb-1 text-xs font-bold text-foreground">{t("posProfiles")}</p>
            <MiniTable
              rows={data.profiles}
              empty={t("noPosProfiles")}
              columns={[
                { key: "name", label: t("name") },
                { key: "status", label: t("status"), render: (p) => (p.status === "ACTIVE" ? <MmsStatus value="ACTIVE" /> : <PosInactive />) },
                { key: "daily", label: t("posDailyTotals"), render: (p) => t("posTotals", { out: limit(p.daily_debit_limit, p.currency_code), in: limit(p.daily_credit_limit, p.currency_code) }) },
                {
                  key: "transactions",
                  label: t("posTransactions"),
                  render: (p) =>
                    p.transactions?.length ? (
                      <ul className="grid gap-0.5">
                        {p.transactions.map((row) => (
                          <li key={row.txn_type}>
                            <span className="font-semibold">{t(`posTxn_${row.txn_type}`, { defaultValue: row.txn_type })}</span> · {limitsOf(t, row)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "—"
                    ),
                },
                { key: "manager_assignable", label: t("posAssignable"), render: (p) => t(p.manager_assignable ? "common:yes" : "common:no") },
                { key: "user_count", label: t("posUserCount"), align: "right" },
              ]}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-bold text-foreground">{t("posShifts")}</p>
            <MiniTable
              rows={data.shifts}
              empty={t("noPosShifts")}
              columns={[
                { key: "name", label: t("name") },
                { key: "status", label: t("status"), render: (sh) => (sh.status === "ACTIVE" ? <MmsStatus value="ACTIVE" /> : <PosInactive />) },
                { key: "windows", label: t("posHours"), render: (sh) => windowsText(sh.windows, i18n.language, t("posNextDay")) ?? "—" },
                { key: "open_now", label: t("posOpenNow"), render: (sh) => t(sh.open_now ? "common:yes" : "common:no") },
                { key: "user_count", label: t("posUserCount"), align: "right" },
              ]}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-bold text-foreground">{t("storeUsers")}</p>
            <MiniTable
              rows={data.users}
              empty={t("noStoreUsers")}
              columns={[
                { key: "name", label: t("name") },
                { key: "role", label: t("role"), render: (u) => t(`storeRole_${u.role}`, { defaultValue: u.role }) },
                { key: "stores", label: t("store"), render: (u) => (u.stores ?? []).map((st) => st.name).join(", ") || "—" },
                { key: "status", label: t("status"), render: (u) => <MmsStatus value={u.status} /> },
                ...POS_USER_COLUMNS(t),
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
}

const WALLET_SETTINGS = ["", "SHARED", "PER_STORE"];

// A merchant's own store wallet setting ("" = the institution's), the
// setting in effect, and its store wallets.
function StoreWalletsCard({ merchant, permission }) {
  const { t } = useTranslation("mms");
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(rowsOf(await storesApi.wallets({ merchant: partyRef(merchant) }))[0] ?? null);
    } catch (error) {
      notifications.error(error.message);
    }
  }, [merchant]);
  useEffect(() => {
    load();
  }, [load]);

  const set = async (store_wallets) => {
    setBusy(true);
    try {
      const response = await storesApi.setWallets({ merchant: partyRef(merchant), store_wallets });
      if (response?.message) notifications.success(response.message);
      await load();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("storeWallets")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{data ? t("storeWalletsEffective", { value: t(`storeWallets_${data.effective}`) }) : t("loading")}</p>
        </div>
        <FilterSelect
          className="w-64"
          disabled={!data || busy || !permission("Edit")}
          value={data?.store_wallets ?? ""}
          onChange={(v) => void set(v)}
          options={WALLET_SETTINGS.map((v) => ({ value: v, label: t(`storeWallets_${v || "INHERIT"}`) }))}
        />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{t("storeWalletsHint")}</p>
      {data?.wallets?.length > 0 && (
        <div className="mt-3">
          <MiniTable
            rows={data.wallets}
            rowKey={(w) => w.acct_num}
            columns={[
              { key: "store_id", label: t("store"), render: (w) => (w.store_name ? `${w.store_name} (${w.store_code})` : `#${w.store_id}`) },
              { key: "acct_num", label: t("wallet"), render: (w) => <span className="font-mono">{w.acct_num}</span> },
              { key: "avail_bal", label: t("balance"), align: "right", render: (w) => `${w.avail_bal} ${w.currency_code}` },
            ]}
          />
        </div>
      )}
    </div>
  );
}

// A merchant's stores and store wallets, for its page (MMS › Agents), with
// the Stores menu's permissions; nothing when that menu isn't granted.
export function MerchantStores({ merchant }) {
  const can = useMenuPermission("Stores");
  const { t } = useTranslation("mms");
  if (!can("View")) return <p className="py-4 text-center text-sm text-muted-foreground">{t("noStoresAccess")}</p>;
  return (
    <div className="grid gap-4 [&>*]:min-w-0">
      <StoreWalletsCard merchant={merchant} permission={can} />
      <TerminalUsersCard merchant={merchant} />
      <StoreList merchant={merchant} permission={can} />
    </div>
  );
}
