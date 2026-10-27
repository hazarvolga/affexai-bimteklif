import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  BookOpen,
  BookOpenCheck,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Briefcase,
  FileCheck2,
  Calculator,
  ClipboardCheck
} from 'lucide-react';
import { ACADEMY_ENABLED } from '@/config/features';
import { PROGRESS_PAYMENTS_ENABLED } from '@/config/client-features';

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
  ...(PROGRESS_PAYMENTS_ENABLED ? [{
    label: "Hakediş & Kesin Hesap",
    path: "/app/progress-payments",
    icon: FileCheck2,
    roles: ["owner", "admin", "manager", "viewer"],
    group: "Ana Menü" as const,
  }] : []),
  {
    label: "Müşteriler (CRM)",
    path: "/app/crm",
    icon: Users,
    roles: ["owner", "admin", "manager", "viewer"],
    group: "Ana Menü",
  },
  {
    label: "Nasıl Çalışır",
    path: "/app/nasil-calisir",
    icon: Calculator,
    roles: ["owner", "admin", "manager", "viewer"],
    group: "Araçlar",
  },
  {
    label: "Uzman Önizlemesi",
    path: "/app/uzman-onizleme",
    icon: ClipboardCheck,
    roles: ["owner", "admin", "manager", "viewer"],
    group: "Araçlar",
  },
  {
    label: "Fiyat Kataloğu",
    path: "/app/fiyat-katalogu",
    icon: BookOpenCheck,
    roles: ["owner", "admin", "manager"],
    group: "Araçlar",
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
