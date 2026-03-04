"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// 简化版 Tooltip (无需 @radix-ui 依赖)
// 使用 CSS :hover + absolute positioning 实现

const TooltipProvider = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);

const Tooltip = ({ children }: { children: React.ReactNode }) => (
  <div className="relative inline-flex group">{children}</div>
);

const TooltipTrigger = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }
>(({ className, children, asChild, ...props }, ref) => (
  <div ref={ref} className={cn("cursor-pointer", className)} {...props}>
    {children}
  </div>
));
TooltipTrigger.displayName = "TooltipTrigger";

interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "top" | "bottom";
}

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, side = "bottom", children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "invisible group-hover:visible opacity-0 group-hover:opacity-100",
        "absolute z-50 rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
        "transition-opacity duration-150",
        "whitespace-nowrap",
        side === "top" ? "bottom-full mb-2 left-1/2 -translate-x-1/2" : "top-full mt-2 left-1/2 -translate-x-1/2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
