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
  CreditCard
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: any;
  roles: string[];
}

export const navigationConfig: NavItem[] = [
  {
    label: "Dashboard",
    path: "/app",
    icon: LayoutDashboard,
    roles: ["owner", "admin", "manager", "viewer"],
  },
  {
    label: "Teklifler",
    path: "/app/quotes",
    icon: FileText,
    roles: ["owner", "admin", "manager", "viewer"],
  },
  {
    label: "Müşteriler",
    path: "/app/clients",
    icon: Users,
    roles: ["owner", "admin", "manager", "viewer"],
  },
  {
    label: "CRM Pipeline",
    path: "/app/crm",
    icon: Target,
    roles: ["owner", "admin", "manager"],
  },
  {
    label: "AI Asistan",
    path: "/app/ai",
    icon: Sparkles,
    roles: ["owner", "admin", "manager"],
  },
  {
    label: "Mevzuat",
    path: "/app/regulations",
    icon: Shield,
    roles: ["owner", "admin", "manager"],
  },
  {
    label: "SmartCheck",
    path: "/app/smartcheck",
    icon: Shield,
    roles: ["owner", "admin", "manager", "viewer"],
  },
  {
    label: "Akademi",
    path: "/app/academy",
    icon: BookOpen,
    roles: ["owner", "admin", "manager", "viewer"],
  },
  {
    label: "Kârlılık",
    path: "/app/profitability",
    icon: ChartBarIncreasing,
    roles: ["owner", "admin", "manager"],
  },
  {
    label: "Faturalandırma",
    path: "/app/billing",
    icon: CreditCard,
    roles: ["owner", "admin"],
  },
  {
    label: "Ayarlar",
    path: "/app/settings",
    icon: Settings,
    roles: ["owner", "admin"],
  },
];
