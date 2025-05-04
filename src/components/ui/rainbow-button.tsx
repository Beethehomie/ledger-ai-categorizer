
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "@/components/ui/button";

export interface RainbowButtonProps extends ButtonProps {
  backgroundClassName?: string;
}

const RainbowButton = React.forwardRef<HTMLButtonElement, RainbowButtonProps>(
  ({ className, backgroundClassName, ...props }, ref) => {
    return (
      <div
        className={cn(
          "group relative p-0.5 overflow-hidden rounded-md",
          backgroundClassName || "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 group-active:opacity-90 transition duration-200" />
        <Button
          ref={ref}
          className={cn(
            "relative bg-background text-primary-foreground hover:bg-background group-active:bg-background/90",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

RainbowButton.displayName = "RainbowButton";

export { RainbowButton };
