// Builds form-walkthrough steps from whatever form is open, so every menu's
// Add form gets a tour without one being written for it: one step per
// visible field, titled with the field's own (already translated) label and
// explained by its hint text, or by what kind of control it is.

const MAX_FIELDS = 14;
const CONTROL = "input:not([type=hidden]), textarea, select, button";
const FIELD = "label, fieldset, [data-tour-field]";

const visible = (el) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
};

// Where the form is: the open modal's body, else the page itself.
export function formRoot() {
  const bodies = [...document.querySelectorAll('[data-tour="modal-body"]')].filter(visible);
  return bodies[bodies.length - 1] ?? document.querySelector('[data-tour="workspace"]');
}

// The field's label text, without its control, hint or required star.
function labelOf(el) {
  const legend = el.matches("fieldset") ? el.querySelector(":scope > legend") : null;
  const copy = (legend ?? el).cloneNode(true);
  copy.querySelectorAll(`${CONTROL}, [role=listbox], ul, table, .text-muted-foreground, [class*="text-[11px]"], [class*="text-[10px]"]`).forEach((n) => n.remove());
  return copy.textContent.replace(/\*/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
}

function hintOf(el) {
  const hint = [...el.querySelectorAll('.text-muted-foreground, [class*="text-[11px]"]')].find((n) => !n.querySelector(CONTROL) && n.textContent.trim().length > 12);
  return hint?.textContent.replace(/\s+/g, " ").trim() ?? "";
}

function kindOf(el) {
  if (el.matches("fieldset")) return "group";
  const c = el.querySelector("input:not([type=hidden]), textarea, select") ?? el.querySelector("button");
  if (!c) return null;
  if (c.matches("textarea")) return "textarea";
  if (c.matches("select, button")) return "select";
  const type = (c.getAttribute("type") ?? "text").toLowerCase();
  if (["checkbox", "radio"].includes(type)) return "checkbox";
  if (["date", "datetime-local", "month", "time"].includes(type)) return "date";
  if (type === "number") return "number";
  if (type === "file") return "file";
  if (type === "color") return "color";
  return "text";
}

// [{ target: Element, title, content }] for the current form, in page order.
export function discoverFieldSteps(t) {
  const root = formRoot();
  if (!root) return [];
  const all = [...root.querySelectorAll(FIELD)].filter(visible);
  // A field inside another field (a label in a fieldset) is covered by it.
  const top = all.filter((el) => !all.some((other) => other !== el && other.contains(el)));
  return top
    .map((el) => {
      const kind = kindOf(el);
      const title = labelOf(el);
      if (!kind || !title) return null;
      const control = el.querySelector("input:not([type=hidden]), textarea, select, button");
      const required = Boolean(el.querySelector(".text-red-500, .text-destructive")) || control?.required;
      const locked = control?.disabled;
      const lead = hintOf(el) || t(`field_${kind}`);
      const tail = locked ? t("fieldLocked") : required ? t("fieldRequired") : t("fieldOptional");
      return { target: el, title, content: `${lead} ${tail}` };
    })
    .filter(Boolean)
    .slice(0, MAX_FIELDS);
}
