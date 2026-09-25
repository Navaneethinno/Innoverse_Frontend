import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { AlertCircle, ArrowLeft, Building2, Contact, IdCard, KeyRound, Pencil, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "@/Hooks/useAuth";
import { useHasUserAction, useMyProfileQuery } from "@/Hooks/UserManagement/userHooks";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { CopyButton } from "@/Components/Common/CopyButton";
import { Skeleton } from "@/Components/UI/skeleton";

// "My profile", opened from the header's user menu: the signed-in user's own
// record from /config/user/get. Read-only — changes to a user go through the
// maker-checker User screen; the one self-service action is Change password.

const glass = {
  background: "var(--glass-bg)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--glass-shadow)",
};

const fullName = (u) => [u?.first_name ?? u?.user_fname, u?.middle_name ?? u?.user_mname, u?.last_name ?? u?.user_lname].filter(Boolean).join(" ");

const initials = (u) => {
  const parts = [u?.first_name ?? u?.user_fname, u?.last_name ?? u?.user_lname].filter(Boolean);
  const source = parts.length ? parts : [u?.username ?? "?"];
  return source.map((p) => String(p)[0]).join("").slice(0, 2).toUpperCase();
};

function formatDate(value, language) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(language, { year: "numeric", month: "long", day: "numeric" });
}

function Field({ label, value, copy, href, wrap = false }) {
  const empty = value == null || value === "";
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-semibold text-slate-800">
        {empty ? (
          <span className="font-medium text-muted-foreground">—</span>
        ) : href ? (
          <a href={href} className="truncate hover:text-primary hover:underline">
            {value}
          </a>
        ) : (
          <span className={wrap ? "break-words" : "truncate"}>{value}</span>
        )}
        {!empty && copy && <CopyButton value={String(value)} />}
      </dd>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="rounded-2xl border p-5" style={glass}>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
          <Icon size={14} />
        </span>
        {title}
      </h2>
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function ProfileSkeleton() {
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-4 rounded-2xl border p-6" style={glass}>
        <Skeleton className="h-16 w-16 rounded-2xl" />
        <div className="grid gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3.5 w-32" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="grid gap-4 rounded-2xl border p-5" style={glass}>
            <Skeleton className="h-4 w-32" />
            <div className="grid gap-4 sm:grid-cols-2">
              {[0, 1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-9 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MyProfilePage() {
  const { t, i18n } = useTranslation("myProfile");
  const navigate = useNavigate();
  const sessionUser = useAuth((s) => s.user);
  const userId = sessionUser?.id ?? sessionUser?.user_id;
  const { data, isLoading, error, refetch } = useMyProfileQuery(userId);
  // Editing reuses the User screen's own edit form (maker-checker), so it's
  // only offered to users who hold Edit on the User menu.
  const canEdit = useHasUserAction("Edit");
  // Fall back to the session's own fields while loading or if the call fails,
  // so the header block never renders empty.
  const u = data ?? sessionUser ?? {};
  const name = fullName(u) || u.username;

  return (
    <div className="mx-auto max-w-5xl pb-12 pt-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-slate-800"
      >
        <ArrowLeft size={16} /> {t("common:back")}
      </button>

      {isLoading && !data ? (
        <ProfileSkeleton />
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="grid gap-4">
          {error && (
            <div className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm" style={{ background: "var(--destructive-soft)", borderColor: "var(--destructive)", color: "var(--destructive)" }}>
              <span className="flex items-center gap-2 font-medium">
                <AlertCircle size={15} /> {error}
              </span>
              <button type="button" onClick={() => void refetch()} className="flex items-center gap-1.5 font-bold hover:underline">
                <RefreshCw size={13} /> {t("common:retry")}
              </button>
            </div>
          )}

          {/* Identity header */}
          <div className="relative overflow-hidden rounded-2xl border p-6" style={glass}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-20 opacity-60" style={{ background: "linear-gradient(135deg, var(--primary-light), transparent 70%)" }} />
            <div className="relative flex flex-wrap items-center gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white shadow-lg"
                style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-hover))" }}
                aria-hidden="true"
              >
                {initials(u)}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl font-black text-slate-800">{name}</h1>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  @{u.username}
                  {u.employee_id && <> · {u.employee_id}</>}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {u.profile_name && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
                      <ShieldCheck size={12} /> {u.profile_name}
                    </span>
                  )}
                  {u.inst_profile_name && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                      <Building2 size={12} /> {u.inst_profile_name}
                    </span>
                  )}
                  {u.status_name && <StatusBadge status={u.status_name} />}
                </div>
              </div>
              <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                {canEdit && userId && (
                  <button
                    type="button"
                    onClick={() => navigate(`/users?edit=${userId}`)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white sm:flex-none"
                  >
                    <Pencil size={14} /> {t("editProfile")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate("/change-password")}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-primary hover:text-primary sm:flex-none"
                >
                  <KeyRound size={14} /> {t("changePassword")}
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section icon={UserRound} title={t("personalDetails")}>
              <Field label={t("firstName")} value={u.first_name ?? u.user_fname} />
              <Field label={t("middleName")} value={u.middle_name ?? u.user_mname} />
              <Field label={t("lastName")} value={u.last_name ?? u.user_lname} />
              <Field label={t("gender")} value={u.gender} />
              <Field label={t("employeeId")} value={u.employee_id} copy />
            </Section>

            <Section icon={Contact} title={t("contactDetails")}>
              <Field label={t("email")} value={u.email} href={u.email ? `mailto:${u.email}` : undefined} copy />
              <Field label={t("mobile")} value={u.mobile} href={u.mobile ? `tel:${u.mobile}` : undefined} copy />
              <Field label={t("alternateEmail")} value={u.alternate_email} href={u.alternate_email ? `mailto:${u.alternate_email}` : undefined} />
              <Field label={t("alternateMobile")} value={u.alternate_mob} href={u.alternate_mob ? `tel:${u.alternate_mob}` : undefined} />
              <div className="min-w-0 sm:col-span-2">
                <Field label={t("address")} value={u.address} wrap />
              </div>
            </Section>
          </div>

          <Section icon={IdCard} title={t("account")}>
            <Field label={t("username")} value={u.username} copy />
            <Field label={t("role")} value={u.profile_name} />
            <Field label={t("institution")} value={u.inst_profile_name} />
            <Field label={t("passwordPolicy")} value={u.policy_name} />
            <div className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("authorization")}</dt>
              <dd className="mt-1">{u.auth_status ? <StatusBadge status={u.auth_status} variant="subtle" /> : "—"}</dd>
            </div>
            <Field label={t("memberSince")} value={formatDate(u.created_time, i18n.language)} />
          </Section>

          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            {canEdit ? t("editApprovalHint") : t("editHint")}
          </p>
        </motion.div>
      )}
    </div>
  );
}
