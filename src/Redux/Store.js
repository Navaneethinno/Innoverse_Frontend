import { configureStore } from "@reduxjs/toolkit";
import authTokenReducer from "./AuthToken";
import themeReducer from "./ThemeSlice";
import menuReducer from "./MenuSlice";
import { loadState, saveState } from "./Middleware";
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
const persistedState = loadState();
const reducers = {
  token: authTokenReducer,
  theme: themeReducer,
  menu: menuReducer,
};
// Mirrors payse's selective-persistence pattern: keep slices that shouldn't be
// rehydrated from sessionStorage (e.g. transient/high-churn state) out of the
// persisted snapshot. Innoverse currently has no such slice, so nothing is
// excluded yet — extend this as domain slices are added.
function selectPersistedState(state) {
  return { ...state };
}
export const store = configureStore({
  reducer: reducers,
  preloadedState: persistedState,
});
let lastPersistedSerialized = "";
const persist = throttle(() => {
  const next = selectPersistedState(store.getState());
  const serialized = JSON.stringify(next);
  if (serialized === lastPersistedSerialized) return;
  lastPersistedSerialized = serialized;
  saveState(next);
}, 1000);
store.subscribe(persist);
export default store;
