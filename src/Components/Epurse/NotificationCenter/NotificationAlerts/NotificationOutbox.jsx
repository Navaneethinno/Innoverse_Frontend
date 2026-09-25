import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, Clock3, ListChecks, Mail, MessageSquare, XCircle } from "lucide-react";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { StatusFilterTabs } from "@/Components/Common/StatusFilterTabs";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { notificationAlertApi, notificationOutboxApi } from "@/Services/Epurse/notification.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { ViewItem } from "../notificationShared";

// Tabs are delivery_status (the maker-checker `filter` tabs don't apply).
const TABS = [
  ["all", "notification:tabAll", ListChecks],
  ["PENDING", "notification:tabPending", Clock3],
  ["SENT", "notification:tabSent", CheckCircle2],
  ["FAILED", "notification:tabFailed", XCircle],
];
const when = (value) => (value ? new Date(value).toLocaleString() : "-");
const ChannelIcon = ({ channel }) => (channel === "SMS" ? <MessageSquare size={13} /> : <Mail size={13} />);

// Read-only list of the messages alerts produced — one row per recipient and
// channel. Until the gateway exists every row stays PENDING.
export function NotificationOutbox({ alertId, onAlertChange }) {
  const { t } = useTranslation(["notification", "common"]);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState("all");
  const [channel, setChannel] = useState("");
  const [sortBy, setSortBy] = useState("desc");
  const [search, setSearch] = useState("");
  const [view, setView] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    notificationAlertApi
      .list({ page: 1, limit: 100, filter: "all", sort_by: "asc" })
      .then((response) => setAlerts(rowsOf(response)))
      .catch(() => setAlerts([]));
  }, []);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const response = await notificationOutboxApi.list({
          page,
          limit,
          sort_by: sortBy,
          ...(status !== "all" ? { delivery_status: status } : {}),
          ...(channel ? { channel } : {}),
          ...(alertId ? { noti_alert_id: Number(alertId) } : {}),
        });
        setRows(rowsOf(response));
        setPagination(response?.pagination ?? {});
      } catch (error) {
        notifications.error(error.message);
      } finally {
        setLoading(false);
      }
    },
    [page, limit, sortBy, status, channel, alertId],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel(notificationOutboxApi.listPath, () => void load({ silent: true }));

  // Any filter change goes back to page 1.
  const reset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q)) : rows;
  }, [rows, search]);

  const columns = [
    { key: "created_time", label: t("notification:time"), render: (row) => <span className="whitespace-nowrap text-xs">{when(row.created_time)}</span> },
    { key: "noti_alert_name", label: t("notification:alert"), align: "left", render: (row) => <span className="font-semibold">{row.noti_alert_name ?? row.alert_code ?? "-"}</span> },
    {
      key: "channel",
      label: t("notification:channel"),
      render: (row) => (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-bold text-primary">
          <ChannelIcon channel={row.channel} /> {row.channel === "SMS" ? t("notification:sms") : t("notification:email")}
        </span>
      ),
    },
    { key: "recipient", label: t("notification:recipient"), render: (row) => <span className="text-xs">{row.recipient}</span> },
    {
      key: "subject",
      label: t("notification:subjectOrMessage"),
      align: "left",
      render: (row) => <span className="line-clamp-1 max-w-72 text-xs">{row.subject ?? row.body}</span>,
    },
    { key: "action", label: t("notification:actionOnMenu"), render: (row) => `${row.action_name ?? "-"} · ${row.menu_name ?? "-"}` },
    { key: "actor_userid_name", label: t("notification:user"), render: (row) => row.actor_userid_name ?? "-" },
    {
      key: "delivery_status",
      label: t("notification:deliveryStatus"),
      render: (row) => <StatusBadge status={String(row.delivery_status ?? "-")} />,
    },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (row) => <RowActions buttons={{ view: true }} onView={() => setView(row)} />,
    },
  ];

  return (
    <>
      <div
        className="mb-4 overflow-hidden rounded-2xl"
        style={{ background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" }}
      >
        <StatusFilterTabs
          tabs={TABS}
          serverFiltered
          total={pagination.totalRecords}
          rows={rows}
          value={status}
          onChange={reset(setStatus)}
          sortBy={sortBy}
          onSortChange={reset(setSortBy)}
          search={search}
          onSearch={setSearch}
          searchPlaceholder={t("notification:searchOutbox")}
          actions={
            <div className="flex items-center gap-2">
              <FilterSelect
                size="sm"
                className="w-32"
                value={channel}
                onChange={reset(setChannel)}
                options={[
                  { value: "", label: t("notification:allChannels") },
                  { value: "EMAIL", label: t("notification:email") },
                  { value: "SMS", label: t("notification:sms") },
                ]}
              />
              <FilterSelect
                size="sm"
                className="w-48"
                value={alertId ? String(alertId) : ""}
                onChange={(next) => {
                  onAlertChange(next);
                  setPage(1);
                }}
                options={[{ value: "", label: t("notification:allAlerts") }, ...alerts.map((a) => ({ value: String(a.id), label: a.name ?? a.code }))]}
              />
            </div>
          }
          bare
        />
        <DataTable
          columns={columns}
          rows={visible}
          rowKey={(row) => row.id}
          isLoading={loading}
          title={t("notification:outbox")}
          emptyTitle={t("notification:noMessages")}
          serverPagination={{
            page,
            totalPages: pagination.totalPages ?? 1,
            totalRecords: pagination.totalRecords ?? rows.length,
            onPageChange: setPage,
            limit,
            onLimitChange: reset(setLimit),
          }}
          serverSorted
          bare
        />
      </div>

      {view && (
        <Modal open onClose={() => setView(null)} size="md" title={view.subject ?? t("notification:smsBody")}>
          <dl className="grid gap-3">
            {view.delivery_status === "FAILED" && view.last_error && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                <span>
                  <b>{t("notification:lastError")}:</b> {view.last_error}
                </span>
              </div>
            )}
            <ViewItem label={t("notification:message")}>
              <p className="whitespace-pre-wrap font-normal">{view.body}</p>
            </ViewItem>
            <div className="grid gap-3 sm:grid-cols-2">
              <ViewItem label={t("notification:recipient")}>
                <span className="inline-flex items-center gap-1.5">
                  <ChannelIcon channel={view.channel} /> {view.recipient}
                </span>
              </ViewItem>
              <ViewItem label={t("notification:deliveryStatus")}>
                <StatusBadge status={String(view.delivery_status ?? "-")} />
              </ViewItem>
              <ViewItem label={t("notification:alert")}>{view.noti_alert_name ?? view.alert_code}</ViewItem>
              <ViewItem label={t("notification:actionOnMenu")}>
                {view.action_name} · {view.menu_name}
                {view.record_id != null && <span className="font-normal text-muted-foreground"> #{view.record_id}</span>}
              </ViewItem>
              <ViewItem label={t("notification:user")}>{view.actor_userid_name}</ViewItem>
              <ViewItem label={t("notification:time")}>{when(view.created_time)}</ViewItem>
              <ViewItem label={t("notification:attempts")}>{view.attempts ?? 0}</ViewItem>
              <ViewItem label={t("notification:sentTime")}>{when(view.sent_time)}</ViewItem>
            </div>
          </dl>
        </Modal>
      )}
    </>
  );
}
