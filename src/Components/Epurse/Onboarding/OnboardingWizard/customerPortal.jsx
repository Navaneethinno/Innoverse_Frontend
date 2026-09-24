import { useCallback, useEffect, useRef } from "react";
import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

// "Handoff — Admin Panel (web)" (2026-09), §2: customers can now onboard
// themselves in the separate customer portal. Such a customer is created
// by the platform actor `CustomerPortal`, not a staff user, and shows up in
// the admin lists like any other. It is a Draft (9/9) while the customer is
// still filling the form, and Active/AUTHORIZED straight after they submit
// (no approval step, can_authorise false, audit_action SELF).
export const PORTAL_ACTOR = "CustomerPortal";

export const isPortalCustomer = (record) => String(record?.created_by ?? "").trim() === PORTAL_ACTOR;

// A portal draft is the customer's own form, still being filled in. The
// handoff recommends showing it read-only (no Save/Submit) until the
// customer completes it.
export const isPortalDraft = (record) =>
  isPortalCustomer(record) && Number(record?.status) === 9 && Number(record?.process_status ?? 9) === 9;

// i18n key (customer namespace) for the portal-draft read-only reason.
export const PORTAL_DRAFT_REASON = "customer:portalDraftReason";

export function PortalSourceBadge({ record }) {
  const { t } = useTranslation("customer");
  if (!isPortalCustomer(record)) return null;
  return (
    <span
      className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}
    >
      <Globe size={10} /> {t("customerPortal")}
    </span>
  );
}

// Audit label: `SELF` on a customer = self-onboarded in the portal.
export function usePortalAuditLabel() {
  const { t } = useTranslation("customer");
  return (entry) =>
    String(entry?.audit_action ?? "").toUpperCase() === "SELF" ? t("selfOnboardedCustomerPortal") : entry?.audit_action;
}

// §3: a customer saving section by section in the portal produces one live
// `edit` push per save — coalesce a burst into one quiet list refresh.
export function useDebouncedRefresh(refresh, delay = 800) {
  const timer = useRef(null);
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => refreshRef.current(), delay);
  }, [delay]);
}

export function PortalDraftBanner() {
  const { t } = useTranslation("customer");
  return <div className="mt-4 rounded-lg bg-amber-50 p-2.5 text-xs font-semibold text-amber-700">{t(PORTAL_DRAFT_REASON)}</div>;
}
