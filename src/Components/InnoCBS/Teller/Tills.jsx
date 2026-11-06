import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Calculator, HandCoins, Landmark, Plus, Unlock } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { Button } from "@/Components/Common/Button";
import { ListTable } from "@/Components/Common/ListView";
import { Modal } from "@/Components/Common/Modal";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { RowActions } from "@/Components/Common/RowActions";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { accountDate, money } from "@/Components/InnoCBS/Accounts/accountShared";
import { useMasterCurrencies } from "@/Hooks/Institution/institutionCurrencyHooks";
import { useMenuPermission, usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { tellerApi } from "@/Services/Accounting/accounting.api";
import { recordOf } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";
import { Facts, NarrationDialog, Section, labelClass } from "../Deposits/depositShared";
import { Field, useInstitutionScope } from "../Loans/loanShared";
import { branchOptions, useCoreBanking } from "../coreBankingShared";
import { CountDialog } from "./Desk";
import { IssueDialog, VaultCounts } from "./EndOfDay";
import { TransferTable } from "./Transfers";
import { BalanceFacts, Movements, ProofSheet, SessionTable, kindLabel, sessionOwner } from "./tellerShared";

export function TillList() {
  const { t } = useTranslation(["corebank", "common"]);
  const can = usePagePermission();
  const { scope } = useInstitutionScope();
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deciding, setDeciding] = useState(null);
  const [opening, setOpening] = useState(null);
  const list = useServerList({ api: tellerApi.listPath, call: tellerApi.list });
  const columns = [
    {
      key: "branch_name",
      label: t("branch"),
      render: (r) => <span className="text-xs">{r.branch_name}</span>,
    },
    {
      key: "code",
      label: t("till"),
      render: (r) => (
        <span className="text-xs leading-tight">
          <b className="block font-mono">{r.code}</b>
          <span className="text-muted-foreground">{r.name}</span>
        </span>
      ),
    },
    {
      key: "kind",
      label: t("kind"),
      render: (r) => (
        <span className="text-xs font-semibold">
          {kindLabel(t, r.kind)} <span className="font-normal text-muted-foreground">· {r.currency}</span>
        </span>
      ),
    },
    {
      key: "balance",
      label: t("balance"),
      render: (r) => (
        <span className="text-xs leading-tight tabular-nums" data-tour="till-balance">
          <b className="block">{money(r.balance, r.currency)}</b>
          <span className="text-[10px] text-muted-foreground">
            {t("limitOf", { amount: money(r.cash_limit, r.currency) })}
          </span>
        </span>
      ),
    },
    {
      key: "available",
      label: t("available"),
      render: (r) => (
        <span className="text-xs tabular-nums" data-tour="till-available">
          {money(r.available ?? r.balance, r.currency)}
        </span>
      ),
    },
    { key: "status", label: t("status"), render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "session",
      label: t("openByColumn"),
      sortable: false,
      render: (r) =>
        r.kind === "VAULT" ? (
          "—"
        ) : r.session ? (
          <span className="text-xs leading-tight" data-tour="till-open-by">
            <b className="block text-emerald-700">{sessionOwner(r.session)}</b>
            <span className="text-[10px] text-muted-foreground">
              {accountDate(r.session.opened_at)}
            </span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{t("closedTill")}</span>
        ),
    },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (r) => (
        <span className="flex items-center gap-1">
          <RowActions
            buttons={{
              view: true,
              edit: r.status === "ACTIVE" && can("Edit"),
              deactivate: r.status === "ACTIVE" && !r.session && can("Deactivate"),
              activate: r.status !== "ACTIVE" && can("Reactivate"),
            }}
            onView={() => setViewing(r)}
            onEdit={() => setEditing(r)}
            onDeactivate={() => setDeciding({ verb: "deactivate", till: r })}
            onReactivate={() => setDeciding({ verb: "reactivate", till: r })}
          />
          {r.kind === "VAULT" && r.status === "ACTIVE" && can("Self") && (
            <ActionIconButton
              label={t("countVault")}
              intent="edit"
              icon={Calculator}
              onClick={() => setOpening({ ...r, verb: "vault" })}
            />
          )}
          {r.kind === "TILL" && !r.session && r.status === "ACTIVE" && can("Self") && (
            <ActionIconButton
              label={t("openTill")}
              intent="reactivate"
              icon={Unlock}
              onClick={() => setOpening(r)}
            />
          )}
        </span>
      ),
    },
  ];
  const decide = async (narration) => {
    try {
      const r = await tellerApi[deciding.verb](
        scope({ id: deciding.till.id, ...(narration ? { narration } : {}) }),
      );
      if (r?.message) notifications.success(r.message);
      setDeciding(null);
      list.reload();
    } catch (e) {
      notifications.error(e.message);
    }
  };
  return (
    <>
      <ListTable
        list={list}
        columns={columns}
        rowKey={(r) => r.id}
        title={t("tellerTab_tills")}
        emptyTitle={t("noTills")}
        emptyDescription={t("noTillsHint")}
        actions={
          can("Add") && (
            <Button size="sm" icon={Plus} onClick={() => setEditing({})} data-tour="add">
              {t("addTill")}
            </Button>
          )
        }
      />
      {viewing && <TillDetail id={viewing.id} onClose={() => setViewing(null)} />}
      {editing && (
        <TillForm
          till={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={list.reload}
        />
      )}
      {opening && (
        <CountDialog
          verb={opening.verb ?? "open"}
          till={opening}
          onClose={() => setOpening(null)}
          onDone={() => {
            setOpening(null);
            list.reload();
          }}
        />
      )}
      {deciding && (
        <NarrationDialog
          title={t(`till_${deciding.verb}`, { code: deciding.till.code })}
          hint={t(`till_${deciding.verb}Hint`)}
          confirmLabel={t(`till_${deciding.verb}Confirm`)}
          variant={deciding.verb === "deactivate" ? "danger" : "primary"}
          onClose={() => setDeciding(null)}
          onSave={decide}
        />
      )}
    </>
  );
}

const blankTill = {
  branch_id: "",
  code: "",
  name: "",
  kind: "TILL",
  currency_id: "",
  cash_limit: "",
};

function TillForm({ till, onClose, onSaved }) {
  const { t } = useTranslation("corebank");
  const { scope } = useInstitutionScope();
  const setup = useCoreBanking(scope, !till);
  const { currencies } = useMasterCurrencies();
  const [form, setForm] = useState(() =>
    till ? { ...blankTill, ...till, cash_limit: String(till.cash_limit ?? "") } : blankTill,
  );
  const [saving, setSaving] = useState(false);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const ready = till
    ? form.name.trim()
    : form.branch_id && form.code && form.name.trim() && form.currency_id;
  const save = async () => {
    setSaving(true);
    try {
      const body = till
        ? { id: till.id, name: form.name.trim(), cash_limit: form.cash_limit || "0" }
        : {
            branch_id: Number(form.branch_id),
            code: form.code,
            name: form.name.trim(),
            kind: form.kind,
            currency_id: Number(form.currency_id),
            cash_limit: form.cash_limit || "0",
          };
      const r = await tellerApi[till ? "edit" : "add"](scope(body));
      if (r?.message) notifications.success(r.message);
      onSaved();
      onClose();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={till ? t("editTill", { code: till.code }) : t("addTill")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button loading={saving} disabled={!ready} disabledReason={t("common:blockedFillRequired")} onClick={() => void save()}>
            {t("save")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {!till && (
          <>
            <label className={labelClass}>
              {t("branch")}
              <Field
                field={{
                  type: "select",
                  blank: t("choose"),
                  options: branchOptions(setup, { openOnly: true, operational: true }),
                }}
                value={form.branch_id}
                onChange={set("branch_id")}
              />
            </label>
            <label className={labelClass}>
              {t("kind")}
              <Field
                field={{
                  type: "select",
                  options: ["TILL", "VAULT"].map((k) => ({ value: k, label: kindLabel(t, k) })),
                }}
                value={form.kind}
                onChange={set("kind")}
              />
            </label>
            <label className={labelClass}>
              {t("code")}
              <Field field={{ type: "code" }} value={form.code} onChange={set("code")} />
            </label>
            <label className={labelClass}>
              {t("currency")}
              <Field
                field={{
                  type: "select",
                  blank: t("choose"),
                  options: currencies.map((c) => ({
                    value: String(c.id ?? c.currency_id),
                    label: [c.alpha_code ?? c.currency_code, c.name ?? c.currency_name]
                      .filter(Boolean)
                      .join(" · "),
                  })),
                }}
                value={form.currency_id}
                onChange={set("currency_id")}
              />
            </label>
          </>
        )}
        <label className={labelClass}>
          {t("name")}
          <Field field={{}} value={form.name} onChange={set("name")} />
        </label>
        <label className={labelClass}>
          {t("cashLimit")}
          <Field field={{ type: "amount" }} value={form.cash_limit} onChange={set("cash_limit")} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
            {t("cashLimitHint")}
          </span>
        </label>
      </div>
      {!till && form.kind === "VAULT" && (
        <p className="mt-3 text-xs text-muted-foreground">{t("oneVaultHint")}</p>
      )}
    </Modal>
  );
}

// A till: its money, today's movements, its last sessions and transfers.
function TillDetail({ id, onClose }) {
  const { t } = useTranslation("corebank");
  const { scope } = useInstitutionScope();
  const [till, setTill] = useState(null);
  const [proof, setProof] = useState(null);
  const [issuing, setIssuing] = useState(false);
  const navigate = useNavigate();
  const canJournal = useMenuPermission("Finance Transaction");
  useEffect(() => {
    tellerApi
      .get(scope({ id }))
      .then((r) => setTill(recordOf(r)))
      .catch((e) => notifications.error(e.message));
  }, [id, scope]);
  return (
    <Modal
      open
      size="xl"
      onClose={onClose}
      title={till ? `${till.code} · ${till.name}` : t("till")}
    >
      {!till ? (
        <PageSkeleton />
      ) : (
        <div className="grid gap-4">
          <Facts
            rows={[
              [t("kind"), `${kindLabel(t, till.kind)} · ${till.currency}`],
              [t("branch"), till.branch_name],
              [t("glAccount"), `${till.gl_account_name ?? ""} · ${till.acct_num ?? ""}`],
              [t("status"), <StatusBadge key="s" status={till.status} />],
            ]}
          />
          <BalanceFacts till={till} />
          {till.kind === "VAULT" && till.status === "ACTIVE" && (
            <div>
              <Button size="sm" icon={HandCoins} onClick={() => setIssuing(true)}>
                {t("giveCash")}
              </Button>
            </div>
          )}
          {issuing && <IssueDialog vault={till} onClose={() => setIssuing(false)} onDone={() => setIssuing(false)} />}
          {/* Cash reaches a vault by a manual journal: DR the vault, CR its source. */}
          {till.kind === "VAULT" && till.status === "ACTIVE" && canJournal("Add") && (
            <div>
              <Button
                size="sm"
                icon={Landmark}
                onClick={() =>
                  navigate("/manualjournal", {
                    state: {
                      journal: {
                        currency_id: till.currency_id,
                        narration: t("fundVaultNarration", { code: till.code }),
                        lines: [
                          { gl_account_id: String(till.gl_account_id), op: "DR" },
                          { gl_account_id: "", op: "CR" },
                        ],
                      },
                    },
                  })
                }
              >
                {t("fundVault")}
              </Button>
              <p className="mt-1 text-[11px] text-muted-foreground">{t("fundVaultHint")}</p>
            </div>
          )}
          {till.session && (
            <Section
              title={t("openSessionSince", {
                name: sessionOwner(till.session),
                date: accountDate(till.session.opened_at),
              })}
            >
              <Movements session={till.session} currency={till.currency} />
            </Section>
          )}
          {till.kind === "VAULT" ? (
            <Section title={t("vaultCounts")}>
              <VaultCounts vault={till} />
            </Section>
          ) : (
            <Section title={t("lastSessions")}>
              <SessionTable
                sessions={till.sessions ?? []}
                currency={till.currency}
                onProof={(sessionId) => setProof({ till, sessionId })}
              />
            </Section>
          )}
          <Section title={t("tillTransfers")}>
            <TransferTable query={{ till_id: till.id }} />
          </Section>
        </div>
      )}
      {proof && <ProofSheet till={proof.till} sessionId={proof.sessionId} onClose={() => setProof(null)} />}
    </Modal>
  );
}
