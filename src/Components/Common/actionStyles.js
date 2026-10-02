// One color per action *intent* (not just per action name) so every
// Actions-column button across the app is visually distinct at a glance —
// view/edit/audit/submit used to all share the same blue, which made a row
// of icons look like one repeated button instead of four different actions.
const ACTION_COLORS = {
  view: "text-blue-600 hover:bg-blue-50", // info — look, don't touch
  edit: "text-indigo-600 hover:bg-indigo-50", // modify the record
  audit: "text-slate-600 hover:bg-slate-100", // neutral — look at history
  submit: "text-cyan-600 hover:bg-cyan-50", // forward it into the workflow
  auth: "text-emerald-600 hover:bg-emerald-50", // approve
  deauth: "text-amber-600 hover:bg-amber-50", // reject/undo approval
  delete: "text-red-600 hover:bg-red-50", // destructive
  deleteAuth: "text-red-600 hover:bg-red-50",
  deactivate: "text-orange-600 hover:bg-orange-50",
  reactivate: "text-emerald-600 hover:bg-emerald-50",
  // Page-specific row actions (Limit groups...).
  rules: "text-cyan-700 hover:bg-cyan-50",
  members: "text-indigo-700 hover:bg-indigo-50",
  test: "text-amber-700 hover:bg-amber-50",
  clone: "text-violet-700 hover:bg-violet-50",
  statement: "text-teal-700 hover:bg-teal-50",
};

export const actionButtonClass = (method) => `rounded-lg p-1.5 ${ACTION_COLORS[method] ?? ACTION_COLORS.view}`;
