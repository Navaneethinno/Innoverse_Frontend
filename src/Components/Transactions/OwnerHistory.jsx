import { useState } from "react";
import { useTranslation } from "react-i18next";
import { History } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { useMenuPermission } from "@/Hooks/usePermission";
import { PartyHistory } from "./Transactions";

// In a customer's or merchant's detail: their transaction history (every
// module, their side), for users who may view the Transactions menu.
export function OwnerHistoryButton({ owner }) {
  const { t } = useTranslation("txn");
  const can = useMenuPermission("Transactions");
  const [open, setOpen] = useState(false);
  if (!owner || !can("View")) return null;
  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button variant="outline" size="sm" icon={History} onClick={() => setOpen(true)}>
          {t("transactionHistory")}
        </Button>
      </div>
      {open && <PartyHistory party={{ entity_type: owner.kind, entity_id: owner.id, name: owner.name }} onClose={() => setOpen(false)} />}
    </>
  );
}
