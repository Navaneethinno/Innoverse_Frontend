import { createElement, useCallback, useEffect, useState, Fragment } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileImage,
  FileText,
  Fingerprint,
  FolderKanban,
  Gauge,
  History,
  KeyRound,
  Landmark,
  Lock,
  ScanFace,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
  Wallet,
  XCircle,
} from "lucide-react";
import { Spinner } from "@/Components/Common/Spinner";
import { StoredFilePreview, useStoredFileUrl } from "@/Components/Common/FileUploadField";
import { KycPdfButton } from "./KycReportPdf";
import { scoredRisk, screenedAml } from "./kycShared";
import { CustomerStateBadges } from "@/Components/Epurse/Onboarding/OnboardingWizard/customerPortal";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { MiniTable } from "@/Components/Loans/loanShared";
import { cn } from "@/Utils/Lib/utils";
import { glassCard } from "../Shared/reportShared";

// KYC Report: everything about one customer or merchant on one read-only
// page (Admin portal handoff "KYC Report"). `api` is the onboarding API of
// the row's kind (customer/merchant, individual/corporate) and `body`
// { customer_id } or { reference_id }; the reply is data[0].

const rowsOf = (v) => (Array.isArray(v) ? v : []);
// Every time is ISO 8601 with its offset: shown in the user's local time.
const when = (v) => (v ? new Date(v).toLocaleString() : "—");
const day = (v) => (v ? new Date(v).toLocaleDateString() : "—");
const show = (v) => (v === null || v === undefined || v === "" ? "—" : String(v));

function Card({ id, icon, title, count, children, className }) {
  return (
    <section id={id} className={cn("scroll-mt-32 rounded-2xl p-4 sm:p-5", className)} style={glassCard}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-800">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--primary)]">
          {createElement(icon, { size: 15 })}
        </span>
        {title}
        {count != null && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
            {count}
          </span>
        )}
      </h2>
      {children}
    </section>
  );
}

function None() {
  const { t } = useTranslation("kycReport");
  return <p className="py-2 text-sm text-muted-foreground">{t("none")}</p>;
}

function Sub({ title, children }) {
  return (
    <div className="mt-4 first:mt-0">
      <h3 className="mb-2 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

// A coloured pill; neutral without a colour.
function ColorBadge({ color, children }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold"
      style={
        color
          ? {
              borderColor: color,
              color,
              background: `color-mix(in srgb, ${color} 12%, transparent)`,
            }
          : undefined
      }
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: color || "var(--muted-foreground)" }}
      />
      {children}
    </span>
  );
}

function Pass({ ok }) {
  return ok ? (
    <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
  ) : (
    <XCircle size={14} className="shrink-0 text-red-600" />
  );
}

// A response as readable rows: "Verification status: Succeeded", nested
// keys as "Address · City", lists joined; never raw JSON.
const humanKey = (k) => String(k).replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
function detailRows(value, prefix = "") {
  if (value === null || value === undefined || value === "") return [];
  if (Array.isArray(value)) {
    if (!value.some((v) => v && typeof v === "object")) return [[prefix, value.join(", ")]];
    return value.flatMap((v, i) => detailRows(v, `${prefix}${prefix ? " · " : ""}${i + 1}`));
  }
  if (typeof value === "object") return Object.entries(value).flatMap(([k, v]) => detailRows(v, prefix ? `${prefix} · ${humanKey(k)}` : humanKey(k)));
  return [[prefix, value]];
}

// Detail behind a toggle (a check's response, a list entry...).
function Details({ value }) {
  const { t } = useTranslation("kycReport");
  const [open, setOpen] = useState(false);
  if (value === null || value === undefined) return null;
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] font-bold text-[var(--primary)] hover:underline"
      >
        {open ? t("hideDetails") : t("details")}
      </button>
      {open && (
        <dl className="thin-scrollbar mt-1 grid max-h-56 grid-cols-[auto_1fr] gap-x-4 gap-y-1 overflow-auto rounded-lg bg-muted/60 p-2 text-[11px]">
          {detailRows(value).map(([k, v], i) => (
            <Fragment key={i}>
              <dt className="text-muted-foreground">{k || t("value")}</dt>
              <dd className="break-words font-semibold text-foreground">{typeof v === "boolean" ? (v ? t("yes") : t("no")) : /^[a-z_]+$/.test(String(v)) ? humanKey(v) : String(v)}</dd>
            </Fragment>
          ))}
        </dl>
      )}
    </div>
  );
}

function Pairs({ items }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </dt>
          <dd
            className="truncate text-sm font-semibold text-slate-700"
            title={typeof value === "string" ? value : undefined}
          >
            {value ?? "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// --- Header ---------------------------------------------------------------

// The selfie when there is one, else the initials.
function Avatar({ photo, name }) {
  const url = useStoredFileUrl(photo?.path, photo?.download);
  const initials = String(name ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
  return url.url && url.isImage ? (
    <img src={url.url} alt="" className="h-16 w-16 shrink-0 rounded-2xl border-2 border-white object-cover shadow-md" />
  ) : (
    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)] text-xl font-black text-[var(--primary-foreground,#fff)] shadow-md">{initials}</span>
  );
}

const SECTIONS = [
  ["kyc-profile", "profile"],
  ["kyc-documents", "documents"],
  ["kyc-identity", "identityChecks"],
  ["kyc-kyc", "kyc"],
  ["kyc-risk", "risk"],
  ["kyc-aml", "aml"],
  ["kyc-cases", "cases"],
  ["kyc-accounts", "accountsBlock"],
  ["kyc-loans", "depositsLoans"],
  ["kyc-cards", "cards"],
  ["kyc-access", "signIn"],
  ["kyc-timeline", "timeline"],
  ["kyc-record", "recordDetails"],
];

// Quick links to each card of the long page.
function SectionLinks() {
  const { t } = useTranslation("kycReport");
  return (
    <nav className="thin-scrollbar sticky top-16 z-20 -mx-1 flex gap-1.5 overflow-x-auto rounded-2xl px-1 py-1.5" style={glassCard}>
      {SECTIONS.map(([id, key]) => (
        <a
          key={id}
          href={`#${id}`}
          onClick={(e) => {
            e.preventDefault();
            document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="shrink-0 rounded-full px-3 py-1 text-[11px] font-bold text-slate-600 transition-colors hover:bg-[var(--primary-light)] hover:text-[var(--primary)]"
        >
          {t(key)}
        </a>
      ))}
    </nav>
  );
}

function Stat({ icon, label, children }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card/70 p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {createElement(icon, { size: 12 })} {label}
      </p>
      <div className="mt-1.5 min-w-0">{children}</div>
    </div>
  );
}

function Header({ summary, photo }) {
  const { t } = useTranslation("kycReport");
  const {
    profile = {},
    customer_type: type,
    onboarding = {},
    kyc = {},
    accounts,
  } = summary ?? {};
  const risk = scoredRisk(summary?.risk);
  const aml = screenedAml(summary?.aml);
  const band = aml?.effective_band;
  return (
    <section className="rounded-2xl p-4 sm:p-5" style={glassCard}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar photo={photo} name={profile.display_name} />
          <div className="min-w-0">
          <h1 className="truncate text-2xl font-black tracking-tight text-slate-800">
            {profile.display_name || "—"}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
            {type?.name && (
              <span className="rounded-full bg-muted px-2 py-0.5 font-bold text-slate-600">
                {type.name}
              </span>
            )}
            {type?.ownership_name && (
              <span className="rounded-full bg-muted px-2 py-0.5 font-bold text-slate-600">
                {type.ownership_name}
              </span>
            )}
            {profile.status != null && (
              <StatusBadge
                status={t(`status_${profile.status}`, { defaultValue: String(profile.status) })}
              />
            )}
            {onboarding.onboarding_status && (
              <span className="text-muted-foreground">
                {t("onboardingStatus")}:{" "}
                <StatusBadge status={onboarding.onboarding_status} variant="subtle" />
                <CustomerStateBadges record={onboarding} />
              </span>
            )}
          </div>
        </div>
          </div>
        <p className="font-mono text-[11px] text-muted-foreground" title={onboarding.reference_id}>
          {t("reference")}: {onboarding.reference_id ?? "—"}
        </p>
      </div>
      <div className="mt-4">
        <Pairs
          items={[
            [t("phone"), show(onboarding.phone_number)],
            [t("email"), show(onboarding.email)],
            [t("channel"), show(onboarding.channel)],
            [t("started"), when(onboarding.started_at)],
            [t("completed"), when(onboarding.completed_at)],
            [t("created"), when(profile.created_time)],
          ]}
        />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={UserCheck} label={t("kyc")}>
          {kyc?.level_name || kyc?.level_no != null ? (
            <>
              <p className="truncate text-sm font-bold">
                {kyc.level_name ?? `${t("level")} ${kyc.level_no}`}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {[kyc.group_name, kyc.kyc_status].filter(Boolean).join(" · ") || "—"}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noKyc")}</p>
          )}
        </Stat>
        <Stat icon={Gauge} label={t("risk")}>
          {risk ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl font-black tabular-nums">{risk.risk_score}</span>
              <ColorBadge color={risk.color_code}>{risk.level_name ?? risk.level_code}</ColorBadge>
              {risk.risk_action_name && (
                <span className="text-[11px] text-muted-foreground">{risk.risk_action_name}</span>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("notAssessed")}</p>
          )}
        </Stat>
        <Stat icon={ShieldAlert} label={t("aml")}>
          {aml ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl font-black tabular-nums">
                {aml.effective_score ?? aml.score}
              </span>
              {band && <ColorBadge color={band.color_code}>{band.name}</ColorBadge>}
              <span className="text-[11px] text-muted-foreground">
                {t("matches")}: {aml.match_count ?? 0}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("notScreened")}</p>
          )}
        </Stat>
        <Stat icon={Wallet} label={t("accounts")}>
          <span className="text-xl font-black tabular-nums">{accounts ?? 0}</span>
        </Stat>
      </div>
    </section>
  );
}

// --- Profile -------------------------------------------------------------

function fieldValue(field, value, t) {
  if (value === null || value === undefined || value === "") return "—";
  if (field?.field_type === "FILE")
    return <span className="text-muted-foreground">{t("inDocuments")}</span>;
  const label = (v) => field?.choices?.find((c) => String(c.value) === String(v))?.label ?? v;
  if (Array.isArray(value)) return value.map(label).join(", ");
  if (typeof value === "boolean") return value ? t("yes") : t("no");
  if (typeof value === "object")
    return (
      Object.values(value)
        .filter((v) => v !== null && v !== "")
        .join(" · ") || "—"
    );
  return String(label(value));
}

function SectionValues({ section }) {
  const { t } = useTranslation("kycReport");
  const fields = rowsOf(section.fields).filter((f) => f.field_type !== "PIN");
  const grid = (values) => (
    <Pairs items={fields.map((f) => [f.label ?? f.key, fieldValue(f, values?.[f.key], t)])} />
  );
  if (section.multi_row) {
    const rows = rowsOf(section.values);
    if (!rows.length) return <None />;
    return (
      <div className="grid gap-3">
        {rows.map((values, i) => (
          <div key={i} className="rounded-xl border border-border p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("row", { n: i + 1 })}
            </p>
            {grid(values)}
          </div>
        ))}
      </div>
    );
  }
  return grid(section.values);
}

function ProfileCard({ profile }) {
  const { t } = useTranslation("kycReport");
  const sections = Array.isArray(profile) ? profile : null;
  const legacy =
    !sections && profile && typeof profile === "object" ? Object.entries(profile) : null;
  return (
    <Card id="kyc-profile" icon={User} title={t("profile")}>
      {sections?.length ? (
        sections.map((s, i) => (
          <Sub key={s.key ?? s.section_key ?? i} title={s.heading ?? s.key}>
            <SectionValues section={s} />
          </Sub>
        ))
      ) : legacy?.length ? (
        // A customer made before the form builder: the stored answers.
        legacy.map(([section, values]) => (
          <Sub key={section} title={section.replace(/_/g, " ")}>
            {values && typeof values === "object" ? (
              <Pairs
                items={Object.entries(values).map(([k, v]) => [
                  k.replace(/_/g, " "),
                  fieldValue(null, v, t),
                ])}
              />
            ) : (
              show(values)
            )}
          </Sub>
        ))
      ) : (
        <None />
      )}
    </Card>
  );
}

// --- Documents -----------------------------------------------------------

const ROLE_KEYS = {
  idv_front: "idFront",
  idv_back: "idBack",
  idv_selfie: "selfie",
  kyc_document_front: "kycDocFront",
  kyc_document_back: "kycDocBack",
};
const hasRole = (doc, role) => rowsOf(doc.roles).includes(role);

function DocTile({ doc, download, large }) {
  const { t } = useTranslation("kycReport");
  const roles = rowsOf(doc.roles).map((r) => t(ROLE_KEYS[r] ?? r, { defaultValue: r }));
  const extra = [
    doc.side && t(`side_${doc.side}`, { defaultValue: doc.side }),
    doc.row != null && t("row", { n: Number(doc.row) + 1 }),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <figure className="min-w-0">
      <StoredFilePreview
        value={doc.path}
        download={download}
        className={large ? "h-56 w-full" : "h-28 w-full"}
      />
      <figcaption className="mt-1.5 min-w-0">
        <p className="truncate text-xs font-semibold text-slate-700" title={doc.label}>
          {doc.label ?? doc.field_key}
        </p>
        <p className="truncate text-[10px] text-muted-foreground">
          {[roles.join(", "), extra].filter(Boolean).join(" · ") || doc.section_heading}
        </p>
      </figcaption>
    </figure>
  );
}

function DocumentsCard({ documents, download }) {
  const { t } = useTranslation("kycReport");
  const docs = rowsOf(documents);
  // The selfie next to the ID front, so the reviewer can compare faces.
  const front = docs.find((d) => hasRole(d, "idv_front"));
  const selfie = docs.find((d) => hasRole(d, "idv_selfie"));
  const pair = front && selfie ? [front, selfie] : [];
  const rest = docs.filter((d) => !pair.includes(d));
  return (
    <Card id="kyc-documents" icon={FileImage} title={t("documents")} count={docs.length}>
      {!docs.length && <None />}
      {pair.length > 0 && (
        <Sub title={t("faceCompare")}>
          <div className="grid gap-3 sm:grid-cols-2">
            {pair.map((d) => (
              <DocTile key={d.path} doc={d} download={download} large />
            ))}
          </div>
        </Sub>
      )}
      {rest.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {rest.map((d) => (
            <DocTile key={d.path} doc={d} download={download} />
          ))}
        </div>
      )}
    </Card>
  );
}

// --- Identity checks -----------------------------------------------------

function IdentityCard({ checks }) {
  const { t } = useTranslation("kycReport");
  const list = rowsOf(checks);
  return (
    <Card id="kyc-identity" icon={ScanFace} title={t("identityChecks")} count={list.length}>
      {!list.length && <None />}
      <div className="grid gap-3">
        {list.map((c, i) => {
          const passed = c.status === "PASSED";
          return (
            <div
              key={i}
              className={cn(
                "rounded-xl border p-3",
                passed ? "border-emerald-200" : "border-red-200",
              )}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-black",
                    passed ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
                  )}
                >
                  {c.status}
                </span>
                {!passed && c.failed_step && (
                  <span className="font-semibold text-red-700">
                    {t("failedAt", { step: c.failed_step })}
                  </span>
                )}
                <span className="text-muted-foreground">
                  {[c.channel, c.actor].filter(Boolean).join(" · ")}
                </span>
                <span className="ml-auto text-muted-foreground">{when(c.created_time)}</span>
              </div>
              <ul className="mt-2 grid gap-1.5">
                {rowsOf(c.steps).map((s, j) => (
                  <li key={j} className="rounded-lg bg-muted/40 px-2.5 py-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <Pass ok={s.ok} />
                      <span className="font-semibold">{t(`step_${s.step}`, { defaultValue: humanKey(String(s.step ?? "").toLowerCase()) })}</span>
                      {s.ms != null && (
                        <span className="ml-auto text-[10px] text-muted-foreground">{s.ms} ms</span>
                      )}
                    </div>
                    <Details value={s.response} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// --- KYC ---------------------------------------------------------------

function KycCard({ kyc, processes }) {
  const { t } = useTranslation("kycReport");
  const records = rowsOf(kyc);
  const checks = rowsOf(processes);
  return (
    <Card id="kyc-kyc" icon={Fingerprint} title={t("kyc")}>
      <Sub title={t("kycRecords")}>
        <MiniTable
          rows={records}
          empty={t("none")}
          columns={[
            { key: "group_name", label: t("group") },
            {
              key: "level",
              label: t("level"),
              render: (r) => [r.level_no, r.level_name].filter((v) => v != null).join(" · ") || "—",
            },
            {
              key: "kyc_status",
              label: t("status"),
              render: (r) =>
                r.kyc_status ? <StatusBadge status={r.kyc_status} variant="subtle" /> : "—",
            },
            { key: "started_at", label: t("started"), render: (r) => when(r.started_at) },
            { key: "completed_at", label: t("completed"), render: (r) => when(r.completed_at) },
          ]}
        />
      </Sub>
      <Sub title={t("kycProcesses")}>
        {!checks.length ? (
          <None />
        ) : (
          <ul className="grid gap-2">
            {checks.map((p, i) => (
              <li key={i} className="rounded-xl border border-border p-2.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold">{p.process_name}</span>
                  {p.process_category && (
                    <span className="text-muted-foreground">{p.process_category}</span>
                  )}
                  {p.process_result_status && (
                    <StatusBadge status={p.process_result_status} variant="subtle" />
                  )}
                  <span className="ml-auto text-muted-foreground">{when(p.completed_at)}</span>
                </div>
                <Details value={p.result} />
              </li>
            ))}
          </ul>
        )}
      </Sub>
    </Card>
  );
}

// --- Risk --------------------------------------------------------------

// The assessment's points: one row per scored question of breakdown.criteria.
function RiskPoints({ breakdown }) {
  const { t } = useTranslation("kycReport");
  return (
    <MiniTable
      rows={rowsOf(breakdown?.criteria)}
      empty={t("none")}
      rowKey={(r, i) => r.field_code ?? i}
      columns={[
        { key: "field_name", label: t("criterion"), render: (r) => show(r.field_name ?? r.field_code) },
        {
          key: "value_name",
          label: t("answer"),
          render: (r) => (r.answered === false ? <span className="italic text-muted-foreground">{t("notAnswered")}</span> : show(r.value_name)),
        },
        { key: "weight", label: t("weight"), align: "right", render: (r) => show(r.weight) },
        {
          key: "points",
          label: t("points"),
          align: "right",
          render: (r) => (
            <span>
              <b>{show(r.points)}</b>
              {r.max_points != null && <span className="text-muted-foreground"> / {r.max_points}</span>}
            </span>
          ),
        },
      ]}
    />
  );
}

// The level bands from min to max score, each in its colour, with a marker
// at the score.
function ScoreScale({ levels, score }) {
  const bands = [...rowsOf(levels)].sort((a, b) => Number(a.min_score) - Number(b.min_score));
  if (!bands.length) return null;
  const lo = Number(bands[0].min_score ?? 0);
  const hi = Number(bands[bands.length - 1].max_score ?? 100);
  const span = hi - lo || 100;
  const at = Math.min(100, Math.max(0, ((Number(score) - lo) / span) * 100));
  return (
    <div className="mt-4 max-w-2xl">
      <div className="relative pt-5">
        <span className="absolute top-0 -translate-x-1/2 text-[10px] font-black tabular-nums text-slate-700" style={{ left: `${at}%` }}>
          {score}
        </span>
        <span className="absolute top-4 z-10 h-5 w-0.5 -translate-x-1/2 rounded-full bg-slate-800 ring-2 ring-white" style={{ left: `${at}%` }} />
        <div className="flex h-3 overflow-hidden rounded-full">
          {bands.map((b) => (
            <span key={b.code} title={`${b.name} ${b.min_score}–${b.max_score}`} style={{ width: `${((Number(b.max_score) - Number(b.min_score)) / span) * 100}%`, background: b.color_code ?? "var(--muted)" }} />
          ))}
        </div>
      </div>
      <div className="mt-1 flex">
        {bands.map((b) => (
          <span key={b.code} className="truncate text-[10px] font-semibold text-muted-foreground" style={{ width: `${((Number(b.max_score) - Number(b.min_score)) / span) * 100}%` }}>
            {b.name} <span className="tabular-nums">{b.min_score}–{b.max_score}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function RiskHistoryRow({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-xl border border-border">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full flex-wrap items-center gap-2 p-2.5 text-left text-xs">
        <ChevronRight size={13} className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
        <span className="font-black tabular-nums">{item.risk_score}</span>
        <ColorBadge color={item.color_code ?? rowsOf(item.breakdown?.levels).find((l) => l.code === item.level_code)?.color_code}>{item.level_name ?? item.level_code}</ColorBadge>
        {item.source && <span className="rounded bg-muted px-1.5 text-[10px] font-bold">{item.source}</span>}
        {item.risk_action_name && <span className="text-muted-foreground">{item.risk_action_name}</span>}
        <span className="ml-auto text-muted-foreground">
          {when(item.assessed_at)}
          {item.assessed_by ? ` · ${item.assessed_by}` : ""}
        </span>
      </button>
      {open && (
        <div className="border-t border-border p-2.5">
          <RiskPoints breakdown={item.breakdown} />
        </div>
      )}
    </li>
  );
}

function RiskCard({ risk, history }) {
  const { t } = useTranslation("kycReport");
  const past = rowsOf(history);
  return (
    <Card id="kyc-risk" icon={Gauge} title={t("risk")}>
      <Sub title={t("currentRisk")}>
        {!risk ? (
          <None />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-3xl font-black tabular-nums">{risk.risk_score}</span>
              <ColorBadge color={risk.color_code}>{risk.level_name ?? risk.level_code}</ColorBadge>
              <span className="text-xs text-muted-foreground">
                {t("action")}: <b className="text-slate-700">{show(risk.risk_action_name)}</b> · {when(risk.assessed_at)}
              </span>
              {risk.breakdown?.setup?.name && <span className="text-xs text-muted-foreground">· {risk.breakdown.setup.name}</span>}
            </div>
            <ScoreScale levels={risk.breakdown?.levels} score={risk.risk_score} />
          </>
        )}
      </Sub>
      {risk && (
        <Sub title={t("riskPoints")}>
          <RiskPoints breakdown={risk.breakdown} />
        </Sub>
      )}
      <Sub title={t("riskHistory")}>
        {!past.length ? (
          <None />
        ) : (
          <ul className="thin-scrollbar grid max-h-[32rem] gap-2 overflow-y-auto pr-1">
            {past.map((h, i) => (
              <RiskHistoryRow key={i} item={h} />
            ))}
          </ul>
        )}
      </Sub>
    </Card>
  );
}

// --- AML ---------------------------------------------------------------

function AmlSubject({ subject }) {
  return subject && typeof subject === "object" ? Object.values(subject).filter(Boolean).join(" · ") : show(subject);
}

function AmlMatches({ screening }) {
  const { t } = useTranslation("kycReport");
  const matches = rowsOf(screening.matches);
  if (!matches.length) return <p className="text-xs text-muted-foreground">{t("noMatches")}</p>;
  return (
    <ul className="grid gap-1.5">
      {matches.map((m, j) => (
        <li key={j} className="rounded-lg border border-border px-2.5 py-1.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{m.matched_name}</span>
            <span className="rounded bg-red-50 px-1.5 text-[10px] font-black tabular-nums text-red-700">{m.score}</span>
            <span className="text-muted-foreground">{[m.list_code, m.category, m.entity_type].filter(Boolean).join(" · ")}</span>
          </div>
          <Details value={m.entity} />
        </li>
      ))}
    </ul>
  );
}

// What a screening searched and how it ended.
function AmlFacts({ screening: s }) {
  const { t } = useTranslation("kycReport");
  return (
    <>
      {s.error && <p className="mb-2 text-xs font-semibold text-red-700">{s.error}</p>}
      <Pairs
        items={[
          [t("subject"), <AmlSubject key="s" subject={s.subject} />],
          [t("trigger"), show(s.trigger)],
          [t("by"), show(s.screened_by)],
          [t("score"), show(s.score)],
          [t("effectiveScore"), show(s.effective_score)],
          [t("matches"), show(s.match_count ?? rowsOf(s.matches).length)],
        ]}
      />
    </>
  );
}

function AmlHistoryRow({ screening: s }) {
  const [open, setOpen] = useState(false);
  const band = s.effective_band;
  return (
    <li className="rounded-xl border border-border">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full flex-wrap items-center gap-2 p-2.5 text-left text-xs">
        <ChevronRight size={13} className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
        <span className="font-black tabular-nums">{s.effective_score ?? s.score ?? "—"}</span>
        {band && <ColorBadge color={band.color_code}>{band.name}</ColorBadge>}
        {s.party_role && <span className="rounded bg-muted px-1.5 text-[10px] font-bold">{s.party_role}</span>}
        {s.trigger && <span className="rounded bg-muted px-1.5 text-[10px] font-bold">{s.trigger}</span>}
        {s.status && s.status !== "DONE" && <StatusBadge status={s.status} variant="subtle" />}
        <span className="ml-auto text-muted-foreground">
          {when(s.screened_at)}
          {s.screened_by ? ` · ${s.screened_by}` : ""}
        </span>
      </button>
      {open && (
        <div className="grid gap-3 border-t border-border p-2.5">
          <AmlFacts screening={s} />
          <AmlMatches screening={s} />
        </div>
      )}
    </li>
  );
}

function AmlCard({ screenings }) {
  const { t } = useTranslation("kycReport");
  const list = rowsOf(screenings);
  const latest = list[0];
  const band = latest?.effective_band;
  const score = latest?.effective_score ?? latest?.score;
  return (
    <Card id="kyc-aml" icon={ShieldCheck} title={t("screenings")} count={list.length}>
      <Sub title={t("latestScreening")}>
        {!latest ? (
          <None />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-3xl font-black tabular-nums">{score ?? "—"}</span>
              {band && <ColorBadge color={band.color_code}>{band.name}</ColorBadge>}
              <span className="text-xs text-muted-foreground">
                {t("action")}: <b className="text-slate-700">{show(band?.risk_action_name)}</b> · {when(latest.screened_at)}
              </span>
              {latest.party_role && <span className="text-xs text-muted-foreground">· {latest.party_role}</span>}
            </div>
            {score != null && <ScoreScale levels={latest.levels} score={score} />}
            <div className="mt-4">
              <AmlFacts screening={latest} />
            </div>
          </>
        )}
      </Sub>
      {latest && (
        <Sub title={t("matches")}>
          <AmlMatches screening={latest} />
        </Sub>
      )}
      <Sub title={t("history")}>
        {!list.length ? (
          <None />
        ) : (
          <ul className="thin-scrollbar grid max-h-[32rem] gap-2 overflow-y-auto pr-1">
            {list.map((sc, i) => (
              <AmlHistoryRow key={i} screening={sc} />
            ))}
          </ul>
        )}
      </Sub>
    </Card>
  );
}

// --- Cases -------------------------------------------------------------

function CasesCard({ cases }) {
  const { t } = useTranslation("kycReport");
  const list = rowsOf(cases);
  return (
    <Card id="kyc-cases" icon={FolderKanban} title={t("cases")} count={list.length}>
      {!list.length && <None />}
      <div className="grid gap-3">
        {list.map((c, i) => (
          <div key={c.case_number ?? i} className="rounded-xl border border-border p-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono font-bold">{c.case_number}</span>
              <span className="text-muted-foreground">{c.case_type}</span>
              <StatusBadge status={c.status} variant="subtle" />
              {c.priority && (
                <span className="rounded bg-muted px-1.5 text-[10px] font-bold">{c.priority}</span>
              )}
            </div>
            <div className="mt-2">
              <Pairs
                items={[
                  [t("outcome"), show(c.outcome)],
                  [t("reasons"), show(Array.isArray(c.reasons) ? c.reasons.join(", ") : c.reasons)],
                  [t("opened"), when(c.opened_at)],
                  [
                    t("closed"),
                    c.closed_at
                      ? `${when(c.closed_at)}${c.closed_by ? ` · ${c.closed_by}` : ""}`
                      : "—",
                  ],
                  [
                    t("proposed"),
                    [c.proposed_outcome, c.proposed_reason].filter(Boolean).join(" · ") || "—",
                  ],
                ]}
              />
            </div>
            {rowsOf(c.events).length > 0 && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer font-bold text-[var(--primary)]">
                  {t("history")} ({c.events.length})
                </summary>
                <ol className="mt-2 grid gap-1.5 border-l border-border pl-3">
                  {c.events.map((e, j) => (
                    <li key={j}>
                      <span className="text-muted-foreground">{when(e.at)}</span> · <b>{e.event}</b>
                      {e.actor && <span className="text-muted-foreground"> · {e.actor}</span>}
                      {e.body && (
                        <p className="text-slate-600">
                          {typeof e.body === "string" ? e.body : JSON.stringify(e.body)}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// --- Accounts, deposits, loans, cards ------------------------------------

const money = (amount, currency) =>
  amount === null || amount === undefined || amount === ""
    ? "—"
    : `${amount}${currency ? ` ${currency}` : ""}`;

function AccountsCard({ accounts, joint }) {
  const { t } = useTranslation("kycReport");
  return (
    <Card id="kyc-accounts" icon={Wallet} title={t("accountsBlock")} count={rowsOf(accounts).length}>
      <MiniTable
        rows={rowsOf(accounts)}
        empty={t("none")}
        rowKey={(r, i) => r.acct_num ?? i}
        columns={[
          {
            key: "acct_num",
            label: t("account"),
            render: (r) => <span className="font-mono font-semibold">{r.acct_num}</span>,
          },
          { key: "acct_product_name", label: t("product") },
          {
            key: "avail_bal",
            label: t("available"),
            align: "right",
            render: (r) => money(r.avail_bal, r.currency_code),
          },
          {
            key: "ledger_bal",
            label: t("ledger"),
            align: "right",
            render: (r) => money(r.ledger_bal, r.currency_code),
          },
          {
            key: "status_name",
            label: t("status"),
            render: (r) =>
              r.status_name ? <StatusBadge status={r.status_name} variant="subtle" /> : "—",
          },
          {
            key: "restriction",
            label: t("restriction"),
            render: (r) =>
              show(
                typeof r.restriction === "object" && r.restriction
                  ? (r.restriction.name ?? r.restriction.code)
                  : r.restriction,
              ),
          },
          { key: "opened_at", label: t("opened"), render: (r) => day(r.opened_at) },
        ]}
      />
      {rowsOf(joint).length > 0 && (
        <Sub title={t("jointAccounts")}>
          <MiniTable
            rows={joint}
            rowKey={(r, i) => `${r.acct_num}-${i}`}
            columns={[
              {
                key: "acct_num",
                label: t("account"),
                render: (r) => <span className="font-mono font-semibold">{r.acct_num}</span>,
              },
              { key: "role", label: t("role") },
              {
                key: "share_percent",
                label: t("share"),
                align: "right",
                render: (r) => (r.share_percent != null ? `${r.share_percent}%` : "—"),
              },
              { key: "relationship", label: t("relationship") },
            ]}
          />
        </Sub>
      )}
    </Card>
  );
}

function DepositsLoansCard({ deposits, applications, loans }) {
  const { t } = useTranslation("kycReport");
  const pct = (v) => (v === null || v === undefined ? "—" : `${v}%`);
  return (
    <Card id="kyc-loans" icon={Landmark} title={t("depositsLoans")}>
      <Sub title={t("termDeposits")}>
        <MiniTable
          rows={rowsOf(deposits)}
          empty={t("none")}
          rowKey={(r, i) => r.reference_no ?? i}
          columns={[
            {
              key: "reference_no",
              label: t("reference"),
              render: (r) => <span className="font-mono">{r.reference_no}</span>,
            },
            {
              key: "principal",
              label: t("principal"),
              align: "right",
              render: (r) => show(r.principal),
            },
            {
              key: "annual_rate",
              label: t("rate"),
              align: "right",
              render: (r) => pct(r.annual_rate),
            },
            { key: "tenor_label", label: t("tenor") },
            { key: "start_date", label: t("start"), render: (r) => day(r.start_date) },
            { key: "maturity_date", label: t("maturity"), render: (r) => day(r.maturity_date) },
            {
              key: "status",
              label: t("status"),
              render: (r) => (r.status ? <StatusBadge status={r.status} variant="subtle" /> : "—"),
            },
          ]}
        />
      </Sub>
      <Sub title={t("loanApplications")}>
        <MiniTable
          rows={rowsOf(applications)}
          empty={t("none")}
          rowKey={(r, i) => r.application_number ?? i}
          columns={[
            {
              key: "application_number",
              label: t("application"),
              render: (r) => <span className="font-mono">{r.application_number}</span>,
            },
            {
              key: "requested_amount",
              label: t("amount"),
              align: "right",
              render: (r) => show(r.requested_amount),
            },
            {
              key: "purpose_description",
              label: t("purpose"),
              render: (r) => (
                <span className="block max-w-[16rem] truncate" title={r.purpose_description}>
                  {show(r.purpose_description)}
                </span>
              ),
            },
            {
              key: "status",
              label: t("status"),
              render: (r) => (r.status ? <StatusBadge status={r.status} variant="subtle" /> : "—"),
            },
            { key: "submitted_time", label: t("submitted"), render: (r) => when(r.submitted_time) },
            { key: "decided_time", label: t("decided"), render: (r) => when(r.decided_time) },
          ]}
        />
      </Sub>
      <Sub title={t("loans")}>
        <MiniTable
          rows={rowsOf(loans)}
          empty={t("none")}
          rowKey={(r, i) => r.facility_number ?? i}
          columns={[
            {
              key: "facility_number",
              label: t("facility"),
              render: (r) => <span className="font-mono">{r.facility_number}</span>,
            },
            {
              key: "principal_disbursed",
              label: t("disbursed"),
              align: "right",
              render: (r) => show(r.principal_disbursed),
            },
            {
              key: "annual_rate",
              label: t("rate"),
              align: "right",
              render: (r) => pct(r.annual_rate),
            },
            {
              key: "disbursement_date",
              label: t("start"),
              render: (r) => day(r.disbursement_date),
            },
            { key: "maturity_date", label: t("maturity"), render: (r) => day(r.maturity_date) },
            {
              key: "days_past_due",
              label: t("dpd"),
              align: "right",
              render: (r) => show(r.days_past_due),
            },
            { key: "risk_class", label: t("riskClass") },
            {
              key: "status",
              label: t("status"),
              render: (r) => (r.status ? <StatusBadge status={r.status} variant="subtle" /> : "—"),
            },
          ]}
        />
      </Sub>
    </Card>
  );
}

function CardsCard({ cards }) {
  const { t } = useTranslation("kycReport");
  return (
    <Card id="kyc-cards" icon={CreditCard} title={t("cards")} count={rowsOf(cards).length}>
      <MiniTable
        rows={rowsOf(cards)}
        empty={t("none")}
        rowKey={(r, i) => `${r.pan_masked}-${i}`}
        columns={[
          {
            key: "pan_masked",
            label: t("card"),
            render: (r) => <span className="font-mono font-semibold">{r.pan_masked}</span>,
          },
          { key: "card_product_name", label: t("product") },
          { key: "name_on_card", label: t("nameOnCard") },
          {
            key: "expiry",
            label: t("expiry"),
            render: (r) =>
              r.expiry_month ? `${String(r.expiry_month).padStart(2, "0")}/${r.expiry_year}` : "—",
          },
          { key: "form_factor", label: t("formFactor") },
          {
            key: "issuance_status",
            label: t("issuance"),
            render: (r) =>
              r.issuance_status ? <StatusBadge status={r.issuance_status} variant="subtle" /> : "—",
          },
          {
            key: "ops_status",
            label: t("ops"),
            render: (r) =>
              r.ops_status ? <StatusBadge status={r.ops_status} variant="subtle" /> : "—",
          },
          { key: "issued_at", label: t("issued"), render: (r) => day(r.issued_at) },
          { key: "activated_at", label: t("activated"), render: (r) => day(r.activated_at) },
        ]}
      />
    </Card>
  );
}

// --- Sign-in -------------------------------------------------------------

function AccessCard({ access }) {
  const { t } = useTranslation("kycReport");
  const list = rowsOf(access);
  const yesNo = (v) => (v ? t("yes") : t("no"));
  return (
    <Card id="kyc-access" icon={KeyRound} title={t("signIn")}>
      {!list.length && <None />}
      {list.map((a, i) => {
        const locked =
          a.pin_locked === true || (a.locked_until && new Date(a.locked_until) > new Date());
        return (
          <div key={a.login_id ?? i} className="mt-3 first:mt-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold">{a.login_id}</span>
              {a.party && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">{a.party}</span>}
              {a.status && <StatusBadge status={String(a.status)} variant="subtle" />}
              {locked && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-black text-red-700">
                  <Lock size={11} /> {t("locked")}
                </span>
              )}
            </div>
            <Pairs
              items={[
                [t("lastLogin"), when(a.last_login_at)],
                [t("failedLogins"), show(a.failed_logins)],
                [t("lockedUntil"), when(a.locked_until)],
                [t("passwordSet"), yesNo(a.password_set)],
                [t("signinPin"), a.signin_pin_set ? t("set") : t("notSet")],
                [t("txnPin"), a.pin_set ? t("set") : t("notSet")],
                [t("pinFailures"), show(a.pin_failures)],
                [t("pinChanged"), when(a.pin_changed_at)],
                [t("passwordChanged"), when(a.password_changed_at)],
                [t("created"), when(a.created_at)],
              ]}
            />
          </div>
        );
      })}
    </Card>
  );
}

// --- Timeline ------------------------------------------------------------

const KIND_ICON = {
  ONBOARDING: User,
  IDENTITY: ScanFace,
  AML: ShieldCheck,
  RISK: Gauge,
  KYC: Fingerprint,
  CASE: FolderKanban,
  ACCOUNT: Wallet,
  DEPOSIT: Landmark,
  LOAN: Briefcase,
  CARD: CreditCard,
  ACCESS: KeyRound,
};

function TimelineCard({ timeline }) {
  const { t } = useTranslation("kycReport");
  // Sent oldest first; shown newest at the top.
  const list = [...rowsOf(timeline)].reverse();
  return (
    <Card id="kyc-timeline" icon={History} title={t("timeline")} count={list.length}>
      {!list.length && <None />}
      <ol className="thin-scrollbar relative max-h-[32rem] overflow-y-auto pr-1">
        {list.map((e, i) => (
          <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
            {i < list.length - 1 && (
              <span className="absolute left-[13px] top-7 bottom-0 w-px bg-border" />
            )}
            <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-[var(--primary)]">
              {createElement(KIND_ICON[e.kind] ?? History, { size: 13 })}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-xs font-bold text-slate-800">
                {e.event}{" "}
                <span className="ml-1 rounded bg-muted px-1.5 text-[9px] font-black text-muted-foreground">
                  {e.kind}
                </span>
              </p>
              {e.detail && <p className="text-xs text-slate-600">{e.detail}</p>}
              <p className="text-[10px] text-muted-foreground">{when(e.at)}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

// --- Record details --------------------------------------------------------

function RecordCard({ onboarding, record }) {
  const { t } = useTranslation("kycReport");
  const o = onboarding ?? {};
  const r = record ?? {};
  if (!onboarding && !record) {
    return (
      <Card id="kyc-record" icon={FileText} title={t("recordDetails")}>
        <None />
      </Card>
    );
  }
  const by = (who, at) => [who, at ? when(at) : null].filter(Boolean).join(" · ") || "—";
  return (
    <Card id="kyc-record" icon={FileText} title={t("recordDetails")}>
      <Pairs
        items={[
          [t("reference"), show(o.reference_id)],
          [t("channel"), show(o.channel)],
          [t("digitalProduct"), show(o.digital_product_name)],
          [t("signupStarted"), when(o.started_at)],
          [t("signupCompleted"), when(o.completed_at)],
          [t("signupStatus"), o.onboarding_status ? <StatusBadge status={o.onboarding_status} variant="subtle" /> : "—"],
          [t("attempts"), show(o.attempt_count)],
          [t("createdBy"), by(r.created_by, r.created_time)],
          [t("lastChangedBy"), by(r.updated_by, r.updated_time)],
          [t("approval"), r.auth_status ? <StatusBadge status={String(r.auth_status)} variant="subtle" /> : "—"],
        ]}
      />
    </Card>
  );
}

// --- The page ------------------------------------------------------------

export function KycReportView({ api, body, onBack, title }) {
  const { t } = useTranslation("kycReport");
  const [state, setState] = useState({ data: null, error: "" });
  const key = JSON.stringify(body);

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, error: "" });
    api
      .report(JSON.parse(key))
      .then(
        (response) =>
          !cancelled &&
          setState({
            data: (Array.isArray(response?.data) ? response.data[0] : response?.data) ?? {},
            error: "",
          }),
      )
      .catch((error) => !cancelled && setState({ data: null, error: error.message }));
    return () => {
      cancelled = true;
    };
  }, [api, key]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    const onKey = (e) => e.key === "Escape" && onBack();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  const { data, error } = state;
  const report = data?.report ?? {};
  const referenceId =
    data?.summary?.onboarding?.reference_id ?? report.onboarding?.reference_id ?? body.reference_id;
  // Stored file paths open through /file with the onboarding's reference.
  const download = useCallback((path) => api.file({ reference_id: referenceId, path }), [api, referenceId]);
  const selfie = rowsOf(data?.documents).find((d) => rowsOf(d.roles).includes("idv_selfie"));

  return (
    <div className="pt-1 pb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-primary hover:text-primary"
        >
          <ArrowLeft size={14} /> {t("back")}
        </button>
        {data && <KycPdfButton data={data} download={download} title={title} />}
      </div>
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : !data ? (
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Spinner size={16} /> {t("loading")}
        </div>
      ) : (
        <div className="grid gap-4">
          <Header summary={data.summary} photo={selfie ? { path: selfie.path, download } : null} />
          <SectionLinks />
          <ProfileCard profile={data.profile} />
          <DocumentsCard documents={data.documents} download={download} />
          <div className="grid gap-4 xl:grid-cols-2">
            <IdentityCard checks={report.identity_checks} />
            <KycCard kyc={report.kyc} processes={report.kyc_processes} />
          </div>
          <RiskCard risk={scoredRisk(report.risk)} history={report.risk_history} />
          <AmlCard screenings={report.aml_screenings} />
          <CasesCard cases={report.cases} />
          <AccountsCard accounts={report.accounts} joint={report.joint_accounts} />
          <DepositsLoansCard
            deposits={report.term_deposits}
            applications={report.loan_applications}
            loans={report.loans}
          />
          <CardsCard cards={report.cards} />
          <div className="grid gap-4 xl:grid-cols-2">
            <AccessCard access={report.access} />
            <TimelineCard timeline={report.timeline} />
          </div>
          <RecordCard onboarding={report.onboarding} record={report.profile_record} />
        </div>
      )}
    </div>
  );
}
