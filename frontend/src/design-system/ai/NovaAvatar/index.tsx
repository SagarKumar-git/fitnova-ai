import * as React from "react";
import { cn } from "../../../utils/cn";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, useReducedMotion } from "framer-motion";

const novaAvatarVariants = cva(
  "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground font-display font-bold transition-all duration-300",
  {
    variants: {
      size: {
        sm: "h-8 w-8 text-xs",
        md: "h-12 w-12 text-sm",
        lg: "h-16 w-16 text-lg",
        xl: "h-24 w-24 text-2xl",
      },
      state: {
        idle: "bg-primary text-primary-foreground ring-1 ring-primary/40 shadow-[0_0_12px_rgba(204,255,0,0.15)]",
        coaching: "bg-neonLime text-black ring-2 ring-neonLime/70 shadow-[0_0_18px_rgba(204,255,0,0.45)]",
        thinking: "bg-purple-600 text-white ring-2 ring-purple-400/80 animate-pulse shadow-[0_0_18px_rgba(168,85,247,0.45)]",
        celebrating: "bg-amber-400 text-black ring-2 ring-amber-300 shadow-[0_0_22px_rgba(245,158,11,0.55)]",
        warning: "bg-rose-600 text-white ring-2 ring-rose-400 shadow-[0_0_18px_rgba(244,63,94,0.45)]",
        recovery: "bg-teal-500 text-black ring-2 ring-teal-300/80 shadow-[0_0_18px_rgba(20,184,166,0.4)]",
        listening: "bg-sky-500 text-white ring-4 ring-sky-300/80 shadow-[0_0_18px_rgba(14,165,233,0.45)]",
        speaking: "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background",
        error: "bg-destructive text-destructive-foreground ring-2 ring-destructive",
        intervention: "bg-red-600 text-white ring-2 ring-red-400 shadow-[0_0_20px_rgba(220,38,38,0.6)] animate-pulse",
        observing: "bg-zinc-800 text-zinc-300 ring-1 ring-zinc-700 shadow-none",
      },
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

export const NovaAvatar = React.memo(
  React.forwardRef<HTMLDivElement, NovaAvatarProps>(
    ({ className, size, state = "idle", ...props }, ref) => {
      const shouldReduceMotion = useReducedMotion();
      const [isVisible, setIsVisible] = React.useState<boolean>(() =>
        typeof document !== "undefined" ? !document.hidden : true
      );

      React.useEffect(() => {
        if (typeof document === "undefined") return;
        const handleVisibilityChange = () => {
          setIsVisible(!document.hidden);
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
          document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
      }, []);

      const shouldAnimate = !shouldReduceMotion && isVisible;

      const animationVariants = React.useMemo(() => {
        if (!shouldAnimate) return {};
        switch (state) {
          case "listening":
            return { scale: [1, 1.15, 1] };
          case "celebrating":
            return { scale: [1, 1.12, 1], rotate: [0, -6, 6, 0] };
          case "recovery":
            return { scale: [1, 0.94, 1] };
          case "intervention":
            return { scale: [1, 1.05, 1] };
          default:
            return {};
        }
      }, [shouldAnimate, state]);

      return (
        <div className={cn(novaAvatarVariants({ size, state }), className)} ref={ref} {...props}>
          <motion.div
            animate={animationVariants}
            transition={{
              repeat: shouldAnimate && Object.keys(animationVariants).length > 0 ? Infinity : 0,
              duration: state === "celebrating" ? 1.0 : 1.8,
              ease: "easeInOut",
            }}
            style={{ willChange: shouldAnimate ? "transform" : "auto", transform: "translateZ(0)" }}
            className="font-black select-none"
          >
            N
          </motion.div>
        </div>
      );
    }
  )
);
NovaAvatar.displayName = "NovaAvatar";
