import { useListSearch } from "@/Hooks/useListSearch";
import { SearchBox } from "@/Components/Common/SearchBox";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Power, RotateCcw, Store, XCircle } from "lucide-react";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { Spinner } from "@/Components/Common/Spinner";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { useMenuPermission, usePagePermission } from "@/Hooks/usePermission";
import { storesApi } from "@/Services/Merchant/mms.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { ActionButtons, NarrationDialog } from "../../TermDeposits/depositShared";
import { MiniTable, Tabs } from "../../Loans/loanShared";
import { MmsStatus, mmsDate, pageOf, partyRef } from "../mmsShared";

const STATUSES = ["PENDING", "ACTIVE", "REJECTED", "INACTIVE"];

// MMS › Stores (menu 208): merchants add stores in their portal; the bank
// approves each new one before it trades, and can close or reopen it.
export function Stores() {
  const { t } = useTranslation("mms");
  const [tab, setTab] = useState("pending");
  return (
    <div className="pb-8 pt-4">
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
          <Store size={22} className="text-primary" /> {t("storesTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("storesSubtitle")}</p>
      </div>
      <Tabs tabs={[{ key: "pending" }, { key: "all" }]} value={tab} onChange={setTab} labelOf={(k) => t(`storesTab_${k}`)} />
      <StoreList key={tab} pendingOnly={tab === "pending"} />
    </div>
  );
}

// The stores list; `merchant` limits it to one merchant's (its page).
export function StoreList({ pendingOnly = false, merchant = null, permission }) {
  const { t } = useTranslation(["mms", "common"]);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [result, setResult] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState(null);
  // Store code or name, merchant.
  const { body: searchBody, latest: latestList, bind: searchBind } = useListSearch(() => setPage(1));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filter = pendingOnly ? { status: "PENDING" } : status ? { status } : {};
      setResult(pageOf(await latestList(storesApi.list({ ...filter, ...(merchant ? { merchant: partyRef(merchant) } : {}), ...searchBody, page, limit }))));
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [pendingOnly, status, merchant, searchBody, latestList, page, limit]);
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel(storesApi.listPath, () => void load());

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
      <div className="mb-4 flex flex-wrap gap-3 rounded-2xl border border-border bg-card p-4">
        <SearchBox {...searchBind} className="min-w-[14rem] flex-1" placeholder={t("searchStores")} />
        {!pendingOnly && (
          <FilterSelect
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={[{ value: "", label: t("allStatuses") }, ...STATUSES.map((s) => ({ value: s, label: t(`status_${s}`) }))]}
          />
        )}
      </div>
      <DataTable
        columns={columns}
        rows={result.items}
        rowKey={(r) => r.id}
        isLoading={loading}
        title={t("storesTitle")}
        emptyTitle={pendingOnly ? t("noPendingStores") : t("noStores")}
        serverSorted
        serverPagination={{
          page,
          totalPages: Math.max(1, Math.ceil(result.total / limit)),
          totalRecords: result.total,
          onPageChange: setPage,
          limit,
          onLimitChange: (n) => {
            setLimit(Math.min(n, 100));
            setPage(1);
          },
        }}
      />
      {viewing && <StoreDetail store={viewing} permission={permission} onClose={() => setViewing(null)} onChanged={load} />}
    </>
  );
}

const DECISIONS = {
  approve: { icon: CheckCircle2, variant: "primary", action: "Authorise" },
  reject: { icon: XCircle, variant: "danger", action: "Authorise", required: true },
  deactivate: { icon: Power, variant: "danger", action: "Change Status" },
  reactivate: { icon: RotateCcw, variant: "secondary", action: "Change Status" },
};
const OFFERED = { PENDING: ["approve", "reject"], ACTIVE: ["deactivate"], INACTIVE: ["reactivate"] };

function StoreDetail({ store, permission, onClose, onChanged }) {
  const { t } = useTranslation("mms");
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
    void load();
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
      <div className="grid gap-4">
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
              { key: "last_sign_in_at", label: t("lastSignIn"), render: (u) => mmsDate(u.last_sign_in_at) },
            ]}
          />
        </div>
        {s.merchant && <StoreWalletsCard merchant={s.merchant} permission={can} />}
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

const WALLET_SETTINGS = ["", "SHARED", "PER_STORE"];

// A merchant's own store wallet setting ("" = the institution's), the
// setting in effect, and its store wallets.
export function StoreWalletsCard({ merchant, permission }) {
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
    void load();
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
    <div className="grid gap-4">
      <StoreWalletsCard merchant={merchant} permission={can} />
      <StoreList merchant={merchant} permission={can} />
    </div>
  );
}
