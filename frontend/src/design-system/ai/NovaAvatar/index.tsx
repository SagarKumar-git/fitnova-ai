import * as React from "react";
import { cn } from "../../../utils/cn";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";

const novaAvatarVariants = cva(
  "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground",
  {
    variants: {
      size: {
        sm: "h-8 w-8",
        md: "h-12 w-12",
        lg: "h-16 w-16",
        xl: "h-24 w-24",
      },
      state: {
        idle: "",
        thinking: "animate-pulse",
        listening: "ring-2 ring-primary ring-offset-2 ring-offset-background",
        speaking: "", // Would use complex svg animation in full version
        error: "bg-destructive text-destructive-foreground",
      }
    },
    defaultVariants: {
      size: "md",
      state: "idle",
    },
  }
);

export interface NovaAvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof novaAvatarVariants> {}

export const NovaAvatar = React.forwardRef<HTMLDivElement, NovaAvatarProps>(
  ({ className, size, state, ...props }, ref) => {
    return (
      <div className={cn(novaAvatarVariants({ size, state }), className)} ref={ref} {...props}>
        <motion.div
          animate={state === "listening" ? { scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="font-display font-bold"
        >
          N
        </motion.div>
      </div>
    );
  }
);
NovaAvatar.displayName = "NovaAvatar";
