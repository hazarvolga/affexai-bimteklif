import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  BookOpen
} from 'lucide-react';

export type NavGroup = 'Ana Menü' | 'Araçlar';

export interface NavItem {
  label: string;
  path: string;
  icon: any;
  roles: string[];
  group: NavGroup;
}

export const navGroupOrder: NavGroup[] = ['Ana Menü', 'Araçlar'];

export const navigationConfig: NavItem[] = [
  {
    label: "Panel",
    path: "/app",
    icon: LayoutDashboard,
    roles: ["owner", "admin", "manager", "viewer"],
    group: "Ana Menü",
  },
  {
    label: "Teklifler & Projeler",
    path: "/app/quotes",
    icon: FileText,
    roles: ["owner", "admin", "manager", "viewer"],
    group: "Ana Menü",
  },
  {
    label: "Müşteriler (CRM)",
    path: "/app/crm",
    icon: Users,
    roles: ["owner", "admin", "manager", "viewer"],
    group: "Ana Menü",
  },
  {
    label: "Ayarlar",
    path: "/app/settings",
    icon: Settings,
    roles: ["owner", "admin"],
    group: "Araçlar",
  },
  {
    label: "Akademi (Yardım)",
    path: "/app/academy",
    icon: BookOpen,
    roles: ["owner", "admin", "manager", "viewer"],
    group: "Araçlar",
  }
];
