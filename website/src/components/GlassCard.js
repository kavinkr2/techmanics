import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
const GlassCard = forwardRef(({ className, ...props }, ref) => (_jsx("div", { ref: ref, className: cn("card", className), ...props })));
GlassCard.displayName = "GlassCard";
export default GlassCard;
