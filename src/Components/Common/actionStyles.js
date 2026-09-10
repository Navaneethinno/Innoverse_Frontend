export const actionButtonClass = (method) => {
  const colors = {
    view: "text-blue-600 hover:bg-blue-50",
    edit: "text-blue-600 hover:bg-blue-50",
    submit: "text-blue-600 hover:bg-blue-50",
    auth: "text-emerald-600 hover:bg-emerald-50",
    deauth: "text-amber-600 hover:bg-amber-50",
    delete: "text-red-600 hover:bg-red-50",
    deleteAuth: "text-red-600 hover:bg-red-50",
    deactivate: "text-orange-600 hover:bg-orange-50",
    reactivate: "text-emerald-600 hover:bg-emerald-50",
  };
  return `rounded-lg p-1.5 ${colors[method] ?? colors.view}`;
};
