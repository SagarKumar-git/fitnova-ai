import * as React from "react";
import { cn } from "../../../utils/cn";
import { cva, type VariantProps } from "class-variance-authority";

const textVariants = cva("text-foreground", {
  variants: {
    variant: {
      displayXL: "text-7xl font-display font-bold tracking-tighter",
      displayL: "text-6xl font-display font-bold tracking-tighter",
      displayM: "text-5xl font-display font-bold tracking-tight",
      headingXL: "text-4xl font-display font-semibold tracking-tight",
      headingL: "text-3xl font-display font-semibold tracking-tight",
      headingM: "text-2xl font-display font-semibold",
      headingS: "text-xl font-display font-semibold",
      title: "text-lg font-sans font-semibold",
      subtitle: "text-base font-sans font-medium text-muted-foreground",
      bodyLarge: "text-lg font-sans",
      body: "text-base font-sans",
      bodySmall: "text-sm font-sans",
      caption: "text-xs font-sans font-medium text-muted-foreground",
      label: "text-sm font-sans font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      code: "font-mono text-sm font-semibold rounded-md bg-muted px-1 py-0.5",
    },
    align: {
      left: "text-left",
      center: "text-center",
      right: "text-right",
    },
  },
  defaultVariants: {
    variant: "body",
    align: "left",
  },
});

export interface TextProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof textVariants> {
  as?: React.ElementType;
}

export const Text = React.forwardRef<HTMLElement, TextProps>(
  ({ className, variant, align, as, ...props }, ref) => {
    const Comp = as || "span";
    return (
      <Comp
        ref={ref as any}
        className={cn(textVariants({ variant, align, className }))}
        {...props}
      />
    );
  }
);
Text.displayName = "Text";
