import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, AlertCircle, Layers } from "lucide-react";
import { useAuthStore } from "../../features/auth/auth.store";
import { apiService } from "../../features/api.service";
import { PendingTable } from "../../components/common/PendingTable";
import { Skeleton } from "../../components/ui/skeleton";
import { notifications } from "../../lib/notifications";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import type { PendingRequestOut } from "../../features/maker-checker.types";

const glass = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.85)",
  boxShadow: "0 4px 24px rgba(108,127,255,0.08), 0 1px 3px rgba(108,127,255,0.04)",
};

type SubTab = "modules" | "menus" | "menu-actions";

interface Module { id: number; code: string; name: string; status?: string; auth_status?: string; application_id?: number }
interface Menu { id: number; code: string; name: string; status?: string; auth_status?: string; module_id?: number }
interface MenuAction { id: number; code: string; name: string; status?: string; auth_status?: string; menu_id?: number }

export function MenusPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [subTab, setSubTab] = useState<SubTab>("modules");
  const [viewMode, setViewMode] = useState<"list" | "pending">("list");

  const [modules, setModules] = useState<Module[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [menuActions, setMenuActions] = useState<MenuAction[]>([]);
  const [pending, setPending] = useState<PendingRequestOut[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const loadList = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (subTab === "modules") setModules((await apiService.getModules()) as Module[]);
      else if (subTab === "menus") setMenus((await apiService.getMenus()) as Menu[]);
      else setMenuActions((await apiService.getMenuActions()) as MenuAction[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  };

  const loadPending = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (subTab === "modules") setPending(await apiService.getPendingModules());
      else if (subTab === "menus") setPending(await apiService.getPendingMenus());
      else setPending(await apiService.getPendingMenuActions());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pending");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setForm({});
    setShowForm(false);
    if (viewMode === "list") void loadList();
    else void loadPending();
  }, [subTab, viewMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.name) { notifications.error("Code and name are required"); return; }
    setSubmitting(true);
    try {
      if (subTab === "modules") {
        if (!form.application_id) { notifications.error("Application ID is required"); setSubmitting(false); return; }
        await apiService.createModule({ application_id: Number(form.application_id), code: form.code, name: form.name, remark: form.remark || null });
      } else if (subTab === "menus") {
        if (!form.module_id) { notifications.error("Module ID is required"); setSubmitting(false); return; }
        await apiService.createMenu({ module_id: Number(form.module_id), code: form.code, name: form.name, remark: form.remark || null });
      } else {
        if (!form.menu_id) { notifications.error("Menu ID is required"); setSubmitting(false); return; }
        await apiService.createMenuAction({ menu_id: Number(form.menu_id), code: form.code, name: form.name, remark: form.remark || null });
      }
      notifications.success("Request submitted for approval");
      setShowForm(false);
      setForm({});
      void loadList();
    } catch (e) {
      notifications.error(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (request_id: string) => {
    try {
      if (subTab === "modules") await apiService.approveModule(request_id);
      else if (subTab === "menus") await apiService.approveMenu(request_id);
      else await apiService.approveMenuAction(request_id);
      toast.success("Request approved");
      setPending((p) => p.filter((r) => r.request_id !== request_id));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to approve"); }
  };

  const handleReject = async (request_id: string) => {
    try {
      if (subTab === "modules") await apiService.rejectModule(request_id);
      else if (subTab === "menus") await apiService.rejectMenu(request_id);
      else await apiService.rejectMenuAction(request_id);
      toast.success("Request rejected");
      setPending((p) => p.filter((r) => r.request_id !== request_id));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to reject"); }
  };

  const items = subTab === "modules" ? modules : subTab === "menus" ? menus : menuActions;
  const subTabLabel = subTab === "modules" ? "Module" : subTab === "menus" ? "Menu" : "Menu Action";

  return (
    <div className="pt-4 pb-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1">System</p>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Menus & Modules</h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">Manage application structure</p>
        </div>
        {viewMode === "list" && (
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-200/50"
            style={{ background: "linear-gradient(135deg, #6C7FFF 0%, #B39DFA 100%)" }}
          >
            <Plus size={14} /> New {subTabLabel}
          </motion.button>
        )}
      </motion.div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 mb-4 p-1 rounded-xl w-fit" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.85)" }}>
        {(["modules", "menus", "menu-actions"] as SubTab[]).map((t) => (
          <button key={t} onClick={() => setSubTab(t)}
            className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize", subTab === t ? "text-white shadow-md" : "text-slate-500 hover:text-indigo-600")}
            style={subTab === t ? { background: "linear-gradient(135deg, #6C7FFF, #B39DFA)" } : {}}
          >
            {t.replace("-", " ")}
          </button>
        ))}
      </div>

      {/* View mode toggle */}
      <div className="flex items-center gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.85)" }}>
        {(["list", "pending"] as const).map((m) => (
          <button key={m} onClick={() => setViewMode(m)}
            className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize", viewMode === m ? "text-white shadow-md" : "text-slate-500 hover:text-indigo-600")}
            style={viewMode === m ? { background: "linear-gradient(135deg, #6C7FFF, #B39DFA)" } : {}}
          >
            {m === "list" ? "All" : "Pending Approvals"}
          </button>
        ))}
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && viewMode === "list" && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-2xl p-6 mb-6" style={glass}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-800">New {subTabLabel}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={14} /></button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {subTab === "modules" && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Application ID</label>
                  <input value={form.application_id ?? ""} onChange={(e) => setForm((f) => ({ ...f, application_id: e.target.value }))}
                    type="number" placeholder="1"
                    className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    style={{ background: "rgba(255,255,255,0.80)", border: "1px solid rgba(108,127,255,0.15)" }} />
                </div>
              )}
              {subTab === "menus" && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Module ID</label>
                  <input value={form.module_id ?? ""} onChange={(e) => setForm((f) => ({ ...f, module_id: e.target.value }))}
                    type="number" placeholder="1"
                    className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    style={{ background: "rgba(255,255,255,0.80)", border: "1px solid rgba(108,127,255,0.15)" }} />
                </div>
              )}
              {subTab === "menu-actions" && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Menu ID</label>
                  <input value={form.menu_id ?? ""} onChange={(e) => setForm((f) => ({ ...f, menu_id: e.target.value }))}
                    type="number" placeholder="1"
                    className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    style={{ background: "rgba(255,255,255,0.80)", border: "1px solid rgba(108,127,255,0.15)" }} />
                </div>
              )}
              {["code", "name", "remark"].map((key) => (
                <div key={key}>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">{key}</label>
                  <input value={form[key] ?? ""} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={key === "remark" ? "Optional" : key.toUpperCase()}
                    className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    style={{ background: "rgba(255,255,255,0.80)", border: "1px solid rgba(108,127,255,0.15)" }} />
                </div>
              ))}
              <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
                <motion.button type="submit" disabled={submitting} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-indigo-200/50 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #6C7FFF 0%, #B39DFA 100%)" }}>
                  {submitting ? "Submitting…" : "Submit for Approval"}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-2xl mb-4 bg-red-50 border border-red-100 text-sm text-red-600">
          <AlertCircle size={14} /> {error}
          <button onClick={() => viewMode === "list" ? void loadList() : void loadPending()} className="ml-auto text-xs font-bold underline">Retry</button>
        </div>
      )}

      {viewMode === "pending" ? (
        <PendingTable
          requests={pending}
          isLoading={isLoading}
          currentUserId={currentUser?.id}
          onApprove={handleApprove}
          onReject={handleReject}
          entityLabel={subTabLabel.toLowerCase()}
        />
      ) : (
        <div className="rounded-2xl overflow-hidden" style={glass}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100/80">
                {["Code", "Name", "Status"].map((h) => (
                  <th key={h} className="text-center px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <td key={j} className="px-5 py-3.5"><Skeleton className="h-4 w-24 mx-auto" /></td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                        <Layers size={20} className="text-indigo-400" />
                      </div>
                      <p className="text-sm font-bold text-slate-600">No {subTabLabel.toLowerCase()}s found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                (items as Array<{ id: number; code: string; name: string; auth_status?: string; status?: string }>).map((item, i) => (
                  <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className="border-b border-slate-50 hover:bg-white/60 transition-colors">
                    <td className="px-5 py-3.5 text-xs font-bold text-slate-700 font-mono text-center">{item.code}</td>
                    <td className="px-5 py-3.5 text-xs font-semibold text-slate-800 text-center">{item.name}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 text-center">{item.auth_status ?? item.status ?? "—"}</td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
