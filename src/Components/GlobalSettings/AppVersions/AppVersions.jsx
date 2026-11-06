import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Pencil, Send, Smartphone, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { EmptyNote } from "@/Components/Common/EmptyNote";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { PageTitle } from "@/Components/Common/PageTitle";
import { SimpleTable } from "@/Components/Common/SimpleTable";
import { Toggle } from "@/Components/Common/Toggle";
import { accountDate } from "@/Components/InnoCBS/Accounts/accountShared";
import {
  ActionButtons,
  AuditTimeline,
  NarrationDialog,
  Problems,
  Section,
  inputClass,
  labelClass,
} from "@/Components/InnoCBS/Deposits/depositShared";
import { RowsEditor, useInstitutionScope } from "@/Components/InnoCBS/Loans/loanShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { appVersionsApi } from "@/Services/AppVersions/appVersions.api";
import { recordOf } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";
import { actorText } from "@/Utils/Lib/actor";
import { cn } from "@/Utils/Lib/utils";

const PLATFORMS = ["ANDROID", "IOS"];
const TEXT_FIELDS = ["platform", "latest_version", "min_supported_version", "version_name", "description", "release_notes", "download_url"];
// 1 to 4 numbers with dots; the server drops a "+build" part.
const VERSION = /^\d+(\.\d+){0,3}(\+\S*)?$/;
const URL = /^https?:\/\/\S+$/i;

const parts = (v) => String(v).split("+")[0].split(".").map(Number);
function compareVersions(a, b) {
  const x = parts(a);
  const y = parts(b);
  for (let i = 0; i < 4; i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

// The entries as the server takes them: optional texts left out when empty.
const toBody = (rows) =>
  rows.map((r) =>
    Object.fromEntries(TEXT_FIELDS.map((k) => [k, String(r[k] ?? "").trim()]).filter(([k, v]) => v || ["platform", "latest_version", "min_supported_version"].includes(k))),
  );

// Checked before proposing (the server checks the same).
function entriesProblem(t, rows) {
  for (const r of rows) {
    if (!r.platform || !r.latest_version || !r.min_supported_version) return t("fillRequired");
    if (!VERSION.test(r.latest_version) || !VERSION.test(r.min_supported_version)) return t("versionFormat");
    if (compareVersions(r.min_supported_version, r.latest_version) > 0) return t("minAboveLatest");
    if (r.download_url && !URL.test(r.download_url)) return t("urlFormat");
  }
  if (new Set(rows.map((r) => r.platform)).size !== rows.length) return t("platformOnce");
  return "";
}

// GLOBAL SETTINGS > App Versions (menu 218): per platform the latest app
// version and the minimum still supported. Below the minimum the app must
// update; below the latest it may. One document under maker-checker.
export function AppVersions() {
  const { t } = useTranslation(["appVersions", "loans"]);
  const can = usePagePermission();
  const { chooser, institution, scope } = useInstitutionScope();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [showPending, setShowPending] = useState(true);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (chooser && !institution) return;
    try {
      setData(recordOf(await appVersionsApi.get(scope())));
    } catch (e) {
      setData({ missing: true });
      notifications.error(e.message);
    }
  }, [chooser, institution, scope]);
  useEffect(() => {
    setData(null);
    setForm(null);
    void load();
  }, [load]);

  const act = async (verb, body = {}) => {
    setBusy(true);
    setError("");
    try {
      const response = await appVersionsApi[verb](scope(body));
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      setForm(null);
      await load();
    } catch (e) {
      setDialog(null);
      if (verb === "edit") setError(e.message);
      else notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const a = data?.actions ?? {};
  const pending = data?.pending?.setup ?? null;
  const shown = form ?? (pending && showPending ? pending : data?.setup);
  const entries = shown?.platforms ?? [];
  const choices = Array.isArray(data?.platforms) && data.platforms.every((p) => typeof p === "string") ? data.platforms : PLATFORMS;
  const platformLabel = (p) => t(`platform_${p}`, { defaultValue: p });
  const problem = form ? entriesProblem(t, form.platforms) : "";
  const missingPlatform = form ? choices.find((p) => !form.platforms.some((r) => r.platform === p)) : null;

  return (
    <div className="pt-1 pb-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle icon={Smartphone}>{t("title")}</PageTitle>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {data && !data.missing && !form && (
          <ActionButtons
            busy={busy}
            buttons={[
              a.edit &&
                can("Edit") && {
                  key: "edit",
                  label: t("loans:edit"),
                  icon: Pencil,
                  run: () => {
                    const base = pending ?? data.setup ?? {};
                    setForm({ platforms: (base.platforms ?? []).map((r) => ({ ...r })) });
                    setError("");
                  },
                },
              a.deauth &&
                can("Authorize") && {
                  key: "deauth",
                  label: t("loans:reject"),
                  icon: XCircle,
                  variant: "danger",
                  run: () => setDialog("deauth"),
                },
              a.auth &&
                can("Authorize") && {
                  key: "auth",
                  label: t("loans:approve"),
                  icon: CheckCircle2,
                  variant: "primary",
                  run: () => setDialog("auth"),
                },
            ]}
          />
        )}
      </div>

      {chooser && !institution ? null : !data ? (
        <PageSkeleton />
      ) : data.missing ? null : (
        <div className="grid gap-4">
          {pending && !form && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
              <span>
                {t("pendingBy", {
                  name: actorText(data.pending, "proposed_by", "—"),
                  date: accountDate(data.pending.proposed_at),
                })}
              </span>
              <Toggle showLabel label={t("showProposed")} checked={showPending} onChange={setShowPending} />
            </div>
          )}

          {form ? (
            <Section title={t("platforms")}>
              <RowsEditor
                rows={form.platforms}
                onChange={(platforms) => setForm({ platforms })}
                blank={() => ({ platform: missingPlatform ?? "", latest_version: "", min_supported_version: "" })}
                addLabel={missingPlatform && t("addPlatform", { platform: platformLabel(missingPlatform) })}
                canAdd={Boolean(missingPlatform)}
                columns="lg:grid-cols-3"
                fields={[
                  { key: "platform", label: t("platform"), type: "select", options: choices.map((p) => ({ value: p, label: platformLabel(p) })) },
                  { key: "latest_version", label: t("latestVersion"), placeholder: "1.3.2" },
                  { key: "min_supported_version", label: t("minVersion"), placeholder: "1.0.0" },
                  { key: "version_name", label: t("versionName") },
                  { key: "description", label: t("description") },
                  { key: "download_url", label: t("downloadUrl"), placeholder: "https://" },
                ]}
                renderExtra={(row, set) => (
                  <label className={cn(labelClass, "mt-2 block")}>
                    {t("releaseNotes")}
                    <textarea
                      rows={3}
                      className={cn(inputClass, "mt-1.5")}
                      value={row.release_notes ?? ""}
                      onChange={(e) => set({ release_notes: e.target.value })}
                    />
                    <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("releaseNotesHint")}</span>
                  </label>
                )}
              />
            </Section>
          ) : entries.length ? (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <SimpleTable columns={[t("platform"), t("latestVersion"), t("minVersion"), t("versionName"), t("downloadUrl")]}>
                <tbody>
                  {entries.map((r) => (
                    <tr key={r.platform} className="border-t border-border align-top">
                      <td className="px-3 py-2 font-semibold">{platformLabel(r.platform)}</td>
                      <td className="px-3 py-2 font-mono">{r.latest_version}</td>
                      <td className="px-3 py-2 font-mono">{r.min_supported_version}</td>
                      <td className="px-3 py-2">{r.version_name || "—"}</td>
                      <td className="max-w-xs px-3 py-2">
                        {r.download_url ? (
                          <a href={r.download_url} target="_blank" rel="noopener noreferrer" className="break-all text-primary hover:underline">
                            {r.download_url}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </SimpleTable>
            </div>
          ) : (
            <EmptyNote>{t("none")}</EmptyNote>
          )}

          {form ? (
            <>
              {problem && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">{problem}</p>}
              {error && <Problems message={error} />}
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" onClick={() => setForm(null)}>
                  {t("loans:cancel")}
                </Button>
                <Button icon={Send} disabled={Boolean(problem)} disabledReason={problem} onClick={() => setDialog("edit")}>
                  {t("loans:proposeChanges")}
                </Button>
              </div>
            </>
          ) : (
            <Section title={t("loans:history")} collapsible>
              <AuditTimeline audit={data.history ?? []} />
            </Section>
          )}
        </div>
      )}

      {dialog && (
        <NarrationDialog
          title={t(`confirm_${dialog}`)}
          hint={t(`confirmHint_${dialog}`)}
          confirmLabel={t(dialog === "auth" ? "loans:approve" : dialog === "deauth" ? "loans:reject" : "loans:proposeChanges")}
          variant={dialog === "deauth" ? "danger" : "primary"}
          required={dialog === "deauth"}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(narration) =>
            act(dialog, {
              ...(dialog === "edit" ? { platforms: toBody(form.platforms) } : {}),
              narration: narration ?? "",
            })
          }
        />
      )}
    </div>
  );
}
