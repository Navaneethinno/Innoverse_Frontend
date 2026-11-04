// Enter in a search box searches; it never submits the form around it (which
// is what asked "are you sure?" on forms with a confirmation). Every search
// input is type="search". A box's own Enter handler still runs first.
export function installSearchEnterGuard(root = document) {
  const onKey = (event) => {
    if (event.key !== "Enter") return;
    const input = event.target;
    if (input?.tagName === "INPUT" && input.type === "search" && input.form) event.preventDefault();
  };
  root.addEventListener("keydown", onKey);
  return () => root.removeEventListener("keydown", onKey);
}
