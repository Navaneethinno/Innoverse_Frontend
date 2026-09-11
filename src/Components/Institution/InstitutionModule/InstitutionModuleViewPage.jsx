import { useMemo } from "react";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { useInstitutionModulesQuery } from "@/Hooks/Institutions/institutionModuleHooks";

const fields = [
  ["module_name", "Module"],
  ["inst_profile_name", "Institution"],
  ["effective_from", "Effective From"],
  ["effective_to", "Effective To"],
  ["configuration_status", "Configuration"],
];

export function InstitutionModuleViewPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const query = useInstitutionModulesQuery({ page: 1, limit: 100 });
  const row = useMemo(
    () => query.data.find((item) => String(item.id) === String(id)),
    [query.data, id],
  );
  const status = row?.status_name ?? row?.auth_status ?? row?.status;

  if (query.isLoading)
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Loading institution module...
      </div>
    );
  if (query.error || !row)
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <AlertCircle className="mb-3 text-red-400" size={24} />
        <p className="text-sm font-bold text-foreground">Institution module not found</p>
        <button
          type="button"
          onClick={() => navigate("/institutionmodule")}
          className="mt-4 text-sm font-bold text-primary"
        >
          Back to institution modules
        </button>
      </div>
    );

  return (
    <div className="space-y-5 pb-8">
      <button
        type="button"
        onClick={() => navigate("/institutionmodule")}
        className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={15} /> Institution Module
      </button>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Institution</p>
        <h1 className="text-xl font-black tracking-tight text-foreground">
          {row.module_name ?? `Module #${row.module_id}`}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          View institution module assignment details.
        </p>
      </div>
      <section className="max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Assignment details
            </p>
            <h2 className="mt-1 text-base font-bold text-foreground">
              {row.inst_profile_name ?? row.inst_profile_id}
            </h2>
          </div>
          <StatusBadge status={String(status ?? "")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(([key, label]) => (
            <div key={key}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {row[key] ?? row[key === "module_name" ? "module_id" : key] ?? "—"}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
