import { useState } from "react";
import { ChevronDown, Check, Eye, EyeOff } from "lucide-react";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { cn } from "@/Utils/Lib/cn";
import { checkPasswordRequirements } from "@/Utils/Lib/password-policy";

export const EMPTY_FORM = {
  user_name: "",
  user_fname: "",
  user_lname: "",
  user_pwd: "",
  inst_id: "",
  profile_id: "",
  employee_id: "",
  email: "",
  mobile: "",
  gender: "",
  address: "",
  password_policy_id: "",
};

export const fields = [
  ["user_name", "Username"],
  ["user_fname", "First name"],
  ["user_lname", "Last name"],
  ["user_pwd", "Password"],
  ["inst_id", "Institution"],
  ["profile_id", "Profile ID"],
  ["employee_id", "Employee ID"],
  ["email", "Email"],
  ["mobile", "Mobile"],
  ["gender", "Gender"],
  ["address", "Address"],
];

export function fieldValue(user, key) {
  const aliases = {
    user_name: ["user_name", "auth_username", "username"],
    user_fname: ["user_fname", "first_name", "firstname", "fname", "user_first_name"],
    user_lname: ["user_lname", "last_name", "lastname", "lname", "user_last_name"],
    inst_id: ["inst_id", "institution_id"],
    profile_id: ["profile_id"],
    employee_id: ["employee_id", "employeeId"],
  };
  return (
    (aliases[key] || [key])
      .map((name) => user?.[name])
      .find((value) => value !== undefined && value !== null) || ""
  );
}
export function userId(user) {
  return user?.user_id ?? user?.id;
}
export function nameOf(user) {
  return fieldValue(user, "user_name") || "Unnamed user";
}

function PasswordPolicyField({ policies, policy, selectedId, onSelect, requirements }) {
  const [expanded, setExpanded] = useState(false);
  const options = policies.length > 0
    ? policies.map((p) => ({ value: p.id, label: p.name }))
    : [{ value: "", label: "No policies available" }];

  return (
    <div className="md:col-span-2">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">Password policy</span>
      <FilterSelect value={selectedId} onChange={onSelect} options={options} className="w-full" />
      {policy && (
        <div className="mt-1.5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
          >
            View Password Policy
            <ChevronDown size={13} className={cn("transition-transform", expanded && "rotate-180")} />
          </button>
          {expanded && (
            <ul className="mt-2 space-y-1 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              {requirements.length === 0 ? (
                <li className="text-xs text-slate-400">No specific requirements for this policy.</li>
              ) : (
                requirements.map((req) => (
                  <li key={req.key} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Check size={12} className="text-slate-400" />
                    {req.label}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function UserForm({
  form,
  setForm,
  editing,
  onSubmit,
  institutions,
  profiles,
  passwordPolicies,
  selectedPolicy,
  readOnly = false,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const passwordRequirements = checkPasswordRequirements(form.user_pwd, selectedPolicy);
  const policyRequirements = checkPasswordRequirements("", selectedPolicy);

  return (
    <form onSubmit={onSubmit} id="user-form" className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {fields
        .filter(([key]) => !(readOnly && key === "user_pwd"))
        .map(([key, label]) => (
        <label key={key} className="text-sm text-slate-700">
          <span className="mb-1.5 block font-medium">{label}</span>
          <div className="relative">
            {key === "inst_id" || key === "profile_id" ? (
              <select
                required={!editing}
                disabled={readOnly}
                value={form[key]}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="">Select {key === "inst_id" ? "institution" : "profile"}</option>
                {(key === "inst_id" ? institutions : profiles).map((option) => {
                  const id =
                    option.inst_profile_id ??
                    option.institution_id ??
                    option.inst_id ??
                    option.profile_id ??
                    option.id;
                  const label =
                    option.institution_name ??
                    option.inst_name ??
                    option.profile_name ??
                    option.name ??
                    id;
                  return (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  );
                })}
              </select>
            ) : (
              <input
                required={!readOnly && !editing && ["user_name", "user_pwd"].includes(key)}
                readOnly={readOnly}
                type={
                  key === "user_pwd"
                    ? showPassword
                      ? "text"
                      : "password"
                    : key === "email"
                      ? "email"
                      : "text"
                }
                value={editing && key === "user_pwd" ? "" : form[key]}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                className={`w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 outline-none focus:border-blue-400${key === "user_pwd" ? " pr-10" : ""}${readOnly ? " bg-slate-50 text-slate-500" : ""}`}
              />
            )}
            {key === "user_pwd" && !readOnly && (
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            )}
          </div>
          {key === "user_pwd" && !editing && !readOnly && passwordRequirements.length > 0 && (
            <ul className="mt-2 space-y-1">
              {passwordRequirements.map((req) => (
                <li
                  key={req.key}
                  className={`flex items-center gap-1.5 text-xs ${req.met ? "text-emerald-600" : "text-slate-400"}`}
                >
                  {req.met ? <Check size={13} /> : <span className="h-1 w-1 rounded-full bg-current" />}
                  {req.label}
                </li>
              ))}
            </ul>
          )}
        </label>
      ))}
      {!readOnly && !editing && (
        <PasswordPolicyField
          policies={passwordPolicies}
          policy={selectedPolicy}
          selectedId={form.password_policy_id}
          onSelect={(value) => setForm({ ...form, password_policy_id: value })}
          requirements={policyRequirements}
        />
      )}
    </form>
  );
}
