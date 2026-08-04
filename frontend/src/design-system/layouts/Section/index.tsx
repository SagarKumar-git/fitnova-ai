import * as React from "react";
import { cn } from "../../../utils/cn";
import { cva, type VariantProps } from "class-variance-authority";

const sectionVariants = cva("w-full flex flex-col", {
  variants: {
    variant: {
      default: "gap-6 py-6",
      compact: "gap-4 py-4",
      dense: "gap-2 py-2",
      hero: "gap-8 py-12 md:py-24 items-center text-center",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface SectionProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof sectionVariants> {}

export const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <section
        ref={ref}
        className={cn(sectionVariants({ variant, className }))}
        {...props}
      />
    );
  }
);
Section.displayName = "Section";
