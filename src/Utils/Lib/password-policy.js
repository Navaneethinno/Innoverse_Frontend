// Shape confirmed live against POST /user/password_policy/list — each
// record has min_length/max_length plus require_uppercase/lowercase/
// numbers/special booleans (each with its own min_* count), a special-char
// allowlist, and unrelated account-security fields (lockout, 2FA, session
// limits, ...) that this module ignores since they aren't checkable
// client-side against a single password string.
export function normalizePasswordPolicy(raw) {
  if (!raw) return null;
  return {
    id: raw.id ?? raw.policy_id,
    name: raw.policy_name ?? raw.name ?? "Password policy",
    minLength: Number(raw.min_length) || 0,
    maxLength: Number(raw.max_length) || 0,
    requireUppercase: !!raw.require_uppercase,
    minUppercase: Number(raw.min_uppercase) || (raw.require_uppercase ? 1 : 0),
    requireLowercase: !!raw.require_lowercase,
    minLowercase: Number(raw.min_lowercase) || (raw.require_lowercase ? 1 : 0),
    requireNumbers: !!raw.require_numbers,
    minNumbers: Number(raw.min_numbers) || (raw.require_numbers ? 1 : 0),
    requireSpecial: !!raw.require_special,
    minSpecial: Number(raw.min_special) || (raw.require_special ? 1 : 0),
    allowedSpecialChars:
      raw.allowed_special_chars && raw.allowed_special_chars !== "Undefined"
        ? raw.allowed_special_chars
        : "!@#$%^&*()_+-=[]{}|;:,.<>?",
  };
}

export function normalizePasswordPolicyList(payload) {
  const list = Array.isArray(payload) ? payload : (payload?.data ?? []);
  return (Array.isArray(list) ? list : []).map(normalizePasswordPolicy).filter(Boolean);
}

// No per-user policy assignment endpoint is confirmed, so the active
// policy is the one every screen falls back to: prefer one literally named
// DEFAULT (matches the live system-bootstrap record), else the first
// authorized/active entry, else just the first record.
export function pickDefaultPolicy(policies) {
  if (!policies?.length) return null;
  return (
    policies.find((p) => p.name?.toUpperCase() === "DEFAULT") ??
    policies.find((p) => p.id != null) ??
    policies[0]
  );
}

function escapeForCharClass(chars) {
  return chars.replace(/[\]\\^-]/g, "\\$&");
}

// One row per rule the policy actually turns on — {label, met} — so the UI
// can render a live checklist instead of only an all-or-nothing verdict.
export function checkPasswordRequirements(password, policy) {
  if (!policy) return [];
  const value = password ?? "";
  const rows = [];

  if (policy.minLength > 0) {
    rows.push({
      key: "minLength",
      label: `At least ${policy.minLength} characters`,
      met: value.length >= policy.minLength,
    });
  }
  if (policy.maxLength > 0) {
    rows.push({
      key: "maxLength",
      label: `At most ${policy.maxLength} characters`,
      met: value.length <= policy.maxLength,
    });
  }
  if (policy.requireUppercase) {
    const count = (value.match(/[A-Z]/g) || []).length;
    rows.push({
      key: "uppercase",
      label:
        policy.minUppercase > 1
          ? `At least ${policy.minUppercase} uppercase letters`
          : "At least 1 uppercase letter",
      met: count >= policy.minUppercase,
    });
  }
  if (policy.requireLowercase) {
    const count = (value.match(/[a-z]/g) || []).length;
    rows.push({
      key: "lowercase",
      label:
        policy.minLowercase > 1
          ? `At least ${policy.minLowercase} lowercase letters`
          : "At least 1 lowercase letter",
      met: count >= policy.minLowercase,
    });
  }
  if (policy.requireNumbers) {
    const count = (value.match(/[0-9]/g) || []).length;
    rows.push({
      key: "numbers",
      label: policy.minNumbers > 1 ? `At least ${policy.minNumbers} numbers` : "At least 1 number",
      met: count >= policy.minNumbers,
    });
  }
  if (policy.requireSpecial) {
    const charClass = escapeForCharClass(policy.allowedSpecialChars);
    const pattern = new RegExp(`[${charClass}]`, "g");
    const count = (value.match(pattern) || []).length;
    rows.push({
      key: "special",
      label:
        policy.minSpecial > 1
          ? `At least ${policy.minSpecial} special characters (${policy.allowedSpecialChars})`
          : `At least 1 special character (${policy.allowedSpecialChars})`,
      met: count >= policy.minSpecial,
    });
  }
  return rows;
}

// Returns a list of unmet requirement labels (empty = password is valid
// under this policy) — the submit-time gate built on the same checklist.
export function validatePassword(password, policy) {
  return checkPasswordRequirements(password, policy)
    .filter((row) => !row.met)
    .map((row) => row.label);
}
