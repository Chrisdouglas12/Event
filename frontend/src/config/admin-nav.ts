import {
  LayoutDashboard,
  Receipt,
  Users,
  Download,
  Settings,
  AlertTriangle,
  ScanLine,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Live Scanner", href: "/admin/scanner", icon: ScanLine },
  { label: "Payments", href: "/admin/payments", icon: Receipt },
  { label: "Participants", href: "/admin/participants", icon: Users },
  { label: "Conflicts", href: "/admin/conflicts", icon: AlertTriangle },
  { label: "Reports & Export", href: "/admin/export", icon: Download },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];
