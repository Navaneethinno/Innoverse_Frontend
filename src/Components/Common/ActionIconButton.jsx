import { UiTooltip } from "@/Components/Common/UiTooltip";
import { actionButtonClass } from "@/Components/Common/actionStyles";
import { cn } from "@/Utils/Lib/utils";

// One icon button in a table's Actions column: tooltip, the intent's colour
// (actionStyles.js) and a small hover pop on the icon. RowActions and any
// page-specific row action use this, so every row button looks and moves
// the same.
export function ActionIconButton({ label, intent = "view", icon: Icon, onClick, className, ...props }) {
  return (
    <UiTooltip label={label}>
      <button type="button" aria-label={label} onClick={onClick} className={cn("group/action", actionButtonClass(intent), className)} {...props}>
        <Icon size={14} className="transition-transform duration-200 ease-out group-hover/action:scale-110" />
      </button>
    </UiTooltip>
  );
}
