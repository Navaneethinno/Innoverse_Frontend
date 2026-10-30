// The guide's topics: short tours built from the same `data-tour` markers
// and texts (tour namespace) as the old "Take a tour", grouped by what the
// user wants to learn. A step whose marker isn't on the page is dropped, so
// a topic with no steps left isn't offered.
//
// A step: { id, target, placement?, icon?, practice?, click?, center?, body? }
//  - practice: { event: "input" | "click", tip } — the step waits for the
//    user to do it on the highlighted element, then moves on by itself.
//  - click: a selector clicked on Next (Add, so the topic walks into the form).
//  - center: a card with no target; `body: "approvalFlow"` draws the diagram.

import {
  ArrowUpDown,
  BookOpen,
  ChevronsRight,
  Eye,
  GitBranch,
  History,
  ListFilter,
  Maximize2,
  MousePointerClick,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Rows3,
  Save,
  Search,
  Send,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Table2,
  TextCursorInput,
  ToggleLeft,
  Trash2,
} from "lucide-react";
import { ACTION_STEPS, FOOTER_STEPS, LIST_STEPS, PAGE_TOURS, PAGE_TITLE, sel } from "@/Components/Tour/tourSteps";

export const ICONS = {
  pageIntro: BookOpen,
  viewSwitch: ToggleLeft,
  statusTabs: ListFilter,
  search: Search,
  sort: ArrowUpDown,
  table: Table2,
  viewAll: Maximize2,
  pagination: ChevronsRight,
  pageSize: Rows3,
  rowActions: MousePointerClick,
  action_view: Eye,
  action_edit: Pencil,
  action_audit: History,
  action_submit: Send,
  action_authorize: ShieldCheck,
  action_reject: ShieldOff,
  action_deactivate: PowerOff,
  action_reactivate: Power,
  action_delete: Trash2,
  add: Plus,
  makerChecker: GitBranch,
  field: TextCursorInput,
  saveDraft: Save,
  saveSubmit: Send,
  formSave: Save,
  page: Sparkles,
};

const find = (target) => (typeof target === "string" ? document.querySelector(target) : target);
export const present = (step) => step.center || Boolean(find(step.target));

// The page's tour key, as the old tour reads it: the last path segment
// (dashes dropped) with its own steps, else the first segment.
export const slugOf = (path) => {
  const parts = path.split("/").filter(Boolean).map((p) => p.replace(/-/g, ""));
  return [...parts].reverse().find((p) => PAGE_TOURS[p]) ?? parts[0] ?? "";
};

const PRACTICE = {
  search: { event: "input", tip: "practiceSearch" },
  statusTabs: { event: "click", tip: "practiceTabs" },
};

const listStep = (id) => {
  const step = LIST_STEPS.find((s) => s.id === id);
  return { ...step, practice: PRACTICE[id] };
};

const APPROVAL_FLOW = { id: "makerChecker", center: true, body: "approvalFlow" };
// The Add button: the marker itself when it is the button, else the last
// button of the page's actions slot (other actions sit before it).
function addButton() {
  const marker = document.querySelector(sel("add"));
  if (!marker || marker.matches("button")) return marker;
  const buttons = marker.querySelectorAll("button");
  return buttons[buttons.length - 1] ?? null;
}
const addStep = () => {
  const button = addButton();
  return { id: "addOpens", target: button ?? sel("add"), placement: "bottom-end", click: button, icon: "add" };
};

// Each topic's steps for the page that is open (before dropping the absent).
export const TOPICS = [
  {
    key: "find",
    icon: Search,
    steps: () => ["pageIntro", "viewSwitch", "statusTabs", "search", "sort", "table", "viewAll", "pagination", "pageSize"].map(listStep),
  },
  { key: "actions", icon: MousePointerClick, steps: () => [listStep("rowActions"), ...ACTION_STEPS] },
  {
    key: "page",
    icon: Sparkles,
    steps: (slug) => (PAGE_TOURS[slug]?.list ?? []).map((s) => ({ ...s, icon: "page" })),
  },
  {
    key: "approval",
    icon: GitBranch,
    steps: () => [APPROVAL_FLOW, ...ACTION_STEPS.filter((s) => /submit|authorize|reject/.test(s.id))],
    always: true,
  },
  { key: "add", icon: Plus, steps: () => [addStep(), { id: "formLoading", center: true }] },
];

export const FULL = {
  key: "full",
  icon: BookOpen,
  steps: (slug) => {
    const [find, actions, page, approval, add] = TOPICS.map((topic) => topic.steps(slug));
    return [...find, ...page, ...actions, approval[0], ...add];
  },
};

export const topicByKey = (key) => (key === "full" ? FULL : TOPICS.find((topic) => topic.key === key));

// The topic's steps that are on the page now.
export function availableSteps(topic, slug) {
  // The form placeholder only stays behind Add.
  const steps = topic
    .steps(slug)
    .filter(present)
    .filter((s, i, all) => s.id !== "formLoading" || all[i - 1]?.click);
  // Only the approval card and the placeholder are left: no topic here.
  if (!topic.always && steps.every((s) => s.center)) return [];
  return steps;
}

// The steps of the form now open: the page's own walkthrough if it has one,
// else one step per field found; then how to save.
export function formSteps(slug, discovered) {
  const own = PAGE_TOURS[slug]?.form;
  const fields = own?.length ? own.filter(present) : discovered.map((s) => ({ ...s, icon: "field" }));
  const footer = FOOTER_STEPS.filter(present);
  const save = footer.length ? footer : document.querySelector(sel("modal-footer")) ? [{ id: "formSave", target: sel("modal-footer"), placement: "top" }] : [];
  return [...fields, ...save];
}

export { PAGE_TITLE, sel };
