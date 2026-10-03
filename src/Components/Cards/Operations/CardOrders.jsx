import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Ban, CheckCircle2, FileDown, PackageCheck, Plus, RefreshCw, Search, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { Spinner } from "@/Components/Common/Spinner";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { Toggle } from "@/Components/Common/Toggle";
import { accountDate } from "@/Components/Epurse/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { cardOrdersApi, cardRequestsApi, cardsApi } from "@/Services/Cards/cards.api";
import { saveBlob } from "@/Services/api/fileTransfer";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cardsIntoEnvelope } from "@/Utils/Lib/flourish";
import { cn } from "@/Utils/Lib/utils";
import { ActionButtons, NarrationDialog, Problems, Section, inputClass } from "../../TermDeposits/depositShared";
import { MiniTable } from "../../Loans/loanShared";
import { CardNumber, CardPill, Labelled, PagedTable, cardWord, filterBody, usePagedFilters } from "./cardOpsShared";

const STATUSES = ["PENDING", "GENERATED", "PREFILED", "RECEIVED", "CANCELLED"];

// The emboss file holds full card numbers and CVVs: it goes straight from
// the reply to a file on the user's machine and is never kept, shown or
// logged here.
function saveEmbossFile(reply) {
  const bytes = Uint8Array.from(atob(reply.content_base64), (c) => c.charCodeAt(0));
  saveBlob(new Blob([bytes], { type: "text/csv" }), reply.file_name);
}

// CARDS > Card Orders (menu 200): orders to the card bureau. Instant
// orders take a quantity (blank stock), personalised ones take requests.
// Authorise (card numbers made), emboss (the file for the bureau), receive
// the plastics, and authorise the receipt.
export function CardOrders() {
  const { t } = useTranslation(["cards", "common"]);
  const can = usePagePermission();
  const list = usePagedFilters({ search: "", order_status: "", issuance_group_id: "", pending: false });
  const { applied, page, limit } = list;
  const [options, setOptions] = useState({});
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    cardOrdersApi
      .options({})
      .then((r) => setOptions(rowsOf(r)[0] ?? {}))
      .catch((e) => notifications.error(e.message));
  }, []);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const row = rowsOf(await cardOrdersApi.list({ page, page_size: limit, ...filterBody(applied, ["issuance_group_id"]) }))[0];
        setData({ items: row?.items ?? [], total: row?.total ?? 0 });
      } catch (error) {
        notifications.error(error.message);
      } finally {
        setLoading(false);
      }
    },
    [applied, page, limit],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel(cardOrdersApi.listPath, () => void load({ silent: true }));

  if (openId) {
    return (
      <OrderView
        id={openId}
        onBack={() => {
          setOpenId(null);
          void load();
        }}
      />
    );
  }

  const columns = [
    {
      key: "order_ref",
      label: t("order"),
      align: "left",
      render: (o) => (
        <button type="button" onClick={() => setOpenId(o.id)} className="text-left">
          <p className="font-mono text-xs font-bold text-primary hover:underline">{o.order_ref}</p>
          <p className="text-[10px] text-muted-foreground">{o.issuance_group_code} · {o.issuance_group_name}</p>
        </button>
      ),
    },
    { key: "product_code", label: t("product"), render: (o) => <span className="text-xs">{o.product_code}</span> },
    { key: "perso_mode", label: t("persoMode"), render: (o) => <span className="text-xs">{cardWord(t, "opt", o.perso_mode)}</span> },
    { key: "quantity", label: t("quantity"), render: (o) => <span className="text-xs font-bold tabular-nums">{o.quantity}</span> },
    { key: "order_status", label: t("status"), render: (o) => <span className="inline-flex flex-wrap gap-1"><CardPill prefix="ord" code={o.order_status} />{o.pending_batch_id > 0 && <CardPill prefix="ord" code="RECEIPT_WAITING" />}</span> },
    { key: "created_by", label: t("orderedBy"), render: (o) => <span className="text-xs">{o.created_by}</span> },
    { key: "created_time", label: t("orderedAt"), render: (o) => <span className="whitespace-nowrap text-xs">{accountDate(o.created_time)}</span> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (o) => <RowActions buttons={{ view: true }} onView={() => setOpenId(o.id)} /> },
  ];

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <PackageCheck size={22} className="text-primary" /> {t("ordersTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("ordersSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>
            {t("refresh")}
          </Button>
          {can("Add") && (
            <Button size="sm" icon={Plus} onClick={() => setAdding(true)}>
              {t("newOrder")}
            </Button>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          list.apply();
        }}
        className="mb-4 grid items-center gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto_auto]"
      >
        <input className={inputClass} placeholder={t("searchOrders")} value={list.filters.search} onChange={(e) => list.set("search")(e.target.value)} />
        <FilterSelect value={list.filters.order_status} onChange={list.set("order_status")} options={[{ value: "", label: t("anyStatus") }, ...STATUSES.map((s) => ({ value: s, label: cardWord(t, "ord", s) }))]} />
        <FilterSelect value={list.filters.issuance_group_id} onChange={list.set("issuance_group_id")} options={[{ value: "", label: t("anyGroup") }, ...(options.issuance_groups ?? []).map((g) => ({ value: String(g.id), label: `${g.code} · ${g.name}` }))]} />
        <Toggle showLabel label={t("waitingForChecker")} checked={list.filters.pending} onChange={list.set("pending")} />
        <Button type="submit" size="sm" icon={Search}>
          {t("search")}
        </Button>
      </form>

      <PagedTable {...list} columns={columns} rows={data.items} total={data.total} loading={loading} title={t("ordersTitle")} emptyTitle={t("noOrders")} emptyDescription={t("noOrdersHint")} />

      {adding && (
        <NewOrder
          groups={options.issuance_groups ?? []}
          onClose={() => setAdding(false)}
          onDone={(order) => {
            setAdding(false);
            if (order?.id) setOpenId(order.id);
            else void load();
          }}
        />
      )}
    </div>
  );
}

// A new order: an instant group takes a quantity, a personalised group the
// requests an order can take now.
function NewOrder({ groups, onClose, onDone }) {
  const { t } = useTranslation("cards");
  const [groupId, setGroupId] = useState(groups[0] ? String(groups[0].id) : "");
  const [quantity, setQuantity] = useState("");
  const [requests, setRequests] = useState(null);
  const [picked, setPicked] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const group = groups.find((g) => String(g.id) === groupId);
  const personalised = group?.perso_mode === "PERSONALIZED";
  const max = group?.max_quantity ?? 500;

  useEffect(() => {
    setPicked([]);
    setRequests(null);
    if (!personalised) return undefined;
    let cancelled = false;
    cardRequestsApi
      .list({ page: 1, page_size: 100, orderable: true, card_product_id: group.card_product_id })
      .then((r) => !cancelled && setRequests((rowsOf(r)[0]?.items ?? []).filter((x) => x.actions?.order)))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [personalised, group?.card_product_id]);

  const ready = group && (personalised ? picked.length > 0 : Number(quantity) >= 1 && Number(quantity) <= max);
  const send = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await cardOrdersApi.add({ issuance_group_id: group.id, ...(personalised ? { request_ids: picked } : { quantity: Number(quantity) }) });
      notifications.success(response?.message ?? t("orderFiled"));
      onDone(rowsOf(response)[0]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={t("newOrder")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button icon={CheckCircle2} loading={busy} disabled={!ready} onClick={send}>
            {t("fileOrder")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <Labelled label={t("group")} hint={group && t(personalised ? "orderPersoHint" : "orderInstantHint")}>
          <FilterSelect value={groupId} onChange={setGroupId} options={groups.map((g) => ({ value: String(g.id), label: `${g.code} · ${g.name} · ${cardWord(t, "opt", g.perso_mode)}` }))} />
        </Labelled>
        {group && !personalised && (
          <Labelled label={t("quantity")} hint={t("upToN", { count: max })}>
            <input className={inputClass} inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/\D/g, "").slice(0, 4))} />
          </Labelled>
        )}
        {personalised && (
          <div>
            <p className="mb-1.5 text-sm font-semibold text-slate-700">{t("requestsToOrder", { count: picked.length })}</p>
            {requests === null ? (
              <Spinner size={16} />
            ) : requests.length ? (
              <div className="grid max-h-72 gap-1.5 overflow-y-auto">
                {requests.map((r) => (
                  <label key={r.id} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-xs transition-colors", picked.includes(r.id) ? "border-primary bg-[var(--primary-light)]" : "border-border bg-card hover:border-primary/50")}>
                    <input type="checkbox" checked={picked.includes(r.id)} onChange={() => toggle(r.id)} className="accent-[var(--primary)]" />
                    <span className="min-w-0 flex-1">
                      <span className="font-bold">{r.holder_name}</span> · {r.name_on_card}
                      <span className="block text-[10px] text-muted-foreground">
                        {r.request_ref} · {cardWord(t, "rtype", r.request_type)} · {cardWord(t, "opt", r.delivery_mode)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noOrderableRequests")}</p>
            )}
          </div>
        )}
        <Problems message={error} />
      </div>
    </Modal>
  );
}

// One order: its state, the actions the server allows, emboss files,
// received batches and its cards.
function OrderView({ id, onBack }) {
  const { t } = useTranslation(["cards", "common"]);
  const can = usePagePermission();
  const [order, setOrder] = useState(null);
  const [cards, setCards] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const o = rowsOf(await cardOrdersApi.get({ id }))[0] ?? null;
      setOrder(o);
      setCards(o?.card_count ? (rowsOf(await cardsApi.list({ card_order_id: id, page: 1, page_size: 500 }))[0]?.items ?? []) : []);
    } catch (error) {
      notifications.error(error.message);
    }
  }, [id]);
  useEffect(() => {
    void reload();
  }, [reload]);
  useLiveChannel(cardOrdersApi.listPath, (_action, records) => (!records.length || records.some((r) => String(r.id) === String(id))) && void reload());

  const act = async (call, after) => {
    setBusy(true);
    try {
      const response = await call();
      after?.(response);
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      await reload();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!order) {
    return (
      <PageSkeleton />
    );
  }

  const a = order.actions ?? {};
  const ask = (key) => () => setDialog(key);
  const buttons = [
    a.cancel && can("Add") && { key: "cancel", label: t("withdrawOrder"), icon: Ban, run: ask("cancel") },
    a.deauth && can("Authorize") && { key: "deauth", label: t("reject"), icon: XCircle, variant: "danger", run: ask("deauth") },
    a.auth && can("Authorize") && { key: "auth", label: t("approve"), icon: CheckCircle2, variant: "primary", run: ask("auth") },
    a.emboss && can("Authorize") && { key: "emboss", label: t("emboss"), icon: FileDown, variant: "primary", run: ask("emboss") },
    a.receive && can("Add") && { key: "receive", label: t("receive"), icon: PackageCheck, variant: "primary", run: ask("receive") },
    a.receive_deauth && can("Authorize") && { key: "receive_deauth", label: t("rejectReceipt"), icon: XCircle, variant: "danger", run: ask("receive_deauth") },
    a.receive_auth && can("Authorize") && { key: "receive_auth", label: t("approveReceipt"), icon: CheckCircle2, variant: "primary", run: ask("receive_auth") },
  ];
  const narrated = {
    auth: [t("approveOrder"), t("approveOrderHint"), t("approve"), "primary", (n) => cardOrdersApi.auth({ id, ...n })],
    deauth: [t("rejectOrder"), t("rejectOrderHint"), t("reject"), "danger", (n) => cardOrdersApi.deauth({ id, ...n })],
    cancel: [t("withdrawOrder"), t("withdrawOrderHint"), t("withdrawOrder"), "danger", (n) => cardOrdersApi.cancel({ id, ...(n.narration ? { reason: n.narration } : {}) })],
    receive_auth: [t("approveReceipt"), t("approveReceiptHint"), t("approve"), "primary", (n) => cardOrdersApi.receive_auth({ id, ...n })],
    receive_deauth: [t("rejectReceipt"), t("rejectReceiptHint"), t("reject"), "danger", (n) => cardOrdersApi.receive_deauth({ id, ...n })],
  }[dialog];

  return (
    <div className="pb-8 pt-4">
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft size={15} /> {t("backToOrders")}
      </button>
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-xl font-black text-foreground">{order.order_ref}</h1>
              <CardPill prefix="ord" code={order.order_status} />
              {order.pending_batch_id > 0 && <CardPill prefix="ord" code="RECEIPT_WAITING" />}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{[`${order.issuance_group_code} · ${order.issuance_group_name}`, order.product_code, cardWord(t, "opt", order.perso_mode), t("cardsN", { count: Number(order.quantity) }), order.inst_profile_name].join(" · ")}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{t("orderedByAt", { name: order.created_by, date: accountDate(order.created_time) })}</p>
          </div>
          <ActionButtons buttons={buttons} busy={busy} />
        </div>
        {order.narration?.trim() && <p className="mt-2 text-xs italic">“{order.narration}”</p>}
      </div>

      <div className="mb-4 grid gap-4 2xl:grid-cols-2">
        <Section title={t("embossFiles")}>
          <MiniTable
            rows={order.emboss_jobs}
            rowKey={(j) => j.job_ref}
            empty={t("noEmbossFiles")}
            columns={[
              { key: "job_ref", label: t("job"), render: (j) => <span className="font-mono">{j.job_ref}</span> },
              { key: "card_count", label: t("cards"), align: "right" },
              { key: "emboss_status", label: t("status"), render: (j) => cardWord(t, "emb", j.emboss_status) },
              { key: "created_by", label: t("madeBy"), render: (j) => `${j.created_by} · ${accountDate(j.created_time)}` },
              { key: "sha256", label: "SHA-256", render: (j) => <span className="font-mono text-[10px]" title={j.sha256}>{String(j.sha256).slice(0, 12)}…</span> },
            ]}
          />
        </Section>
        <Section title={t("receipts")}>
          <MiniTable
            rows={order.batches}
            rowKey={(b) => b.batch_ref}
            empty={t("noReceipts")}
            columns={[
              { key: "batch_ref", label: t("batch"), render: (b) => <span className="font-mono">{b.batch_ref}</span> },
              { key: "quantity_received", label: t("received"), align: "right" },
              { key: "missing", label: t("missing"), align: "right", render: (b) => b.missing_card_ids?.length ?? 0 },
              { key: "batch_status", label: t("status"), render: (b) => cardWord(t, "batch", b.batch_status) },
              { key: "received_at", label: t("recordedBy"), render: (b) => `${b.created_by} · ${accountDate(b.received_at ?? b.created_time)}` },
            ]}
          />
        </Section>
      </div>

      <Section title={t("orderCards", { count: cards.length })}>
        <MiniTable
          rows={cards}
          empty={t("noCardsYet")}
          columns={[
            { key: "pan_masked", label: t("card"), render: (c) => <CardNumber card={c} /> },
            { key: "card_serial_number", label: t("serial"), render: (c) => <span className="font-mono">{c.card_serial_number || "—"}</span> },
            { key: "holder_name", label: t("holder"), render: (c) => c.holder_name || c.name_on_card || "—" },
            { key: "issuance_status", label: t("issuanceStatus"), render: (c) => <CardPill prefix="iss" code={c.issuance_status} /> },
            { key: "ops_status", label: t("opsStatus"), render: (c) => <CardPill prefix="ops" code={c.ops_status} /> },
          ]}
        />
      </Section>

      {narrated && <NarrationDialog title={narrated[0]} hint={narrated[1]} confirmLabel={narrated[2]} variant={narrated[3]} busy={busy} onClose={() => setDialog(null)} onSave={(narration) => act(() => narrated[4](narration ? { narration } : {}))} />}
      {dialog === "emboss" && (
        <Modal
          open
          onClose={() => setDialog(null)}
          size="sm"
          title={t("emboss")}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialog(null)}>
                {t("cancel")}
              </Button>
              <Button icon={FileDown} loading={busy} onClick={() => act(() => cardOrdersApi.emboss({ id }), (response) => {
                    saveEmbossFile(rowsOf(response)[0]);
                    cardsIntoEnvelope();
                  })}>
                {t("makeFile")}
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted-foreground">{t(order.emboss_jobs?.length ? "embossAgainHint" : "embossHintFile")}</p>
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">{t("embossSensitive")}</p>
        </Modal>
      )}
      {dialog === "receive" && <ReceiveDialog cards={cards.filter((c) => c.issuance_status !== "CANCELLED")} busy={busy} onClose={() => setDialog(null)} onSave={(missing, narration) => act(() => cardOrdersApi.receive({ id, missing_card_ids: missing, ...(narration ? { narration } : {}) }))} />}
    </div>
  );
}

// Record what came back from the bureau: tick the cards that did not.
function ReceiveDialog({ cards, busy, onClose, onSave }) {
  const { t } = useTranslation("cards");
  const [missing, setMissing] = useState([]);
  const [narration, setNarration] = useState("");
  const toggle = (id) => setMissing((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={t("receive")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button icon={PackageCheck} loading={busy} onClick={() => onSave(missing, narration.trim())}>
            {t("recordReceipt", { count: cards.length - missing.length })}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">{t("receiveHint")}</p>
        <div className="grid max-h-72 gap-1.5 overflow-y-auto">
          {cards.map((c) => (
            <label key={c.id} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-xs transition-colors", missing.includes(c.id) ? "border-red-200 bg-red-50" : "border-border bg-card hover:border-primary/50")}>
              <input type="checkbox" checked={missing.includes(c.id)} onChange={() => toggle(c.id)} className="accent-[var(--destructive)]" />
              <CardNumber card={c} />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{c.card_serial_number || c.name_on_card}</span>
              {missing.includes(c.id) && <span className="font-bold text-red-700">{t("missing")}</span>}
            </label>
          ))}
        </div>
        <Labelled label={t("narration")}>
          <input className={inputClass} value={narration} onChange={(e) => setNarration(e.target.value)} />
        </Labelled>
      </div>
    </Modal>
  );
}
