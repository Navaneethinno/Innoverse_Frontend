import { useMemo } from "react";
import { cn } from "@/Utils/Lib/cn";
function nextSequence(assignments) {
  return assignments.length + 1;
}
export function MakerCheckerConfig({
  value,
  onChange,
  candidates,
  makerInstitutionId,
  currentMakerId,
  showTitle = true,
}) {
  const eligibleCandidates = useMemo(
    () =>
      candidates.filter((candidate) => {
        if (candidate.is_current_maker || String(candidate.id) === String(currentMakerId))
          return false;
        if (
          makerInstitutionId !== undefined &&
          makerInstitutionId !== null &&
          candidate.institution_id !== undefined &&
          candidate.institution_id !== null
        ) {
          return String(candidate.institution_id) === String(makerInstitutionId);
        }
        return true;
      }),
    [candidates, currentMakerId, makerInstitutionId],
  );
  const selectedIds = value.checker_assignments.map((assignment) => String(assignment.user_id));
  const selectedCandidates = value.checker_assignments
    .map((assignment) =>
      eligibleCandidates.find((candidate) => String(candidate.id) === String(assignment.user_id)),
    )
    .filter(Boolean);
  const setMode = (checker_mode) => {
    if (checker_mode === "ANY") {
      onChange({
        checker_mode,
        checker_assignments: [],
        required_checker_count: Math.max(1, value.required_checker_count || 1),
      });
      return;
    }
    const count = value.checker_assignments.length || 1;
    onChange({
      checker_mode,
      checker_assignments: value.checker_assignments,
      required_checker_count:
        checker_mode === "ASSIGNED_SEQUENTIAL"
          ? count
          : Math.min(Math.max(1, value.required_checker_count || count), count),
    });
  };
  const addCandidate = (id) => {
    if (selectedIds.includes(String(id))) return;
    const candidate = eligibleCandidates.find((item) => String(item.id) === String(id));
    if (!candidate) return;
    const assignment = {
      user_id: candidate.id,
      sequence:
        value.checker_mode === "ASSIGNED_SEQUENTIAL"
          ? nextSequence(value.checker_assignments)
          : undefined,
    };
    const nextAssignments = [...value.checker_assignments, assignment];
    onChange({
      ...value,
      checker_assignments: nextAssignments,
      required_checker_count:
        value.checker_mode === "ASSIGNED_SEQUENTIAL"
          ? nextAssignments.length
          : Math.min(Math.max(1, value.required_checker_count || 1), nextAssignments.length),
    });
  };
  const removeCandidate = (id) => {
    const nextAssignments = value.checker_assignments.filter(
      (assignment) => String(assignment.user_id) !== String(id),
    );
    const normalizedAssignments =
      value.checker_mode === "ASSIGNED_SEQUENTIAL"
        ? nextAssignments.map((assignment, index) => ({ ...assignment, sequence: index + 1 }))
        : nextAssignments;
    onChange({
      ...value,
      checker_assignments: normalizedAssignments,
      required_checker_count:
        value.checker_mode === "ASSIGNED_SEQUENTIAL"
          ? normalizedAssignments.length
          : Math.min(
              Math.max(1, value.required_checker_count || 1),
              Math.max(1, normalizedAssignments.length),
            ),
    });
  };
  const moveAssignment = (fromIndex, toIndex) => {
    if (value.checker_mode !== "ASSIGNED_SEQUENTIAL") return;
    if (toIndex < 0 || toIndex >= value.checker_assignments.length) return;
    const nextAssignments = [...value.checker_assignments];
    const [picked] = nextAssignments.splice(fromIndex, 1);
    nextAssignments.splice(toIndex, 0, picked);
    onChange({
      ...value,
      checker_assignments: nextAssignments.map((assignment, index) => ({
        ...assignment,
        sequence: index + 1,
      })),
      required_checker_count: nextAssignments.length,
    });
  };
  return (
    <div className="rounded-2xl border border-slate-100 bg-white/90 p-4 space-y-4">
      {showTitle && <h3 className="text-sm font-bold text-slate-800">Checker Workflow</h3>}

      <div className="space-y-2">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          Approval Method
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { value: "ANY", label: "Any Eligible Checker" },
            { value: "ASSIGNED_PARALLEL", label: "Assigned Checkers - Parallel" },
            { value: "ASSIGNED_SEQUENTIAL", label: "Assigned Checkers - Sequential" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMode(option.value)}
              className={cn(
                "rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors",
                value.checker_mode === option.value
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {value.checker_mode !== "ANY" && (
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Assigned Checkers
            </p>
            <div className="flex flex-wrap gap-2">
              {eligibleCandidates.length === 0 ? (
                <span className="text-xs text-slate-400">
                  No eligible checker candidates available
                </span>
              ) : (
                eligibleCandidates.map((candidate) => {
                  const selected = selectedIds.includes(String(candidate.id));
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() =>
                        selected ? removeCandidate(candidate.id) : addCandidate(candidate.id)
                      }
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                        selected
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      {candidate.name}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Required Approvals
              </label>
              <input
                type="number"
                min={1}
                max={Math.max(1, value.checker_assignments.length || 1)}
                value={value.required_checker_count}
                onChange={(e) => {
                  const raw = Number(e.target.value || 1);
                  const max = Math.max(1, value.checker_assignments.length || 1);
                  const next = Math.min(Math.max(1, raw), max);
                  onChange({
                    ...value,
                    required_checker_count:
                      value.checker_mode === "ASSIGNED_SEQUENTIAL"
                        ? value.checker_assignments.length
                        : next,
                  });
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            {value.checker_mode === "ASSIGNED_SEQUENTIAL" && (
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Sequence
                </label>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                  {selectedCandidates.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Select checkers to define approval order
                    </p>
                  ) : (
                    selectedCandidates.map((candidate, index) => (
                      <div
                        key={candidate.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs border border-slate-100"
                      >
                        <span>
                          {index + 1}. {candidate.name}
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => moveAssignment(index, index - 1)}
                            disabled={index === 0}
                            className="text-slate-400 disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveAssignment(index, index + 1)}
                            disabled={index === selectedCandidates.length - 1}
                            className="text-slate-400 disabled:opacity-30"
                          >
                            ↓
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400">
            {value.checker_mode === "ASSIGNED_PARALLEL"
              ? "Required approvals must be less than or equal to assigned checkers."
              : "Required approvals always matches the number of assigned checkers for sequential approval."}
          </p>
        </div>
      )}
    </div>
  );
}
