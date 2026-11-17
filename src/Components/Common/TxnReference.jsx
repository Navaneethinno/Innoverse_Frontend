import { useTranslation } from "react-i18next";
import { CopyButton } from "@/Components/Common/CopyButton";
import { cn } from "@/Utils/Lib/utils";

// The institution's own transaction reference (Admin_36 §1), the one the
// customer sees on receipts, SMS and USSD ("ETU202605110001"), shown under
// the rrn wherever staff see the rrn. Empty when the institution has
// references off, or for transactions before 17 November 2026: nothing.
export function TxnReference({ value, className }) {
  const { t } = useTranslation("common");
  if (!value) return null;
  return (
    <span className={cn("block font-mono text-[10px] font-normal text-muted-foreground", className)} title={t("customerReference")}>
      {value} <CopyButton value={value} />
    </span>
  );
}
