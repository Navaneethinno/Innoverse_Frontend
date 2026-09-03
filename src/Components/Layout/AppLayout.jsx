import { Outlet } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { clearToken } from "@/Redux/AuthToken";
import { clearMenuState } from "@/Redux/MenuSlice";
import store from "@/Redux/Store";
import { clearAuthSession } from "@/Services/api/authStorage";
import { TopBar } from "./TopBar";
import { WorkspaceContainer } from "./WorkspaceContainer";
import { SidebarStateProvider, useSidebar } from "./SidebarContext";
import { DynamicSidebar, SIDEBAR_WIDTHS } from "./Sidebar/DynamicSidebar";
function Layout() {
  const { collapsed } = useSidebar();
  const sidebarW = collapsed ? SIDEBAR_WIDTHS.collapsed : SIDEBAR_WIDTHS.expanded;
  return (
    <div className="min-h-screen flex w-full">
      <DynamicSidebar />
      <div
        style={{
          paddingLeft: sidebarW + 16,
          transition: "padding-left 0.28s cubic-bezier(0.22,1,0.36,1)",
        }}
        className="flex flex-col flex-1 min-w-0 pr-3"
      >
        <TopBar />
        <WorkspaceContainer>
          <Outlet />
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
      <Layout />
    </SidebarStateProvider>
  );
}
