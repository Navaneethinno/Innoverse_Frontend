import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Ban, CheckCircle2, PlusCircle, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { DateInput } from "@/Components/Common/DateInput";
import { Modal } from "@/Components/Common/Modal";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { usePagePermission } from "@/Hooks/usePermission";
import { request } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { amountInput, inputClass, labelClass } from "../Deposits/depositShared";
import { accountDate, money } from "./accountShared";

// Accounts › Overdrafts: an overdraft lets one account go below zero up to a
// limit; interest accrues daily on the negative balance and is charged on the
// 1st of each month. Requested, then approved by another user (Self at once).
// Buttons follow each row's `actions` (auth, deauth, cancel, close).
const BASE = "/config/account/overdraft";
export const overdraftApi = Object.fromEntries(["list", "get", "add", "auth", "deauth", "cancel", "close"].map((v) => [v, (body) => request(`${BASE}/${v}`, body)]));

const TABS = ["", "PENDING", "ACTIVE", "CLOSED"];
// The list answers the overdrafts as `data` with the usual pagination block.
const pageOf = (r) => {
  const items = Array.isArray(r?.data) ? r.data : (r?.data?.items ?? []);
  return { items, total: r?.pagination?.totalRecords ?? r?.data?.total ?? items.length };
};

export function Overdrafts() {
  const { t } = useTranslation(["accounts", "common"]);
  const can = usePagePermission();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [adding, setAdding] = useState(false);
  const [deciding, setDeciding] = useState(null);
  const load = useCallback(() => {
    setData(null);
    overdraftApi
      .list({ ...(status ? { status } : {}), page, page_size: 25 })
      .then((r) => setData(pageOf(r)))
      .catch((e) => {
        notifications.error(e.message);
        setData({ items: [], total: 0 });
      });
  }, [status, page]);
  useEffect(() => load(), [load]);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {TABS.map((s) => (
            <button
              key={s || "all"}
              type="button"
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
              className={cn("rounded-full px-3 py-1 text-xs font-bold", status === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
            >
              {t(`od_${s || "ALL"}`)}
            </button>
          ))}
        </div>
        {can("Add") && (
          <Button size="sm" icon={PlusCircle} onClick={() => setAdding(true)}>
            {t("requestOverdraft")}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{t("overdraftsHint")}</p>
      <DataTable
        columns={[
          {
            key: "acct_num",
            label: t("account"),
            render: (o) => (
              <span className="text-xs">
                <b className="font-mono">{o.acct_num}</b>
                <span className="block text-[10px] text-muted-foreground">{o.owner_name}</span>
              </span>
            ),
          },
          { key: "limit_amount", label: t("odLimit"), render: (o) => <span className="whitespace-nowrap text-xs font-semibold tabular-nums">{money(o.limit_amount, o.currency_code)}</span> },
          { key: "annual_rate", label: t("odRate"), render: (o) => <span className="text-xs tabular-nums">{Number(o.annual_rate)}%</span> },
          { key: "used", label: t("odUsed"), render: (o) => <UsageBar od={o} /> },
          { key: "interest_accrued", label: t("odInterest"), render: (o) => <span className="whitespace-nowrap text-xs tabular-nums">{money(o.interest_accrued, o.currency_code)}</span> },
          { key: "expiry_date", label: t("odExpiry"), render: (o) => <span className="text-xs">{o.expiry_date ?? "—"}</span> },
          { key: "status", label: t("status"), render: (o) => <StatusBadge status={o.status} variant="subtle" /> },
          {
            key: "actions",
            label: t("common:actions"),
            sortable: false,
            render: (o) => <OverdraftButtons od={o} onAct={(verb) => setDeciding({ verb, od: o })} />,
          },
        ]}
        rows={data?.items ?? []}
        rowKey={(o) => o.id}
        isLoading={!data}
        title={t("overdrafts")}
        emptyTitle={t("noOverdrafts")}
        serverSorted
        serverPagination={{ page, totalPages: Math.max(1, Math.ceil((data?.total ?? 0) / 25)), totalRecords: data?.total ?? 0, onPageChange: setPage, limit: 25 }}
      />
      {adding && (
        <RequestOverdraft
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            load();
          }}
        />
      )}
      {deciding && (
        <DecideOverdraft
          {...deciding}
          onClose={() => setDeciding(null)}
          onDone={() => {
            setDeciding(null);
            load();
          }}
        />
      )}
    </div>
  );
}

// Used against the limit, as a bar; what is left (headroom) under it.
export function UsageBar({ od }) {
  const { t } = useTranslation("accounts");
  const used = Number(od.used || 0);
  const limit = Number(od.limit_amount || 0);
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <span className="block min-w-[8rem] text-[11px]">
      <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
        <span className={cn("block h-full rounded-full", pct >= 90 ? "bg-red-500" : "bg-primary")} style={{ width: `${pct}%` }} />
      </span>
      <span className="tabular-nums">
        {money(used, od.currency_code)} · {t("odHeadroom", { amount: money(od.headroom, od.currency_code) })}
      </span>
    </span>
  );
}

export function OverdraftButtons({ od, onAct }) {
  const { t } = useTranslation("accounts");
  const a = od.actions ?? {};
  return (
    <span className="flex flex-wrap justify-end gap-1">
      {a.auth && (
        <Button size="sm" icon={CheckCircle2} onClick={() => onAct("auth")}>
          {t("approve")}
        </Button>
      )}
      {a.deauth && (
        <Button size="sm" variant="danger" icon={XCircle} onClick={() => onAct("deauth")}>
          {t("reject")}
        </Button>
      )}
      {a.cancel && (
        <Button size="sm" variant="outline" icon={Ban} onClick={() => onAct("cancel")}>
          {t("cancelRequest")}
        </Button>
      )}
      {a.close && (
        <Button size="sm" variant="outline" icon={Ban} onClick={() => onAct("close")}>
          {t("closeOverdraft")}
        </Button>
      )}
    </span>
  );
}

// Approve, reject (with a note), cancel one's own request, or close an
// active overdraft (only once the account is back at zero; the interest
// accrued is charged then).
export function DecideOverdraft({ verb, od, onClose, onDone }) {
  const { t } = useTranslation(["accounts", "common"]);
  const [narration, setNarration] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const needsNote = verb === "deauth";
  const run = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await overdraftApi[verb]({ id: od.id, ...(verb === "auth" || verb === "deauth" ? { narration: narration.trim() } : {}) });
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
      title={t(`odVerb_${verb}`)}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common:cancel")}
          </Button>
          <Button variant={verb === "auth" ? "primary" : "danger"} loading={busy} disabled={needsNote && !narration.trim()} onClick={() => void run()}>
            {t(`odVerb_${verb}`)}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 text-sm">
        <p>{t(`odVerbHint_${verb}`, { acct: od.acct_num, limit: money(od.limit_amount, od.currency_code) })}</p>
        {(verb === "auth" || verb === "deauth") && (
          <label className={labelClass}>
            {t(needsNote ? "reasonRequired" : "noteOptional")}
            <textarea className={cn(inputClass, "mt-1.5 min-h-16")} value={narration} onChange={(e) => setNarration(e.target.value)} />
          </label>
        )}
        {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
      </div>
    </Modal>
  );
}

export function RequestOverdraft({ acctNum, onClose, onDone }) {
  const { t } = useTranslation(["accounts", "common"]);
  const [form, setForm] = useState({ acct_num: acctNum ?? "", limit_amount: "", annual_rate: "", expiry_date: "", reason: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (key) => (v) => setForm((f) => ({ ...f, [key]: v }));
  const ready = form.acct_num.trim() && Number(form.limit_amount) > 0 && form.annual_rate !== "" && form.reason.trim();
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await overdraftApi.add({ ...form, acct_num: form.acct_num.trim(), reason: form.reason.trim(), ...(form.expiry_date ? {} : { expiry_date: null }) });
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
      title={t("requestOverdraft")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common:cancel")}
          </Button>
          <Button loading={busy} disabled={!ready} onClick={() => void save()}>
            {t("requestOverdraft")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <p className="text-xs text-muted-foreground">{t("requestOverdraftHint")}</p>
        <label className={labelClass}>
          {t("account")}
          <input className={cn(inputClass, "mt-1.5 font-mono")} disabled={Boolean(acctNum)} value={form.acct_num} onChange={(e) => set("acct_num")(e.target.value.replace(/\s/g, ""))} />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={labelClass}>
            {t("odLimit")}
            <input className={cn(inputClass, "mt-1.5 tabular-nums")} inputMode="decimal" value={form.limit_amount} onChange={(e) => set("limit_amount")(amountInput(e.target.value, 2))} />
          </label>
          <label className={labelClass}>
            {t("odRate")}
            <input className={cn(inputClass, "mt-1.5 tabular-nums")} inputMode="decimal" value={form.annual_rate} onChange={(e) => set("annual_rate")(amountInput(e.target.value, 4))} />
          </label>
          <label className={labelClass}>
            {t("odExpiryOptional")}
            <DateInput className={cn(inputClass, "mt-1.5")} value={form.expiry_date} onChange={(e) => set("expiry_date")(e.target.value)} />
          </label>
        </div>
        <label className={labelClass}>
          {t("reason")}
          <input className={cn(inputClass, "mt-1.5")} maxLength={255} value={form.reason} onChange={(e) => set("reason")(e.target.value)} />
        </label>
        {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
      </div>
    </Modal>
  );
}

// The account detail's Overdraft card: limit, rate, expiry, used against
// available, interest this month and so far; Request or Close.
export function OverdraftCard({ account }) {
  const { t } = useTranslation(["accounts", "common"]);
  const can = usePagePermission();
  const [od, setOd] = useState(undefined);
  const [adding, setAdding] = useState(false);
  const [deciding, setDeciding] = useState(null);
  const load = useCallback(() => {
    overdraftApi
      .list({ acct_num: account.acct_num, page: 1, page_size: 5 })
      .then((r) => {
        const { items } = pageOf(r);
        setOd(items.find((o) => o.status === "ACTIVE") ?? items.find((o) => o.status === "PENDING") ?? null);
      })
      .catch(() => setOd(null));
  }, [account.acct_num]);
  useEffect(() => load(), [load]);
  if (od === undefined) return null;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-black">{t("overdraft")}</p>
        {od ? <OverdraftButtons od={od} onAct={(verb) => setDeciding({ verb, od })} /> : can("Add") && (
          <Button size="sm" variant="outline" icon={PlusCircle} onClick={() => setAdding(true)}>
            {t("requestOverdraft")}
          </Button>
        )}
      </div>
      {od ? (
        <div className="grid gap-2 text-xs sm:grid-cols-4">
          <span>
            {t("odLimit")} <b className="block">{money(od.limit_amount, od.currency_code)}</b>
          </span>
          <span>
            {t("odRate")} <b className="block">{Number(od.annual_rate)}%</b>
          </span>
          <span>
            {t("odExpiry")} <b className="block">{od.expiry_date ?? "—"}</b>
          </span>
          <span>
            {t("status")} <StatusBadge status={od.status} variant="subtle" />
          </span>
          <span className="sm:col-span-2">
            <UsageBar od={od} />
          </span>
          <span>
            {t("odInterest")} <b className="block">{money(od.interest_accrued, od.currency_code)}</b>
            {od.accrued_to && <span className="text-muted-foreground">{t("odAccruedTo", { date: accountDate(od.accrued_to) })}</span>}
          </span>
          <span>
            {t("odCharged")} <b className="block">{money(od.interest_charged, od.currency_code)}</b>
          </span>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("noOverdraftHere")}</p>
      )}
      {adding && (
        <RequestOverdraft
          acctNum={account.acct_num}
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            load();
          }}
        />
      )}
      {deciding && (
        <DecideOverdraft
          {...deciding}
          onClose={() => setDeciding(null)}
          onDone={() => {
            setDeciding(null);
            load();
          }}
        />
      )}
    </div>
  );
}
