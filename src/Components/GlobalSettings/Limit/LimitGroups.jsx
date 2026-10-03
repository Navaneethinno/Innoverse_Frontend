import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, FlaskConical, Gauge, ListChecks, Plus, Users } from "lucide-react";
import { Modal } from "@/Components/Common/Modal";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { usePagePermission } from "@/Hooks/usePermission";
import { limitGroupApi, limitGroupOps, rowsOf } from "@/Services/Epurse/onboarding.api";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { LifecycleList } from "@/Components/Epurse/Onboarding/OnboardingConfiguration/LifecycleList";
import { LimitRulesEditor } from "./LimitRulesEditor";
import { LimitMembers } from "./LimitMembers";
import { LimitEvaluate } from "./LimitEvaluate";
import { LimitUsageDialog } from "./LimitUsage";

import { Button } from "@/Components/Common/Button";
// Global Settings > Limit: limit groups (maker-checker), their rules, who
// is in them and a "test a customer" panel. The Default group can't be
// deleted or deactivated.
const EDITABLE = new Set([9, 5, 1, 6, 7, 12, 15]);
const field = "mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm";
const codeOf = (v) => v.toUpperCase().replace(/[^A-Z0-9_]/g, "");

export function LimitGroups() {
  const { t } = useTranslation(["limits", "common"]);
  const can = usePagePermission("Limit");
  const [form, setForm] = useState(null);
  const [clone, setClone] = useState(null);
  const [editor, setEditor] = useState(null);
  const [members, setMembers] = useState(null);
  const [evaluate, setEvaluate] = useState(null);
  const [usage, setUsage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  const create = async () => {
    if (!form.code || !form.name.trim()) return notifications.error(t("limits:codeAndNameRequired"));
    setSaving(true);
    try {
      const response = await limitGroupApi.add({ code: form.code, name: form.name.trim(), description: form.description, is_draft: true });
      notifications.success(apiMessage(response, t("limits:groupCreated")));
      setForm(null);
      reload();
      const created = rowsOf(response)[0];
      if (created?.id) setEditor({ group: created, readOnly: false });
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setSaving(false);
    }
  };
  const doClone = async () => {
    if (!clone.code || !clone.name.trim()) return notifications.error(t("limits:codeAndNameRequired"));
    setSaving(true);
    try {
      const response = await limitGroupOps.clone({ id: clone.source.id, code: clone.code, name: clone.name.trim() });
      notifications.success(apiMessage(response, t("limits:groupCloned")));
      setClone(null);
      reload();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: "code",
      label: t("limits:code"),
      render: (r) => (
        <span className="font-semibold">
          {r.code}
          {r.is_default && <span className="ml-2 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">{t("limits:default")}</span>}
        </span>
      ),
    },
    { key: "name", label: t("limits:name") },
    { key: "description", label: t("limits:description"), render: (r) => r.description || "-" },
  ];


  return (
    <>
      <LifecycleList
        title={t("limits:title")}
        subtitle={t("limits:subtitle")}
        api={limitGroupApi}
        menuName="Limit"
        columns={columns}
        reloadKey={reloadKey}
        onEdit={(row) => setEditor({ group: row, readOnly: false })}
        onView={(row) => setEditor({ group: row, readOnly: true })}
        canEditRow={(row) => EDITABLE.has(Number(row.process_status))}
        canDeleteRow={(row) => !row.is_default}
        canDeactivateRow={(row) => !row.is_default}
        toolbar={
          can("View") && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setUsage(true)} className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-bold text-slate-600">
                <Gauge size={14} /> {t("limits:limitsAndUsage")}
              </button>
              <button type="button" onClick={() => setEvaluate({ group: null })} className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-bold text-slate-600">
                <FlaskConical size={14} /> {t("limits:testACustomer")}
              </button>
            </div>
          )
        }
        addButton={
          can("Add") && (
            <Button size="sm" onClick={() => setForm({ code: "", name: "", description: "" })}>
              <Plus size={14} /> {t("limits:addGroup")}
            </Button>
          )
        }
        renderExtra={(row) => (
          <>
            <ActionIconButton label={t("limits:rules")} intent="rules" icon={ListChecks} onClick={() => setEditor({ group: row, readOnly: !can("Edit") || !EDITABLE.has(Number(row.process_status)) })} />
            <ActionIconButton label={t("limits:members")} intent="members" icon={Users} onClick={() => setMembers(row)} />
            <ActionIconButton label={t("limits:test")} intent="test" icon={FlaskConical} onClick={() => setEvaluate({ group: row })} />
            {can("Add") && Number(row.status) === 1 && <ActionIconButton label={t("limits:clone")} intent="clone" icon={Copy} onClick={() => setClone({ source: row, code: "", name: `${row.name} (copy)` })} />}
          </>
        )}
        emptyTitle={t("limits:noGroups")}
      />

      {form && (
        <Modal
          open
          onClose={() => setForm(null)}
          title={t("limits:addGroup")}
          footer={
            <>
              <Button variant="ghost" onClick={() => setForm(null)}>
                {t("common:cancel")}
              </Button>
              <Button disabled={saving} onClick={() => void create()} loading={saving}>
                {t("limits:createAndAddRules")}
              </Button>
            </>
          }
        >
          <div className="grid gap-4">
            <label className="text-sm font-semibold text-slate-700">
              {t("limits:code")}
              <input value={form.code} onChange={(e) => setForm({ ...form, code: codeOf(e.target.value) })} className={`${field} font-mono`} placeholder="WALLET_STD" />
              <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("limits:codeHint")}</span>
            </label>
            <label className="text-sm font-semibold text-slate-700">
              {t("limits:name")}
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={field} />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              {t("limits:description")}
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5 min-h-20 w-full rounded-xl border p-3 text-sm" />
            </label>
          </div>
        </Modal>
      )}
      {clone && (
        <Modal
          open
          onClose={() => setClone(null)}
          title={t("limits:cloneTitle", { name: clone.source.name })}
          footer={
            <>
              <Button variant="ghost" onClick={() => setClone(null)}>
                {t("common:cancel")}
              </Button>
              <Button disabled={saving} onClick={() => void doClone()} loading={saving}>
                {t("limits:clone")}
              </Button>
            </>
          }
        >
          <p className="mb-3 text-xs text-muted-foreground">{t("limits:cloneHint")}</p>
          <div className="grid gap-4">
            <label className="text-sm font-semibold text-slate-700">
              {t("limits:newCode")}
              <input value={clone.code} onChange={(e) => setClone({ ...clone, code: codeOf(e.target.value) })} className={`${field} font-mono`} />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              {t("limits:newName")}
              <input value={clone.name} onChange={(e) => setClone({ ...clone, name: e.target.value })} className={field} />
            </label>
          </div>
        </Modal>
      )}
      {editor && <LimitRulesEditor group={editor.group} forceReadOnly={editor.readOnly} onClose={() => setEditor(null)} onSaved={reload} />}
      {members && <LimitMembers group={members} canMove={can("Edit")} onClose={() => setMembers(null)} />}
      {usage && <LimitUsageDialog onClose={() => setUsage(false)} />}
      {evaluate && <LimitEvaluate group={evaluate.group} onClose={() => setEvaluate(null)} />}
    </>
  );
}
