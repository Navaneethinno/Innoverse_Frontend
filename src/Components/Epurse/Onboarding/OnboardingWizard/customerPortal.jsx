import { Globe, Hourglass, TrendingUp } from "lucide-react";
import { useAudienceTranslation } from "@/Hooks/useAudienceTranslation";

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
  const { t } = useAudienceTranslation("customer");
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
  const { t } = useAudienceTranslation("customer");
  return (entry) =>
    String(entry?.audit_action ?? "").toUpperCase() === "SELF" ? t("selfOnboardedCustomerPortal") : entry?.audit_action;
}

export function PortalDraftBanner() {
  const { t } = useAudienceTranslation("customer");
  return <div className="mt-4 rounded-lg bg-amber-50 p-2.5 text-xs font-semibold text-amber-700">{t(PORTAL_DRAFT_REASON)}</div>;
}

// Handoff 7 Oct 2026, customers. `kyc_upgrade` on the row (and the
// detail's `onboarding`): a customer completing the next KYC level
// themselves (e.g. after a USSD approval).
// - IN_PROGRESS: the customer is filling it in; staff can't edit it.
// - WAITING: submitted, an ordinary pending edit for a checker.
// - REJECTED: back with the customer to correct; staff can't edit it.
// `onboarding_status` HELD_FOR_GUARDIAN: a minor held until their guardian
// reaches the KYC level asked; nothing for staff to approve.
const kycUpgradeOf = (record) => String(record?.kyc_upgrade ?? "").toUpperCase();
export const isKycUpgradeWithCustomer = (record) => ["IN_PROGRESS", "REJECTED"].includes(kycUpgradeOf(record));
export const isHeldForGuardian = (record) => String(record?.onboarding_status ?? "").toUpperCase() === "HELD_FOR_GUARDIAN";

const UPGRADE_BADGES = {
  IN_PROGRESS: ["kycUpgradeInProgress", "bg-sky-50 text-sky-700"],
  WAITING: ["kycUpgradeWaiting", "bg-amber-50 text-amber-700"],
  REJECTED: ["kycUpgradeRejected", "bg-red-50 text-red-700"],
};

export function CustomerStateBadges({ record }) {
  const { t } = useAudienceTranslation("customer");
  const badge = (key, icon, text, tone) => (
    <span key={key} className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${tone}`}>
      {icon} {text}
    </span>
  );
  const out = [];
  const upgrade = UPGRADE_BADGES[kycUpgradeOf(record)];
  if (upgrade) out.push(badge("upgrade", <TrendingUp size={10} />, t(upgrade[0]), upgrade[1]));
  if (isHeldForGuardian(record)) out.push(badge("guardian", <Hourglass size={10} />, t("waitingForGuardian"), "bg-violet-50 text-violet-700"));
  return out.length ? <span className="flex flex-wrap gap-1">{out}</span> : null;
}
