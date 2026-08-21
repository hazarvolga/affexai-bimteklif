import {
  BarChart3,
  FileText,
  Users,
  Settings,
  LayoutDashboard,
  BookOpen,
  Target,
  Sparkles,
  Shield,
  ChartBarIncreasing,
  CreditCard,
  ClipboardList,
  ClipboardCheck,
  Box
} from 'lucide-react';

export type NavGroup = 'İş' | 'Kalite' | 'Öğrenme' | 'Yönetim';

export interface NavItem {
  label: string;
  path: string;
  icon: any;
  roles: string[];
  group: NavGroup;
}

export const navGroupOrder: NavGroup[] = ['İş', 'Kalite', 'Öğrenme', 'Yönetim'];

export const navigationConfig: NavItem[] = [
  {
    label: "Dashboard",
    path: "/app",
    icon: LayoutDashboard,
    roles: ["owner", "admin", "manager", "viewer"],
    group: "İş",
  },
  {
    label: "Teklifler",
    path: "/app/quotes",
    icon: FileText,
    roles: ["owner", "admin", "manager", "viewer"],
    group: "İş",
  },
  {
    label: "Müşteriler",
    path: "/app/clients",
    icon: Users,
    roles: ["owner", "admin", "manager", "viewer"],
    group: "İş",
  },
  {
    label: "CRM Pipeline",
    path: "/app/crm",
    icon: Target,
    roles: ["owner", "admin", "manager"],
    group: "İş",
  },
  {
    label: "AI Asistan",
    path: "/app/ai",
    icon: Sparkles,
    roles: ["owner", "admin", "manager"],
    group: "İş",
  },
  {
    label: "Kârlılık",
    path: "/app/profitability",
    icon: ChartBarIncreasing,
    roles: ["owner", "admin", "manager"],
    group: "İş",
  },
  {
    label: "5D IFC Metraj Engine",
    path: "/app/ifc-parser",
    icon: Box,
    roles: ["owner", "admin", "manager", "viewer"],
    group: "Kalite",
  },
  {
    label: "SmartCheck",
    path: "/app/smartcheck",
    icon: Shield,
    roles: ["owner", "admin", "manager", "viewer"],
    group: "Kalite",
  },
  {
    label: "Piyasa Verisi",
    path: "/app/market-intelligence",
    icon: BarChart3,
    roles: ["owner", "admin", "manager", "viewer"],
    group: "Kalite",
  },
  {
    label: "Mevzuat",
    path: "/app/regulations",
    icon: Shield,
    roles: ["owner", "admin", "manager"],
    group: "Kalite",
  },
  {
    label: "Pilot Kanıtı",
    path: "/app/pilot-evidence",
    icon: ClipboardCheck,
    roles: ["owner", "admin", "manager"],
    group: "Kalite",
  },
  {
    label: "Akademi",
    path: "/app/academy",
    icon: BookOpen,
    roles: ["owner", "admin", "manager", "viewer"],
    group: "Öğrenme",
  },
  {
    label: "Pilot Başvuruları",
    path: "/app/pilot-applications",
    icon: ClipboardList,
    roles: ["owner", "admin"],
    group: "Yönetim",
  },
  {
    label: "Faturalandırma",
    path: "/app/billing",
    icon: CreditCard,
    roles: ["owner", "admin"],
    group: "Yönetim",
  },
  {
    label: "Ayarlar",
    path: "/app/settings",
    icon: Settings,
    roles: ["owner", "admin"],
    group: "Yönetim",
  },
];
