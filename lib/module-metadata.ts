import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Package,
  DollarSign,
  Bot,
  type LucideIcon,
} from "lucide-react";
import { AppModule } from "@prisma/client";

export { AppModule };

export type ModuleMetadata = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const MODULE_METADATA: Record<AppModule, ModuleMetadata> = {
  [AppModule.APPOINTMENTS]: {
    label: "Agendamiento",
    href: "/appointments",
    icon: CalendarDays,
  },
  [AppModule.PATIENTS]: {
    label: "Pacientes",
    href: "/patients",
    icon: Users,
  },
  [AppModule.INVENTORY]: {
    label: "Inventario",
    href: "/inventory",
    icon: Package,
  },
  [AppModule.CAJA]: {
    label: "Caja",
    href: "/caja",
    icon: DollarSign,
  },
  [AppModule.AI_ASSISTANT]: {
    label: "Asistente IA",
    href: "/ai-assistant",
    icon: Bot,
  },
};

export const MODULE_ORDER: AppModule[] = [
  AppModule.APPOINTMENTS,
  AppModule.PATIENTS,
  AppModule.INVENTORY,
  AppModule.CAJA,
  AppModule.AI_ASSISTANT,
];

export const DASHBOARD_METADATA = {
  label: "Dashboard",
  href: "/dashboard",
  icon: LayoutDashboard,
};
