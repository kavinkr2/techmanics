import {
  LayoutDashboard,
  LineChart,
  MessageCircle,
  Package,
  Ship,
  TrendingUp,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import Card from "@/components/Card";

const quick = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Forecast", to: "/forecast", icon: LineChart },
  { label: "Optimizer", to: "/optimize", icon: TrendingUp },
  { label: "Copilot", to: "/copilot", icon: MessageCircle },
  { label: "Cargo", to: "/cargo", icon: Package },
  { label: "Ports", to: "/ports", icon: Ship },
];

export default function QuickActions() {
  return (
    <Card className="grid grid-cols-3 gap-3 p-4 sm:grid-cols-6">
      {quick.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={cn(
            "group flex flex-col items-center gap-1.5 rounded-[10px] p-3 text-center text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-all"
          )}
        >
          <item.icon className="h-6 w-6 shrink-0 text-accent group-hover:text-accent-hover" />
          {item.label}
        </NavLink>
      ))}
    </Card>
  );
}