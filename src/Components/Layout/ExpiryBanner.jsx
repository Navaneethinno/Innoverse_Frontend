import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AlertTriangle, CalendarClock, X } from "lucide-react";
import { formatDay } from "@/Utils/Lib/dateFormat";
import { useMenuPermission } from "@/Hooks/usePermission";
import { expiryNoticesApi } from "@/Services/Expiry/expiry.api";
import { recordOf } from "@/Services/Loans/loans.api";
import { cn } from "@/Utils/Lib/utils";

const EVERY = 30 * 60 * 1000;
const TONES = {
  danger: "border-red-200 bg-red-50 text-red-800",
  warning: "border-orange-200 bg-orange-50 text-orange-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
};

// The text of one notice, by kind and state.
function noticeText(t, n) {
  const values = {
    label: n.label,
    expires: formatDay(n.expires_on),
    stops: formatDay(n.stops_on),
    count: n.days_left,
  };
  if (n.kind === "MODULE_SUBSCRIPTION") return t(`notice_module_${n.state}`, values);
  if (n.kind === "INSTITUTION_LICENCE") return t("notice_licence", values);
  if (n.kind === "STAFF_PASSWORD") return t("notice_password", values);
  return n.label;
}

// Across the portal, under the top bar: the signed-in user's expiring
// modules, licence and password, and (for users of Expiring Documents) how
// many customer documents run out. Read at sign-in and every 30 minutes; a
// line closed stays closed until the next read.
export function ExpiryBanner() {
  const { t } = useTranslation("expiry");
  const canDocuments = useMenuPermission("Expiring Documents")("View");
  const [data, setData] = useState(null);
  const [closed, setClosed] = useState([]);
  useEffect(() => {
    const read = () =>
      expiryNoticesApi()
        .then((r) => {
          setData(recordOf(r));
          setClosed([]);
        })
        .catch(() => setData(null));
    void read();
    const timer = window.setInterval(read, EVERY);
    return () => window.clearInterval(timer);
  }, []);

  const docs = data?.documents ?? {};
  const lines = [
    ...(data?.notices ?? []).map((n) => ({
      key: `${n.kind}-${n.label}`,
      tone: n.severity,
      text: noticeText(t, n),
      link: n.kind === "STAFF_PASSWORD" ? { to: "/change-password", label: t("changeNow") } : null,
    })),
    canDocuments &&
      (docs.EXPIRING > 0 || docs.IN_GRACE > 0 || docs.EXPIRED > 0) && {
        key: "documents",
        tone: docs.EXPIRED > 0 || docs.IN_GRACE > 0 ? "warning" : "info",
        text: t("notice_documents", { expiring: docs.EXPIRING ?? 0, grace: docs.IN_GRACE ?? 0 }),
        link: { to: "/expiringdocuments", label: t("viewDocuments") },
      },
  ].filter((l) => l && !closed.includes(l.key));
  if (!lines.length) return null;
  return (
    <div className="mb-3 grid gap-1.5">
      {lines.map((l) => (
        <div
          key={l.key}
          role="status"
          className={cn(
            "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold",
            TONES[l.tone] ?? TONES.info,
          )}
        >
          {l.tone === "danger" ? (
            <AlertTriangle size={14} className="shrink-0" />
          ) : (
            <CalendarClock size={14} className="shrink-0" />
          )}
          <span className="min-w-0 flex-1">
            {l.text}
            {l.link && (
              <Link to={l.link.to} className="ml-2 underline underline-offset-2">
                {l.link.label}
              </Link>
            )}
          </span>
          <button
            type="button"
            onClick={() => setClosed((c) => [...c, l.key])}
            aria-label={t("close")}
            className="shrink-0 rounded-md p-0.5 opacity-60 hover:opacity-100"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
