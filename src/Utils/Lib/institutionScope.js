import { trimPayload } from "@/Utils/Lib/trimPayload";
import { readAuthUser } from "@/Services/api/authStorage";

// Institution scope (Admin portal: institution scope handoff). The login
// reply's `scope` (kept on the stored user) says who the user is:
//   PROVIDER (service provider): sees every non-system institution and picks
//     one where a record belongs to an institution (can_choose_institution).
//   TENANT (bank, fintech): only ever its own institution; no institution
//     picker, column or field anywhere, and inst_profile_id is never sent
//     (the server fills it in).
// The server enforces all of it; the frontend only follows it. A session
// from before the scope existed keeps the old behaviour (can choose).
export const readScope = () => readAuthUser()?.scope ?? null;

export const canChooseInstitution = (scope = readScope()) => scope?.can_choose_institution !== false;

// A request body without inst_profile_id for a TENANT user. Every request
// helper passes its JSON body through here.
// Also trims every text value except passwords (trimPayload), so this is the
// one place all request bodies pass through before they are sent.
export function scopedBody(body) {
  const trimmed = trimPayload(body);
  if (canChooseInstitution() || !trimmed || typeof trimmed !== "object" || Array.isArray(trimmed) || !("inst_profile_id" in trimmed)) return trimmed;
  const { inst_profile_id: _own, ...rest } = trimmed;
  return rest;
}

// Config-driven forms (Account configuration, Digital Product) list their
// fields in `config.fields`: for a bank / fintech user the institution field
// drops out everywhere those fields are read (form, validation, payload,
// view, audit), since the server fills it in.
export function scopeInstitutionFields(configs, key = "inst_profile_id") {
  for (const config of Object.values(configs)) {
    const all = config.fields;
    if (!Array.isArray(all) || !all.some(([k]) => k === key)) continue;
    Object.defineProperty(config, "fields", {
      get: () => (canChooseInstitution() ? all : all.filter(([k]) => k !== key)),
      enumerable: true,
    });
  }
  return configs;
}
