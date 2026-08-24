import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
import Card from "./Card";
export default function StatCard({ title, value, subtitle, icon, trend = "neutral", className, }) {
    const trendColor = {
        up: "text-success",
        down: "text-danger",
        neutral: "text-text-secondary",
    }[trend];
    return (_jsxs(Card, { className: cn("stat-card", className), children: [icon && _jsx("div", { className: "shrink-0 text-accent", children: icon }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "text-xs uppercase tracking-wider text-text-secondary", children: title }), _jsx("div", { className: "text-2xl font-semibold text-text-primary mt-0.5 truncate", children: value }), subtitle && (_jsx("p", { className: cn("mt-0.5 text-xs", trendColor), children: subtitle }))] })] }));
}
