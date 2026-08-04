import * as React from "react";
import { cn } from "../../../utils/cn";
import { cva, type VariantProps } from "class-variance-authority";

const avatarVariants = cva(
  "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
  {
    variants: {
      size: {
        sm: "h-8 w-8",
        md: "h-10 w-10",
        lg: "h-12 w-12",
        xl: "h-16 w-16",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  src?: string;
  fallback?: string;
  status?: "online" | "offline" | "busy";
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size, src, fallback, status, ...props }, ref) => {
    return (
      <div className="relative inline-block" ref={ref}>
        <div className={cn(avatarVariants({ size }), className)} {...props}>
          {src ? (
            <img src={src} className="aspect-square h-full w-full object-cover" alt="Avatar" />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground font-medium uppercase">
              {fallback || "?"}
            </div>
          )}
        </div>
        {status && (
          <span
            className={cn(
              "absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-background",
              status === "online" && "bg-green-500",
              status === "offline" && "bg-gray-500",
              status === "busy" && "bg-red-500"
            )}
          />
        )}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";
