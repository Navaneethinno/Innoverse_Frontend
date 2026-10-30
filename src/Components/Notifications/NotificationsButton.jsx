import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, ChevronRight } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { menuPathForItem } from "@/Pages/Sidebar/menuRouteMap";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { Spinner } from "@/Components/Common/Spinner";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { inboxApi } from "@/Services/Notifications/inbox.api";

const LIMIT = 20;
// No live push yet: the count is asked for on load and every minute.
const POLL_MS = 60_000;

// The signed-in user's inbox in the top bar: newest first, unread in bold,
// more loaded on scroll. Opening a message marks it read and, when it names a
// screen (menu_id), goes there.
export function NotificationsButton() {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState(null);
  const [page, setPage] = useState({ current: 0, total: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const boxRef = useRef(null);
  const menus = useSelector((state) => state.menu.menuArray);
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
    return () => clearInterval(timer);
  }, [countNow]);

  const loadPage = async (n) => {
    setLoading(true);
    setError("");
    try {
      const r = await inboxApi.list({ page: n, limit: LIMIT });
      const rows = rowsOf(r);
      setItems((old) => (n === 1 ? rows : [...(old ?? []), ...rows]));
      setPage({ current: n, total: Number(r?.pagination?.totalPages ?? 1) });
      if (r?.summary?.unread != null) setUnread(Number(r.summary.unread));
    } catch (e) {
      setError(e.message);
      if (n === 1) setItems([]);
    } finally {
      setLoading(false);
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
    void loadPage(1);
  };
  const onScroll = (e) => {
    const el = e.currentTarget;
    if (!loading && page.current < page.total && el.scrollTop + el.clientHeight >= el.scrollHeight - 40) void loadPage(page.current + 1);
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

  // The message's screen, found in the sidebar's menus as the sidebar builds it.
  const pageOf = (x) => {
    if (!x.menu_id) return null;
    const active = (menus ?? []).filter((m) => m?.status === 1);
    const menu = active.find((m) => Number(m.menu_id) === Number(x.menu_id));
    return menu ? menuPathForItem(menu, active) : null;
  };
  const openItem = (x) => {
    if (!x.read) void markRead({ ids: [x.id] }, [x.id]);
    const to = pageOf(x);
    if (to) {
      setOpen(false);
      navigate(to, { state: { menuClick: Date.now(), recordId: x.record_id ?? undefined } });
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      <UiTooltip label={t("notificationsTitle")}>
        <button
          type="button"
          onClick={toggle}
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
          <div className="max-h-[60vh] overflow-y-auto" onScroll={onScroll}>
            {items === null ? (
              <div className="flex justify-center p-6">
                <Spinner size={16} />
              </div>
            ) : !items.length ? (
              <p className="p-6 text-center text-sm text-muted-foreground">{error || t("notificationsEmpty")}</p>
            ) : (
              <ul>
                {items.map((x) => {
                  const to = pageOf(x);
                  return (
                    <li key={x.id}>
                      <button type="button" onClick={() => openItem(x)} className={`flex w-full items-start gap-2.5 border-b border-border/50 px-4 py-2.5 text-left transition-colors hover:bg-muted ${x.read ? "" : "bg-primary-light/40"}`}>
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${x.read ? "bg-transparent" : "bg-primary"}`} />
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-sm ${x.read ? "font-medium text-foreground/80" : "font-bold text-foreground"}`}>{x.title}</span>
                          {x.body && <span className="line-clamp-2 block text-xs text-muted-foreground">{x.body}</span>}
                          <span className="mt-0.5 block text-[10px] text-muted-foreground">{[x.menu_label ?? x.menu_name, x.created_at && new Date(x.created_at).toLocaleString()].filter(Boolean).join(" · ")}</span>
                        </span>
                        {to && <ChevronRight size={14} className="mt-1 shrink-0 text-muted-foreground" />}
                      </button>
                    </li>
                  );
                })}
                {loading && (
                  <li className="flex justify-center p-3">
                    <Spinner size={14} />
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
