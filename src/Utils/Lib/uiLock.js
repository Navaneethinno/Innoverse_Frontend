import { getEnvironment, onEnvironmentChange } from "@/Utils/Lib/environment";

// Where the lock is on, by the API's X-Environment: UAT only while it is
// tested. Before go-live this becomes ["PRODUCTION"].
const LOCKED_ENVIRONMENTS = ["UAT"];

// Sign-in fields and every password or PIN: nothing copied out, pasted or
// dropped in.
const SENSITIVE = 'input[type="password"], input[name^="signin-"]';
const EDITABLE = 'input, textarea, [contenteditable="true"]';

export const isLockedEnvironment = (environment) => LOCKED_ENVIRONMENTS.includes(environment);

// What a blocked event would have acted on.
const closest = (target, selector) => (target?.nodeType === 1 ? target : target?.parentElement)?.closest?.(selector) ?? null;

export function shouldBlock(type, target) {
  if (type === "contextmenu" || type === "dragstart") return true;
  if (closest(target, SENSITIVE)) return true;
  // Copying from the page: what is typed in a form stays usable, and the copy
  // buttons work on their own (the clipboard API, or a hidden textarea).
  return (type === "copy" || type === "cut") && !closest(target, EDITABLE);
}

export const isPrintShortcut = (event) => Boolean(event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === "p";

// A deterrent for casual copying, not a protection: browser tools and
// screenshots (the system's, which no page can stop) still reach what is on screen. Access stays the server's.
export function installUiLock() {
  const locked = () => isLockedEnvironment(getEnvironment());
  const block = (event) => {
    if (locked() && shouldBlock(event.type, event.target)) event.preventDefault();
  };
  ["contextmenu", "copy", "cut", "dragstart"].forEach((type) => document.addEventListener(type, block));
  ["paste", "drop"].forEach((type) =>
    document.addEventListener(type, (event) => {
      if (locked() && closest(event.target, SENSITIVE)) event.preventDefault();
    }),
  );
  // The print shortcut only: the app's own print buttons (receipts, reports) still work.
  document.addEventListener("keydown", (event) => {
    if (locked() && isPrintShortcut(event)) event.preventDefault();
  });
  const mark = () => document.documentElement.classList.toggle("ui-locked", locked());
  mark();
  onEnvironmentChange(mark);
}
