import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { ListTable } from "@/Components/Common/ListView";
import { asQuery, useServerList } from "@/Hooks/useServerList";
import { mapInstitutionListResponse } from "@/Hooks/Institution/institutionHooks";
import { institutionsApi } from "@/Services/Institution/institutions.api";
import { API_ENDPOINTS } from "@/Utils/Constant";
import { PageTitle } from "@/Components/Common/PageTitle";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { RowActions } from "@/Components/Common/RowActions";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { INSTITUTION_DRAFT_STATUS_CODE } from "@/Utils/Constant";
import { institutionId } from "./profileShared";
import { useInstitutionActions } from "./useInstitutionActions";
import { AuditInstitutionProfile } from "./AuditInstitutionProfile";

function statusOf(inst) {
  return String(inst.auth_status ?? inst.status ?? "").toUpperCase();
}
// Entity status is a numeric code (1 = Active, 0 = Inactive, INSTITUTION_
// DRAFT_STATUS_CODE = Draft) — status_name is only the human-readable label
// for display, never compared against directly. Confirmed against a real
// record: status_name showed "Draft" while status was the number 9, not the
// string "DRAFT" — that code lives in Constant.jsx (env-overridable) rather
// than hardcoded here, in case the backend ever renumbers it. The string
// check is kept only as a tolerant fallback in case some other response
// shape sends it as text instead.
function isInstitutionDraft(inst) {
  return Number(inst.status) === INSTITUTION_DRAFT_STATUS_CODE || statusOf(inst) === "DRAFT";
}
// PendingInstitutionsPage.jsx (formerly a separate route) used a different,
// request-based maker-checker data model (usePendingInstitutionsQuery /
// request_id / after_data) rather than a simple status filter over this same
// institution list — so its logic was NOT folded in here as a tab (that
// would misrepresent different data). It is no longer routed (institutionRoutes
// redirects /institutions/pending -> /institutions) and was left in place,
// unrelated to this list's own "Pending" tab which just groups this list's
// own non-active/non-terminal auth_status rows exactly as before.
export function InstitutionProfile() {
  const navigate = useNavigate();
  const { t } = useTranslation(["institutions", "common"]);
  // Who may do what, and the confirm dialogs, shared with the institution page.
  const actions = useInstitutionActions();
  // Only platform users create institutions (profile/options can_create).
  const [canCreate, setCanCreate] = useState(false);
  useEffect(() => {
    institutionsApi
      .options()
      .then((r) => setCanCreate(Boolean(rowsOf(r)[0]?.can_create)))
      .catch(() => setCanCreate(false));
  }, []);
  // Kept for the tab session: View/Edit open the institution on its own
  // route, and coming back should land on the same page, tab and search.
  const [auditInstitution, setAuditInstitution] = useState(null);

  // The request carries only what the screen shows (page, page size, tab,
  // order, search).
  const list = useServerList({ api: API_ENDPOINTS.INSTITUTION.INSTITUTION_PROFILE.LIST, call: institutionsApi.list, select: (r) => mapInstitutionListResponse(r).institutions, reloadOn: "institutions:data-changed" });
  const institutionsQuery = asQuery(list);
  const institutions = useMemo(() => institutionsQuery.data ?? [], [institutionsQuery.data]);

  // Active by the record's own status (1), like the badges and the
  // dashboard: an Active institution with a draft edit still counts.
  const activeCount = useMemo(() => institutions.filter((inst) => Number(inst.status) === 1).length, [institutions]);


  const columns = [
    { key: "code", label: t("institutions:columnCode"), render: (r) => <span className="font-mono font-bold text-slate-700">{r.code ?? "—"}</span> },
    {
      key: "name",
      label: t("institutions:columnName"),
      render: (r) => (
        <button type="button" onClick={() => navigate(`/institutions/${institutionId(r)}`)} className="font-semibold text-slate-800 hover:text-primary hover:underline">
          {r.name ?? "—"}
        </button>
      ),
    },
    { key: "type", label: t("institutions:columnType"), sortValue: (r) => r.type_name ?? r.type ?? "", render: (r) => r.type_name ?? r.type ?? "—" },
    {
      key: "status_name",
      label: t("institutions:columnStatus"),
      sortValue: (r) => r.status_name ?? r.status ?? "",
      render: (r) =>
        r.status == null && !r.status_name ? (
          "—"
        ) : (
          <StatusBadge
            status={String(
              r.status_name ?? (isInstitutionDraft(r) ? "DRAFT" : r.status === 1 ? "ACTIVE" : "INACTIVE"),
            ).toUpperCase()}
          />
        ),
    },
    {
      key: "process_status_name",
      label: t("institutions:columnProcessStatus"),
      sortValue: (r) => r.process_status_name ?? "",
      render: (r) => (r.process_status_name ? <StatusBadge status={String(r.process_status_name)} variant="subtle" /> : "—"),
    },
    {
      key: "auth_status",
      label: t("institutions:columnAuthorizationStatus"),
      sortValue: statusOf,
      render: (r) => (r.auth_status ? <StatusBadge status={statusOf(r)} variant="subtle" /> : "—"),
    },
    {
      key: "actions",
      label: t("institutions:columnActions"),
      sortable: false,
      render: (inst) => {
        const id = institutionId(inst);
        const buttons = actions.buttonsFor(inst);
        // A draft goes on in the create wizard.
        const draft = isInstitutionDraft(inst);
        return (
          <span className="flex items-center justify-center gap-2">
            {draft && buttons.edit && (
              <button type="button" onClick={() => navigate(`/institutions/create?draft=${id}`)} className="whitespace-nowrap rounded-lg bg-[var(--primary-light)] px-2.5 py-1 text-[11px] font-bold text-primary hover:underline">
                {t("institutions:continueSetup")}
              </button>
            )}
            <RowActions
              buttons={{ ...buttons, edit: buttons.edit && !draft }}
              onView={() => navigate(`/institutions/${id}`)}
              onEdit={() => navigate(`/institutions/${id}?edit=1`)}
              onAudit={() => setAuditInstitution(inst)}
              onSubmit={() => actions.open("submit", inst)}
              onAuthorize={() => actions.open("auth", inst)}
              onDeauthorize={() => actions.open("deauth", inst)}
              onDeactivate={() => actions.open("deactivate", inst)}
              onReactivate={() => actions.open("reactivate", inst)}
              onDelete={() => actions.open("delete", inst)}
            />
          </span>
        );
      },
    },
  ];

  return (
    <div className="pt-1 pb-6">
      <div className="mb-3">
        <PageTitle>{t("institutions:listTitle")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("institutions:listSubtitle", { total: institutions.length, active: activeCount })}
        </p>
      </div>

      <ListTable list={list} actions={
          actions.can.canAdd && canCreate && (
            <button
              type="button"
              onClick={() => navigate("/institutions/create")}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white"
            >
              <Plus size={14} /> {t("institutions:newInstitution")}
            </button>
          )
        } columns={columns} rowKey={(inst) => institutionId(inst)} title={t("institutions:listTitle")} emptyTitle={t("institutions:emptyTitle")} emptyDescription={t("institutions:emptyDescription")} />

      {actions.dialogs}

      {auditInstitution && (
        <AuditInstitutionProfile
          institution={auditInstitution}
          institutionId={institutionId(auditInstitution)}
          onClose={() => setAuditInstitution(null)}
        />
      )}
    </div>
  );
}
