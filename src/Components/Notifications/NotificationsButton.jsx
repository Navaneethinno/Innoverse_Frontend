import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { Spinner } from "@/Components/Common/Spinner";
import { NotificationRow, useNotificationTarget } from "@/Components/Notifications/NotificationRow";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { inboxApi, INBOX_CHANGED } from "@/Services/Notifications/inbox.api";

// The rest are on the full page.
const LIMIT = 5;
// No live push yet: the count is asked for on load and every minute.
const POLL_MS = 60_000;

// The signed-in user's inbox in the top bar: the latest few, unread in bold,
// with View all for the full page. Opening a message marks it read and, when it names a
// screen (menu_id), goes there.
export function NotificationsButton() {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const boxRef = useRef(null);
  const { pageOf, go } = useNotificationTarget();
  const navigate = useNavigate();

  const countNow = useCallback(
    () =>
      inboxApi
        .unreadCount({})
        .then((r) => setUnread(Number(rowsOf(r)[0]?.unread ?? 0)))
        .catch(() => {}),
    [],
  );
  useEffect(() => {
    void countNow();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void countNow();
    }, POLL_MS);
    // The full page marks messages read too.
    window.addEventListener(INBOX_CHANGED, countNow);
    return () => {
      clearInterval(timer);
      window.removeEventListener(INBOX_CHANGED, countNow);
    };
  }, [countNow]);

  const load = async () => {
    setError("");
    try {
      const r = await inboxApi.list({ page: 1, limit: LIMIT });
      setItems(rowsOf(r));
      if (r?.summary?.unread != null) setUnread(Number(r.summary.unread));
    } catch (e) {
      setError(e.message);
      setItems([]);
    }
  };

  useEffect(() => {
    if (!open) return;
    const outside = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const toggle = () => {
    if (open) return setOpen(false);
    setOpen(true);
    setItems(null);
    void load();
  };
  const markRead = (body, ids) =>
    inboxApi
      .read(body)
      .then((r) => {
        const left = rowsOf(r)[0]?.unread;
        if (left != null) setUnread(Number(left));
        setItems((old) => (old ?? []).map((x) => (!ids || ids.includes(x.id) ? { ...x, read: true } : x)));
      })
      .catch(() => {});

  const openItem = (x) => {
    if (!x.read) void markRead({ ids: [x.id] }, [x.id]);
    const to = pageOf(x);
    if (to) {
      setOpen(false);
      go(x, to);
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      <UiTooltip label={t("notificationsTitle")}>
        <button
          type="button"
          onClick={toggle}
          data-tour="notifications"
          aria-label={t("notificationsTitle")}
          aria-expanded={open}
          className="relative rounded-xl p-2 text-muted-foreground transition-colors hover:bg-primary-light hover:text-primary"
        >
          <Bell size={15} strokeWidth={1.8} />
          {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>}
        </button>
      </UiTooltip>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-border bg-popover shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <p className="text-sm font-bold text-foreground">{t("notificationsTitle")}</p>
            {unread > 0 && (
              <button type="button" onClick={() => void markRead({ all: true }, null)} className="text-xs font-semibold text-primary hover:underline">
                {t("markAllRead")}
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {items === null ? (
              <div className="flex justify-center p-6">
                <Spinner size={16} />
              </div>
            ) : !items.length ? (
              <p className="p-6 text-center text-sm text-muted-foreground">{error || t("notificationsEmpty")}</p>
            ) : (
              <ul>
                {items.map((x) => (
                  <li key={x.id}>
                    <NotificationRow item={x} to={pageOf(x)} onOpen={() => openItem(x)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/notifications");
            }}
            className="block w-full px-4 py-2.5 text-center text-xs font-semibold text-primary hover:bg-muted"
          >
            {t("viewAll")}
          </button>
        </div>
      )}
    </div>
  );
}
