import { lazy } from "react";
import { usePagePermission } from "@/Hooks/usePermission";

const MessageCampaigns = lazy(() => import("./MessageCampaigns.jsx").then((m) => ({ default: m.MessageCampaigns })));
const RewardsCampaigns = lazy(() => import("./RewardsCampaigns.jsx").then((m) => ({ default: m.RewardsCampaigns })));

// Two menus share the name "Campaigns" (so the slug "campaigns"): 248
// (Global Settings, messages) and 226 (ePurse rewards). The menu the page
// was opened from picks which. SQL 267 renames 226 "Rewards Campaigns" (its
// own slug); until it lands on UAT this keeps the old name working.
const REWARDS_MENU_ID = 226;

export function CampaignsMenu() {
  const can = usePagePermission();
  return Number(can.menu?.menu_id) === REWARDS_MENU_ID ? <RewardsCampaigns /> : <MessageCampaigns />;
}
