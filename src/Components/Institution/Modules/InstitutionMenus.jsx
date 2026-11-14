import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronDown, ChevronRight, Lock, Search } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { Toggle } from "@/Components/Common/Toggle";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
import { useAuth } from "@/Hooks/useAuth";
import { useApiMutation } from "@/Hooks/useApiMutation";
import { institutionMenuApi } from "@/Services/Institution/institutionMenu.api";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";
import { formatDateTime } from "@/Utils/Lib/dateFormat";
import { cn } from "@/Utils/Lib/cn";

// Which menus of its modules an institution gets. The tree comes from
// /institution/menu/options, what it has today from /institution/menu/get
// (`enabled_menus`); a change is proposed with `edit` and approved or
// rejected by another user. Buttons follow the record's `actions`.
const first = (r) => (Array.isArray(r?.data) ? r.data[0] : r?.data) ?? null;
const idsOf = (menus) => menus.flatMap((m) => [m.id, ...idsOf(m.children ?? [])]);
// Each module and menu carries `label`, its name in the user's language.
const relabel = (menus) => menus.map((m) => ({ ...m, name: m.label || m.name, children: relabel(m.children ?? []) }));
const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

function filterTree(menus, q) {
  return menus.flatMap((m) => {
    const children = filterTree(m.children ?? [], q);
    return String(m.name).toLowerCase().includes(q) || children.length ? [{ ...m, children: String(m.name).toLowerCase().includes(q) ? m.children ?? [] : children }] : [];
  });
}

function MenuNode({ node, depth, ticked, onToggle, disabled, forced }) {
  return (
    <li>
      <label className={cn("flex items-center gap-2 rounded-lg py-1 pr-2 text-sm", !disabled && "cursor-pointer hover:bg-muted/40")} style={{ paddingLeft: 8 + depth * 18 }}>
        <input type="checkbox" className="h-4 w-4 shrink-0 accent-[var(--primary)]" checked={forced || ticked.has(node.id)} disabled={disabled} onChange={() => onToggle(node.id)} />
        <span className={cn(node.children?.length ? "font-semibold text-foreground" : "text-slate-700")}>{node.name}</span>
      </label>
      {node.children?.length > 0 && (
        <ul>
          {node.children.map((c) => (
            <MenuNode key={c.id} node={c} depth={depth + 1} ticked={ticked} onToggle={onToggle} disabled={disabled} forced={forced} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function InstitutionMenus({ institutions = [] }) {
  const tr = useConfigLabel();
  const canChoose = useCanChooseInstitution();
  const own = useAuth((state) => state.user?.inst_profile_id);
  const [instId, setInstId] = useState(canChoose ? "" : String(own ?? ""));
  const [tree, setTree] = useState([]);
  const [view, setView] = useState(null);
  const [state, setState] = useState({ loading: false, error: null });
  const [ticked, setTicked] = useState(() => new Set());
  const [all, setAll] = useState(false);
  const [narration, setNarration] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(() => new Set());
  const edit = useApiMutation(institutionMenuApi, "edit");
  const auth = useApiMutation(institutionMenuApi, "auth");
  const deauth = useApiMutation(institutionMenuApi, "deauth");

  const lockedIds = useMemo(() => new Set(tree.filter((m) => m.locked).flatMap((m) => idsOf(m.menus))), [tree]);
  const allIds = useMemo(() => new Set(tree.flatMap((m) => idsOf(m.menus))), [tree]);
  const apply = useCallback(
    (next) => {
      setView(next);
      setTicked(new Set((next?.enabled_menus ?? []).map(Number)));
      setAll(Boolean(next?.selection?.all));
      setNarration("");
    },
    [],
  );

  const load = useCallback(async () => {
    if (!instId) return;
    setState({ loading: true, error: null });
    try {
      const body = { inst_profile_id: Number(instId) };
      const [options, current] = await Promise.all([institutionMenuApi.options(body), institutionMenuApi.get(body)]);
      setTree((Array.isArray(options?.data) ? options.data : []).map((m) => ({ ...m, name: m.label || m.name, menus: relabel(m.menus ?? []) })));
      apply(first(current));
      setState({ loading: false, error: null });
    } catch (error) {
      setState({ loading: false, error });
    }
  }, [instId, apply]);
  useEffect(() => {
    void load();
  }, [load]);

  const pending = view?.pending ?? null;
  const actions = view?.actions ?? {};
  const readOnly = Boolean(pending) || !actions.edit;
  // A waiting change is shown as proposed; otherwise what is ticked now.
  const shown = useMemo(() => (pending ? new Set((pending.selection?.menus ?? []).map(Number)) : ticked), [pending, ticked]);
  const shownAll = pending ? Boolean(pending.selection?.all) : all;
  const initial = useMemo(() => new Set((view?.enabled_menus ?? []).map(Number)), [view]);
  const chosen = [...ticked].filter((id) => allIds.has(id) && !lockedIds.has(id));
  const changed = all !== Boolean(view?.selection?.all) || (!all && !sameSet(new Set([...ticked].filter((id) => allIds.has(id))), new Set([...initial].filter((id) => allIds.has(id)))));

  const toggle = (id) =>
    setTicked((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const setModule = (module, on) =>
    setTicked((cur) => {
      const next = new Set(cur);
      idsOf(module.menus).forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });
  const toggleOpen = (id) =>
    setOpen((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const run = async (mutation, payload) => {
    try {
      const result = await mutation.mutateAsync({ inst_profile_id: Number(instId), ...payload });
      const next = first(result);
      if (next) apply(next);
      else await load();
    } catch {
      /* the mutation already showed the reason */
    }
  };
  const save = () => run(edit, all ? { all: true, narration } : { menus: chosen, narration });

  const saveBlocked = !actions.edit
    ? tr("Your role cannot change this institution's menus.")
    : !changed
      ? tr("Nothing has changed yet.")
      : !all && chosen.length === 0
        ? tr("Tick at least one menu outside Institution and User Management.")
        : null;
  const notApprover = tr("You proposed this change, or your role cannot approve it.");

  const q = query.trim().toLowerCase();
  const modules = q
    ? tree.map((m) => ({ ...m, menus: String(m.name).toLowerCase().includes(q) ? m.menus : filterTree(m.menus, q) })).filter((m) => m.menus.length)
    : tree;

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-foreground">{tr("Menus")}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{tr("Choose which menus of its modules the institution gets. A checker approves the change.")}</p>
        </div>
        {canChoose && (
          <FilterSelect
            className="w-full sm:w-72"
            value={instId}
            onChange={(next) => setInstId(String(next ?? ""))}
            options={[
              { value: "", label: tr("Select institution") },
              ...institutions.map((item) => ({ value: String(item.id ?? item.inst_profile_id), label: item.name ?? item.inst_profile_name ?? item.code })),
            ]}
          />
        )}
      </div>

      {!instId ? (
        <p className="text-sm text-muted-foreground">{tr("Select an institution to see its menus.")}</p>
      ) : state.loading && !view ? (
        <p className="text-sm text-muted-foreground">{tr("Loading menus...")}</p>
      ) : state.error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle size={14} /> {state.error.message}
          <button type="button" onClick={() => void load()} className="ml-auto text-xs font-bold underline">
            {tr("Retry")}
          </button>
        </div>
      ) : (
        <>
          {pending && (
            <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
              <p className="font-semibold text-amber-900">
                {tr("A change is waiting for approval")}:{" "}
                {pending.selection?.all ? tr("all menus of the subscribed modules") : `${(pending.selection?.menus ?? []).length} ${tr("menus")}`}
              </p>
              <p className="text-amber-900/80">
                {tr("Proposed by")} {pending.proposed_by?.name ?? "—"} · {pending.proposed_at ? formatDateTime(pending.proposed_at) : "—"}
              </p>
              <textarea
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder={tr("Narration")}
                className="min-h-16 w-full rounded-xl border border-border bg-white p-2.5"
              />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" disabled={!actions.deauth} disabledReason={notApprover} loading={deauth.isPending} onClick={() => run(deauth, { narration })}>
                  {tr("Reject")}
                </Button>
                <Button size="sm" disabled={!actions.auth} disabledReason={notApprover} loading={auth.isPending} onClick={() => run(auth, { narration })}>
                  {tr("Approve")}
                </Button>
              </div>
            </div>
          )}

          <Toggle
            showLabel
            label={tr("All menus of the subscribed modules")}
            checked={shownAll}
            disabled={readOnly}
            onChange={(on) => {
              setAll(on);
              // Turning it off starts from what the institution has today.
              if (!on) setTicked(new Set(initial));
            }}
          />

          {!shownAll && (
            <>
              <div className="relative">
                <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={tr("Search modules or menus")}
                  className="w-full rounded-xl border border-border py-2 pl-8 pr-3 text-sm outline-none focus:border-[var(--primary)]"
                />
              </div>
              <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
                {modules.map((module) => {
                  const ids = idsOf(module.menus);
                  const on = module.locked ? ids.length : ids.filter((id) => shown.has(id)).length;
                  const isOpen = Boolean(q) || open.has(module.id);
                  return (
                    <div key={module.id} className={cn("rounded-xl border border-border", !module.subscribed && "opacity-60")}>
                      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                        <button type="button" onClick={() => toggleOpen(module.id)} className="flex min-w-0 items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                          {isOpen ? <ChevronDown size={13} className="shrink-0" /> : <ChevronRight size={13} className="shrink-0" />}
                          <span className="truncate">{module.name}</span>
                          <span className="font-normal normal-case">({on}/{ids.length})</span>
                          {module.locked && (
                            <span className="flex items-center gap-1 font-semibold normal-case tracking-normal">
                              <Lock size={11} /> {tr("Always on")}
                            </span>
                          )}
                          {!module.subscribed && <span className="font-semibold normal-case tracking-normal">· {tr("Not subscribed: its menus take effect once the module is added")}</span>}
                        </button>
                        {!module.locked && !readOnly && (
                          <span className="flex gap-1">
                            <Button variant="ghost" size="xs" onClick={() => setModule(module, true)}>
                              {tr("Tick all")}
                            </Button>
                            <Button variant="ghost" size="xs" onClick={() => setModule(module, false)}>
                              {tr("Clear")}
                            </Button>
                          </span>
                        )}
                      </div>
                      {isOpen && (
                        <ul className="border-t border-border py-1">
                          {module.menus.map((m) => (
                            <MenuNode key={m.id} node={m} depth={0} ticked={shown} onToggle={toggle} disabled={readOnly || module.locked} forced={module.locked} />
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
                {modules.length === 0 && <p className="text-sm text-muted-foreground">{tr("No menus match the search.")}</p>}
              </div>
            </>
          )}

          {!pending && (
            <div className="flex flex-wrap items-end justify-end gap-2">
              {actions.edit && (
                <input
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  placeholder={tr("Narration")}
                  className="min-w-0 flex-1 rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
                />
              )}
              <Button disabled={Boolean(saveBlocked)} disabledReason={saveBlocked} loading={edit.isPending} onClick={save}>
                {tr("Save")}
              </Button>
            </div>
          )}

          {(view?.history ?? []).length > 0 && (
            <div>
              <h3 className="mb-1.5 text-sm font-bold text-foreground">{tr("History")}</h3>
              <div className="max-h-64 overflow-y-auto rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/40 text-left text-[11px] text-muted-foreground">
                      <th className="px-3 py-2 font-semibold">{tr("When")}</th>
                      <th className="px-3 py-2 font-semibold">{tr("Action")}</th>
                      <th className="px-3 py-2 font-semibold">{tr("Menus")}</th>
                      <th className="px-3 py-2 font-semibold">{tr("By")}</th>
                      <th className="px-3 py-2 font-semibold">{tr("Narration")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.history.map((h, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="whitespace-nowrap px-3 py-1.5">{h.at ? formatDateTime(h.at) : "—"}</td>
                        <td className="px-3 py-1.5">
                          <StatusBadge status={h.action} />
                        </td>
                        <td className="px-3 py-1.5">{h.selection?.all ? tr("All") : (h.selection?.menus ?? []).length}</td>
                        <td className="px-3 py-1.5">{h.actor ?? "—"}</td>
                        <td className="px-3 py-1.5">{h.narration || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
