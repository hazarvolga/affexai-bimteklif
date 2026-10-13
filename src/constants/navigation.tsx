import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  BookOpen
} from 'lucide-react';
import { ACADEMY_ENABLED } from '@/config/features';

export type NavGroup = 'Ana Menü' | 'Araçlar' | 'Sistem Yönetimi';

export interface NavItem {
  label: string;
  path: string;
  icon: any;
  roles: string[];
  group: NavGroup;
}

export const navGroupOrder: NavGroup[] = ['Ana Menü', 'Araçlar', 'Sistem Yönetimi'];

export const navigationConfig: NavItem[] = [
  {
    label: 'Platform Yönetimi',
    path: '/admin',
    icon: Settings,
    roles: ['super_admin'],
    group: 'Sistem Yönetimi',
  },
  {
    label: "Deneme & Müşteriler",
    path: "/app/pilot-applications",
    icon: Users,
    roles: ["super_admin"],
    group: "Sistem Yönetimi",
  },
  {
    label: "Faturalandırma",
    path: "/app/billing",
    icon: LayoutDashboard,
    roles: ["super_admin"],
    group: "Sistem Yönetimi",
  },
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
  ...(ACADEMY_ENABLED ? [{
    label: "Akademi (Yardım)",
    path: "/app/academy",
    icon: BookOpen,
    roles: ["owner", "admin", "manager", "viewer"],
    group: "Araçlar" as const,
  }] : []),
];
