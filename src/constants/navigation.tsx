import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  BookOpen,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Briefcase
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
    label: "SmartCheck & e-PYS",
    path: "/app/smartcheck",
    icon: ShieldCheck,
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
    label: "Tedarikçi & Piyasa",
    path: "/app/market-intelligence",
    icon: Briefcase,
    roles: ["owner", "admin", "manager"],
    group: "Araçlar",
  },
  {
    label: "Kârlılık Analizi",
    path: "/app/profitability",
    icon: TrendingUp,
    roles: ["owner", "admin", "manager"],
    group: "Araçlar",
  },
  {
    label: "Faturalandırma",
    path: "/app/billing",
    icon: CreditCard,
    roles: ["owner", "admin", "super_admin"],
    group: "Araçlar",
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
