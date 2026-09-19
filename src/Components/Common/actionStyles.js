// One color per action *intent* (not just per action name) so every
// Actions-column button across the app is visually distinct at a glance —
// view/edit/audit/submit used to all share the same blue, which made a row
// of icons look like one repeated button instead of four different actions.
export const actionButtonClass = (method) => {
  const colors = {
    view: "text-blue-600 hover:bg-blue-50", // info — look, don't touch
    edit: "text-violet-600 hover:bg-violet-50", // modify the record
    audit: "text-slate-500 hover:bg-slate-100", // neutral — look at history
    submit: "text-teal-600 hover:bg-teal-50", // forward it into the workflow
    auth: "text-emerald-600 hover:bg-emerald-50", // approve
    deauth: "text-amber-600 hover:bg-amber-50", // reject/undo approval
    delete: "text-red-600 hover:bg-red-50", // destructive
    deleteAuth: "text-red-600 hover:bg-red-50",
    deactivate: "text-orange-600 hover:bg-orange-50",
    reactivate: "text-emerald-600 hover:bg-emerald-50",
  };
  return `rounded-lg p-1.5 ${colors[method] ?? colors.view}`;
};
