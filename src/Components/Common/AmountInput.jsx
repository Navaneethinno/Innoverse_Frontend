import { useState } from "react";
import { cn } from "@/Utils/Lib/utils";
import { decimalSeparator, formatNumber, plainDecimal } from "@/Utils/Lib/numberFormat";

// An amount typed in the institution's number format; kept as a plain
// decimal ("1234.5") and shown formatted once the field is left.
export function AmountInput({ value, decimals = 2, onChange, className, placeholder }) {
  const [focused, setFocused] = useState(false);
  const shown = focused || value === "" ? String(value).replace(".", decimalSeparator()) : formatNumber(value, { min: decimals, max: decimals });
  return (
    <input
      className={cn("text-end tabular-nums", className)}
      placeholder={placeholder}
      inputMode="decimal"
      value={shown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => onChange(plainDecimal(e.target.value, decimals))}
    />
  );
}
