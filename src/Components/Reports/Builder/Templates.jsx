import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, FolderOpen, Play, Save, Trash2 } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { Button } from "@/Components/Common/Button";
import { CheckboxPillGroup } from "@/Components/Common/CheckboxPill";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { Modal } from "@/Components/Common/Modal";
import { SearchBox } from "@/Components/Common/SearchBox";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { Spinner } from "@/Components/Common/Spinner";
import { profileId } from "@/Components/UserManagement/Profile/ProfileForm";
import { inputClass, labelClass } from "@/Components/TermDeposits/depositShared";
import { useListSearch } from "@/Hooks/useListSearch";
import { mapProfileListResponse } from "@/Hooks/UserManagement/profileHooks";
import { reportBuilderApi } from "@/Services/Reports/reportBuilder.api";
import { profilesApi } from "@/Services/UserManagement/profiles.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";

const VISIBILITY = ["PRIVATE", "INSTITUTION", "PROFILES"];

// Saved reports the user may run (their own and those shared with them),
// by folder. Open loads one into the builder; Copy makes a private copy;
// only the owner deletes.
export function SavedReports({ open, onClose, onOpen }) {
  const { t } = useTranslation("builder");
  const { term, bind } = useListSearch();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoading(true);
    reportBuilderApi.template
      .list(term ? { search: term } : {})
      .then((r) => !cancelled && setRows(rowsOf(r)))
      .catch((e) => !cancelled && notifications.error(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, term, version]);

  const folders = useMemo(() => {
    const by = new Map();
    for (const row of rows) by.set(row.folder || "", [...(by.get(row.folder || "") ?? []), row]);
    return [...by.entries()];
  }, [rows]);

  const act = async (call, message) => {
    setBusy(true);
    try {
      const r = await call();
      notifications.success(r?.message ?? message);
      setVersion((v) => v + 1);
      return true;
    } catch (e) {
      notifications.error(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("savedReports")}
      icon={<FolderOpen size={15} />}
      size="lg"
    >
      <SearchBox {...bind} placeholder={t("searchSaved")} />
      <div className="mt-3 grid gap-4">
        {loading && (
          <div className="flex justify-center p-4">
            <Spinner size={18} />
          </div>
        )}
        {!loading && rows.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">
            {t(term ? "noSavedMatch" : "noSaved")}
          </p>
        )}
        {!loading &&
          folders.map(([folder, list]) => (
            <div key={folder}>
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                {folder || t("noFolder")}
              </p>
              <div className="divide-y divide-border rounded-xl border border-border">
                {list.map((row) => (
                  <div key={row.id} className="flex items-center gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{row.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[
                          row.source_label,
                          t(`vis_${row.visibility}`),
                          row.is_owner ? t("yours") : t("byOwner", { name: row.owner_name }),
                          row.description,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <ActionIconButton
                      label={t("open")}
                      intent="view"
                      icon={Play}
                      onClick={() => onOpen(row)}
                    />
                    <ActionIconButton
                      label={t("copy")}
                      intent="edit"
                      icon={Copy}
                      disabled={busy}
                      onClick={() =>
                        act(() => reportBuilderApi.template.copy({ id: row.id }), t("copied"))
                      }
                    />
                    {row.is_owner && (
                      <ActionIconButton
                        label={t("delete")}
                        intent="delete"
                        icon={Trash2}
                        onClick={() => setDeleting(row)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
      <ConfirmDialog
        open={Boolean(deleting)}
        destructive
        title={t("deleteTitle")}
        description={t("deleteText", { name: deleting?.name })}
        confirmLabel={t("delete")}
        pending={busy}
        onClose={() => setDeleting(null)}
        onConfirm={async () =>
          (await act(() => reportBuilderApi.template.delete({ id: deleting.id }), t("deleted"))) &&
          setDeleting(null)
        }
      />
    </Modal>
  );
}

// Name, folder, description and who sees it. Editing the open template is
// for its owner; anyone can save the current setup as a new one.
export function SaveTemplateDialog({ open, onClose, definition, current, onSaved }) {
  const { t } = useTranslation("builder");
  const [form, setForm] = useState({
    name: "",
    folder: "",
    description: "",
    visibility: "PRIVATE",
    profile_ids: [],
  });
  const [profiles, setProfiles] = useState([]);
  const [busy, setBusy] = useState("");
  const owner = Boolean(current?.is_owner);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: owner ? current.name : "",
      folder: current?.folder ?? "",
      description: owner ? (current.description ?? "") : "",
      visibility: owner ? current.visibility : "PRIVATE",
      profile_ids: owner ? (current.profile_ids ?? []) : [],
    });
  }, [open, owner, current]);

  const needProfiles = open && form.visibility === "PROFILES";
  useEffect(() => {
    if (!needProfiles || profiles.length) return;
    profilesApi
      .getAll()
      .then((r) => setProfiles(mapProfileListResponse(r).profiles))
      .catch((e) => notifications.error(e.message));
  }, [needProfiles, profiles.length]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e?.target ? e.target.value : e }));
  const save = async (asNew) => {
    const body = {
      name: form.name.trim(),
      folder: form.folder.trim(),
      description: form.description.trim(),
      visibility: form.visibility,
      profile_ids: form.visibility === "PROFILES" ? form.profile_ids : [],
      definition,
    };
    setBusy(asNew ? "add" : "edit");
    try {
      const r = asNew
        ? await reportBuilderApi.template.add(body)
        : await reportBuilderApi.template.edit({ ...body, id: current.id });
      notifications.success(r?.message ?? t("saved"));
      onSaved(rowsOf(r)[0] ?? null);
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy("");
    }
  };
  const invalid =
    !form.name.trim() || (form.visibility === "PROFILES" && form.profile_ids.length === 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("saveTitle")}
      icon={<Save size={15} />}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            variant={owner ? "secondary" : "primary"}
            size="sm"
            disabled={invalid}
            loading={busy === "add"}
            onClick={() => save(true)}
          >
            {t(owner ? "saveAsNew" : "save")}
          </Button>
          {owner && (
            <Button
              size="sm"
              disabled={invalid}
              loading={busy === "edit"}
              onClick={() => save(false)}
            >
              {t("saveChanges")}
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          {t("name")} <span className="text-red-600">*</span>
          <input
            className={`${inputClass} mt-1.5`}
            maxLength={100}
            value={form.name}
            onChange={set("name")}
          />
        </label>
        <label className={labelClass}>
          {t("folder")}
          <input
            className={`${inputClass} mt-1.5`}
            maxLength={100}
            value={form.folder}
            onChange={set("folder")}
            placeholder={t("folderHint")}
          />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          {t("description")}
          <input
            className={`${inputClass} mt-1.5`}
            maxLength={500}
            value={form.description}
            onChange={set("description")}
          />
        </label>
        <div className="sm:col-span-2">
          <p className={labelClass}>{t("sharing")}</p>
          <SegmentedSwitch
            className="mt-1.5"
            value={form.visibility}
            onChange={set("visibility")}
            options={VISIBILITY.map((v) => ({ value: v, label: t(`vis_${v}`) }))}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t(`visHint_${form.visibility}`)}
          </p>
        </div>
        {form.visibility === "PROFILES" && (
          <div className="max-h-56 overflow-y-auto rounded-xl border border-border p-3 sm:col-span-2">
            {profiles.length === 0 ? (
              <Spinner size={14} />
            ) : (
              <CheckboxPillGroup
                value={form.profile_ids}
                onChange={set("profile_ids")}
                options={profiles.map((p) => ({
                  value: Number(profileId(p)),
                  label: p.profile_name ?? `#${profileId(p)}`,
                }))}
              />
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
