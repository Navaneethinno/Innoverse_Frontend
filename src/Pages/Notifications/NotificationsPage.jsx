import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import { TabButton } from "@/Components/Common/ListView";
import { PageTitle } from "@/Components/Common/PageTitle";
import { Pager } from "@/Components/Common/Pager";
import { Spinner } from "@/Components/Common/Spinner";
import { NotificationRow, useNotificationTarget } from "@/Components/Notifications/NotificationRow";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { inboxApi, INBOX_CHANGED } from "@/Services/Notifications/inbox.api";
import { LinkButton } from "@/Components/Common/TextButtons";

// Every message in the signed-in user's inbox, a page at a time; the top bar's
// bell shows only the latest few and links here.
export function NotificationsPage() {
  const { t } = useTranslation("common");
  const { pageOf, go } = useNotificationTarget();
  const [items, setItems] = useState(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const r = await inboxApi.list({ page, limit: pageSize, ...(unreadOnly ? { unread_only: true } : {}) });
      setItems(rowsOf(r));
      setTotal(Number(r?.pagination?.totalRecords ?? 0));
      setUnread(Number(r?.summary?.unread ?? 0));
    } catch (e) {
      setError(e.message);
      setItems([]);
    }
  }, [page, pageSize, unreadOnly]);
  useEffect(() => {
    void load();
  }, [load]);

  const markRead = (body, ids) =>
    inboxApi
      .read(body)
      .then((r) => {
        const left = rowsOf(r)[0]?.unread;
        if (left != null) setUnread(Number(left));
        setItems((old) => (old ?? []).map((x) => (!ids || ids.includes(x.id) ? { ...x, read: true } : x)));
        window.dispatchEvent(new Event(INBOX_CHANGED));
        // What was read has left the Unread tab.
        if (unreadOnly) void load();
      })
      .catch(() => {});

  const openItem = (x) => {
    if (!x.read) void markRead({ ids: [x.id] }, [x.id]);
    const to = pageOf(x);
    if (to) go(x, to);
  };

  return (
    <div className="pb-12 pt-2">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <PageTitle icon={Bell}>{t("notificationsTitle")}</PageTitle>
        {unread > 0 && (
          <LinkButton onClick={() => void markRead({ all: true }, null)} className="font-semibold">
            {t("markAllRead")}
          </LinkButton>
        )}
      </div>
      <div className="mb-3 flex items-center gap-1.5">
        {[false, true].map((only) => (
          <TabButton
            key={String(only)}
            active={unreadOnly === only}
            onClick={() => {
              setUnreadOnly(only);
              setPage(1);
            }}
          >
            {t(only ? "unreadTab" : "all")}
          </TabButton>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {items === null ? (
          <div className="flex justify-center p-10">
            <Spinner size={18} />
          </div>
        ) : !items.length ? (
          <p className="p-10 text-center text-sm text-muted-foreground">{error || t(unreadOnly ? "notificationsNoUnread" : "notificationsEmpty")}</p>
        ) : (
          <>
            <ul>
              {items.map((x) => (
                <li key={x.id}>
                  <NotificationRow item={x} to={pageOf(x)} onOpen={() => openItem(x)} />
                </li>
              ))}
            </ul>
            <Pager
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
