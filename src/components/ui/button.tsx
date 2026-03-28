"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-brand-500 text-white hover:bg-brand-600 shadow-sm",
  secondary:
    "bg-muted text-foreground hover:bg-muted/80 border border-transparent dark:border-border",
  outline:
    "border border-border bg-card text-foreground hover:bg-muted dark:hover:bg-muted/80",
  ghost: "text-foreground hover:bg-muted",
  destructive: "bg-red-500 text-white hover:bg-red-600",
  link: "text-brand-600 underline-offset-4 hover:underline p-0 h-auto dark:text-brand-400",
};

const sizes = {
  sm: "h-8 px-3 text-xs rounded-md",
  md: "h-9 px-4 text-sm rounded-lg",
  lg: "h-11 px-6 text-base rounded-lg",
  icon: "h-9 w-9 rounded-lg",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...props}
    />
  )
);
Button.displayName = "Button";
