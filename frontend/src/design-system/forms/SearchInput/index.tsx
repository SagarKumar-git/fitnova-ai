import * as React from "react";
import { cn } from "../../../utils/cn";

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
SearchInput.displayName = "SearchInput";
