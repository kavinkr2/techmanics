import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
const Input = forwardRef(({ className, type, ...props }, ref) => (_jsx("input", { ref: ref, type: type, className: cn("input", className), ...props })));
Input.displayName = "Input";
export default Input;
