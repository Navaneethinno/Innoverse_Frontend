import i18n from "i18next";

// Who did something, from a record's `<field>` (e.g. created_by) and the
// server's `<field>_portal` / `<field>_channel` next to it. An admin user
// (or an action whose portal is not known) shows the name as sent; a
// customer or merchant shows where it was done ("Customer app", "Merchant
// POS"); the platform itself shows "System". The raw `<field>` text is
// never parsed.
const nameOf = (value) =>
  value && typeof value === "object" ? value.name ?? value.username ?? value.user_name ?? "" : value ?? "";

export function actorText(row, field, fallback = "—") {
  const portal = String(row?.[`${field}_portal`] ?? "").toUpperCase();
  const channel = String(row?.[`${field}_channel`] ?? "").toUpperCase();
  const t = (key, options) => i18n.t(`common:${key}`, options);
  if (portal === "SYSTEM") return t("actor_SYSTEM");
  if (portal === "CUSTOMER" || portal === "MERCHANT") return t(`actor_${portal}_${channel}`, { defaultValue: t(`actor_${portal}`) });
  const name = nameOf(row?.[field]);
  return name === "" ? fallback : String(name);
}
