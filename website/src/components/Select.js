import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
const Select = forwardRef(({ className, ...props }, ref) => (_jsx("select", { ref: ref, className: cn("select", className), ...props })));
Select.displayName = "Select";
export default Select;
