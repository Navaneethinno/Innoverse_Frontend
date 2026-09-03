const STORAGE_KEY = "reduxState";
export function loadState() {
  try {
    const serialized = sessionStorage.getItem(STORAGE_KEY);
    return serialized ? JSON.parse(serialized) : undefined;
  } catch {
    return undefined;
  }
}
export function saveState(state) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Persistence is best effort and must not interrupt the application.
  }
}
