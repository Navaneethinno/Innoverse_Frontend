import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/Components/Common/Button";
import { ListTable } from "@/Components/Common/ListView";
import { NoAccess } from "@/Components/Common/NoAccess";
import { PageTitle } from "@/Components/Common/PageTitle";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { OpDialog, useL, words } from "@/Components/InnoCBS/cbsOps";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { notifications } from "@/Utils/Lib/notifications";

export const Status = ({ code }) => (code ? <StatusBadge status={code} label={words(code)} variant="subtle" /> : "—");
export const isPending = (r) => ["PENDING", "PENDING_APPROVAL"].includes(r?.status);

// Runs a call, shows its message, then `after`.
export const runCall = (call, body, after) =>
  call(body)
    .then((x) => {
      notifications.success(x?.message ?? "OK");
      after?.(x);
    })
    .catch((e) => notifications.error(e.message));

// An operation screen from a spec: the list, toolbar buttons and per-row
// buttons. A button either calls at once (`call`, `body`) or opens an
// OpDialog (`dialog`: its props, `run(form)` gets the row as 2nd argument).
// `right` is the menu right the button needs. When the row carries `actions`,
// the flag named `flag` (default: the key) decides; otherwise `show(row)`.
//   toolbar: [{ key, label, icon, right, variant, call, body, dialog }]
//   rowActions: (row) => [same, plus show]
export function OpsList({ api, call, title, sub, columns, toolbar = [], rowActions, rowKey = (r) => r.id, above, prefix = "", emptyTitle, enabled = true, select = null, extra = null }) {
  const L = useL();
  const { t } = useTranslation("common");
  const can = usePagePermission();
  const [dialog, setDialog] = useState(null);
  const list = useServerList({ api: api.listPath, call: call ?? api.list, prefix, describe: false, enabled, select, extra });
  if (!can("View")) return <NoAccess />;
  const allowed = (b) => b && (!b.right || can(b.right));
  const press = (b, row) => {
    if (b.onPress) b.onPress(row);
    else if (b.dialog) setDialog({ ...b.dialog, row });
    else runCall(b.call, typeof b.body === "function" ? b.body(row) : b.body, list.reload);
  };
  const buttons = toolbar.filter(allowed);
  const cols = [
    ...columns,
    ...(rowActions
      ? [
          {
            key: "_actions",
            label: t("actions"),
            sortable: false,
            render: (r) => (
              <span className="flex flex-wrap gap-1">
                {rowActions(r)
                  .filter((b) => allowed(b) && (r.actions && typeof r.actions === "object" && (b.flag ?? b.key) in r.actions ? r.actions[b.flag ?? b.key] === true : !b.show || b.show(r)))
                  .map((b) => (
                    <Button key={b.key} size="sm" variant={b.variant ?? "ghost"} icon={b.icon} onClick={() => press(b, r)}>
                      {b.label}
                    </Button>
                  ))}
              </span>
            ),
          },
        ]
      : []),
  ];
  return (
    <div className="pt-1 pb-6">
      {title && <PageTitle>{L(title)}</PageTitle>}
      {sub && <p className="mt-1 mb-4 text-sm text-muted-foreground">{L(sub)}</p>}
      {above?.(list)}
      <ListTable
        list={list}
        rowKey={rowKey}
        title={L(title ?? "")}
        emptyTitle={emptyTitle ?? L("Nothing yet")}
        actions={
          buttons.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {buttons.map((b, i) => (
                <Button key={b.key} size="sm" variant={b.variant ?? (i === buttons.length - 1 ? "primary" : "secondary")} icon={b.icon} onClick={() => press(b)}>
                  {b.label}
                </Button>
              ))}
            </div>
          )
        }
        columns={cols}
      />
      {dialog && (
        <OpDialog
          {...dialog}
          fields={dialog.fields ?? []}
          run={(form) => dialog.run(form, dialog.row)}
          children={dialog.children ? (form, setForm) => dialog.children(form, setForm, dialog.row) : undefined}
          onClose={() => setDialog(null)}
          onDone={(reply) => {
            setDialog(null);
            dialog.after?.(reply);
            list.reload();
          }}
        />
      )}
    </div>
  );
}

// A list reply of { items, total } as rows.
export const itemsOf = (reply) => {
  const d = reply?.data;
  const o = Array.isArray(d) ? d[0] : d;
  return Array.isArray(o?.items) ? o.items : Array.isArray(d) ? d : [];
};
