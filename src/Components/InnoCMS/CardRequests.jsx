import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Inbox, Plus, RefreshCw, Truck, XCircle } from "lucide-react";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { Spinner } from "@/Components/Common/Spinner";
import { accountDate, money } from "@/Components/Finance/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { cardOrdersApi, cardRequestsApi, cardStockApi, cardsApi, idempotencyKey } from "@/Services/Cards/cards.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { ActionButtons, Facts, NarrationDialog, Problems, inputClass } from "../Finance/Deposits/depositShared";
import { CardPill, DeliveryFields, HolderPicker, Labelled, PagedTable, ProductCardPreview, WithCard, cardWord, filterBody, usePagedFilters } from "./cardOpsShared";

const STATUSES = ["SUBMITTED", "IN_PRODUCTION", "FULFILLED", "REJECTED", "CANCELLED"];
const TYPES = ["NEW", "VIRTUAL_TO_PHYSICAL", "REISSUE", "REPLACE_DAMAGED", "RENEW"];
const allows = (product, key, value) => String(product?.[key] ?? "").split(",").includes(value);

// CARDS > Card Requests (menu 199): requests for physical cards. Ask for a
// personalised card for a customer (its fee is charged now), reject one not
// yet ordered (the fee is refunded), deliver one back from the bureau.
export function CardRequests() {
  const { t } = useTranslation(["cards", "common"]);
  const can = usePagePermission();
  const list = usePagedFilters({ search: "", request_status: "", request_type: "", card_product_id: "" });
  const { applied, page, limit } = list;
  const [options, setOptions] = useState({});
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    cardsApi
      .options({})
      .then((r) => setOptions(rowsOf(r)[0] ?? {}))
      .catch((e) => notifications.error(e.message));
  }, []);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const row = rowsOf(await cardRequestsApi.list({ page, page_size: limit, ...filterBody(applied, ["card_product_id"]) }))[0];
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
  useLiveChannel(cardRequestsApi.listPath, () => void load({ silent: true }));

  const columns = [
    {
      key: "request_ref",
      label: t("request"),
      align: "left",
      render: (r) => (
        <button type="button" onClick={() => setOpenId(r.id)} className="text-start">
          <p className="font-mono text-xs font-bold text-primary hover:underline">{r.request_ref}</p>
          <p className="text-[10px] text-muted-foreground">{cardWord(t, "rtype", r.request_type)}</p>
        </button>
      ),
    },
    { key: "holder_name", label: t("holder"), render: (r) => <span className="text-xs font-semibold">{r.holder_name}<span className="block text-[10px] font-normal text-muted-foreground">{r.name_on_card}</span></span> },
    { key: "product_code", label: t("product"), render: (r) => <span className="text-xs">{r.product_code}</span> },
    { key: "delivery_mode", label: t("deliveryMode"), render: (r) => <span className="text-xs">{cardWord(t, "opt", r.delivery_mode)}</span> },
    { key: "request_status", label: t("status"), render: (r) => <span className="inline-flex flex-wrap items-center gap-1"><CardPill prefix="req" code={r.request_status} />{r.ready_to_deliver && <CardPill prefix="req" code="READY" />}</span> },
    { key: "channel", label: t("channel"), render: (r) => <span className="text-xs">{r.channel}</span> },
    { key: "created_time", label: t("requestedAt"), render: (r) => <span className="whitespace-nowrap text-xs">{accountDate(r.created_time)}</span> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setOpenId(r.id)} /> },
  ];

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <Inbox size={22} className="text-primary" /> {t("requestsTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("requestsSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>
            {t("refresh")}
          </Button>
          {can("Add") && (
            <Button size="sm" icon={Plus} onClick={() => setAdding(true)}>
              {t("newRequest")}
            </Button>
          )}
        </div>
      </div>

      <PagedTable
        {...list}
        searchPlaceholder={t("searchRequests")}
        filterFields={
          <>
            <FilterSelect value={list.filters.request_status} onChange={list.set("request_status")} options={[{ value: "", label: t("anyStatus") }, ...STATUSES.map((s) => ({ value: s, label: cardWord(t, "req", s) }))]} />
            <FilterSelect value={list.filters.request_type} onChange={list.set("request_type")} options={[{ value: "", label: t("anyType") }, ...TYPES.map((s) => ({ value: s, label: cardWord(t, "rtype", s) }))]} />
            <FilterSelect value={list.filters.card_product_id} onChange={list.set("card_product_id")} options={[{ value: "", label: t("anyProduct") }, ...(options.card_products ?? []).map((p) => ({ value: String(p.id), label: `${p.product_code} · ${p.product_name}` }))]} />
          </>
        }
        columns={columns} rows={data.items} total={data.total} loading={loading} title={t("requestsTitle")} emptyTitle={t("noRequests")} emptyDescription={t("noRequestsHint")} />

      {openId && <RequestDialog id={openId} onClose={() => setOpenId(null)} onChanged={() => void load({ silent: true })} />}
      {adding && (
        <NewCardRequest
          options={options}
          onClose={() => setAdding(false)}
          onDone={(request) => {
            setAdding(false);
            void load();
            if (request?.id) setOpenId(request.id);
          }}
        />
      )}
    </div>
  );
}

// One request: what it is, its fee, and Reject / Deliver when allowed.
function RequestDialog({ id, onClose, onChanged }) {
  const { t } = useTranslation("cards");
  const can = usePagePermission();
  const [request, setRequest] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      setRequest(rowsOf(await cardRequestsApi.get({ id }))[0] ?? null);
    } catch (error) {
      notifications.error(error.message);
    }
  }, [id]);
  useEffect(() => {
    void reload();
  }, [reload]);

  const act = async (call) => {
    setBusy(true);
    try {
      const response = await call();
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      await reload();
      onChanged();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const r = request;
  const buttons = r
    ? [
        r.actions?.accept && can("Authorize") && { key: "accept", label: t("accept"), icon: CheckCircle2, variant: "primary", run: () => setDialog("accept") },
        r.actions?.reject && can("Authorize") && { key: "reject", label: t("reject"), icon: XCircle, variant: "danger", run: () => setDialog("reject") },
        r.actions?.deliver && can("Edit") && { key: "deliver", label: t("deliver"), icon: Truck, variant: "primary", run: () => setDialog("deliver") },
      ]
    : [];

  return (
    <Modal open onClose={onClose} size="lg" title={r ? `${r.request_ref} · ${cardWord(t, "rtype", r.request_type)}` : t("request")} footer={buttons.some(Boolean) && <ActionButtons buttons={buttons} busy={busy} />}>
      {!r ? (
        <Spinner size={18} />
      ) : (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardPill prefix="req" code={r.request_status} />
            {r.ready_to_deliver && <CardPill prefix="req" code="READY" />}
          </div>
          <Facts
            className="sm:grid-cols-3 lg:grid-cols-3"
            rows={[
              [t("holder"), r.holder_name],
              [t("nameOnCard"), r.name_on_card || "—"],
              [t("product"), `${r.product_code} · ${r.card_product_name}`],
              [t("deliveryMode"), cardWord(t, "opt", r.delivery_mode)],
              [t("deliveryRef"), r.delivery_ref || "—"],
              [t("channel"), r.channel],
              [t("fee"), r.fee_rrn ? `${money(r.fee_amount)} · ${r.fee_rrn}` : t("noFee")],
              r.fee_refund_rrn && [t("feeRefund"), r.fee_refund_rrn],
              r.card_order_id > 0 && [t("order"), `#${r.card_order_id}`],
              r.card_instance_id > 0 && [t("cardMade"), `#${r.card_instance_id}`],
              r.reference_card_id > 0 && [t("virtualCard"), `#${r.reference_card_id}`],
              [t("requestedAt"), `${accountDate(r.created_time)} · ${r.created_by ?? "—"}`],
            ]}
          />
        </div>
      )}
      {dialog === "accept" && <AcceptRequest request={r} busy={busy} onClose={() => setDialog(null)} onSave={(body) => act(() => cardRequestsApi.accept({ id, ...body }))} />}
      {dialog === "reject" && <NarrationDialog title={t("rejectRequest")} hint={t("rejectRequestHint")} label={t("reason")} confirmLabel={t("reject")} variant="danger" required busy={busy} onClose={() => setDialog(null)} onSave={(reason) => act(() => cardRequestsApi.reject({ id, reason }))} />}
      {dialog === "deliver" && <NarrationDialog title={t("deliverTitle")} hint={t("deliverHint")} confirmLabel={t("deliver")} busy={busy} onClose={() => setDialog(null)} onSave={(narration) => act(() => cardRequestsApi.deliver({ id, ...(narration ? { narration } : {}) }))} />}
    </Modal>
  );
}

// Accept a customer's new-card request: give an instant card from stock now
// (no second fee), or put it in a new order of a personalised group of the
// request's product (waits for a checker).
function AcceptRequest({ request, busy, onClose, onSave }) {
  const { t } = useTranslation("cards");
  const [mode, setMode] = useState("INSTANT");
  const [search, setSearch] = useState("");
  const [stock, setStock] = useState(null);
  const [inventoryId, setInventoryId] = useState("");
  const [groups, setGroups] = useState(null);
  const [groupId, setGroupId] = useState("");
  const [name, setName] = useState(request.name_on_card ?? "");

  useEffect(() => {
    if (mode !== "INSTANT") return undefined;
    let current = true;
    const timer = setTimeout(() => {
      cardStockApi
        .list({ card_product_id: request.card_product_id, inventory_status: "AVAILABLE", page: 1, page_size: 20, ...(search.trim() ? { search: search.trim() } : {}) })
        .then((r) => current && setStock(rowsOf(r)[0]?.items ?? []))
        .catch((e) => current && (setStock([]), notifications.error(e.message)));
    }, 300);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [mode, search, request.card_product_id]);

  useEffect(() => {
    if (mode !== "PERSONALIZED" || groups) return;
    cardOrdersApi
      .options({})
      .then((r) => {
        const list = (rowsOf(r)[0]?.issuance_groups ?? []).filter((g) => g.perso_mode === "PERSONALIZED" && String(g.card_product_id) === String(request.card_product_id));
        setGroups(list);
        if (list[0]) setGroupId(String(list[0].id));
      })
      .catch((e) => (setGroups([]), notifications.error(e.message)));
  }, [mode, groups, request.card_product_id]);

  const ready = mode === "INSTANT" ? Boolean(inventoryId) : Boolean(groupId);
  const save = () =>
    onSave(mode === "INSTANT" ? { mode, inventory_id: Number(inventoryId) } : { mode, issuance_group_id: Number(groupId), ...(name.trim() ? { name_on_card: name.trim() } : {}) });

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={t("acceptRequest")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button icon={CheckCircle2} loading={busy} disabled={!ready} onClick={save}>
            {t("accept")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <SegmentedSwitch options={["INSTANT", "PERSONALIZED"].map((m) => ({ value: m, label: t(`acceptAs_${m}`) }))} value={mode} onChange={setMode} />
        <p className="text-xs text-muted-foreground">{t(`acceptHint_${mode}`)}</p>
        {mode === "INSTANT" ? (
          <>
            <input className={inputClass} placeholder={t("searchStockLast4")} value={search} onChange={(e) => setSearch(e.target.value)} />
            {stock === null ? (
              <Spinner size={16} />
            ) : stock.length ? (
              <div className="grid max-h-64 gap-1.5 overflow-y-auto">
                {stock.map((s) => (
                  <label key={s.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-xs transition-colors ${String(s.id) === inventoryId ? "border-primary bg-[var(--primary-light)]" : "border-border bg-card hover:border-primary/50"}`}>
                    <input type="radio" name="stock" checked={String(s.id) === inventoryId} onChange={() => setInventoryId(String(s.id))} className="accent-[var(--primary)]" />
                    <span className="min-w-0 flex-1">
                      <span className="font-mono font-bold">{s.pan_masked}</span> · {s.expiry}
                      <span className="block text-[10px] text-muted-foreground">{[s.card_serial_number, s.order_ref].filter(Boolean).join(" · ")}</span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noStockForProduct")}</p>
            )}
          </>
        ) : (
          <>
            <Labelled label={t("group")} hint={groups && !groups.length && t("noPersonalisedGroup")}>
              {groups === null ? <Spinner size={16} /> : <FilterSelect value={groupId} onChange={setGroupId} options={groups.map((g) => ({ value: String(g.id), label: `${g.code} · ${g.name}` }))} />}
            </Labelled>
            <Labelled label={t("nameOnCard")}>
              <input className={inputClass} maxLength={26} value={name} onChange={(e) => setName(e.target.value.toUpperCase())} />
            </Labelled>
          </>
        )}
      </div>
    </Modal>
  );
}

// A personalised physical card for a customer (request type NEW): the
// product, the holder, the name on the card and how it reaches them. The
// fee is charged from the holder's wallet now.
function NewCardRequest({ options, onClose, onDone }) {
  const { t } = useTranslation("cards");
  const products = (options.card_products ?? []).filter((p) => allows(p, "allowed_form_factors", "PHYSICAL") && allows(p, "allowed_perso_modes", "PERSONALIZED"));
  const [productId, setProductId] = useState(products[0] ? String(products[0].id) : "");
  const [holder, setHolder] = useState(null);
  const [name, setName] = useState("");
  const [delivery, setDelivery] = useState({ delivery_mode: "BRANCH_PICKUP", delivery_ref: "" });
  const [key] = useState(idempotencyKey);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const product = products.find((p) => String(p.id) === productId);

  const send = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await cardRequestsApi.add({
        request_type: "NEW",
        card_product_id: Number(productId),
        entity_type: holder.entity_type,
        entity_id: holder.entity_id,
        ...(name.trim() ? { name_on_card: name.trim() } : {}),
        delivery_mode: delivery.delivery_mode,
        ...(delivery.delivery_ref.trim() ? { delivery_ref: delivery.delivery_ref.trim() } : {}),
        idempotency_key: key,
      });
      notifications.success(response?.message ?? t("requestMade"));
      onDone(rowsOf(response)[0]);
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
      size="lg"
      title={t("newRequest")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button icon={CheckCircle2} loading={busy} disabled={!productId || !holder || (product?.emboss_name_required && !name.trim())} onClick={send}>
            {t("requestCard")}
          </Button>
        </>
      }
    >
      <WithCard card={<ProductCardPreview product={product} form="PHYSICAL" name={name} holder={holder} />}>
        <p className="text-sm text-muted-foreground">{t("newRequestHint")}</p>
        <Labelled label={t("product")} hint={!products.length && t("noPersonalisedProduct")}>
          <FilterSelect value={productId} onChange={setProductId} options={products.map((p) => ({ value: String(p.id), label: `${p.product_code} · ${p.product_name} · ${p.currency_code}` }))} />
        </Labelled>
        <Labelled label={t("holder")}>
          <HolderPicker value={holder} onChange={setHolder} />
        </Labelled>
        <Labelled label={t("nameOnCard")} hint={product?.emboss_name_required ? t("nameRequired") : t("nameDefaults")}>
          <input className={inputClass} maxLength={26} value={name} onChange={(e) => setName(e.target.value.toUpperCase())} />
        </Labelled>
        <DeliveryFields modes={options.delivery_modes} value={delivery} onChange={setDelivery} />
        <Problems message={error} />
      </WithCard>
    </Modal>
  );
}
