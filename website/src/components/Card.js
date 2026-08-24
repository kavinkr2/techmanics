import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
const Card = forwardRef(({ className, ...props }, ref) => (_jsx("div", { ref: ref, className: cn("card p-5", className), ...props })));
Card.displayName = "Card";
export default Card;
