import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Clock, MapPin, TrendingUp, Ship } from "lucide-react";
import GlassCard from "@/components/GlassCard";
const idleVessels = [
    {
        name: "MV Ocean Pioneer",
        idleDays: 4,
        location: "Port of Mundra",
        costPerDay: 18400,
        aiSuggestion: "Backhaul coal from Paradip to Chittagong — $3.20/MT rate active",
        aiMatch: "Iron Ore / Coal",
    },
    {
        name: "MV Pacific Drift",
        idleDays: 7,
        location: "Visakhapatnam Anchorage",
        costPerDay: 22100,
        aiSuggestion: "Reposition to Chennai for coke load — 2-day transit",
        aiMatch: "Coke / Limestone",
    },
    {
        name: "MV Atlantic Tide",
        idleDays: 2,
        location: "Port of Paradip",
        costPerDay: 16800,
        aiSuggestion: "Backhaul limestone to Kamarajar — immediate cargo available",
        aiMatch: "Coal / Coke",
    },
    {
        name: "MV Indian Star",
        idleDays: 9,
        location: "Mundra Outer Anchorage",
        costPerDay: 25400,
        aiSuggestion: "Reposition to Mumbai for coal cargo — shock scenario favorable",
        aiMatch: "Coal / Iron Ore",
    },
];
export default function IdleVesselPage() {
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-semibold text-text-primary", children: "Idle Vessel Management" }), _jsx("p", { className: "text-sm text-text-secondary/60", children: "Monitor idle vessels, holding costs, and AI-recommended backhaul/repositioning matches." })] }), _jsxs("div", { className: "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4", children: [_jsxs(GlassCard, { className: "p-5", children: [_jsx("p", { className: "text-xs uppercase tracking-wider text-text-secondary/60", children: "Idle Vessels" }), _jsx("p", { className: "text-2xl font-semibold text-text-primary", children: idleVessels.length })] }), _jsxs(GlassCard, { className: "p-5", children: [_jsx("p", { className: "text-xs uppercase tracking-wider text-text-secondary/60", children: "Total Idle Days" }), _jsx("p", { className: "text-2xl font-semibold text-text-primary", children: idleVessels.reduce((a, b) => a + b.idleDays, 0) })] }), _jsxs(GlassCard, { className: "p-5", children: [_jsx("p", { className: "text-xs uppercase tracking-wider text-text-secondary/60", children: "Avg Daily Cost" }), _jsxs("p", { className: "text-2xl font-semibold text-text-primary", children: ["$", (idleVessels.reduce((a, b) => a + b.costPerDay, 0) / idleVessels.length / 1000).toFixed(1), "k"] })] }), _jsxs(GlassCard, { className: "p-5", children: [_jsx("p", { className: "text-xs uppercase tracking-wider text-text-secondary/60", children: "AI Matches" }), _jsx("p", { className: "text-2xl font-semibold text-text-primary", children: idleVessels.length })] })] }), _jsx("div", { className: "space-y-4", children: idleVessels.map((v) => (_jsxs(GlassCard, { className: "p-6", children: [_jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "rounded-xl bg-accent/15 p-2 text-accent", children: _jsx(Ship, { className: "h-5 w-5" }) }), _jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-text-primary", children: v.name }), _jsxs("div", { className: "flex items-center gap-3 text-xs text-text-secondary/60 mt-1", children: [_jsxs("span", { className: "flex items-center gap-1", children: [_jsx(MapPin, { className: "h-3 w-3" }), v.location] }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx(Clock, { className: "h-3 w-3" }), v.idleDays, " days idle"] })] })] })] }), _jsx("div", { className: "text-right", children: _jsxs("p", { className: "text-sm font-semibold text-text-primary", children: ["$", v.costPerDay.toLocaleString(), "/day"] }) })] }), _jsxs("div", { className: "mt-4 rounded-xl border border-border/30 bg-surface-2/30 px-4 py-3", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx(TrendingUp, { className: "h-4 w-4 text-accent" }), _jsx("span", { className: "text-xs font-semibold uppercase tracking-wider text-accent", children: "AI Suggestion" })] }), _jsx("p", { className: "text-sm text-text-primary", children: v.aiSuggestion }), _jsxs("p", { className: "text-xs text-text-secondary/50 mt-1", children: ["Match: ", v.aiMatch] })] })] }, v.name))) })] }));
}
