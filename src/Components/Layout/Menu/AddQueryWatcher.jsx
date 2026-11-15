import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ownAddQuery } from "./goTo";

// ?action=add on every screen with an Add button (Admin_34 B4, Admin_35 §3),
// once for all: the Add button is the one with a plus in the page's add
// area (data-tour="add", from ListView / StatusFilterTabs or the button
// itself).
//   - The page opens with action=add: that button is clicked.
//   - The button is clicked: action=add is written.
//   - The form closes (its dialog goes, or the list with the button comes
//     back): action is removed.
// A screen that handles it itself (useAddQuery) is left alone; a locked
// menu has no Add button, so nothing opens.
const addButton = () =>
  [...document.querySelectorAll('[data-tour="add"] button, button[data-tour="add"]')].find(
    (b) => b.querySelector("svg.lucide-plus") && !b.disabled && !b.closest('[role="dialog"]'),
  ) ?? null;
const dialogOpen = () => Boolean(document.querySelector('[role="dialog"]'));

export function AddQueryWatcher() {
  const [, setParams] = useSearchParams();

  useEffect(() => {
    let watching = null;
    const set = (on) =>
      setParams(
        (p) => {
          if ((p.get("action") === "add") === on) return p;
          const q = new URLSearchParams(p);
          if (on) q.set("action", "add");
          else q.delete("action");
          return q;
        },
        { replace: true },
      );
    // Open until neither a dialog nor a missing Add button says so.
    const watch = () => {
      clearInterval(watching);
      let seenOpen = false;
      watching = setInterval(() => {
        const open = dialogOpen() || !addButton();
        if (open) seenOpen = true;
        else if (seenOpen) {
          clearInterval(watching);
          set(false);
        }
      }, 400);
    };
    const onClick = (event) => {
      if (ownAddQuery()) return;
      const b = event.target.closest?.("button");
      if (b && b === addButton()) {
        set(true);
        watch();
      }
    };
    document.addEventListener("click", onClick, true);

    // Opened with action=add: wait for the page's Add button, then press it.
    let tries = 0;
    const asked = new URLSearchParams(window.location.search).get("action") === "add";
    const opener = asked
      ? setInterval(() => {
          tries += 1;
          if (ownAddQuery()) return clearInterval(opener);
          const b = addButton();
          if (b) {
            clearInterval(opener);
            b.click();
          } else if (tries > 25) {
            clearInterval(opener);
            set(false);
          }
        }, 300)
      : null;

    return () => {
      document.removeEventListener("click", onClick, true);
      clearInterval(watching);
      clearInterval(opener);
    };
  }, [setParams]);
  return null;
}
