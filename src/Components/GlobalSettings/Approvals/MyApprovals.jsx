import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ListChecks } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { menuPathForItem } from "@/Pages/Sidebar/menuRouteMap";
import { Modal } from "@/Components/Common/Modal";
import { Button } from "@/Components/Common/Button";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { approvalApi } from "@/Services/GlobalSettings/approval.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { ApprovalTimeline, approvalText } from "./approvalShared";

// What the signed-in user can approve now, across the admin menus, oldest
// first (/config/approval/queue). Open in the top bar; the count shows on
// the button.
export function MyApprovalsButton() {
  const { t } = useTranslation("common");
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(false);
  const [timeline, setTimeline] = useState(null);
  const menus = useSelector((state) => state.menu.menuArray);
  const navigate = useNavigate();
  // The item's page, found in the sidebar's menus as the sidebar builds it.
  const pageOf = (x) => {
    const active = (menus ?? []).filter((m) => m?.status === 1);
    const menu = active.find((m) => Number(m.menu_id) === Number(x.menu_id) && (!x.module_name || m.module_name === x.module_name)) ?? active.find((m) => Number(m.menu_id) === Number(x.menu_id));
    return menu ? menuPathForItem(menu, active) : null;
  };
  const load = () =>
    approvalApi
      .queue({})
      .then((r) => setItems(rowsOf(r)))
      .catch((e) => {
        setItems([]);
        if (open) notifications.error(e.message);
      });
  useEffect(() => {
    void load();
    // Loaded once at sign-in and again on every opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const count = items?.length ?? 0;
  return (
    <>
      <UiTooltip label={t("myApprovals")}>
        <button
          type="button"
          aria-label={t("myApprovals")}
          onClick={() => {
            setOpen(true);
            void load();
          }}
          className="relative rounded-xl p-2 text-muted-foreground transition-colors hover:bg-primary-light hover:text-primary"
        >
          <ListChecks size={15} strokeWidth={1.8} />
          {count > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{count > 99 ? "99+" : count}</span>}
        </button>
      </UiTooltip>
      {open && (
        <Modal open size="lg" onClose={() => setOpen(false)} title={t("myApprovals")}>
          {items === null ? (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          ) : !items.length ? (
            <p className="text-sm text-muted-foreground">{t("myApprovalsEmpty")}</p>
          ) : (
            <ul className="grid max-h-[60vh] gap-2 overflow-y-auto">
              {items.map((x) => (
                <li key={`${x.route}:${x.record_id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800">
                      {[x.module_label ?? x.module_name, x.parent_menu_label ?? x.parent_menu_name, x.menu_label ?? x.menu_name].filter(Boolean).join(" › ")} · {x.action}
                      {x.record_name ? ` · ${x.record_name}` : ` #${x.record_id}`}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {[x.inst_profile_name, x.maker && t("approvalMaker", { name: x.maker }), x.submitted_at && new Date(x.submitted_at).toLocaleString(), x.amount != null && String(x.amount)].filter(Boolean).join(" · ")}
                    </p>
                    <p className="text-[11px] font-semibold text-primary">{approvalText(t, x.approval)}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="outline" onClick={() => setTimeline(x)}>
                      {t("approvalTimeline")}
                    </Button>
                    {pageOf(x) && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setOpen(false);
                          navigate(pageOf(x), { state: { menuClick: Date.now() } });
                        }}
                      >
                        {t("open")}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
      {timeline && <ApprovalTimeline route={timeline.route} recordId={timeline.record_id} title={`${timeline.menu_label ?? timeline.menu_name} #${timeline.record_id}`} onClose={() => setTimeline(null)} />}
    </>
  );
}
