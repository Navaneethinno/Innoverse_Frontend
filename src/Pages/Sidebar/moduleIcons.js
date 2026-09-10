import {
  AlertTriangle,
  BadgeCheck,
  Bot,
  Building2,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Database,
  FileText,
  Fingerprint,
  FolderCog,
  Gavel,
  House,
  KeyRound,
  Landmark,
  Layers,
  Link2,
  Lock,
  MapPinned,
  Palette,
  Radio,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  Store,
  Truck,
  UserRound,
  UsersRound,
  Wallet,
} from "lucide-react";

const MODULE_ICON_RULES = [
  [/purse|wallet/i, Wallet],
  [/risk/i, ShieldAlert],
  [/cms|content/i, ClipboardList],
  [/mms|merchant|store/i, Store],
  [/pay/i, CreditCard],
  [/secure|security/i, Lock],
  [/aml/i, ShieldCheck],
  [/chatbot|bot/i, Bot],
  [/fraud/i, AlertTriangle],
  [/lrms|loan|recovery/i, Landmark],
  [/recon/i, RefreshCcw],
  [/bridge/i, Link2],
  [/fleet/i, Truck],
  [/kyc|identity/i, Fingerprint],
];

export function getModuleIcon(moduleName = "") {
  const match = MODULE_ICON_RULES.find(([pattern]) => pattern.test(moduleName));
  return match ? match[1] : Layers;
}

const MENU_ICON_RULES = [
  [/institution/i, Landmark],
  [/user management|users?$/i, UsersRound],
  [/profile|role/i, BadgeCheck],
  [/password|credential/i, KeyRound],
  [/kyc|identity/i, Fingerprint],
  [/epurse|wallet/i, Wallet],
  [/settings?/i, FolderCog],
  [/master/i, Database],
  [/province|state|region/i, MapPinned],
  [/district|branch/i, Building2],
  [/village|city|town/i, House],
  [/legal|compliance/i, Gavel],
  [/branding|brand/i, Palette],
  [/channel/i, Radio],
  [/currency|money/i, CircleDollarSign],
  [/account|person/i, UserRound],
];

// Menu metadata does not currently include icon identifiers. Keep icon
// selection in one place so every tree depth has an intentional fallback.
export function getMenuIcon(menuName = "") {
  const match = MENU_ICON_RULES.find(([pattern]) => pattern.test(menuName));
  return match ? match[1] : FileText;
}
