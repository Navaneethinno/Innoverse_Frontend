import { motion } from "motion/react";
import { useL } from "@/Components/InnoCBS/cbsOps";
import { cn } from "@/Utils/Lib/utils";
import { BankArt, CardsArt, ChartArt, GearsArt, InboxArt, LedgerArt, PeopleArt, ShieldArt, StoreArt, VaultArt, WalletArt } from "./ModuleArt";

// The top of a module's dashboard: the module as a small animated picture,
// a sentence of what it is for, its key numbers, and one visual tied to a
// real number (a ring, meters, a journey, health lights). Everything comes
// from the dashboard reply's tiles; a tile the module doesn't send is left out.

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });

// A ring filled to value / max.
export function Ring({ value, max, label, colour = "var(--primary)", caption }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const share = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <figure className="flex flex-col items-center">
      <svg width="78" height="78" viewBox="0 0 78 78" aria-hidden="true">
        <circle cx="39" cy="39" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
        <motion.circle cx="39" cy="39" r={r} fill="none" stroke={colour} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - share) }} transition={{ duration: 0.55, ease: "easeOut" }} transform="rotate(-90 39 39)" />
        <text x="39" y="44" textAnchor="middle" fontSize="15" fontWeight="900" fill="var(--foreground)">
          {Math.round(share * 100)}%
        </text>
      </svg>
      <figcaption className="mt-1 text-center text-xs font-bold">{label}</figcaption>
      {caption && <p className="text-center text-[11px] text-muted-foreground">{caption}</p>}
    </figure>
  );
}

// Horizontal meters, each against the largest.
function Meters({ rows }) {
  const most = Math.max(1, ...rows.map(([, v]) => Number(v) || 0));
  return (
    <div className="w-56 space-y-2">
      {rows.map(([name, v, colour]) => (
        <div key={name}>
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">{name}</span>
            <span className="font-bold">{fmt(v)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <motion.div className="h-full rounded-full" style={{ background: colour ?? "var(--primary)" }} initial={{ width: 0 }} animate={{ width: `${((Number(v) || 0) / most) * 100}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Steps a customer goes through, with a count at each.
function Journey({ steps }) {
  return (
    <div className="flex items-center gap-1.5">
      {steps.map(([name, v], i) => (
        <div key={name} className="flex items-center gap-1.5">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.06 * i, duration: 0.25 }} className="rounded-2xl border border-border bg-card px-3 py-2 text-center shadow-sm">
            <p className="text-lg font-black tabular-nums">{fmt(v)}</p>
            <p className="max-w-24 text-[10px] leading-tight text-muted-foreground">{name}</p>
          </motion.div>
          {i < steps.length - 1 && <span className="text-muted-foreground">→</span>}
        </div>
      ))}
    </div>
  );
}

// Green when nothing is wrong, red with the count otherwise.
function Health({ rows }) {
  return (
    <div className="space-y-1.5">
      {rows.map(([name, v]) => {
        const bad = Number(v) > 0;
        return (
          <div key={name} className="flex items-center gap-2 text-xs">
            <span className={cn("h-2.5 w-2.5 rounded-full", bad ? "animate-pulse bg-red-500" : "bg-emerald-500")} />
            <span className="text-muted-foreground">{name}</span>
            <span className={cn("font-bold", bad ? "text-red-600" : "text-emerald-700")}>{bad ? fmt(v) : "OK"}</span>
          </div>
        );
      })}
    </div>
  );
}

// Each module: picture, sentence, the facts (tile keys) and its visual.
const MODULES = {
  epurse: {
    art: WalletArt,
    text: "Customers' wallets: who is joining, who has joined, and what waits for a checker.",
    facts: ["pending_approvals"],
    visual: (v, L) => <Journey steps={[[L("Onboarding in progress"), v("onboarding_in_progress")], [L("Joined this month"), v("onboarded_this_month")], [L("Active customers"), v("active_customers")]]} />,
  },
  innomms: {
    art: StoreArt,
    text: "Merchants, their stores, terminals and agents.",
    facts: ["active_merchants", "active_stores", "active_agents", "qr_sessions_today"],
    visual: (v, L) => {
      const all = v("active_terminals");
      const off = v("terminals_offline");
      return <Ring value={all - off} max={all} colour={off > 0 ? "#f59e0b" : "#10b981"} label={L("Terminals online")} caption={`${fmt(all - off)} / ${fmt(all)}`} />;
    },
  },
  innoaml: {
    art: ShieldArt,
    text: "Screening and monitoring: what is flagged, raised and waiting for a review.",
    facts: ["aml_open_cases", "aml_str_in_progress", "aml_blacklist_entries"],
    visual: (v, L) => <Meters rows={[[L("Open alerts"), v("aml_open_alerts"), "#ef4444"], [L("Open flags"), v("aml_open_flags"), "#f59e0b"], [L("Waiting for review"), v("aml_pending_reviews"), "var(--primary)"]]} />,
  },
  "case management": {
    art: InboxArt,
    text: "Onboarding reviews, customer cases and disputes.",
    facts: ["cm_open_customer_cases", "cm_customer_replied", "cm_open_disputes"],
    visual: (v, L) => <Ring value={v("cm_overdue_onboarding")} max={v("cm_open_onboarding")} colour="#ef4444" label={L("Onboarding overdue")} caption={`${fmt(v("cm_overdue_onboarding"))} / ${fmt(v("cm_open_onboarding"))}`} />,
  },
  "global settings": {
    art: GearsArt,
    text: "Providers, fees, limits and the jobs that keep things running.",
    facts: ["gs_active_providers", "gs_active_fee_schedules", "gs_active_digital_products"],
    visual: (v, L) => <Health rows={[[L("Interfaces down"), v("gs_interfaces_down")], [L("Jobs failed"), v("gs_jobs_failed")], [L("Waiting for approval"), v("pending_approvals")]]} />,
  },
  finance: { art: LedgerArt, text: "Transactions and their postings.", facts: ["transactions_this_month", "pending_approvals"] },
  innocbs: { art: BankArt, text: "Core banking: accounts, deposits and loans.", facts: ["active_accounts", "pending_approvals"] },
  institution: { art: BankArt, text: "The institution's profile, modules, channels and documents.", facts: ["active_modules", "active_channels", "changes_this_month", "pending_approvals"] },
  "user management": {
    art: PeopleArt,
    text: "Staff users, their profiles and sign-ins.",
    facts: ["users", "locked_users"],
    visual: (v, L) => <Ring value={v("signed_in_today")} max={v("users")} label={L("Signed in today")} caption={`${fmt(v("signed_in_today"))} / ${fmt(v("users"))}`} />,
  },
  innoreports: { art: ChartArt, text: "Saved reports and documents about to expire.", facts: ["rp_saved_reports", "rp_documents_expiring", "rp_documents_in_grace", "rp_documents_expired"] },
  innocms: { art: CardsArt, text: "Cards: products, orders, stock and the cards in customers' hands." },
  innotreasury: { art: VaultArt, text: "Treasury: placements, borrowings, securities and exposure." },
};

export const hasModuleHero = (moduleName) => Boolean(MODULES[String(moduleName ?? "").toLowerCase()]);

export function ModuleHero({ moduleName, data }) {
  const L = useL();
  const m = MODULES[String(moduleName ?? "").toLowerCase()];
  if (!m) return null;
  const tiles = data?.tiles ?? [];
  const tile = (key) => tiles.find((x) => x.key === key);
  const v = (key) => Number(tile(key)?.value) || 0;
  // The named facts it sends; a module without named facts shows its first tiles.
  const facts = (m.facts ? m.facts.map(tile).filter(Boolean) : tiles.slice(0, 4)).map((x) => [x.label, fmt(x.value)]);
  const Art = m.art;
  return (
    <div className="relative mb-5 min-h-[8.5rem] overflow-hidden rounded-3xl border border-border p-5" style={{ background: "linear-gradient(120deg, color-mix(in srgb, var(--primary) 13%, var(--card)), var(--card) 60%)" }}>
      <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full opacity-[0.15]" style={{ background: "var(--primary)" }} />
      <div className="relative flex flex-wrap items-center gap-5">
        <div className="mh-float shrink-0">
          <Art />
        </div>
        <div className="min-w-0 flex-1">
          <p className="max-w-2xl text-sm text-muted-foreground">{L(m.text)}</p>
          {!data && <div className="mt-3 h-6 w-64 animate-pulse rounded-full bg-muted" />}
          {facts.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {facts.map(([k, val]) => (
                <span key={k} className="rounded-full border border-border bg-card/80 px-3 py-1 text-xs">
                  <span className="text-muted-foreground">{k}</span> <span className="font-bold text-foreground">{val}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        {m.visual && <div className="shrink-0">{data ? m.visual(v, L) : <div className="h-20 w-40 animate-pulse rounded-2xl bg-muted" />}</div>}
      </div>
    </div>
  );
}
