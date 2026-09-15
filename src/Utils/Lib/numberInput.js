// Shared guard for numeric <input type="number"> fields that must never
// hold a negative value. A bare `min="0"` attribute only flags the field as
// invalid on submit — it doesn't stop someone from typing "-5" or scrolling
// the native spinner below zero, so every non-negative number field needs
// both: blockNegativeKeyDown stops the "-" keystroke (and the exponent/plus
// keys native number inputs otherwise accept) before it lands, and
// clampNonNegative sanitizes onChange/onWheel so an already-negative or
// pasted value can't stick either.
export function blockNegativeKeyDown(event) {
  if (["-", "+", "e", "E"].includes(event.key)) event.preventDefault();
}

export function clampNonNegative(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return number;
}

// Prevents the native number spinner's scroll-to-change behavior from
// silently walking a focused-but-unintended field into a negative value.
export function blurOnWheel(event) {
  event.currentTarget.blur();
}
