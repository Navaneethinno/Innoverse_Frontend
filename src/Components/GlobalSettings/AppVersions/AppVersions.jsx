import { useTranslation } from "react-i18next";
import { EmptyNote } from "@/Components/Common/EmptyNote";
import { SimpleTable } from "@/Components/Common/SimpleTable";
import { inputClass, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { RowsEditor } from "@/Components/InnoCBS/Loans/loanShared";
import { SectionScreen } from "@/Components/InnoCBS/Settings/SectionScreen";
import { appVersionsApi } from "@/Services/AppVersions/appVersions.api";
import { cn } from "@/Utils/Lib/utils";

const PLATFORMS = ["ANDROID", "IOS"];
const TEXT_FIELDS = ["platform", "latest_version", "min_supported_version", "version_name", "description", "release_notes", "download_url"];
const REQUIRED = ["platform", "latest_version", "min_supported_version"];
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
  rows.map((r) => Object.fromEntries(TEXT_FIELDS.map((k) => [k, String(r[k] ?? "").trim()]).filter(([k, v]) => v || REQUIRED.includes(k))));

// Checked before proposing (the server checks the same).
function entriesProblem(t, form) {
  const rows = form.platforms;
  for (const r of rows) {
    if (!r.platform || !r.latest_version || !r.min_supported_version) return t("fillRequired");
    if (!VERSION.test(r.latest_version) || !VERSION.test(r.min_supported_version)) return t("versionFormat");
    if (compareVersions(r.min_supported_version, r.latest_version) > 0) return t("minAboveLatest");
    if (r.download_url && !URL.test(r.download_url)) return t("urlFormat");
  }
  if (new Set(rows.map((r) => r.platform)).size !== rows.length) return t("platformOnce");
  return "";
}

// An edit replaces the whole list: a platform in effect (setup.platforms) that
// the proposal leaves out is removed once approved.
const droppedPlatforms = (data, form) => (data?.setup?.platforms ?? []).map((r) => r.platform).filter((p) => !form.platforms.some((r) => r.platform === p));

// GLOBAL SETTINGS > App Versions (menu 218): per platform the latest app
// version and the minimum still supported. Below the minimum the app must
// update; below the latest it may. One document under maker-checker.
export function AppVersions() {
  const { t } = useTranslation("appVersions");
  return (
    <SectionScreen
      api={appVersionsApi}
      ns="appVersions"
      valueKey="setup"
      fallbackTitle={t("title")}
      subtitle={t("subtitle")}
      toForm={(setup) => ({ platforms: (setup?.platforms ?? []).map((r) => ({ ...r })) })}
      bodyOf={(form) => ({ platforms: toBody(form.platforms) })}
      problemOf={(_, form) => entriesProblem(t, form)}
      warningsOf={(form, data) => droppedPlatforms(data, form).map((p) => t("platformDropped", { platform: t(`platform_${p}`, { defaultValue: p }) }))}
    >
      {({ data, shown, editing, setForm }) => <Platforms data={data} entries={shown?.platforms ?? []} editing={editing} setForm={setForm} />}
    </SectionScreen>
  );
}

function Platforms({ data, entries, editing, setForm }) {
  const { t } = useTranslation("appVersions");
  // The choices sit at the top of the reply; setup.platforms is what is in effect.
  const choices = Array.isArray(data?.platforms) && data.platforms.length && data.platforms.every((p) => typeof p === "string") ? data.platforms : PLATFORMS;
  const platformLabel = (p) => t(`platform_${p}`, { defaultValue: p });

  if (editing) {
    const missing = choices.find((p) => !entries.some((r) => r.platform === p));
    return (
      <RowsEditor
        rows={entries}
        onChange={(platforms) => setForm({ platforms })}
        blank={() => ({ platform: missing ?? "", latest_version: "", min_supported_version: "" })}
        addLabel={missing && t("addPlatform", { platform: platformLabel(missing) })}
        canAdd={Boolean(missing)}
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
            <textarea rows={3} className={cn(inputClass, "mt-1.5")} value={row.release_notes ?? ""} onChange={(e) => set({ release_notes: e.target.value })} />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("releaseNotesHint")}</span>
          </label>
        )}
      />
    );
  }
  if (!entries.length) return <EmptyNote>{t("none")}</EmptyNote>;
  return (
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
  );
}
