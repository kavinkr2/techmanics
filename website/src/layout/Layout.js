import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink, Outlet } from "react-router-dom";
import { BarChart2, LayoutDashboard, LineChart, MessageCircle, Package, Settings, Ship, TrendingUp, ShoppingCart, } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNav } from "@/components/NavContext";
const nav = [
    { label: "Dashboard", to: "/", icon: LayoutDashboard },
    { label: "Forecast", to: "/forecast", icon: LineChart },
    { label: "Optimizer", to: "/optimize", icon: TrendingUp },
    { label: "Copilot", to: "/copilot", icon: MessageCircle },
    { label: "Coal Buyer", to: "/coal-buyer", icon: ShoppingCart },
    { label: "Cargo", to: "/cargo", icon: Package },
    { label: "Ports", to: "/ports", icon: Ship },
    { label: "Analytics", to: "/analytics", icon: BarChart2 },
    { label: "Settings", to: "/settings", icon: Settings },
];
export default function Layout() {
    const { expanded, setExpanded } = useNav();
    return (_jsxs("div", { className: "relative isolate flex h-screen w-full overflow-hidden bg-background", children: [_jsxs("nav", { onMouseEnter: () => setExpanded(true), onMouseLeave: () => !expanded && setExpanded(false), className: cn("sidebar transition-all duration-300", expanded ? "w-64" : "w-18"), children: [_jsxs("div", { className: "flex h-16 items-center justify-between px-4", children: [expanded && (_jsx("span", { className: "text-lg font-semibold tracking-tight text-text-primary", children: "TechManics" })), _jsxs("button", { onClick: () => setExpanded(!expanded), className: "rounded-lg p-1.5 text-text-secondary hover:bg-surface-muted hover:text-text-primary", children: [_jsx("span", { className: "sr-only", children: "Toggle navigation" }), _jsx("svg", { className: "h-4 w-4", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", children: _jsx("path", { d: expanded ? "M6 18L18 12L6 6" : "M6 18L18 12L6 6", strokeLinecap: "round", strokeLinejoin: "round" }) })] })] }), _jsx("div", { className: "flex-1 overflow-y-auto py-2", children: nav.map((item) => (_jsxs(NavLink, { to: item.to, title: item.label, className: cn("mx-2 my-0.5 flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-all duration-200", "text-text-secondary hover:bg-surface-muted hover:text-text-primary", "data-[active=true]:bg-accent-light data-[active=true]:text-accent data-[active=true]:font-semibold"), children: [_jsx(item.icon, { className: "h-5 w-5 shrink-0" }), expanded && _jsx("span", { children: item.label })] }, item.to))) })] }), _jsxs("div", { className: "flex-1 overflow-y-auto", children: [_jsx("header", { className: "header", children: _jsx("h1", { className: "text-xl font-semibold text-text-primary", children: "Maritime Logistics Dashboard" }) }), _jsx("main", { className: "p-6", children: _jsx("div", { className: "mx-auto max-w-7xl space-y-6", children: _jsx(Outlet, {}) }) })] })] }));
}
