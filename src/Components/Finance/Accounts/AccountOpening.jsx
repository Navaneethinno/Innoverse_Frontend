import { ListTable } from "@/Components/Common/ListView";
import { useServerList } from "@/Hooks/useServerList";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, PlusCircle, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { usePagePermission } from "@/Hooks/usePermission";
import { useOwnIds } from "@/Hooks/useInstitutionScope";
import { accountOpeningApi } from "@/Services/Epurse/accounts.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { ActionButtons, NarrationDialog, inputClass, labelClass } from "../Deposits/depositShared";
import { OwnerFinder } from "../Deposits/TermDeposits/OpenDeposit";
import { MiniTable } from "../Loans/loanShared";
import { accountDate, money, productLabel } from "./accountShared";

// Opening a further account for a customer or merchant (Admin handoff
// 2026-10-22): the maker picks one of the account products the owner's
// digital product allows and gives a reason; a checker approves it (Self
// opens it at once). Term deposits are not offered: each opens its own.

// `entity` ({ entity_type, entity_id }) when the owner is known; otherwise
// the owner is found first.
export function OpenAccount({ entity: given, onClose, onDone }) {
  const { t } = useTranslation(["accounts", "common"]);
  const [entity, setEntity] = useState(given ?? null);
  const [options, setOptions] = useState(null);
  const [productId, setProductId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  // The parent passes an inline onClose; a ref keeps it out of the load's deps.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    if (!entity) return undefined;
    let cancelled = false;
    setOptions(null);
    accountOpeningApi
      .options(entity)
      .then((r) => {
        if (cancelled) return;
        const o = rowsOf(r)[0] ?? {};
        setOptions(o);
        setProductId(o.products?.length === 1 ? String(o.products[0].acct_product_id) : "");
      })
      .catch((error) => {
        if (cancelled) return;
        notifications.error(error.message);
        if (given) close.current();
        else setEntity(null);
      });
    return () => {
      cancelled = true;
    };
  }, [entity, given]);

  const submit = async () => {
    setBusy(true);
    try {
      const response = await accountOpeningApi.add({ ...entity, acct_product_id: Number(productId), reason: reason.trim() });
      const made = rowsOf(response)[0];
      // Self opens it at once: the reply already carries the number.
      notifications.success(made?.status === "APPROVED" && made.acct_num ? t("accountOpenedNumber", { number: made.acct_num }) : (response?.message ?? t("openRequested")));
      onDone?.(made);
      onClose();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const products = options?.products ?? [];
  // The customer's account limit (handoff 52): when reached, nothing can be opened.
  const blocked = options?.limit?.can_open === false;
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={t("openAccount")}
      footer={
        entity &&
        options &&
        !blocked && (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              {t("common:cancel")}
            </Button>
            <Button type="submit" form="open-account-form" icon={PlusCircle} loading={busy} disabled={!productId || !reason.trim()}>
              {t("openAccount")}
            </Button>
          </div>
        )
      }
    >
      {!entity ? (
        <OwnerFinder onPick={setEntity} />
      ) : !options ? (
        <Spinner size={16} />
      ) : (
        <form
          id="open-account-form"
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (productId && reason.trim()) void submit();
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
            <div>
              <p className="text-sm font-bold text-foreground">{options.owner?.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {t(options.owner?.party === "MERCHANT" ? "merchant" : "customer")} · {t(options.owner?.ownership === "CORPORATE" ? "corporate" : "individual")}
              </p>
            </div>
            {options.owner?.status_name && <StatusBadge status={options.owner.status_name} variant="subtle" />}
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("accountsHeld")}</p>
            <MiniTable
              rows={options.accounts ?? []}
              rowKey={(a) => a.id}
              empty={t("noAccounts")}
              columns={[
                { key: "acct_num", label: t("accountNumber"), render: (a) => <span className="font-mono text-xs font-bold">{a.acct_num}</span> },
                { key: "product", label: t("accountProduct"), render: (a) => <span className="text-xs">{productLabel(a.acct_product_code, a.acct_product_name)}</span> },
                { key: "priority", label: t("priority"), render: (a) => <span className="text-xs tabular-nums">{a.acct_priority === 1 ? t("mainAccount") : a.acct_priority}</span> },
                { key: "avail_bal", label: t("availBal"), render: (a) => <span className="whitespace-nowrap text-xs">{money(a.avail_bal, a.currency_code)}</span> },
                { key: "status", label: t("status"), render: (a) => <StatusBadge status={a.status_name ?? String(a.status ?? "")} variant="subtle" /> },
              ]}
            />
          </div>

          {blocked ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{t(`openLimit_${options.limit.reason || "LIMIT_REACHED"}`, { count: options.limit.max_accounts, held: options.limit.held })}</p>
          ) : products.length === 0 ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{t("noAccountProductsAvailable")}</p>
          ) : (
            <>
              <label className={labelClass}>
                {t("accountProduct")}
                <span className="text-destructive"> *</span>
                <FilterSelect
                  className="mt-1.5"
                  value={productId}
                  onChange={setProductId}
                  options={[
                    { value: "", label: t("chooseAccountProduct") },
                    ...products.map((p) => ({ value: String(p.acct_product_id), label: `${productLabel(p.product_code, p.product_name)} (${p.currency_code}) · ${t("heldN", { count: Number(p.held) || 0 })}` })),
                  ]}
                />
              </label>
              <label className={labelClass}>
                {t("reason")}
                <span className="text-destructive"> *</span>
                <input className={`${inputClass} mt-1.5`} value={reason} maxLength={250} placeholder={t("openReasonPlaceholder")} onChange={(e) => setReason(e.target.value)} />
              </label>
            </>
          )}
        </form>
      )}
    </Modal>
  );
}


// Accounts > Opening requests: every request the user can see, newest
// first; a checker approves or rejects, the maker may cancel their own.
export function OpeningRequests() {
  const { t } = useTranslation(["accounts", "common"]);
  const can = usePagePermission();
  const own = useOwnIds();
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const list = useServerList({ api: accountOpeningApi.listPath, call: accountOpeningApi.list });

  const load = list.reload;
  useLiveChannel(accountOpeningApi.listPath, () => load());

  const act = async (call) => {
    setBusy(true);
    try {
      const response = await call();
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      await load({ silent: true });
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: "owner_name", label: t("owner"), render: (r) => <span className="text-xs font-semibold">{r.owner_name || "—"}</span> },
    { key: "product", label: t("accountProduct"), render: (r) => <span className="text-xs">{productLabel(r.product_code, r.product_name ?? r.acct_product_name)}</span> },
    { key: "reason", label: t("reason"), render: (r) => <span className="text-xs">{r.reason || "—"}</span> },
    { key: "status", label: t("status"), render: (r) => <span className="text-xs font-bold">{t(`reqStatus_${r.status}`, { defaultValue: r.status })}</span> },
    { key: "acct_num", label: t("accountNumber"), render: (r) => <span className="font-mono text-xs">{r.acct_num ?? "—"}</span> },
    { key: "requested", label: t("requested"), render: (r) => <span className="text-[11px]">{r.requested_by} · {accountDate(r.requested_at)}</span> },
    { key: "decided", label: t("decided"), render: (r) => <span className="text-[11px]">{r.decided_by ? `${r.decided_by} · ${accountDate(r.decided_at)}${r.decision_note ? ` · ${r.decision_note}` : ""}` : "—"}</span> },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (r) =>
        r.status === "PENDING" ? (
          <ActionButtons
            busy={busy}
            buttons={[
              can("Authorise") && { key: "auth", label: t("approve"), icon: CheckCircle2, variant: "primary", run: () => setDialog({ kind: "auth", row: r }) },
              can("Authorise") && { key: "deauth", label: t("reject"), icon: XCircle, variant: "danger", run: () => setDialog({ kind: "deauth", row: r }) },
              // Only the requester may cancel (by user id: names repeat across institutions).
              can("Edit") && String(r.requested_userid) === own.userId && { key: "cancel", label: t("cancelRequest"), icon: XCircle, run: () => void act(() => accountOpeningApi.cancel({ id: r.id })) },
            ]}
          />
        ) : null,
    },
  ];

  return (
    <>
      <ListTable list={list} columns={columns} rowKey={(r) => r.id} title={t("openingRequests")} emptyTitle={t("noRequests")} />
      {dialog?.kind === "auth" && <NarrationDialog title={t("approveOpenTitle", { name: dialog.row.owner_name })} confirmLabel={t("approve")} busy={busy} onClose={() => setDialog(null)} onSave={(narration) => act(() => accountOpeningApi.auth({ id: dialog.row.id, narration }))} />}
      {dialog?.kind === "deauth" && <NarrationDialog title={t("rejectTitle")} confirmLabel={t("reject")} variant="danger" required busy={busy} onClose={() => setDialog(null)} onSave={(narration) => act(() => accountOpeningApi.deauth({ id: dialog.row.id, narration }))} />}
    </>
  );
}
