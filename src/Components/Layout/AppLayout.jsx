import { Outlet } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { clearToken } from "@/Redux/AuthToken";
import { clearMenuState } from "@/Redux/MenuSlice";
import store from "@/Redux/Store";
import { clearAuthSession } from "@/Services/api/authStorage";
import { TopBar } from "../../Pages/Header/TopBar";
import { WorkspaceContainer } from "./WorkspaceContainer";
import { SidebarStateProvider, useSidebar } from "./SidebarContext";
import { DynamicSidebar, SIDEBAR_WIDTHS } from "@/Pages/Sidebar/DynamicSidebar";
import { PageBreadcrumbs } from "./PageBreadcrumbs";
import { useIsMobile } from "@/Hooks/useIsMobile";
import { usePagePermission } from "@/Hooks/usePermission";
import { NoAccess } from "@/Components/Common/NoAccess";
import { TourProvider } from "@/Components/Tour/TourProvider";
function Layout() {
  // Reflow the page in sync with the sidebar's actual visual state
  // (pinned-open OR currently hovered) rather than the pinned preference
  // alone — an overlay-while-hovering approach looked broken (see
  // SidebarContext.jsx), so the content now shifts over exactly as the
  // rail widens/narrows.
  const { collapsed, hovering } = useSidebar();
  const isMobile = useIsMobile();
  const isExpanded = !collapsed || hovering;
  const sidebarW = isExpanded ? SIDEBAR_WIDTHS.expanded : SIDEBAR_WIDTHS.collapsed;
  // On mobile the sidebar is an off-canvas drawer (DynamicSidebar.jsx) that
  // overlays the page instead of sitting beside it, so the content column
  // reserves no space for it at all — reserving even the collapsed-rail
  // width on a ~375px-wide phone was eating a real chunk of the viewport
  // for a sidebar the user couldn't otherwise hide.
  return (
    <div className="min-h-screen flex w-full">
      <DynamicSidebar />
      <div
        style={{
          paddingLeft: isMobile ? 0 : sidebarW + 16,
          transition: "padding-left 0.28s cubic-bezier(0.22,1,0.36,1)",
        }}
        className="flex flex-col flex-1 min-w-0 px-3 md:pl-0 md:pr-3"
      >
        <TopBar />
        <WorkspaceContainer>
          <PageBreadcrumbs />
          <PageAccessGate />
        </WorkspaceContainer>
      </div>
    </div>
  );
}

function AuthEvents() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleUnauthorized = () => {
      store.dispatch(clearToken());
      store.dispatch(clearMenuState());
      navigate("/login", { replace: true });
    };
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [navigate]);

  return null;
}

// Mirrors payse's Body.jsx inactivity-logout mechanism: read a per-user
// inactivity timeout (minutes) from Redux, reset a timer on user activity,
// and force a logout + redirect once the user goes idle past that window.
// Innoverse's user object has no `inactivity_timeout` field yet, so this
// falls back to the same 5-minute default payse uses when the value is
// missing/invalid.
function InactivityLogout() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((storeState) => storeState.token?.user);
  const inactivityTimeoutMinutes = Number(user?.inactivity_timeout);
  const inactivityTimeoutMs =
    Number.isFinite(inactivityTimeoutMinutes) && inactivityTimeoutMinutes > 0
      ? inactivityTimeoutMinutes * 60 * 1000
      : 5 * 60 * 1000;

  useEffect(() => {
    let inactivityTimeout;

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimeout);

      inactivityTimeout = setTimeout(() => {
        dispatch(clearToken());
        dispatch(clearMenuState());
        clearAuthSession();
        sessionStorage.removeItem("reduxState");

        navigate("/login", { replace: true });
      }, inactivityTimeoutMs);
    };

    const events = ["click", "keydown", "touchstart", "mousemove"];

    const handleUserActivity = () => {
      resetInactivityTimer();
    };

    events.forEach((event) => window.addEventListener(event, handleUserActivity));

    resetInactivityTimer();

    return () => {
      clearTimeout(inactivityTimeout);
      events.forEach((event) => window.removeEventListener(event, handleUserActivity));
    };
  }, [dispatch, navigate, inactivityTimeoutMs]);

  return null;
}

export function AppLayout() {
  return (
    <SidebarStateProvider>
      <AuthEvents />
      <InactivityLogout />
      <TourProvider>
        <Layout />
      </TourProvider>
    </SidebarStateProvider>
  );
}

// A sidebar menu the user holds without its View grant never loads — the
// backend would only answer "Permission Denied". Pages that aren't menus
// (dashboard, notifications, my profile) pass straight through.
function PageAccessGate() {
  const can = usePagePermission();
  if (can.menu && !can("View")) return <NoAccess />;
  return <Outlet />;
}
