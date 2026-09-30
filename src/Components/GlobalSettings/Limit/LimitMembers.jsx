import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRightLeft, Search } from "lucide-react";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { limitGroupApi, limitGroupOps, rowsOf } from "@/Services/Epurse/onboarding.api";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";

// Who is in a limit group, and moving people to another group (handoff:
// "Moving customers and merchants between groups"). A move takes effect at
// once, no checker; it needs Edit. People not listed here (e.g. from the
// Default group) can be moved in by their reference id.
const PAGE = 25;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

export function LimitMembers({ group, canMove, onClose }) {
  const { t } = useTranslation("limits");
  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(() => new Set());
  const [groups, setGroups] = useState([]);
  const [target, setTarget] = useState("");
  const [narration, setNarration] = useState("");
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = rowsOf(await limitGroupOps.members({ limit_group_id: group.id, page, limit: PAGE, ...(search.trim() ? { search: search.trim() } : {}) }))[0] ?? {};
      setMembers(data.members ?? []);
      setTotal(data.total ?? 0);
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [group.id, page, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  useEffect(() => {
    if (!canMove) return;
    limitGroupApi
      .list({ page: 1, limit: 200 })
      .then((r) => setGroups(rowsOf(r).filter((g) => Number(g.status) === 1)))
      .catch(() => setGroups([]));
  }, [canMove]);

  const move = async (referenceIds, targetId) => {
    if (!referenceIds.length || !targetId) return;
    setBusy(true);
    try {
      const response = await limitGroupOps.assign({ limit_group_id: Number(targetId), reference_ids: referenceIds, ...(narration.trim() ? { narration: narration.trim() } : {}) });
      const result = rowsOf(response)[0] ?? {};
      notifications.success(apiMessage(response, t("movedN", { count: (result.moved ?? referenceIds).length })));
      setSelected(new Set());
      setPasted("");
      void load();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const otherGroups = groups.filter((g) => g.id !== group.id);
  const pastedIds = [...new Set(pasted.match(UUID) ?? [])];

  return (
    <Modal open onClose={onClose} size="lg" title={t("membersTitle", { name: group.name ?? group.code })}>
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("searchMembers")}
            className="w-full rounded-lg border bg-white/70 py-2 pl-8 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="overflow-hidden rounded-xl border">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner size={20} />
            </div>
          ) : members.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("noMembers")}</p>
          ) : (
            <ul className="divide-y">
              {members.map((m) => (
                <li key={m.reference_id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  {canMove && <input type="checkbox" checked={selected.has(m.reference_id)} onChange={() => toggle(m.reference_id)} className="h-4 w-4 accent-[var(--primary)]" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-800">{m.display_name || "-"}</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">{m.reference_id}</p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {t(`kind_${m.party_kind}`, { defaultValue: m.party_kind })} · {t(`own_${m.ownership}`, { defaultValue: m.ownership })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("membersTotal", { count: total })}</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border px-2 py-1 disabled:opacity-40">
              ‹
            </button>
            <span>
              {page} / {pages}
            </span>
            <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border px-2 py-1 disabled:opacity-40">
              ›
            </button>
          </div>
        </div>

        {canMove && (
          <div className="flex flex-col gap-3 rounded-2xl border bg-muted/40 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("moveTitle")}</p>
            <input value={narration} onChange={(e) => setNarration(e.target.value)} placeholder={t("narration")} className="w-full rounded-lg border bg-white/70 px-3 py-2 text-sm" />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">{t("moveSelected", { count: selected.size })}</span>
              <FilterSelect className="min-w-[200px] flex-1" value={target} onChange={setTarget} options={[{ value: "", label: t("pickGroup") }, ...otherGroups.map((g) => ({ value: g.id, label: `${g.name} (${g.code})${g.is_default ? ` · ${t("default")}` : ""}` }))]} />
              <button type="button" disabled={busy || !selected.size || !target} onClick={() => void move([...selected], target)} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                {busy ? <Spinner size={12} /> : <ArrowRightLeft size={13} />} {t("move")}
              </button>
            </div>
            <div className="border-t pt-3">
              <p className="mb-1.5 text-xs text-muted-foreground">{t("moveInHint", { name: group.name ?? group.code })}</p>
              <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder={t("referenceIdsPlaceholder")} className="min-h-20 w-full rounded-lg border bg-white/70 p-2 font-mono text-xs" />
              <button type="button" disabled={busy || !pastedIds.length || Number(group.status) !== 1} onClick={() => void move(pastedIds, group.id)} className="mt-2 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold text-primary disabled:opacity-50">
                <ArrowRightLeft size={13} /> {t("moveInN", { count: pastedIds.length })}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
