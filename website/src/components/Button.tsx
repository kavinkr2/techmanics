import { ForwardRefExoticComponent, ReactNode, forwardRef } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", icon, ...props }, ref) => {
    const base = "btn";
    const variants: Record<ButtonVariant, string> = {
      primary: "btn-primary",
      secondary: "btn-secondary",
      ghost: "btn-ghost",
      danger: "btn-danger",
    };
    const sizes: Record<ButtonSize, string> = {
      sm: "btn-sm",
      md: "",
      lg: "btn-lg",
    };
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        {props.children}
      </button>
    );
  }
);
Button.displayName = "Button";
export default Button;