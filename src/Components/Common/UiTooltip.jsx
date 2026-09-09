import { Tooltip, TooltipContent, TooltipTrigger } from "@/Components/UI/tooltip";
import { getUiTooltipText } from "@/Utils/Lib/tooltips";

export function UiTooltip({ label, children, side = "top" }) {
  const text = getUiTooltipText(label);
  if (!text) return children;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} sideOffset={6}>
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
