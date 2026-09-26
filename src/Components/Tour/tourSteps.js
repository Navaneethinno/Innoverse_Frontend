// Guided tours. Every step points at a `data-tour` marker, so one set of
// steps covers every screen built from the shared parts (StatusFilterTabs,
// DataTable, RowActions, LifecycleList, FormFooter): a step whose marker
// isn't on the page (no Add permission, no rows yet, a page without search)
// is dropped when the tour starts.
//
// A step: { id, target, placement?, click?, center? }
//  - id: its text is tour:<id>Title / tour:<id>Body (<id>Body may use
//    {{page}}, the page's own title).
//  - click: a selector clicked when the user presses Next — e.g. the Add
//    button, so the tour walks on into the form. The steps after it are
//    kept even though their markers only appear once the form opens.
//  - center: a free-standing explainer card with no target.

export const sel = (name) => `[data-tour="${name}"]`;

// The list: header, tabs, search, sort, table, the first row's actions.
export const LIST_STEPS = [
  { id: "pageIntro", target: sel("page-title"), placement: "bottom-start" },
  { id: "statusTabs", target: sel("status-tabs"), placement: "bottom-start" },
  { id: "search", target: sel("search"), placement: "bottom" },
  { id: "sort", target: sel("sort"), placement: "bottom-end" },
  { id: "table", target: sel("table"), placement: "top" },
  { id: "rowActions", target: sel("row-actions"), placement: "left" },
];

// Each row action the first row actually shows, in RowActions' order.
export const ACTION_STEPS = ["view", "edit", "audit", "submit", "authorize", "reject", "deactivate", "reactivate", "delete"].map((name) => ({
  id: `action_${name}`,
  target: sel(`action-${name}`),
  placement: "left",
}));

export const MAKER_CHECKER_STEP = { id: "makerChecker", center: true };

export const ADD_STEP = { id: "add", target: sel("add"), placement: "bottom-end" };

// Closing steps of any add/edit form that uses the shared FormFooter.
export const FOOTER_STEPS = [
  { id: "saveDraft", target: sel("save-draft"), placement: "top" },
  { id: "saveSubmit", target: sel("save-submit"), placement: "top" },
];

// Page-specific steps, keyed by the page's route slug (the first path
// segment). `form` is walked after Add is clicked; `list` is shown after
// the generic list steps.
export const PAGE_TOURS = {
  individualrisk: {
    form: [
      { id: "risk_institution", target: sel("field-institution"), placement: "bottom-start" },
      { id: "risk_code", target: sel("field-code"), placement: "bottom" },
      { id: "risk_customerType", target: sel("risk-customer-type"), placement: "bottom" },
      { id: "risk_criteria", target: sel("risk-criteria"), placement: "top" },
      { id: "risk_addCriterion", target: sel("risk-add-criterion"), placement: "left" },
      { id: "risk_weightTotal", target: sel("risk-weight-total"), placement: "bottom" },
      { id: "risk_levelBar", target: sel("risk-level-bar"), placement: "top" },
      { id: "risk_levelRows", target: sel("risk-level-rows"), placement: "top" },
    ],
  },
};
