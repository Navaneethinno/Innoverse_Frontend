// Reads what is actually on the open page (or the window open over it), so
// the guide can explain its own controls (toolbar buttons, filters,
// switches, tabs, table columns, a form's fields) by their real labels, and
// so "What's this?" can explain any element pointed at or tapped.

import i18n from "i18next";
import { PAGE_HELP, PAGE_HELP_TEXT } from "./pageHelp";
import { discoverFieldSteps } from "./discoverFields";

const t = (key, vars) => i18n.t(`guide:${key}`, vars);
const tour = (key) => (i18n.exists(`tour:${key}`) ? i18n.t(`tour:${key}`) : "");

const visible = (el) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
};
const clean = (text) => String(text ?? "").replace(/\s+/g, " ").trim();

// The page itself: the workspace, never the sidebar or top bar.
export const workspace = () => document.querySelector('[data-tour="workspace"]');

// The window open over the page (its header, fields and buttons), if any.
export function openWindow() {
  const bodies = [...document.querySelectorAll('[data-tour="modal-body"]')].filter(visible);
  const body = bodies[bodies.length - 1];
  return body ? (body.parentElement ?? body) : null;
}

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

const lang = () => String(i18n.resolvedLanguage ?? i18n.language ?? "en").slice(0, 2);

// Labels are shown in the user's language; the help is keyed by the English
// label. The app's own translations lead back: the text found in the
// user's language, then the same key's English text. Built once per language.
const reverse = new Map();
// Every English text the label may stand for (one translation can serve several).
function englishOf(label) {
  const code = lang();
  if (code === "en") return [label];
  if (!reverse.has(code)) {
    const map = new Map();
    const walk = (node, ns, path) => {
      for (const [k, v] of Object.entries(node ?? {})) {
        const key = path ? `${path}.${k}` : k;
        if (typeof v === "string") {
          const en = i18n.getResource("en", ns, key);
          if (typeof en === "string") map.set(v.toLowerCase(), [...new Set([...(map.get(v.toLowerCase()) ?? []), en])]);
        } else if (v && typeof v === "object") walk(v, ns, key);
      }
    };
    for (const [ns, data] of Object.entries(i18n.store?.data?.[code] ?? {})) walk(data, ns, "");
    reverse.set(code, map);
  }
  return reverse.get(code).get(String(label).toLowerCase()) ?? [label];
}

// One entry of a page's help in the user's language, else in English.
const helpEntry = (page, key) => PAGE_HELP_TEXT[lang()]?.[page]?.[key] ?? PAGE_HELP[page]?.[key] ?? null;

// The heading of the page (or of the window open over it).
const headingText = () => labelOf(workspace()?.querySelector("h1") ?? document.createElement("i"));

// Written help for a label on this page, else the shared one. A master-data
// list explains its Add button and Individual / Corporate views by template.
export const writtenHelp = (label) => {
  const page = pageKey();
  for (const english of englishOf(label)) {
    const key = String(english ?? "").toLowerCase();
    if (PAGE_HELP[page]?.master) {
      if (key.startsWith("add ")) return t("masterAdd", { name: headingText() });
      if (key === "individual" || key === "corporate") return t(`master_${key}`);
    }
    const help = helpEntry(page, key) ?? helpEntry("_common", key);
    if (help) return help;
  }
  return null;
};

// A button that only closes a banner or a notice, in any language.
const dismisses = (label) => englishOf(label).some((english) => DISMISS.test(english));

// The page's own introduction, when one is written.
export const pageAbout = () => {
  const page = pageKey();
  if (PAGE_HELP[page]?.master) return t("masterAbout", { name: headingText() });
  return helpEntry(page, "about");
};

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

// The open window's steps: one per field (its label and hint, or written
// help), then its buttons.
function windowSteps(win) {
  const steps = discoverFieldSteps(i18n.getFixedT(null, "tour")).map((s, i) => {
    const written = writtenHelp(s.title);
    return { ...s, id: `pc_f${i}`, icon: "field", ...(written ? { content: written } : {}) };
  });
  const seen = new Set(steps.map((s) => s.title));
  for (const el of win.querySelectorAll("button")) {
    const label = labelOf(el);
    if (!visible(el) || el.closest('[data-tour="modal-body"]') || !label || label.length < 2 || dismisses(label) || seen.has(label)) continue;
    seen.add(label);
    steps.push({ id: `pc_b${steps.length}`, target: el, icon: "page", ...explain(el) });
  }
  return steps;
}

// Whether the guide reads a window (a form) rather than the page.
export const readsWindow = () => Boolean(openWindow());

// One step per control of the page's header and toolbars (not the rows, not
// the sidebar), then one for the table's columns. Tabs of one bar are one
// step. With a window open over the page, its fields and buttons instead.
export function pageControlSteps() {
  const win = openWindow();
  if (win) return windowSteps(win);
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
    if (!label || label.length < 2 || dismisses(label)) continue;
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
      const help = englishOf(labelOf(th)).map((english) => helpEntry(pageKey(), String(english).toLowerCase())).find(Boolean);
      if (help) steps.push({ id: `pc_col_${steps.length}`, target: th, icon: "table", title: labelOf(th), content: help });
    }
  }
  return steps;
}
