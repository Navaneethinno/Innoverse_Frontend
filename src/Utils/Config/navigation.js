import {
  AppWindow,
  Building2,
  ClipboardList,
  Layers,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  Users,
} from "lucide-react";
export const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Pending", path: "/pending", icon: ClipboardList },
  { label: "Institutions", path: "/institutions", icon: Building2 },
  { label: "Users", path: "/users", icon: Users },
  { label: "Profiles", path: "/profiles", icon: Layers },
  { label: "Applications", path: "/applications", icon: AppWindow },
  { label: "Menus", path: "/menus", icon: Menu },
  { label: "KYC", path: "/kyc", icon: ShieldCheck },
];
