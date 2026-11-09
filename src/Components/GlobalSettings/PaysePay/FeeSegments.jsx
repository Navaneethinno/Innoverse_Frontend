import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { EmptyNote } from "@/Components/Common/EmptyNote";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { inputClass, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { RowsEditor } from "@/Components/InnoCBS/Loans/loanShared";
import { SectionScreen } from "@/Components/InnoCBS/Settings/SectionScreen";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { feeSegmentApi, partyBlockApi } from "@/Services/Merchant/ops.api";
import { notifications } from "@/Utils/Lib/notifications";

const CODE = /^[A-Z0-9_]{2,32}$/;
const SHOWN = 50;
const keyOf = (m) => `${m.entity_type}:${m.entity_id}`;

function problemOf(t, f) {
  if (f.segments.some((s) => !CODE.test(String(s.code ?? "")))) return t("fs_badCode");
  if (f.segments.some((s) => !String(s.name ?? "").trim())) return t("fillRequired");
  if (new Set(f.segments.map((s) => s.code)).size !== f.segments.length) return t("codeOnce");
  const all = f.segments.flatMap((s) => (s.members ?? []).map(keyOf));
  if (new Set(all).size !== all.length) return t("fs_oneSegment");
  return "";
}

// The members of a segment: searchable, and capped on screen so a segment of
// thousands stays usable.
function Members({ members, onRemove }) {
  const { t } = useTranslation("ops");
  const [q, setQ] = useState("");
  const text = q.trim().toLowerCase();
  const matched = text ? members.filter((m) => `${m.name ?? ""} ${m.entity_id}`.toLowerCase().includes(text)) : members;
  const shown = matched.slice(0, SHOWN);
  if (!members.length) return <p className="mt-2 text-xs text-muted-foreground">{t("fs_noMembers")}</p>;
  return (
    <div className="mt-2">
      {members.length > SHOWN && <input type="search" className={`${inputClass} !mt-0 mb-2 max-w-xs`} placeholder={t("fs_filterMembers")} value={q} onChange={(e) => setQ(e.target.value)} />}
      <div className="flex flex-wrap gap-1.5">
        {shown.map((m) => (
          <span key={keyOf(m)} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold">
            {m.name || `${m.entity_type} ${m.entity_id}`}
            {onRemove && (
              <button type="button" aria-label={t("fs_removeMember", { name: m.name ?? m.entity_id })} className="text-muted-foreground hover:text-red-600" onClick={() => onRemove(m)}>
                <X size={12} />
              </button>
            )}
          </span>
        ))}
      </div>
      {matched.length > SHOWN && <p className="mt-1.5 text-[11px] text-muted-foreground">{t("fs_moreMembers", { shown: SHOWN, total: matched.length })}</p>}
    </div>
  );
}

function AddMember({ onAdd }) {
  const { t } = useTranslation("ops");
  const [found, setFound] = useState([]);
  const latest = useRef(0);
  const search = (text) => {
    if (!text) return;
    const ticket = ++latest.current;
    partyBlockApi
      .parties({ search: text, page_size: 20 })
      .then((r) => {
        if (ticket === latest.current) setFound(rowsOf(r));
      })
      .catch((e) => notifications.error(e.message));
  };
  return (
    <FilterSelect
      className="mt-1.5 max-w-md"
      value=""
      onSearch={search}
      onChange={(v) => {
        const party = found.find((p) => keyOf(p) === v);
        if (party) onAdd({ entity_type: party.entity_type, entity_id: party.entity_id, name: party.name });
      }}
      options={[{ value: "", label: t("fs_addMember") }, ...found.map((p) => ({ value: keyOf(p), label: [p.name, p.phone_number, p.status_name].filter(Boolean).join(" · ") }))]}
    />
  );
}

// GLOBAL SETTINGS > Products & Pricing > Fee Segments (menu 249): named groups
// of customers or merchants a fee rule can apply to. One document per
// institution under maker-checker; the backend fills in a member's name.
export function FeeSegments() {
  const { t } = useTranslation("ops");
  return (
    <SectionScreen
      api={feeSegmentApi}
      ns="ops"
      valueKey="setup"
      fallbackTitle={t("fs_title")}
      subtitle={t("fs_subtitle")}
      toForm={(s) => ({ segments: structuredClone(s?.segments ?? []) })}
      bodyOf={(f) => ({
        segments: f.segments.map((s) => ({ code: s.code, name: s.name.trim(), description: String(s.description ?? "").trim(), members: (s.members ?? []).map((m) => ({ entity_type: m.entity_type, entity_id: Number(m.entity_id) })) })),
      })}
      problemOf={problemOf}
    >
      {({ data, shown, editing, setForm }) => {
        const segments = shown?.segments ?? [];
        const total = segments.reduce((n, s) => n + (s.members ?? []).length, 0);
        const count = <p className="mb-3 text-xs text-muted-foreground">{t("fs_memberCount", { count: total, max: data?.choices?.max_members ?? "—" })}</p>;
        if (editing)
          return (
            <>
              {count}
              <RowsEditor
                rows={segments}
                onChange={(rows) => setForm({ segments: rows })}
                blank={() => ({ code: "", name: "", description: "", members: [] })}
                addLabel={t("fs_add")}
                columns="lg:grid-cols-3"
                fields={[
                  { key: "code", label: t("code"), placeholder: "VIP" },
                  { key: "name", label: t("name"), placeholder: "VIP customers" },
                  { key: "description", label: t("description") },
                ]}
                renderExtra={(row, set) => {
                  const members = row.members ?? [];
                  return (
                    <div className={`${labelClass} mt-3`}>
                      {t("fs_members")}
                      <AddMember onAdd={(m) => !members.some((x) => keyOf(x) === keyOf(m)) && set({ members: [...members, m] })} />
                      <Members members={members} onRemove={(m) => set({ members: members.filter((x) => keyOf(x) !== keyOf(m)) })} />
                    </div>
                  );
                }}
              />
            </>
          );
        if (!segments.length) return <EmptyNote>{t("fs_none")}</EmptyNote>;
        return (
          <>
            {count}
            <div className="grid gap-3">
              {segments.map((s) => (
                <div key={s.code} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <b>{s.name}</b>
                    <span className="font-mono text-xs text-muted-foreground">{s.code}</span>
                  </div>
                  {s.description && <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>}
                  <Members members={s.members ?? []} />
                </div>
              ))}
            </div>
          </>
        );
      }}
    </SectionScreen>
  );
}
