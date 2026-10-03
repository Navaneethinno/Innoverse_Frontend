// A barcode from the reference: bars and gaps of varying width taken from each
// character, so the same reference always draws the same code. Returns the
// dark bars as { x, width } and the total width in units.
export function barcodeBars(value) {
  const widths = [2, 1, 1, 2, 1, 3]; // start
  for (const char of String(value)) {
    const code = char.charCodeAt(0);
    widths.push(1 + (code % 3), 1 + ((code >> 2) % 3), 1 + ((code >> 4) % 2), 1 + ((code >> 1) % 3), 1 + ((code >> 3) % 2), 1);
  }
  widths.push(2, 1, 1, 2, 1, 3); // stop
  let x = 0;
  const bars = [];
  widths.forEach((width, index) => {
    if (index % 2 === 0) bars.push({ x, width });
    x += width;
  });
  return { bars, total: x };
}
