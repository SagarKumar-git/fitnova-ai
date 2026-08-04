import * as React from "react";
import { cn } from "../../../utils/cn";
import { Surface } from "../../primitives";

export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  delta?: string | number;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
}

export const Stat = React.forwardRef<HTMLDivElement, StatProps>(
  ({ className, title, value, delta, trend, icon, ...props }, ref) => {
    return (
      <Surface ref={ref} className={cn("p-6 flex flex-col gap-2", className)} {...props}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold font-display">{value}</span>
          {delta && trend && (
            <span
              className={cn(
                "text-sm font-medium",
                trend === "up" && "text-green-600 dark:text-green-400",
                trend === "down" && "text-red-600 dark:text-red-400",
                trend === "neutral" && "text-muted-foreground"
              )}
            >
              {trend === "up" && "↑"}
              {trend === "down" && "↓"}
              {trend === "neutral" && "→"}
              {delta}
            </span>
          )}
        </div>
      </Surface>
    );
  }
);
Stat.displayName = "Stat";
