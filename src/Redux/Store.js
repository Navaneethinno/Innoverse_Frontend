import { configureStore } from "@reduxjs/toolkit";
import authTokenReducer from "./AuthToken";
import menuReducer from "./MenuSlice";
import { loadState, saveState } from "./Middleware";
import { getAccessToken, getRefreshToken } from "@/Services/api/authStorage";
function throttle(fn, waitMs) {
  let timeoutId;
  let lastRun = 0;
  return () => {
    const remaining = waitMs - (Date.now() - lastRun);
    if (remaining <= 0) {
      lastRun = Date.now();
      fn();
      return;
    }
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      lastRun = Date.now();
      fn();
    }, remaining);
  };
}
// Sanitize whatever is already sitting in sessionStorage from before this
// exclusion existed — a bad snapshot saved by an older build must not get
// one more free ride as preloadedState before selectPersistedState's write
// guard has a chance to correct it (see that function below for the bug).
const rawPersistedState = loadState();
// (A snapshot from an older build may still hold a "theme" slice; it is dropped.)
const { theme: _retiredTheme, ...keptState } = rawPersistedState ?? {};
// The tokens live only in authStorage; the snapshot never holds a copy.
const persistedState = rawPersistedState
  ? {
      ...keptState,
      token: { ...keptState.token, token: getAccessToken(), refreshToken: getRefreshToken() },
      menu: { ...keptState.menu, masterModules: [] },
    }
  : rawPersistedState;
const reducers = {
  token: authTokenReducer,
  menu: menuReducer,
};
// Mirrors payse's selective-persistence pattern: keep slices that shouldn't be
// rehydrated from sessionStorage out of the persisted snapshot.
//
// menu.masterModules is excluded: it's reference data from
// POST /master/module/list, meant to always be re-fetched fresh on mount
// (see Hooks/Sidebar/useMasterModules.js). Persisting it caused a real bug —
// a stale or partially-fetched value could get saved, then rehydrate as the
// starting Redux state on the next load, and if the live refetch's owning
// component happened to unmount before the request resolved (e.g. during
// the redirect right after login), the fresh result was silently discarded,
// leaving the stale value in place indefinitely (symptom: the module
// dropdown showing only one leftover module instead of the user's full
// permitted set). menu.menuArray (the user's own permissions from login) is
// still persisted — that's legitimately session state, not reference data.
function selectPersistedState(state) {
  return {
    ...state,
    token: { ...state.token, token: null, refreshToken: null },
    menu: { ...state.menu, masterModules: [] },
  };
}
const store = configureStore({
  reducer: reducers,
  preloadedState: persistedState,
});
let lastPersistedSerialized = "";
const savePersisted = () => {
  const next = selectPersistedState(store.getState());
  const serialized = JSON.stringify(next);
  if (serialized === lastPersistedSerialized) return;
  lastPersistedSerialized = serialized;
  saveState(next);
};
store.subscribe(throttle(savePersisted, 1000));
// A refresh right after sign-in must not lose the menus the throttle hasn't saved.
globalThis.addEventListener?.("pagehide", savePersisted);
export default store;
