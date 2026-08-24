import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
const Label = forwardRef(({ className, ...props }, ref) => (_jsx("label", { ref: ref, className: cn("label", className), ...props })));
Label.displayName = "Label";
export default Label;
