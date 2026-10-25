import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Plus, Send } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { Button } from "@/Components/Common/Button";
import { ListTable } from "@/Components/Common/ListView";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { accountDate } from "@/Components/Finance/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { saveBlob } from "@/Services/api/fileTransfer";
import { bureauSubmissionsApi } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";
import { FormDialog } from "../loanDialogs";
import { useInstitutionScope } from "../loanShared";

// Last month, YYYY-MM: the default period of a bureau file.
const lastMonth = () => {
  const d = new Date();
  d.setDate(0);
  return d.toISOString().slice(0, 7);
};

// Regulatory Submissions › Credit bureau file: a month's loan book as the
// bureau's CSV, downloaded and sent outside the platform, then recorded as
// submitted with the bureau's reference.
export function BureauFiles() {
  const { t } = useTranslation(["corebank", "common"]);
  const can = usePagePermission();
  const { chooser, institution, scope } = useInstitutionScope();
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const list = useServerList({
    api: bureauSubmissionsApi.listPath,
    call: bureauSubmissionsApi.list,
    prefix: "bur_",
  });
  const run = async (verb, body) => {
    setBusy(true);
    try {
      const r = await bureauSubmissionsApi[verb](scope(body));
      if (r?.message) notifications.success(r.message);
      setDialog(null);
      list.reload();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const download = async (row) => {
    try {
      const { blob, fileName } = await bureauSubmissionsApi.file(
        scope({ id: row.id }),
        `bureau_${row.period}_${row.id}.csv`,
      );
      saveBlob(blob, fileName);
    } catch (e) {
      notifications.error(e.message);
    }
  };
  const columns = [
    {
      key: "period",
      label: t("period"),
      render: (r) => <b className="font-mono text-xs">{r.period}</b>,
    },
    {
      key: "rows",
      label: t("loansInFile"),
      render: (r) => <span className="text-xs tabular-nums">{r.rows}</span>,
    },
    {
      key: "status",
      label: t("status"),
      render: (r) => <StatusBadge status={r.status} variant="subtle" />,
    },
    {
      key: "generated_at",
      label: t("generatedBy"),
      render: (r) => (
        <span className="text-xs leading-tight">
          {r.generated_by}
          <span className="block text-[10px] text-muted-foreground">
            {accountDate(r.generated_at)}
          </span>
        </span>
      ),
    },
    {
      key: "submission_reference",
      label: t("submittedAs"),
      render: (r) =>
        r.submitted_at ? (
          <span className="text-xs leading-tight">
            <b className="block font-mono">{r.submission_reference}</b>
            <span className="text-[10px] text-muted-foreground">
              {[r.submitted_by, accountDate(r.submitted_at)].join(" · ")}
            </span>
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (r) => (
        <span className="flex gap-1">
          <ActionIconButton
            label={t("downloadCsv")}
            intent="statement"
            icon={Download}
            onClick={() => void download(r)}
          />
          {!r.submitted_at && can("Edit") && (
            <ActionIconButton
              label={t("recordSubmitted")}
              intent="submit"
              icon={Send}
              onClick={() => setDialog({ kind: "submit", row: r })}
            />
          )}
        </span>
      ),
    },
  ];
  return (
    <>
      <ListTable
        list={list}
        columns={columns}
        rowKey={(r) => r.id}
        title={t("bureauFiles")}
        emptyTitle={t("noBureauFiles")}
        actions={
          can("Add") && (
            <Button
              size="sm"
              icon={Plus}
              disabled={chooser && !institution}
              onClick={() => setDialog({ kind: "generate" })}
            >
              {t("generateBureauFile")}
            </Button>
          )
        }
      />
      {dialog?.kind === "generate" && (
        <FormDialog
          title={t("generateBureauFile")}
          hint={t("generateBureauFileHint")}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(f) => run("generate", { period: f.period })}
          initial={{ period: lastMonth() }}
          required={["period"]}
          problem={(f) => (/^\d{4}-(0[1-9]|1[0-2])$/.test(f.period ?? "") ? "" : t("periodFormat"))}
          fields={[
            {
              key: "period",
              label: t("periodMonth"),
              placeholder: "YYYY-MM",
              span: "sm:col-span-2",
            },
          ]}
        />
      )}
      {dialog?.kind === "submit" && (
        <FormDialog
          title={t("recordSubmittedTitle", { period: dialog.row.period })}
          hint={t("recordSubmittedHint")}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(f) =>
            run("submit", {
              id: dialog.row.id,
              submission_reference: f.submission_reference.trim(),
            })
          }
          required={["submission_reference"]}
          fields={[
            { key: "submission_reference", label: t("bureauReference"), span: "sm:col-span-2" },
          ]}
        />
      )}
    </>
  );
}
