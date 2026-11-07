import { CopyButton } from "@/Components/Common/CopyButton";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CreditCard, Package, Undo2, UserCheck } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { accountDate } from "@/Components/InnoCBS/Accounts/accountShared";
import { useAuth } from "@/Hooks/useAuth";
import { useMenuPermission, usePagePermission } from "@/Hooks/usePermission";
import { ReturnDialog } from "./CardReturns";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { useServerList } from "@/Hooks/useServerList";
import { ListTable } from "@/Components/Common/ListView";
import { cardStockApi, idempotencyKey } from "@/Services/Cards/cards.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cardsHandedTo } from "@/Utils/Lib/flourish";
import { Problems } from "../InnoCBS/Deposits/depositShared";
import { CardFace, CardNumber, CardPill, HolderPicker, Labelled, WithCard } from "./cardOpsShared";

const VAULT = "VAULT";

// CARDS > Card Stock (menu 201): instant cards back from the bureau. Hand
// cards to the staff user who gives them out (or back to the vault), and
// issue one to a customer. A card held by a user is issued only by them.
export function CardStock() {
  const { t } = useTranslation(["cards", "common"]);
  const can = usePagePermission();
  const me = useAuth((s) => s.user);
  const list = useServerList({ api: cardStockApi.listPath, call: cardStockApi.list });
  const load = list.reload;
  const canReturn = useMenuPermission("Card Returns");
  const [returning, setReturning] = useState(false);
  const [users, setUsers] = useState([]);
  const [holders, setHolders] = useState({ agents: [], branches: [] });
  const [picked, setPicked] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [issuing, setIssuing] = useState(null);

  useEffect(() => {
    cardStockApi
      .options({})
      .then((r) => {
        const o = rowsOf(r)[0] ?? {};
        setUsers(o.users ?? []);
        setHolders({ agents: o.agents ?? [], branches: o.branches ?? [] });
      })
      .catch((e) => notifications.error(e.message));
  }, []);

  useLiveChannel(cardStockApi.listPath, () => load());

  // Cards still in stock can be handed on; a card held by someone else is
  // theirs to issue.
  const movable = (s) => s.inventory_status !== "ISSUED";
  const mayIssue = (s) => movable(s) && (s.assignee_type === VAULT || String(s.assignee_id) === String(me?.id));
  // A return is of cards one holder (not the vault) holds now.
  const pickedRows = list.rows.filter((s) => picked.includes(s.id));
  const holderKeys = new Set(pickedRows.map((s) => `${s.assignee_type}:${s.assignee_id}`));
  const returnBlocked = !pickedRows.length ? t("common:blockedSelectRows") : holderKeys.size > 1 ? t("ret_blockedOneHolder") : pickedRows[0].assignee_type === VAULT ? t("ret_blockedVault") : null;
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const columns = [
    can("Edit") && {
      key: "pick",
      label: "",
      sortable: false,
      render: (s) => movable(s) && <input type="checkbox" aria-label={t("select")} checked={picked.includes(s.id)} onChange={() => toggle(s.id)} className="accent-[var(--primary)]" />,
    },
    { key: "pan_masked", label: t("card"), align: "left", render: (s) => <span><CardNumber card={s} /><span className="block font-mono text-[10px] text-muted-foreground">{s.card_serial_number}</span></span> },
    { key: "product_code", label: t("product"), render: (s) => <span className="text-xs">{s.product_code}</span> },
    { key: "order_ref", label: t("order"), render: (s) => <span className="font-mono text-xs">{s.order_ref} <CopyButton value={s.order_ref} /></span> },
    { key: "inventory_status", label: t("status"), render: (s) => <CardPill prefix="inv" code={s.inventory_status} /> },
    { key: "assignee", label: t("heldBy"), render: (s) => <span className="text-xs font-semibold">{s.assignee_type === VAULT ? t("vault") : s.assignee_name}{s.assignee_type && s.assignee_type !== VAULT && s.assignee_type !== "USER" && <span className="block text-[10px] font-normal text-muted-foreground">{t(`ret_holder_${s.assignee_type}`, { defaultValue: s.assignee_type })}</span>}</span> },
    { key: "assigned_at", label: t("since"), render: (s) => <span className="whitespace-nowrap text-xs">{s.assigned_at ? accountDate(s.assigned_at) : "—"}</span> },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (s) => can("Add") && mayIssue(s) && <ActionIconButton label={t("issueToCustomer")} intent="auth" icon={CreditCard} onClick={() => setIssuing(s)} />,
    },
  ].filter(Boolean);

  return (
    <div className="pt-1 pb-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <Package size={22} className="text-primary" /> {t("stockTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("stockSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          {canReturn("Add") && (
            <Button size="sm" variant="secondary" icon={Undo2} disabled={Boolean(returnBlocked)} disabledReason={returnBlocked} onClick={() => setReturning(true)}>
              {t("ret_returnCards")}
            </Button>
          )}
          {can("Edit") && (
            <Button size="sm" icon={UserCheck} disabled={!picked.length} disabledReason={t("common:blockedSelectRows")} onClick={() => setAssigning(true)}>
              {t("handOverN", { count: picked.length })}
            </Button>
          )}
        </div>
      </div>

      <ListTable list={list} columns={columns} title={t("stockTitle")} emptyTitle={t("noStock")} emptyDescription={t("noStockHint")} />

      {assigning && (
        <AssignDialog
          ids={picked}
          users={users}
          holders={holders}
          onClose={() => setAssigning(false)}
          onDone={() => {
            setAssigning(false);
            load();
          }}
        />
      )}
      {returning && (
        <ReturnDialog
          holder={{ type: pickedRows[0].assignee_type, id: pickedRows[0].assignee_id, name: pickedRows[0].assignee_name }}
          cards={pickedRows}
          onClose={() => setReturning(false)}
          onDone={() => {
            setReturning(false);
            setPicked([]);
            load();
          }}
        />
      )}
      {issuing && (
        <IssueFromStock
          stock={issuing}
          onClose={() => setIssuing(null)}
          onDone={() => {
            setIssuing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

// Hand the picked cards to a staff user, or back to the vault.
const ASSIGNEE_TYPES = [VAULT, "USER", "AGENT", "BRANCH"];
function AssignDialog({ ids, users, holders, onClose, onDone }) {
  const { t } = useTranslation(["cards", "common"]);
  const [type, setType] = useState(VAULT);
  const [to, setTo] = useState("");
  const choices = type === "USER" ? users.map((u) => ({ value: String(u.id), label: u.user_name })) : type === "AGENT" ? holders.agents.map((a) => ({ value: String(a.id), label: a.name })) : type === "BRANCH" ? holders.branches.map((b) => ({ value: String(b.id), label: b.name })) : [];
  const nameOf = () => (type === VAULT ? t("vault") : choices.find((c) => c.value === to)?.label ?? `#${to}`);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await cardStockApi.assign({ inventory_ids: ids, ...(type === VAULT ? { assignee_type: VAULT } : { assignee_type: type, assignee_id: Number(to) }) });
      notifications.success(response?.message ?? t("handedOver"));
      cardsHandedTo(nameOf());
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
      size="sm"
      title={t("handOverN", { count: ids.length })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button icon={UserCheck} loading={busy} disabled={type !== VAULT && !to} disabledReason={t("common:blockedFillRequired")} onClick={send}>
            {t("handOver")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <Labelled label={t("handTo")} hint={t("handToHint")}>
          <FilterSelect
            value={type}
            onChange={(v) => {
              setType(v);
              setTo("");
            }}
            options={ASSIGNEE_TYPES.map((x) => ({ value: x, label: x === VAULT ? t("vault") : t(`ret_holder_${x}`) }))}
          />
        </Labelled>
        {type !== VAULT &&
          (choices.length ? (
            <Labelled label={t(`ret_holder_${type}`)} required>
              <FilterSelect value={to} onChange={setTo} options={[{ value: "", label: t("ret_choose") }, ...choices]} />
            </Labelled>
          ) : (
            <Labelled label={t(type === "AGENT" ? "stockAgentId" : type === "BRANCH" ? "stockBranchId" : "stockUserId")} required>
              <input className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm" inputMode="numeric" placeholder="42" value={to} onChange={(e) => setTo(e.target.value.replace(/D/g, ""))} />
            </Labelled>
          ))}
        <Problems message={error} />
      </div>
    </Modal>
  );
}

// Issue a card from stock to a customer; the new card fee is charged from
// their wallet.
function IssueFromStock({ stock, onClose, onDone }) {
  const { t } = useTranslation("cards");
  const [holder, setHolder] = useState(null);
  const [key] = useState(idempotencyKey);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await cardStockApi.issue({ inventory_id: stock.id, entity_type: holder.entity_type, entity_id: holder.entity_id, idempotency_key: key });
      notifications.success(response?.message ?? t("cardIssued"));
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
      size="lg"
      title={t("issueToCustomer")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button icon={CreditCard} loading={busy} disabled={!holder} disabledReason={t("common:blockedFillRequired")} onClick={send}>
            {t("issue")}
          </Button>
        </>
      }
    >
      <WithCard card={<CardFace className="mx-auto w-full max-w-[280px] sm:w-64" card={{ ...stock, form_factor: "PHYSICAL", ops_status: "ACTIVE", name_on_card: stock.name_on_card || holder?.name?.toUpperCase() || t("binPreviewName") }} />}>
        <p className="text-sm text-muted-foreground">{t("issueStockHint")}</p>
        <Labelled label={t("holder")}>
          <HolderPicker value={holder} onChange={setHolder} />
        </Labelled>
        <Problems message={error} />
      </WithCard>
    </Modal>
  );
}
