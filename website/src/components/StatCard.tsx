import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import Card from "./Card";

export interface StatCardProps {
  title: string;
  value: ReactNode;
  subtitle?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend = "neutral",
  className,
}: StatCardProps) {
  const trendColor = {
    up: "text-success",
    down: "text-danger",
    neutral: "text-text-secondary",
  }[trend];
  return (
    <Card className={cn("stat-card", className)}>
      {icon && <div className="shrink-0 text-accent">{icon}</div>}
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wider text-text-secondary">
          {title}
        </p>
        <div className="text-2xl font-semibold text-text-primary mt-0.5 truncate">
          {value}
        </div>
        {subtitle && (
          <p className={cn("mt-0.5 text-xs", trendColor)}>{subtitle}</p>
        )}
      </div>
    </Card>
  );
}