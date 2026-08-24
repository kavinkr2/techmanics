import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
const variantClass = {
    default: "badge-default",
    success: "badge-success",
    warning: "badge-warning",
    danger: "badge-danger",
    info: "badge-info",
    outline: "badge-outline",
};
export default forwardRef(({ className, variant = "default", ...props }, ref) => (_jsx("span", { ref: ref, className: cn(variantClass[variant], className), ...props })));
