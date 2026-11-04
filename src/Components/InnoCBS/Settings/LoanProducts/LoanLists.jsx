import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { Button } from "@/Components/Common/Button";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { usePagePermission } from "@/Hooks/usePermission";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { loanProductGroupsApi, loanPurposesApi } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { inputClass, labelClass } from "../../Deposits/depositShared";
import { Field } from "../../Loans/loanShared";

// Loan Products › Groups and Purposes: small lists saved at once (no
// checker). A product names one group (short, medium, long term: for
// reports); an application picks its purpose from the list. Edit and delete
// follow each row's `actions`; a group in use can't be deleted.
const KINDS = {
  groups: {
    api: loanProductGroupsApi,
    titleKey: "productGroups",
    hintKey: "productGroupsHint",
    blank: { code: "", name: "", description: "", minimum_term_months: "0", maximum_term_months: "0", priority: "1" },
    fields: [
      ["code", "code"],
      ["name", "text"],
      ["description", "text"],
      ["minimum_term_months", "int"],
      ["maximum_term_months", "int"],
      ["priority", "int"],
    ],
    extra: (r, t) => (r.products ? t("groupProducts", { count: r.products }) : ""),
  },
  purposes: {
    api: loanPurposesApi,
    titleKey: "loanPurposes",
    hintKey: "loanPurposesHint",
    blank: { code: "", name: "", priority: "1" },
    fields: [
      ["code", "code"],
      ["name", "text"],
      ["priority", "int"],
    ],
    extra: () => "",
  },
};

const NUMERIC = new Set(["minimum_term_months", "maximum_term_months", "priority"]);
const bodyOf = (fields, form) => Object.fromEntries(fields.map(([key]) => [key, NUMERIC.has(key) ? Number(form[key]) || 0 : String(form[key] ?? "").trim()]));

export function LoanLists({ kind, scope, onClose }) {
  const { t } = useTranslation("loans");
  const can = usePagePermission();
  const spec = KINDS[kind];
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    spec.api
      .list(scope({ active_only: false }))
      .then((r) => setRows(rowsOf(r)))
      .catch((e) => {
        setError(e.message);
        setRows([]);
      });
  }, [spec.api, scope]);
  useEffect(() => load(), [load]);

  const run = async (verb, body) => {
    setBusy(true);
    setError("");
    try {
      const r = await spec.api[verb](scope(body));
      notifications.success(r?.message ?? t("saved"));
      setEditing(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} size="lg" title={t(spec.titleKey)}>
      <div className="grid gap-3">
        <p className="text-xs text-muted-foreground">{t(spec.hintKey)}</p>
        {!rows ? (
          <Spinner size={18} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead className="border-b border-border text-left text-[10px] font-bold uppercase text-muted-foreground">
                <tr>
                  {spec.fields.map(([key]) => (
                    <th key={key} className="px-3 py-2">
                      {t(`list_${key}`)}
                    </th>
                  ))}
                  <th className="px-3 py-2">{t("status")}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {!rows.length && (
                  <tr>
                    <td colSpan={spec.fields.length + 2} className="px-3 py-4 text-muted-foreground">
                      {t("nothingYet")}
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 last:border-0">
                    {spec.fields.map(([key]) => (
                      <td key={key} className={cn("px-3 py-1.5", key === "code" && "font-mono font-bold")}>
                        {r[key] ?? "—"}
                        {key === "name" && spec.extra(r, t) && <span className="block text-[10px] text-muted-foreground">{spec.extra(r, t)}</span>}
                      </td>
                    ))}
                    <td className="px-3 py-1.5">
                      <StatusBadge status={Number(r.status) === 1 ? "ACTIVE" : "INACTIVE"} variant="subtle" />
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="flex justify-end gap-1">
                        {r.actions?.edit && <ActionIconButton label={t("edit")} intent="edit" icon={Pencil} onClick={() => setEditing({ ...r })} />}
                        {r.actions?.delete && <ActionIconButton label={t("delete")} intent="delete" icon={Trash2} onClick={() => void run("delete", { id: r.id })} />}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {editing ? (
          <div className="grid gap-3 rounded-xl border border-border p-3">
            <div className="grid gap-3 sm:grid-cols-3">
              {spec.fields.map(([key, type]) => (
                <label key={key} className={labelClass}>
                  {t(`list_${key}`)}
                  <Field field={{ key, type }} value={String(editing[key] ?? "")} disabled={key === "code" && Boolean(editing.id)} onChange={(v) => setEditing((f) => ({ ...f, [key]: v }))} />
                </label>
              ))}
              {editing.id && (
                <label className={labelClass}>
                  {t("status")}
                  <Field
                    field={{ type: "select", options: [{ value: "1", label: t("active") }, { value: "13", label: t("inactive") }] }}
                    value={String(editing.status ?? 1)}
                    onChange={(v) => setEditing((f) => ({ ...f, status: Number(v) }))}
                  />
                </label>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                {t("cancel")}
              </Button>
              <Button
                size="sm"
                loading={busy}
                disabled={!String(editing.code ?? "").trim() || !String(editing.name ?? "").trim()}
                onClick={() => void run(editing.id ? "edit" : "add", { ...(editing.id ? { id: editing.id, status: Number(editing.status ?? 1) } : {}), ...bodyOf(spec.fields, editing) })}
              >
                {t("save")}
              </Button>
            </div>
          </div>
        ) : (
          can("Add") && (
            <div>
              <Button size="sm" variant="outline" icon={Plus} onClick={() => setEditing({ ...spec.blank })}>
                {t("addOne")}
              </Button>
            </div>
          )
        )}
        {error && <p className={cn(inputClass, "border-red-200 bg-red-50 text-xs font-semibold text-red-700")}>{error}</p>}
      </div>
    </Modal>
  );
}
