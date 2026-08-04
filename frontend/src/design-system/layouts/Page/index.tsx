import * as React from "react";
import { cn } from "../../../utils/cn";
import { PageTransition } from "../PageTransition";

export interface PageProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  withTransition?: boolean;
}

export const Page = React.forwardRef<HTMLElement, PageProps>(
  ({ className, children, title, description, withTransition = true, ...props }, ref) => {
    const Comp = withTransition ? PageTransition : "main";
    
    // In a real app, title/description would inject into Next.js Head or React Helmet
    React.useEffect(() => {
      if (title) document.title = `${title} | FitNova AI`;
    }, [title]);

    return (
      <Comp
        ref={ref as any}
        className={cn("flex flex-col flex-1 w-full max-w-screen-2xl mx-auto px-4 md:px-8 py-6 safe-area-y", className)}
        {...(props as any)}
      >
        {children}
      </Comp>
    );
  }
);
Page.displayName = "Page";
