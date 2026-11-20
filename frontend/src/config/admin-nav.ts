import {
  LayoutDashboard,
  Receipt,
  Users,
  Download,
  Settings,
  CheckCircle2,
  BookOpen,
  AlertTriangle,
  MessageSquare,
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
  { label: "Orders", href: "/admin/orders", icon: Receipt },
  { label: "Participants", href: "/admin/participants", icon: Users },
  { label: "Approvals", href: "/admin/approvals", icon: CheckCircle2 },
  { label: "Booklet Stock", href: "/admin/booklet-stock", icon: BookOpen },
  { label: "Conflicts", href: "/admin/conflicts", icon: AlertTriangle },
  { label: "Messaging Queue", href: "/admin/messaging", icon: MessageSquare },
  { label: "Reports & Export", href: "/admin/export", icon: Download },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];
