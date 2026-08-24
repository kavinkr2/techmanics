import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
const Button = forwardRef(({ className, variant = "primary", size = "md", icon, ...props }, ref) => {
    const base = "btn";
    const variants = {
        primary: "btn-primary",
        secondary: "btn-secondary",
        ghost: "btn-ghost",
        danger: "btn-danger",
    };
    const sizes = {
        sm: "btn-sm",
        md: "",
        lg: "btn-lg",
    };
    return (_jsxs("button", { ref: ref, className: cn(base, variants[variant], sizes[size], className), ...props, children: [icon && _jsx("span", { className: "shrink-0", children: icon }), props.children] }));
});
Button.displayName = "Button";
export default Button;
