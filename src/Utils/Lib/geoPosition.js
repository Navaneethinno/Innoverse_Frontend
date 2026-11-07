// A map position (branch, ATM): latitude -90..90 and longitude -180..180,
// both or neither.
const coord = (v) => (String(v ?? "").trim() === "" ? null : Number(v));

// The body's pair: both numbers, or both null (no position).
export function positionOf(row) {
  const latitude = coord(row?.latitude);
  const longitude = coord(row?.longitude);
  return latitude == null || longitude == null ? { latitude: null, longitude: null } : { latitude, longitude };
}

// Why the pair can't be saved ("" when it can).
export function positionProblem(t, row) {
  const lat = coord(row?.latitude);
  const lng = coord(row?.longitude);
  if ((lat == null) !== (lng == null)) return t("campaigns:positionBoth");
  if (lat == null) return "";
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) return t("campaigns:positionRange");
  return "";
}
