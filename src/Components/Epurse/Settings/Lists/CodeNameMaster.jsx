import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { AuditModal } from "@/Components/Common/AuditModal";
import { mapAuditResponse } from "@/Components/Common/auditResponse";
import { Button } from "@/Components/Common/Button";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { ListTable } from "@/Components/Common/ListView";
import { Modal } from "@/Components/Common/Modal";
import { PageTitle } from "@/Components/Common/PageTitle";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { RowActions } from "@/Components/Common/RowActions";
import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";

const rowsOf = (r) => (Array.isArray(r?.data) ? r.data : (r?.data?.data ?? []));
const inputClass = "mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 outline-none focus:border-primary disabled:bg-muted";
const labelClass = "text-sm font-semibold text-slate-700";
// What the server records when the user leaves the narration empty.
const DEFAULT_NARRATION = { submit: "Submitted for review", auth: "approved", deauth: "UNDEFINED" };

// One master list with a code and a name (Religion, Province, Source of Fund...):
// add and edit under maker-checker, audit, and review of pending changes.
// `list` is the translation key of the list's name (masters:list_<list>);
// `fields` adds a yes/no field ({ key, kind: "bool" }) or a parent to choose
// ({ key, kind: "parent", parent: <its list key>, load }).
export function CodeNameMaster({ list: listKey, permission, idKey, api, endpoint, fields = [] }) {
  const { t } = useTranslation(["masters", "common"]);
  const name = t(`list_${listKey}`);
  const plural = t(`list_${listKey}_plural`);
  const idOf = (r) => r?.id ?? r?.[idKey];
  const blank = () => ({ code: "", name: "", description: "", ...Object.fromEntries(fields.map((f) => [f.key, f.kind === "bool" ? false : ""])) });
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(null);
  const [audit, setAudit] = useState(null);
  const [action, setAction] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const can = usePagePermission(permission);
  const list = useServerList({ api: endpoint, call: api.list });
  useLiveChannel(endpoint, () => list.reload());
  const pendingInfo = usePendingChanges(api.pending, action ? idOf(action.row) : null, Boolean(action) && ["auth", "deauth", "deleteAuth"].includes(action?.type));

  // Each parent's active choices, in the institution of the record being edited.
  const parentField = fields.find((f) => f.kind === "parent");
  const [parents, setParents] = useState([]);
  const scopeId = editing?.inst_profile_id;
  const loadParents = parentField?.load;
  useEffect(() => {
    if (!loadParents) return;
    loadParents({ view: "dropdown", ...(scopeId ? { inst_profile_id: Number(scopeId) } : {}) })
      .then((r) => setParents(rowsOf(r)))
      .catch((e) => notifications.error(e.message));
  }, [loadParents, scopeId]);
  const parentName = (id) => {
    const p = parents.find((x) => String(x.id ?? x[`${parentField.parent}_id`]) === String(id));
    return p?.name ?? (id || "—");
  };
  const show = (f, row) => (f.kind === "bool" ? t(row[f.key] ? "common:yes" : "common:no") : parentName(row[f.key]));

  const openForm = (row) => {
    setEditing(row);
    setForm(row ? { ...blank(), ...Object.fromEntries(Object.keys(blank()).map((k) => [k, typeof blank()[k] === "boolean" ? Boolean(row[k]) : String(row[k] ?? "")])) } : blank());
    setOpen(true);
  };

  const save = async (isDraft) => {
    if (!form.name.trim()) return notifications.error(t("nameRequired", { name }));
    if (parentField && !(Number(form[parentField.key]) > 0)) return notifications.error(t("chooseParent", { parent: t(`list_${parentField.parent}`) }));
    setSaving(true);
    try {
      const payload = {
        ...form,
        ...Object.fromEntries(fields.map((f) => [f.key, f.kind === "bool" ? Boolean(form[f.key]) : Number(form[f.key])])),
        is_draft: isDraft,
        ...(editing ? { id: idOf(editing), expected_updated_time: editing.updated_time } : {}),
      };
      const r = await (editing ? api.edit(payload) : api.add(payload));
      if (editing && (editing.auth_status === "DRAFT" || editing.process_status_name === "Draft") && !isDraft) {
        await api.submit({ id: idOf(editing), narration: DEFAULT_NARRATION.submit });
      }
      notifications.success(apiMessage(r, t("saved", { name })));
      setOpen(false);
      setEditing(null);
      setForm(blank());
      list.reload();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  // The user's narration is sent; the fixed text only when they leave it empty.
  const run = async () => {
    setActionPending(true);
    try {
      const id = idOf(action.row);
      const narration = action.reason || DEFAULT_NARRATION[action.type] || (action.type === "delete" ? `${name} no longer used` : "");
      const r = await api[action.type]({ id, narration });
      notifications.success(apiMessage(r, t("actionDone", { name })));
      setAction(null);
      list.reload();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setActionPending(false);
    }
  };
  const ask = (type, row) => setAction({ type, row, label: t(`common:action_${type}`), reason: "" });

  const facts = (row) => [
    [t("code"), row.code],
    [t("nameOf", { name }), row.name],
    ...fields.map((f) => [t(`field_${f.key}`, { defaultValue: t(`list_${f.parent}`) }), show(f, row)]),
    [t("common:description"), row.description],
  ];
  const columns = [
    { key: "code", label: t("code"), render: (r) => r.code ?? "-" },
    { key: "name", label: name, align: "left", render: (r) => r.name ?? "-" },
    ...fields.map((f) => ({ key: f.key, label: t(`field_${f.key}`, { defaultValue: t(`list_${f.parent}`) }), render: (r) => show(f, r) })),
    { key: "description", label: t("common:description"), render: (r) => r.description ?? "-" },
    { key: "status", label: t("common:status"), render: (r) => (r.status_name != null || r.status != null ? <StatusBadge status={String(r.status_name ?? (r.status === 1 ? "ACTIVE" : "INACTIVE"))} /> : "—") },
    { key: "process_status_name", label: t("common:processStatus"), render: (r) => (r.process_status_name ? <StatusBadge status={String(r.process_status_name)} variant="subtle" /> : "—") },
    { key: "auth_status", label: t("common:authorizationStatus"), render: (r) => (r.auth_status ? <StatusBadge status={String(r.auth_status)} variant="subtle" /> : "—") },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (r) => {
        const buttons = getMakerCheckerButtons(r, { canAdd: can("Add"), canEdit: can("Edit"), canAuthorize: can("Authorize"), canDelete: can("Delete"), canChangeStatus: can("Deactivate") || can("Reactivate") });
        return (
          <RowActions
            buttons={buttons}
            onView={() => setView(r)}
            onEdit={() => openForm(r)}
            onAudit={() => setAudit(r)}
            onSubmit={() => ask("submit", r)}
            onAuthorize={() => ask(buttons.isPendingDelete ? "deleteAuth" : "auth", r)}
            onDeauthorize={() => ask("deauth", r)}
            onDeactivate={() => ask("deactivate", r)}
            onReactivate={() => ask("reactivate", r)}
            onDelete={() => ask("delete", r)}
          />
        );
      },
    },
  ];

  const formId = `${listKey}-form`;
  return (
    <div className="pt-1 pb-6">
      <div className="mb-3">
        <PageTitle>{name}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("manage", { plural })}</p>
      </div>
      <ListTable
        list={list}
        actions={can("Add") && <Button size="xs" icon={Plus} onClick={() => openForm(null)}>{t("addOne", { name })}</Button>}
        columns={columns}
        rowKey={idOf}
        title={plural}
        emptyTitle={t("noneFound", { plural })}
      />

      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        title={editing ? t("editOne", { name }) : t("addOne", { name })}
        size="md"
        footer={
          <>
            <Button variant="ghost" disabled={saving} onClick={() => { setOpen(false); setEditing(null); }}>{t("common:cancel")}</Button>
            <Button variant="secondary" type="submit" form={formId} data-mode="draft" disabled={saving}>{t("saveDraft")}</Button>
            <Button type="submit" form={formId} data-mode="submit" disabled={saving} loading={saving}>
              {saving ? t("saving") : editing ? t("saveChanges") : t("addOne", { name })}
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={(e) => { e.preventDefault(); void save(e.nativeEvent.submitter?.dataset?.mode === "draft"); }} className="grid gap-4">
          {parentField && (
            <label className={labelClass}>
              {t(`list_${parentField.parent}`)}
              <FilterSelect
                className="mt-1.5"
                value={form[parentField.key]}
                onChange={(v) => setForm({ ...form, [parentField.key]: v })}
                options={[{ value: "", label: t("chooseParent", { parent: t(`list_${parentField.parent}`) }) }, ...parents.map((p) => ({ value: String(p.id ?? p[`${parentField.parent}_id`]), label: p.name ?? "" }))]}
              />
            </label>
          )}
          <label className={labelClass}>
            {t("code")} <span className="text-red-500">*</span>
            <input
              required={!editing}
              disabled={Boolean(editing)}
              title={editing ? t("codeFixed") : undefined}
              value={form.code ?? ""}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") })}
              className={`${inputClass} font-mono uppercase`}
            />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("codeHint")}</span>
          </label>
          <label className={labelClass}>
            {t("nameOf", { name })} <span className="text-red-500">*</span>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </label>
          {fields.filter((f) => f.kind === "bool").map((f) => (
            <label key={f.key} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={Boolean(form[f.key])} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })} />
              {t(`field_${f.key}`)}
            </label>
          ))}
          <label className={labelClass}>
            {t("common:description")}
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5 min-h-24 w-full rounded-xl border border-border p-3 outline-none focus:border-primary" />
          </label>
        </form>
      </Modal>

      {view && (
        <Modal open title={t("viewOne", { name })} onClose={() => setView(null)} size="sm">
          <dl className="grid gap-3">
            {facts(view).map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border p-3">
                <dt className="text-[10px] font-bold uppercase text-muted-foreground">{label}</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-700">{value || "-"}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
      {audit && (
        <AuditModal
          title={audit.name ?? `${name} #${idOf(audit)}`}
          fields={[["code", t("code")], ["name", t("nameOf", { name })], ["description", t("common:description")]]}
          onClose={() => setAudit(null)}
          fetchAudit={(p, limit) => api.audit({ id: idOf(audit), page: p, limit }).then(mapAuditResponse)}
        />
      )}
      {action && (
        <ConfirmDialog
          open
          title={`${action.label} ${name}`}
          description={action.row.name}
          confirmLabel={action.label}
          destructive={action.type.includes("delete")}
          pending={actionPending}
          onClose={() => setAction(null)}
          onConfirm={() => void run()}
        >
          {action.type === "submit" && (
            <dl className="mt-1 grid gap-2">
              <p className="text-xs font-semibold text-muted-foreground">{t("submitPreview")}</p>
              {facts(action.row).map(([label, value]) => (
                <div key={label} className="rounded-xl border border-border p-2.5">
                  <dt className="text-[10px] font-bold uppercase text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-700">{value || "-"}</dd>
                </div>
              ))}
            </dl>
          )}
          {["auth", "deauth", "deleteAuth"].includes(action.type) && <PendingChangesDiff {...pendingInfo} />}
          <textarea
            value={action.reason ?? ""}
            onChange={(e) => setAction({ ...action, reason: e.target.value })}
            placeholder={t("common:narration")}
            aria-label={t("common:narration")}
            className="mt-3 min-h-20 w-full rounded-xl border p-3"
          />
        </ConfirmDialog>
      )}
    </div>
  );
}
