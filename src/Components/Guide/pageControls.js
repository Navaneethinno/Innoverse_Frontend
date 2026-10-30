// Reads what is actually on the open page, so the guide can explain this
// page's own controls (its toolbar buttons, filters, switches, tabs and
// table columns) by their real labels, and so "What's this?" can explain
// any element under the pointer.

import i18n from "i18next";
import { PAGE_HELP } from "./pageHelp";

const t = (key, vars) => i18n.t(`guide:${key}`, vars);
const tour = (key) => (i18n.exists(`tour:${key}`) ? i18n.t(`tour:${key}`) : "");

const visible = (el) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
};
const clean = (text) => String(text ?? "").replace(/\s+/g, " ").trim();

// The page itself: the workspace, never the sidebar, top bar or an open modal.
export const workspace = () => document.querySelector('[data-tour="workspace"]');

export const labelOf = (el) => clean(el.getAttribute("aria-label") || el.textContent || el.getAttribute("title") || el.getAttribute("placeholder") || "").slice(0, 60);

// What kind of control an element is, and the sentence that explains it.
export function kindOf(el) {
  const role = el.getAttribute("role");
  if (role === "switch" || el.matches('input[type="checkbox"]')) return "switch";
  if (role === "tab") return "tab";
  if (el.matches("th")) return "column";
  if (el.matches('input[type="date"], [data-date-input]')) return "date";
  if (el.matches("input, textarea")) return "input";
  if (el.matches("select, [aria-haspopup='listbox'], [role='combobox']")) return "select";
  if (el.matches("a")) return "link";
  return "button";
}

// Markers that group several controls of one kind (one step for the group).
const GROUPS = new Set(["status-tabs", "view-switch"]);
// Closing a banner or a notice is not worth a step.
const DISMISS = /^(close|dismiss|fechar|×)$/i;

// The marker that speaks for an element: its own, or a group's. A marker
// around several different controls (the page's actions slot) speaks for
// none of them; each is explained by its own label.
function markerOf(el) {
  const marker = el.closest("[data-tour]");
  if (!marker) return null;
  const name = marker.getAttribute("data-tour");
  if (marker === el || GROUPS.has(name) || marker.querySelectorAll(INTERACTIVE).length <= 1) return marker;
  return null;
}

// The tour's own text for a marked element (data-tour="action-view" reads
// tour:action_viewTitle / Body), when there is one.
function markedText(el) {
  const marker = markerOf(el)?.getAttribute("data-tour");
  if (!marker) return null;
  const id = marker.replace(/-/g, "_").replace(/^action_/, "action_");
  const camel = marker.replace(/-(\w)/g, (_, c) => c.toUpperCase());
  for (const key of [id, camel]) {
    const body = tour(`${key}Body`);
    if (body) return { title: tour(`${key}Title`) || labelOf(el), content: body.replace(/\{\{page\}\}/g, t("thisPage")) };
  }
  return null;
}

// The open page's key in PAGE_HELP: its last path segment without dashes.
export const pageKey = () => (window.location.pathname.split("/").filter(Boolean).pop() ?? "").replace(/-/g, "").toLowerCase();

// Written help for a label on this page, else the shared one.
export const writtenHelp = (label) => {
  const key = String(label ?? "").toLowerCase();
  return PAGE_HELP[pageKey()]?.[key] ?? PAGE_HELP._common[key] ?? null;
};

// The page's own introduction, when one is written.
export const pageAbout = () => PAGE_HELP[pageKey()]?.about ?? null;

// { title, content } for any element: its written help if there is one,
// else the tour's text, else its label, its tooltip and what kind of
// control it is.
export function explain(el) {
  const written = writtenHelp(labelOf(el));
  if (written) return { title: labelOf(el), content: written };
  const marked = markedText(el);
  if (marked) return marked;
  const kind = kindOf(el);
  const label = labelOf(el);
  const tip = clean(el.getAttribute("title"));
  const lead = tip && tip !== label ? `${tip}. ` : "";
  return { title: label || t(`kind_${kind}`), content: `${lead}${t(`explain_${kind}`, { label })}` };
}

const INTERACTIVE = 'button, a[href], input:not([type=hidden]), select, textarea, [role="tab"], [role="switch"], [role="combobox"], th';

// The element "What's this?" explains under the pointer: the nearest
// control or column heading inside the page or an open dialog.
export function controlAt(target) {
  const el = target?.closest?.(INTERACTIVE) ?? target?.closest?.("[data-tour]");
  if (!el || el.closest("[data-guide-ui]")) return null;
  return el;
}

// One step per control of the page's header and toolbars (not the rows, not
// the sidebar), then one for the table's columns. Tabs of one bar are one step.
export function pageControlSteps() {
  const root = workspace();
  if (!root) return [];
  const steps = [];
  const seen = new Set();
  const groups = new Set();
  const about = pageAbout();
  const heading = root.querySelector("h1");
  if (about && heading) steps.push({ id: "pc_about", target: heading, icon: "pageIntro", title: labelOf(heading), content: about });
  for (const el of root.querySelectorAll(INTERACTIVE)) {
    if (!visible(el) || el.matches("th") || el.closest("tbody, tfoot, [data-tour='row-actions'], [data-tour='pagination'], [data-guide-ui]")) continue;
    if (el.closest("[role=tablist]")) {
      const bar = el.closest("[role=tablist]");
      if (groups.has(bar)) continue;
      groups.add(bar);
      const names = [...bar.querySelectorAll("[role=tab]")].map(labelOf).filter(Boolean);
      steps.push({ id: `pc_${steps.length}`, target: bar, icon: "page", title: t("tabsTitle"), content: t("tabsBody", { names: names.join(", ") }) });
      continue;
    }
    const label = labelOf(el);
    if (!label || label.length < 2 || DISMISS.test(label)) continue;
    // A group (status tabs, the view switch) is one step, on the whole group.
    const marker = markerOf(el);
    const group = marker && GROUPS.has(marker.getAttribute("data-tour")) ? marker : null;
    const key = group ? `group:${group.getAttribute("data-tour")}` : label;
    if (seen.has(key)) continue;
    seen.add(key);
    const { title, content } = explain(el);
    steps.push({ id: `pc_${steps.length}`, target: group ?? el, icon: "page", title, content });
    if (steps.length >= 14) break;
  }
  const head = root.querySelector("table thead");
  if (head && visible(head)) {
    const cols = [...head.querySelectorAll("th")].map(labelOf).filter(Boolean);
    if (cols.length) steps.push({ id: "pc_columns", target: head, icon: "table", title: t("columnsTitle"), content: t("columnsBody", { names: cols.join(", ") }) });
    // Columns with written help get a step of their own.
    for (const th of head.querySelectorAll("th")) {
      const help = PAGE_HELP[pageKey()]?.[labelOf(th).toLowerCase()];
      if (help) steps.push({ id: `pc_col_${steps.length}`, target: th, icon: "table", title: labelOf(th), content: help });
    }
  }
  return steps;
}
