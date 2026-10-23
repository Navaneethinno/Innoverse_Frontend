import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CreditCard, Package, UserCheck } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { accountDate } from "@/Components/Finance/Accounts/accountShared";
import { useAuth } from "@/Hooks/useAuth";
import { usePagePermission } from "@/Hooks/usePermission";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { useServerList } from "@/Hooks/useServerList";
import { ListTable } from "@/Components/Common/ListView";
import { cardStockApi, idempotencyKey } from "@/Services/Cards/cards.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cardsHandedTo } from "@/Utils/Lib/flourish";
import { Problems } from "../Finance/Deposits/depositShared";
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
  const [users, setUsers] = useState([]);
  const [picked, setPicked] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [issuing, setIssuing] = useState(null);

  useEffect(() => {
    cardStockApi
      .options({})
      .then((r) => setUsers(rowsOf(r)[0]?.users ?? []))
      .catch((e) => notifications.error(e.message));
  }, []);

  useLiveChannel(cardStockApi.listPath, () => load());

  // Cards still in stock can be handed on; a card held by someone else is
  // theirs to issue.
  const movable = (s) => s.inventory_status !== "ISSUED";
  const mayIssue = (s) => movable(s) && (s.assignee_type === VAULT || String(s.assignee_id) === String(me?.id));
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
    { key: "order_ref", label: t("order"), render: (s) => <span className="font-mono text-xs">{s.order_ref}</span> },
    { key: "inventory_status", label: t("status"), render: (s) => <CardPill prefix="inv" code={s.inventory_status} /> },
    { key: "assignee", label: t("heldBy"), render: (s) => <span className="text-xs font-semibold">{s.assignee_type === VAULT ? t("vault") : s.assignee_name}</span> },
    { key: "assigned_at", label: t("since"), render: (s) => <span className="whitespace-nowrap text-xs">{s.assigned_at ? accountDate(s.assigned_at) : "—"}</span> },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (s) => can("Add") && mayIssue(s) && <ActionIconButton label={t("issueToCustomer")} intent="auth" icon={CreditCard} onClick={() => setIssuing(s)} />,
    },
  ].filter(Boolean);

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <Package size={22} className="text-primary" /> {t("stockTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("stockSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          {can("Edit") && (
            <Button size="sm" icon={UserCheck} disabled={!picked.length} onClick={() => setAssigning(true)}>
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
          onClose={() => setAssigning(false)}
          onDone={() => {
            setAssigning(false);
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
function AssignDialog({ ids, users, onClose, onDone }) {
  const { t } = useTranslation("cards");
  const [to, setTo] = useState(VAULT);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await cardStockApi.assign({ inventory_ids: ids, ...(to === VAULT ? { assignee_type: VAULT } : { assignee_type: "USER", assignee_id: Number(to) }) });
      notifications.success(response?.message ?? t("handedOver"));
      cardsHandedTo(to === VAULT ? t("vault") : users.find((u) => String(u.id) === to)?.user_name);
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
          <Button icon={UserCheck} loading={busy} onClick={send}>
            {t("handOver")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <Labelled label={t("handTo")} hint={t("handToHint")}>
          <FilterSelect value={to} onChange={setTo} options={[{ value: VAULT, label: t("vault") }, ...users.map((u) => ({ value: String(u.id), label: u.user_name }))]} />
        </Labelled>
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
          <Button icon={CreditCard} loading={busy} disabled={!holder} onClick={send}>
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
