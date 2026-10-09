import { useListSearch } from "@/Hooks/useListSearch";
import { SearchBox } from "@/Components/Common/SearchBox";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Network, UserCog, XCircle } from "lucide-react";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { Spinner } from "@/Components/Common/Spinner";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { usePagePermission } from "@/Hooks/usePermission";
import { useOwnIds } from "@/Hooks/useInstitutionScope";
import { agentsApi } from "@/Services/Merchant/mms.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { ActionButtons, NarrationDialog, labelClass } from "../../TermDeposits/depositShared";
import { MiniTable, Tabs } from "../../Loans/loanShared";
import { MerchantStores } from "../Stores/Stores";
import { MmsStatus, RoleBadge, pageOf, partyKey, partyRef } from "../mmsShared";

// The list tabs: party type and tier filters, then the checker's queue.
const TABS = {
  all: {},
  merchants: { party_type: "MERCHANT" },
  agents: { tier: "AGENT" },
  superAgents: { tier: "SUPER_AGENT" },
  pending: null,
};

// MMS › Agents (menu 207): merchants, agents and super agents. A role or
// super agent change is a request a second user approves (Self: at once).
export function Agents() {
  const { t } = useTranslation("mms");
  const [tab, setTab] = useState("all");
  return (
    <div className="pb-8 pt-4">
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
          <Network size={22} className="text-primary" /> {t("agentsTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("agentsSubtitle")}</p>
      </div>
      <Tabs
        tabs={Object.keys(TABS).map((key) => ({ key }))}
        value={tab}
        onChange={setTab}
        labelOf={(k) => t(`agentsTab_${k}`)}
      />
      {tab === "pending" ? <RoleRequests /> : <AgentList key={tab} filter={TABS[tab]} />}
    </div>
  );
}

function AgentList({ filter }) {
  const { t } = useTranslation(["mms", "common"]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [result, setResult] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState(null);
  // Part of the name.
  const {
    body: searchBody,
    latest: latestList,
    bind: searchBind,
  } = useListSearch(() => setPage(1));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setResult(
        pageOf(await latestList(agentsApi.list({ ...filter, ...searchBody, page, limit }))),
      );
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [filter, searchBody, latestList, page, limit]);
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel(agentsApi.listPath, () => void load());

  const columns = [
    {
      key: "name",
      label: t("name"),
      render: (r) => (
        <div>
          <p className="text-xs font-semibold">{r.name}</p>
          <p className="text-[10px] text-muted-foreground">{r.inst_profile_name}</p>
        </div>
      ),
    },
    {
      key: "party_type",
      label: t("partyType"),
      render: (r) => (
        <span className="text-xs">{t(`role_${r.party_type}`, { defaultValue: r.party_type })}</span>
      ),
    },
    {
      key: "tier",
      label: t("roles"),
      render: (r) => (
        <span className="inline-flex flex-wrap justify-center gap-1">
          {(r.roles ?? []).map((role) => (
            <RoleBadge key={role} value={role} />
          ))}
          {r.pending_request && <MmsStatus value="PENDING" />}
        </span>
      ),
    },
    {
      key: "parent",
      label: t("superAgent"),
      render: (r) => <span className="text-xs">{r.parent?.name ?? "—"}</span>,
    },
    {
      key: "agents",
      label: t("agentsCount"),
      render: (r) => (
        <span className="text-xs tabular-nums">{r.tier === "SUPER_AGENT" ? r.agents : "—"}</span>
      ),
    },
    {
      key: "status",
      label: t("status"),
      render: (r) => <span className="text-xs">{r.status_name ?? "—"}</span>,
    },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (r) => <RowActions buttons={{ view: true }} onView={() => setViewing(r)} />,
    },
  ];

  return (
    <>
      <div className="mb-4 flex rounded-2xl border border-border bg-card p-4">
        <SearchBox {...searchBind} className="min-w-[14rem] flex-1" placeholder={t("searchName")} />
      </div>
      <DataTable
        columns={columns}
        rows={result.items}
        rowKey={partyKey}
        isLoading={loading}
        title={t("agentsTitle")}
        emptyTitle={t("noParties")}
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
      {viewing && <AgentDetail party={viewing} onClose={() => setViewing(null)} onChanged={load} />}
    </>
  );
}

// One request's change, "Agent → Agent under Mondlane".
function changeText(t, r) {
  const side = (tier, parent) =>
    `${tier ? t(`role_${tier}`) : t("noTier")}${parent?.name ? ` · ${t("under", { name: parent.name })}` : ""}`;
  return `${side(r.from_tier, r.from_parent)} → ${side(r.tier, r.parent)}`;
}

// Approve / reject / withdraw buttons for a pending request, and their dialogs.
function useRequestDecision(onDone) {
  const { t } = useTranslation("mms");
  const can = usePagePermission();
  const own = useOwnIds();
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const act = async (call) => {
    setBusy(true);
    try {
      const response = await call();
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      onDone();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  const buttons = (r) => [
    can("Authorise") && {
      key: "auth",
      label: t("approve"),
      icon: CheckCircle2,
      variant: "primary",
      run: () => setDialog({ kind: "auth", r }),
    },
    can("Authorise") && {
      key: "deauth",
      label: t("reject"),
      icon: XCircle,
      variant: "danger",
      run: () => setDialog({ kind: "deauth", r }),
    },
    can("Add") &&
      String(r.requested_userid) === own.userId && {
        key: "cancel",
        label: t("withdraw"),
        icon: XCircle,
        run: () => void act(() => agentsApi.cancel({ id: r.id })),
      },
  ];
  const dialogs =
    dialog &&
    (dialog.kind === "auth" ? (
      <NarrationDialog
        title={t("approveRoleTitle")}
        hint={changeText(t, dialog.r)}
        confirmLabel={t("approve")}
        busy={busy}
        onClose={() => setDialog(null)}
        onSave={(narration) => act(() => agentsApi.auth({ id: dialog.r.id, narration }))}
      />
    ) : (
      <NarrationDialog
        title={t("rejectRoleTitle")}
        hint={changeText(t, dialog.r)}
        confirmLabel={t("reject")}
        variant="danger"
        required
        busy={busy}
        onClose={() => setDialog(null)}
        onSave={(narration) => act(() => agentsApi.deauth({ id: dialog.r.id, narration }))}
      />
    ));
  return { buttons, dialogs, busy };
}

// The party, its agents (a super agent's), its role requests, and "Change role".
function AgentDetail({ party, onClose, onChanged }) {
  const { t } = useTranslation("mms");
  const can = usePagePermission();
  const [data, setData] = useState(null);
  const [changing, setChanging] = useState(false);
  // A merchant's page also shows its stores and store wallets.
  const [tab, setTab] = useState("overview");

  // Callers pass an inline onClose; a ref keeps it out of the fetch's deps.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  const load = useCallback(async () => {
    try {
      setData(rowsOf(await agentsApi.get(partyRef(party)))[0] ?? null);
    } catch (error) {
      notifications.error(error.message);
      close.current();
    }
  }, [party]);
  useEffect(() => {
    void load();
  }, [load]);
  const refresh = () => {
    void load();
    onChanged();
  };
  const decision = useRequestDecision(refresh);

  const p = data?.party ?? party;
  const pending = data?.requests?.find((r) => r.status === "PENDING");
  return (
    <Modal open onClose={onClose} size="xl" title={p.name}>
      {!data ? (
        <div className="flex justify-center py-8">
          <Spinner size={20} />
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {(p.roles ?? []).map((role) => (
                <RoleBadge key={role} value={role} />
              ))}
              <span className="text-xs text-muted-foreground">
                {p.parent?.name ? t("under", { name: p.parent.name }) : ""}{" "}
                {p.status_name ? `· ${p.status_name}` : ""}
              </span>
            </div>
            {!pending && can("Add") && (
              <ActionButtons
                buttons={[
                  {
                    key: "change",
                    label: t("changeRole"),
                    icon: UserCog,
                    variant: "primary",
                    run: () => setChanging(true),
                  },
                ]}
              />
            )}
          </div>

          {(p.roles ?? []).includes("MERCHANT") && (
            <Tabs
              tabs={[{ key: "overview" }, { key: "stores" }]}
              value={tab}
              onChange={setTab}
              labelOf={(k) => t(`partyTab_${k}`)}
            />
          )}
          {tab === "stores" ? (
            <MerchantStores merchant={p} />
          ) : (
            <>
              {pending && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    {t("pendingChange")}
                  </p>
                  <p className="mt-1 text-sm font-bold text-foreground">{changeText(t, pending)}</p>
                  <p className="text-xs text-muted-foreground">
                    {pending.reason} · {pending.requested_by}
                  </p>
                  <div className="mt-3">
                    <ActionButtons busy={decision.busy} buttons={decision.buttons(pending)} />
                  </div>
                </div>
              )}

              {p.tier === "SUPER_AGENT" && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {t("itsAgents", { count: data.agents?.length ?? 0 })}
                  </p>
                  <MiniTable
                    rows={data.agents}
                    rowKey={partyKey}
                    empty={t("noAgentsYet")}
                    columns={[
                      { key: "name", label: t("name") },
                      { key: "status", label: t("status"), render: (a) => a.status_name ?? "—" },
                    ]}
                  />
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("roleRequests")}
                </p>
                <MiniTable
                  rows={data.requests}
                  empty={t("noRoleRequests")}
                  columns={[
                    { key: "change", label: t("change"), render: (r) => changeText(t, r) },
                    { key: "reason", label: t("reason"), render: (r) => r.reason || "—" },
                    {
                      key: "status",
                      label: t("status"),
                      render: (r) => <MmsStatus value={r.status} />,
                    },
                    { key: "by", label: t("requestedBy"), render: (r) => r.requested_by ?? "—" },
                  ]}
                />
              </div>
            </>
          )}
        </div>
      )}
      {decision.dialogs}
      {changing && <ChangeRole party={p} onClose={() => setChanging(false)} onDone={refresh} />}
    </Modal>
  );
}

// Ask for the party's tier and super agent as they should be afterwards.
function ChangeRole({ party, onClose, onDone }) {
  const { t } = useTranslation("mms");
  const isMerchant = party.party_type === "MERCHANT";
  const [tier, setTier] = useState(party.tier ?? "");
  const [parent, setParent] = useState(party.parent ? partyKey(party.parent) : "");
  const [superAgents, setSuperAgents] = useState(null);
  const [busy, setBusy] = useState(false);

  // The super agents to pick from (a party is never its own).
  useEffect(() => {
    if (tier !== "AGENT" || superAgents) return;
    agentsApi
      .list({ tier: "SUPER_AGENT", page: 1, limit: 100 })
      .then((r) => setSuperAgents(pageOf(r).items.filter((s) => partyKey(s) !== partyKey(party))))
      .catch((error) => {
        notifications.error(error.message);
        setSuperAgents([]);
      });
  }, [tier, superAgents, party]);

  const save = async (reason) => {
    setBusy(true);
    try {
      const chosen = tier === "AGENT" ? superAgents?.find((s) => partyKey(s) === parent) : null;
      const response = await agentsApi.add({
        ...partyRef(party),
        tier,
        ...(chosen ? { parent: partyRef(chosen) } : {}),
        reason,
      });
      notifications.success(response?.message ?? t("roleRequested"));
      onClose();
      onDone();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const tiers = [...(isMerchant ? [""] : []), "AGENT", "SUPER_AGENT"];
  return (
    <NarrationDialog
      size="md"
      title={t("changeRoleTitle", { name: party.name })}
      hint={t("changeRoleHint")}
      label={t("reason")}
      required
      confirmLabel={t("askForChange")}
      busy={busy}
      onClose={onClose}
      onSave={save}
    >
      <div className="mb-3 grid gap-3">
        <label className={labelClass}>
          {t("tier")}
          <FilterSelect
            className="mt-1.5"
            value={tier}
            onChange={setTier}
            options={tiers.map((v) => ({ value: v, label: v ? t(`role_${v}`) : t("noTier") }))}
          />
        </label>
        {tier === "AGENT" && (
          <label className={labelClass}>
            {t("superAgent")}
            <FilterSelect
              className="mt-1.5"
              value={parent}
              onChange={setParent}
              options={[
                { value: "", label: superAgents ? t("noSuperAgent") : t("loading") },
                ...(superAgents ?? []).map((s) => ({ value: partyKey(s), label: s.name })),
              ]}
            />
          </label>
        )}
      </div>
    </NarrationDialog>
  );
}

// The checker's queue: role changes waiting for approval.
function RoleRequests() {
  const { t } = useTranslation(["mms", "common"]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [result, setResult] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setResult(pageOf(await agentsApi.pending({ status: "PENDING", page, limit })));
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel(agentsApi.listPath, () => void load());
  const decision = useRequestDecision(load);

  const columns = [
    {
      key: "party",
      label: t("name"),
      render: (r) => <span className="text-xs font-semibold">{r.party?.name}</span>,
    },
    {
      key: "change",
      label: t("change"),
      render: (r) => <span className="text-xs">{changeText(t, r)}</span>,
    },
    {
      key: "reason",
      label: t("reason"),
      render: (r) => <span className="text-xs">{r.reason || "—"}</span>,
    },
    {
      key: "requested_by",
      label: t("requestedBy"),
      render: (r) => <span className="text-xs">{r.requested_by}</span>,
    },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (r) => <ActionButtons busy={decision.busy} buttons={decision.buttons(r)} />,
    },
  ];
  return (
    <>
      <DataTable
        columns={columns}
        rows={result.items}
        rowKey={(r) => r.id}
        isLoading={loading}
        title={t("agentsTab_pending")}
        emptyTitle={t("noPendingRoles")}
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
      {decision.dialogs}
    </>
  );
}
