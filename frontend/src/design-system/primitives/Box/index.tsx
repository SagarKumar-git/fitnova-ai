import * as React from "react";
import { cn } from "../../../utils/cn";
import { cva, type VariantProps } from "class-variance-authority";

const boxVariants = cva("", {
  variants: {
    display: {
      block: "block",
      inlineBlock: "inline-block",
      inline: "inline",
    },
  },
  defaultVariants: {
    display: "block",
  },
});

export interface BoxProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof boxVariants> {
  asChild?: boolean;
}

export const Box = React.forwardRef<HTMLDivElement, BoxProps>(
  ({ className, display, asChild = false, ...props }, ref) => {
    const Comp = asChild ? (props.children as any).type : "div";
    return (
      <Comp
        ref={ref}
        className={cn(boxVariants({ display, className }))}
        {...props}
      />
    );
  }
);
Box.displayName = "Box";
