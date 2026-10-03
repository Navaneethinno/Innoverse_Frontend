import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDownToLine, ArrowLeft, Hourglass, ArrowUpFromLine, CreditCard, KeyRound, Plus, Power, RefreshCw, Repeat, Search, ShieldAlert, Truck } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { Spinner } from "@/Components/Common/Spinner";
import { accountDate, money } from "@/Components/Epurse/Accounts/accountShared";
import { useMenuPermission, usePagePermission } from "@/Hooks/usePermission";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { cardRequestsApi, cardsApi, idempotencyKey } from "@/Services/Cards/cards.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { NewRequest } from "@/Components/Transactions/NewRequest";
import { transactionRequestsApi } from "@/Services/Transactions/transactions.api";
import { notifications } from "@/Utils/Lib/notifications";
import { ActionButtons, Facts, NarrationDialog, Problems, Section, inputClass } from "../../TermDeposits/depositShared";
import { CardNumber, CardPill, DeliveryFields, HolderPicker, Labelled, PagedTable, cardWord, filterBody, usePagedFilters } from "./cardOpsShared";

const FORM_FACTORS = ["VIRTUAL", "PHYSICAL"];
const allows = (product, key, value) => String(product?.[key] ?? "").split(",").includes(value);

// CARDS > Cards (menu 198): every card, issue a virtual card, and one card's
// page: its details and history, activate, status changes, clear the PIN,
// reissue and the plastic of a virtual card.
export function Cards() {
  const { t } = useTranslation(["cards", "common"]);
  const can = usePagePermission();
  const list = usePagedFilters({ search: "", card_product_id: "", ops_status: "", issuance_status: "", form_factor: "" });
  const { applied, page, limit } = list;
  const [options, setOptions] = useState({});
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [issuing, setIssuing] = useState(false);

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
        const row = rowsOf(await cardsApi.list({ page, page_size: limit, ...filterBody(applied, ["card_product_id"]) }))[0];
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
  useLiveChannel(cardsApi.listPath, () => void load({ silent: true }));

  if (openId) {
    return (
      <CardView
        id={openId}
        options={options}
        onOpen={setOpenId}
        onBack={() => {
          setOpenId(null);
          void load();
        }}
      />
    );
  }

  const columns = [
    {
      key: "pan_masked",
      label: t("card"),
      align: "left",
      render: (c) => (
        <button type="button" onClick={() => setOpenId(c.id)} className="text-left">
          <CardNumber card={c} className="text-primary hover:underline" />
          <p className="text-[10px] text-muted-foreground">{c.name_on_card || c.card_serial_number || "—"}</p>
        </button>
      ),
    },
    { key: "holder_name", label: t("holder"), render: (c) => <span className="text-xs font-semibold">{c.holder_name || t("inStock")}</span> },
    { key: "product_code", label: t("product"), render: (c) => <span className="text-xs">{c.product_code} · {cardWord(t, "opt", c.product_class)}</span> },
    { key: "form_factor", label: t("formFactor"), render: (c) => <span className="text-xs">{cardWord(t, "opt", c.form_factor)}</span> },
    { key: "ops_status", label: t("opsStatus"), render: (c) => <CardPill prefix="ops" code={c.ops_status} /> },
    { key: "issuance_status", label: t("issuanceStatus"), render: (c) => <CardPill prefix="iss" code={c.issuance_status} /> },
    { key: "issued_at", label: t("issuedAt"), render: (c) => <span className="whitespace-nowrap text-xs">{c.issued_at ? accountDate(c.issued_at) : "—"}</span> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (c) => <RowActions buttons={{ view: true }} onView={() => setOpenId(c.id)} /> },
  ];

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <CreditCard size={22} className="text-primary" /> {t("cardsTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("cardsSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>
            {t("refresh")}
          </Button>
          {can("Add") && (
            <Button size="sm" icon={Plus} onClick={() => setIssuing(true)}>
              {t("issueVirtual")}
            </Button>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          list.apply();
        }}
        className="mb-4 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]"
      >
        <input className={inputClass} placeholder={t("searchCards")} value={list.filters.search} onChange={(e) => list.set("search")(e.target.value)} />
        <FilterSelect value={list.filters.card_product_id} onChange={list.set("card_product_id")} options={[{ value: "", label: t("anyProduct") }, ...(options.card_products ?? []).map((p) => ({ value: String(p.id), label: `${p.product_code} · ${p.product_name}` }))]} />
        <FilterSelect value={list.filters.ops_status} onChange={list.set("ops_status")} options={[{ value: "", label: t("anyOpsStatus") }, ...(options.ops_statuses ?? []).map((s) => ({ value: s.code, label: cardWord(t, "ops", s.code) }))]} />
        <FilterSelect value={list.filters.issuance_status} onChange={list.set("issuance_status")} options={[{ value: "", label: t("anyIssuanceStatus") }, ...(options.issuance_statuses ?? []).map((s) => ({ value: s, label: cardWord(t, "iss", s) }))]} />
        <FilterSelect value={list.filters.form_factor} onChange={list.set("form_factor")} options={[{ value: "", label: t("anyFormFactor") }, ...FORM_FACTORS.map((f) => ({ value: f, label: cardWord(t, "opt", f) }))]} />
        <Button type="submit" size="sm" icon={Search}>
          {t("search")}
        </Button>
      </form>

      <PagedTable {...list} columns={columns} rows={data.items} total={data.total} loading={loading} title={t("cardsTitle")} emptyTitle={t("noCards")} emptyDescription={t("noCardsHint")} />

      {issuing && (
        <IssueCardDialog
          products={(options.card_products ?? []).filter((p) => allows(p, "allowed_form_factors", "VIRTUAL"))}
          onClose={() => setIssuing(false)}
          onIssued={(card) => {
            setIssuing(false);
            if (card?.id) setOpenId(card.id);
            else void load();
          }}
        />
      )}
    </div>
  );
}

// Issue a virtual card at once: the product, the holder, the name on it.
// The new card fee is charged from the holder's wallet.
function IssueCardDialog({ products, onClose, onIssued }) {
  const { t } = useTranslation("cards");
  const [productId, setProductId] = useState(products[0] ? String(products[0].id) : "");
  const [holder, setHolder] = useState(null);
  const [name, setName] = useState("");
  const [narration, setNarration] = useState("");
  const [key] = useState(idempotencyKey);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const product = products.find((p) => String(p.id) === productId);

  const issue = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await cardsApi.issue({
        card_product_id: Number(productId),
        entity_type: holder.entity_type,
        entity_id: holder.entity_id,
        ...(name.trim() ? { name_on_card: name.trim() } : {}),
        ...(narration.trim() ? { narration: narration.trim() } : {}),
        idempotency_key: key,
      });
      notifications.success(response?.message ?? t("cardIssued"));
      onIssued(rowsOf(response)[0]);
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
      size="md"
      title={t("issueVirtual")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button icon={CreditCard} loading={busy} disabled={!productId || !holder || (product?.emboss_name_required && !name.trim())} onClick={issue}>
            {t("issue")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">{t("issueHint")}</p>
        <Labelled label={t("product")}>
          <FilterSelect value={productId} onChange={setProductId} options={products.map((p) => ({ value: String(p.id), label: `${p.product_code} · ${p.product_name} · ${p.currency_code}` }))} />
        </Labelled>
        <Labelled label={t("holder")}>
          <HolderPicker value={holder} onChange={setHolder} />
        </Labelled>
        <Labelled label={t("nameOnCard")} hint={product?.emboss_name_required ? t("nameRequired") : t("nameDefaults")}>
          <input className={inputClass} maxLength={26} value={name} onChange={(e) => setName(e.target.value.toUpperCase())} />
        </Labelled>
        <Labelled label={t("narration")}>
          <input className={inputClass} value={narration} onChange={(e) => setNarration(e.target.value)} />
        </Labelled>
        <Problems message={error} />
      </div>
    </Modal>
  );
}

// One card: details, what staff may do now, and every status change.
function CardView({ id, options, onBack, onOpen }) {
  const { t } = useTranslation(["cards", "common"]);
  const can = usePagePermission();
  const canRequest = useMenuPermission("Card Requests");
  const canTxn = useMenuPermission("Transactions");
  const [card, setCard] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  // A load / unload sent from here and waiting for a checker.
  const [waiting, setWaiting] = useState(null);

  const reload = useCallback(async () => {
    try {
      setCard(rowsOf(await cardsApi.get({ id }))[0] ?? null);
    } catch (error) {
      notifications.error(error.message);
    }
  }, [id]);
  useEffect(() => {
    setCard(null);
    void reload();
  }, [reload]);
  useLiveChannel(cardsApi.listPath, (_action, records) => (!records.length || records.some((r) => String(r.id) === String(id))) && void reload());
  // The waiting request was decided: say how, and drop the note.
  useLiveChannel(transactionRequestsApi.listPath, (_action, records) => {
    const done = waiting && records.find((r) => String(r.id) === String(waiting.id) && ["APPROVED", "REJECTED", "CANCELLED"].includes(r.status));
    if (!done) return;
    notifications[done.status === "APPROVED" ? "success" : "error"](t(`request_${done.status}`, { ref: waiting.request_reference }));
    setWaiting(null);
  });

  const act = async (call) => {
    setBusy(true);
    try {
      const response = await call();
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      await reload();
      return response;
    } catch (error) {
      notifications.error(error.message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  if (!card) {
    return (
      <div className="flex items-center gap-2 pt-10 text-sm text-muted-foreground">
        <Spinner size={16} /> {t("loading")}
      </div>
    );
  }

  const a = card.actions ?? {};
  const product = options.card_products?.find((p) => p.id === card.card_product_id);
  const issued = card.issuance_status === "ISSUED";
  const buttons = [
    a.activate && can("Change Status") && { key: "activate", label: t("activate"), icon: Power, variant: "primary", run: () => setDialog("activate") },
    a.status && can("Change Status") && card.status_changes?.length > 0 && { key: "status", label: t("changeStatus"), icon: ShieldAlert, run: () => setDialog("status") },
    a.pin_clear && can("Edit") && { key: "pin", label: t("clearPin"), icon: KeyRound, run: () => setDialog("pin") },
    a.load && canTxn("Add") && { key: "load", label: t("load"), icon: ArrowDownToLine, variant: "primary", run: () => setDialog("CARD_LOAD") },
    a.unload && canTxn("Add") && { key: "unload", label: t("unload"), icon: ArrowUpFromLine, run: () => setDialog("CARD_UNLOAD") },
    a.reissue && can("Add") && { key: "reissue", label: t("reissue"), icon: Repeat, run: () => setDialog("reissue") },
    issued && card.form_factor === "VIRTUAL" && product?.allow_virtual_to_physical && canRequest("Add") && { key: "plastic", label: t("orderPlastic"), icon: Truck, run: () => setDialog("plastic") },
  ];
  const yes = (v) => t(v ? "yes" : "no");

  return (
    <div className="pb-8 pt-4">
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft size={15} /> {t("backToCards")}
      </button>
      {waiting && (
        <p className="mb-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <Hourglass size={15} className="shrink-0" /> {t("requestWaiting", { ref: waiting.request_reference })}
        </p>
      )}
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-xl font-black text-foreground">{card.pan_masked}</h1>
              <CardPill prefix="ops" code={card.ops_status} />
              <CardPill prefix="iss" code={card.issuance_status} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{[card.holder_name || t("inStock"), card.name_on_card, `${card.product_code} · ${cardWord(t, "opt", card.product_class)}`, cardWord(t, "opt", card.form_factor), card.network_code, card.inst_profile_name].filter(Boolean).join(" · ")}</p>
            {card.replaced_by_card_id > 0 && (
              <button type="button" onClick={() => onOpen(card.replaced_by_card_id)} className="mt-1 text-xs font-bold text-primary hover:underline">
                {t("replacedByCard")}
              </button>
            )}
          </div>
          <ActionButtons buttons={buttons} busy={busy} />
        </div>
      </div>

      <Section title={t("details")} className="mb-4">
        <Facts
          rows={[
            [t("expiry"), card.expiry],
            [t("serial"), card.card_serial_number || "—"],
            [t("currency"), card.currency_code],
            card.purse_acct_num && [t("purseAccount"), card.purse_acct_num],
            card.funding_acct_num && [t("fundingAccount"), card.funding_acct_num],
            [t("activationMode"), cardWord(t, "opt", card.activation_mode)],
            [t("pinSet"), yes(card.pin_set)],
            [t("pinLocked"), yes(card.pin_locked), card.pin_locked ? "text-red-700" : undefined],
            [t("pinLength"), card.pin_length],
            [t("persoMode"), cardWord(t, "opt", card.perso_mode)],
            [t("issuedAt"), card.issued_at ? accountDate(card.issued_at) : "—"],
            card.activated_at && [t("activatedAt"), accountDate(card.activated_at)],
            card.closed_at && [t("closedAt"), accountDate(card.closed_at)],
            card.request_ref && [t("requestRef"), card.request_ref],
            card.fee_rrn && [t("fee"), `${money(card.fee_amount, card.currency_code)} · ${card.fee_rrn}`],
          ]}
        />
      </Section>

      <Section title={t("history")}>
        <ol className="relative grid gap-3 border-l border-border pl-4">
          {(card.history ?? []).map((h, i) => (
            <li key={`${h.changed_time}-${i}`} className="relative">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-[var(--primary-light)]" />
              <p className="text-xs font-bold text-foreground">
                {cardWord(t, "reason", h.reason_code)}
                {h.to_ops_status && h.to_ops_status !== h.from_ops_status && <span className="font-medium text-muted-foreground"> · {[h.from_ops_status && cardWord(t, "ops", h.from_ops_status), cardWord(t, "ops", h.to_ops_status)].filter(Boolean).join(" → ")}</span>}
                {h.to_issuance_status && h.to_issuance_status !== h.from_issuance_status && <span className="font-medium text-muted-foreground"> · {[h.from_issuance_status && cardWord(t, "iss", h.from_issuance_status), cardWord(t, "iss", h.to_issuance_status)].filter(Boolean).join(" → ")}</span>}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {h.changed_by} · {cardWord(t, "actor", h.actor_type)} · {h.channel} · {accountDate(h.changed_time)}
              </p>
              {h.reason_text?.trim() && <p className="mt-0.5 text-xs italic">“{h.reason_text}”</p>}
            </li>
          ))}
          {!card.history?.length && <li className="text-sm text-muted-foreground">{t("nothingYet")}</li>}
        </ol>
      </Section>

      <ConfirmDialog open={dialog === "activate"} title={t("activateTitle")} description={t("activateHint")} confirmLabel={t("activate")} pending={busy} onClose={() => setDialog(null)} onConfirm={() => act(() => cardsApi.activate({ id }))} />
      {dialog === "status" && <StatusDialog card={card} busy={busy} onClose={() => setDialog(null)} onSave={(to, reason) => act(() => cardsApi.status({ id, to, reason }))} />}
      {dialog === "pin" && (
        <NarrationDialog title={t("clearPinTitle")} hint={t("clearPinHint")} label={t("reason")} confirmLabel={t("clearPin")} variant="danger" required busy={busy} onClose={() => setDialog(null)} onSave={(reason) => act(() => cardsApi.pin_clear({ id, reason }))} />
      )}
      {dialog === "reissue" && (
        <ReissueDialog
          card={card}
          onClose={() => setDialog(null)}
          onDone={(result) => {
            setDialog(null);
            if (result?.card?.id) onOpen(result.card.id);
            else void reload();
          }}
        />
      )}
      {(dialog === "CARD_LOAD" || dialog === "CARD_UNLOAD") && (
        <NewRequest
          preset={{ txn_type: dialog, card }}
          onClose={() => setDialog(null)}
          onDone={(request) => {
            setWaiting(request && !request.result ? request : null);
            setDialog(null);
            void reload();
          }}
        />
      )}
      {dialog === "plastic" && (
        <PlasticDialog
          card={card}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            void reload();
          }}
        />
      )}
    </div>
  );
}

// Change the status to one the server allows now, with a reason.
function StatusDialog({ card, busy, onClose, onSave }) {
  const { t } = useTranslation("cards");
  const [to, setTo] = useState(card.status_changes[0]);
  const [reason, setReason] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={t("changeStatus")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button variant={["ACTIVE"].includes(to) ? "primary" : "danger"} loading={busy} disabled={!reason.trim()} onClick={() => onSave(to, reason.trim())}>
            {t("changeTo", { status: cardWord(t, "ops", to) })}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <Labelled label={t("newStatus")} hint={t(`toHint_${to}`, { defaultValue: "" })}>
          <FilterSelect value={to} onChange={setTo} options={card.status_changes.map((s) => ({ value: s, label: cardWord(t, "ops", s) }))} />
        </Labelled>
        <Labelled label={t("reason")}>
          <textarea className={`${inputClass} min-h-20`} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Labelled>
      </div>
    </Modal>
  );
}

// Replace a card: lost or stolen (after it was reported), damaged (a
// physical card in use) or a renewal. A virtual card is replaced at once;
// a physical one becomes a request for the plastic.
function ReissueDialog({ card, onClose, onDone }) {
  const { t } = useTranslation("cards");
  const reasons = card.reissue_reasons ?? [];
  const [reason, setReason] = useState(reasons[0] ?? "");
  const [name, setName] = useState(card.name_on_card ?? "");
  const [delivery, setDelivery] = useState({ delivery_mode: "BRANCH_PICKUP", delivery_ref: "" });
  const [narration, setNarration] = useState("");
  const [key] = useState(idempotencyKey);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const physical = card.form_factor === "PHYSICAL";

  const send = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await cardsApi.reissue({
        id: card.id,
        reason,
        idempotency_key: key,
        ...(name.trim() ? { name_on_card: name.trim() } : {}),
        ...(physical ? { delivery_mode: delivery.delivery_mode, ...(delivery.delivery_ref.trim() ? { delivery_ref: delivery.delivery_ref.trim() } : {}) } : {}),
        ...(narration.trim() ? { narration: narration.trim() } : {}),
      });
      notifications.success(response?.message ?? t("reissued"));
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
      size="md"
      title={t("reissueTitle", { card: card.pan_masked })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button icon={Repeat} loading={busy} disabled={!reason} onClick={send}>
            {t("reissue")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">{t(physical ? "reissuePhysicalHint" : "reissueVirtualHint")}</p>
        <Labelled label={t("reason")} hint={t(`reissueHint_${reason}`)}>
          <FilterSelect value={reason} onChange={setReason} options={reasons.map((r) => ({ value: r, label: cardWord(t, "reissue", r) }))} />
        </Labelled>
        <Labelled label={t("nameOnCard")}>
          <input className={inputClass} maxLength={26} value={name} onChange={(e) => setName(e.target.value.toUpperCase())} />
        </Labelled>
        {physical && <DeliveryFields value={delivery} onChange={setDelivery} />}
        <Labelled label={t("narration")}>
          <input className={inputClass} value={narration} onChange={(e) => setNarration(e.target.value)} />
        </Labelled>
        <Problems message={error} />
      </div>
    </Modal>
  );
}

// The plastic of a virtual card: a VIRTUAL_TO_PHYSICAL request (Card
// Requests), made and delivered like a personalised card.
function PlasticDialog({ card, onClose, onDone }) {
  const { t } = useTranslation("cards");
  const [delivery, setDelivery] = useState({ delivery_mode: "BRANCH_PICKUP", delivery_ref: "" });
  const [key] = useState(idempotencyKey);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await cardRequestsApi.add({
        request_type: "VIRTUAL_TO_PHYSICAL",
        reference_card_id: card.id,
        entity_type: card.entity_type,
        entity_id: card.entity_id,
        delivery_mode: delivery.delivery_mode,
        ...(delivery.delivery_ref.trim() ? { delivery_ref: delivery.delivery_ref.trim() } : {}),
        idempotency_key: key,
      });
      notifications.success(response?.message ?? t("requestMade"));
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
      size="md"
      title={t("orderPlastic")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button icon={Truck} loading={busy} onClick={send}>
            {t("requestCard")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">{t("plasticHint", { card: card.pan_masked })}</p>
        <DeliveryFields value={delivery} onChange={setDelivery} />
        <Problems message={error} />
      </div>
    </Modal>
  );
}
