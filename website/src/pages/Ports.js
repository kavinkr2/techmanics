import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { Ship, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from "recharts";
import DataTable from "@/components/DataTable";
import GlassCard from "@/components/GlassCard";
import StatCard from "@/components/StatCard";
import Badge from "@/components/Badge";
import { fmt } from "@/lib/utils";
import portData from "@/assets/port_data.json";
const portColumns = [
    {
        accessorKey: "port_id",
        header: "Port ID",
        cell: (info) => (_jsx("span", { className: "font-mono text-xs text-accent", children: info.getValue() })),
    },
    { accessorKey: "name", header: "Name" },
    {
        accessorKey: "draft_limit",
        header: "Draft (m)",
        cell: (info) => fmt(info.getValue()),
    },
    {
        accessorKey: "loa_limit",
        header: "LOA (m)",
        cell: (info) => fmt(info.getValue()),
    },
    {
        accessorKey: "beam_limit",
        header: "Beam (m)",
        cell: (info) => fmt(info.getValue()),
    },
    { accessorKey: "berths", header: "Berths" },
    {
        accessorKey: "port_cost_per_tonne",
        header: "Cost/t",
        cell: (info) => fmt(info.getValue(), { prefix: "$" }),
    },
];
function CargoDemandChart() {
    const cargo = (portData.cargo ?? []);
    const byCommodity = useMemo(() => {
        const m = new Map();
        cargo.forEach((c) => m.set(c.commodity, (m.get(c.commodity) ?? 0) + c.demand_tonnes));
        return Array.from(m.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([commodity, demand]) => ({ commodity, demand }));
    }, [cargo]);
    const colors = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4"];
    return (_jsxs(GlassCard, { className: "p-5 mb-6", children: [_jsxs("h3", { className: "text-lg font-medium text-text-primary mb-4 flex items-center gap-2", children: [_jsx(BarChart3, { className: "h-5 w-5 text-accent" }), "Cargo Demand by Commodity"] }), _jsx("div", { className: "h-[240px]", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: byCommodity, margin: { top: 10, right: 24, left: 0, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "oklch(0.9 0.005 260)", vertical: false }), _jsx(XAxis, { dataKey: "commodity", tick: { fill: "oklch(0.45 0.01 260)", fontSize: 10 }, tickLine: false, axisLine: false }), _jsx(YAxis, { tick: { fill: "oklch(0.45 0.01 260)", fontSize: 11 }, tickLine: false, axisLine: false, tickFormatter: (v) => `${v / 1e6}M` }), _jsx(Tooltip, { contentStyle: { backgroundColor: "oklch(0.15 0.02 260 / 0.9)", border: "1px solid oklch(0.9 0.005 260)", borderRadius: "0.75rem", color: "oklch(0.98 0 0)" }, formatter: (value) => [fmt(value, { suffix: " t" }), "Demand"] }), _jsx(Bar, { dataKey: "demand", radius: [4, 4, 0, 0], children: byCommodity.map((_, i) => _jsx(Cell, { fill: colors[i % colors.length] }, `cell-${i}`)) })] }) }) })] }));
}
function PortUtilizationChart({ ports }) {
    const berthLoad = useMemo(() => {
        return ports
            .filter((p) => p.berths > 0)
            .map((p) => ({
            name: p.name,
            berths: p.berths,
            cost: p.port_cost_per_tonne,
        }))
            .sort((a, b) => b.cost - a.cost)
            .slice(0, 8);
    }, [ports]);
    if (!berthLoad.length) {
        return null;
    }
    return (_jsxs(GlassCard, { className: "p-5 mb-6", children: [_jsxs("h3", { className: "text-lg font-medium text-text-primary mb-4 flex items-center gap-2", children: [_jsx(PieChartIcon, { className: "h-5 w-5 text-accent" }), "Port Cost Overview"] }), _jsx("div", { className: "h-[200px]", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: berthLoad, margin: { top: 10, right: 24, left: 0, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "oklch(0.9 0.005 260)", vertical: false }), _jsx(XAxis, { dataKey: "name", tick: { fill: "oklch(0.45 0.01 260)", fontSize: 9 }, tickLine: false, axisLine: false }), _jsx(YAxis, { tick: { fill: "oklch(0.45 0.01 260)", fontSize: 11 }, tickLine: false, axisLine: false, tickFormatter: (v) => `$${v}` }), _jsx(Tooltip, { contentStyle: { backgroundColor: "oklch(0.15 0.02 260 / 0.9)", border: "1px solid oklch(0.9 0.005 260)", borderRadius: "0.75rem", color: "oklch(0.98 0 0)" }, formatter: (value) => [`$${value}/t`, "Cost"] }), _jsx(Bar, { dataKey: "cost", fill: "#3b82f6", radius: [4, 4, 0, 0] })] }) }) })] }));
}
export default function PortsPage() {
    const ports = (portData.ports ?? []);
    const cargo = (portData.cargo ?? []);
    const avgCost = ports.length
        ? ports.reduce((a, p) => a + p.port_cost_per_tonne, 0) / ports.length
        : 0;
    const totalBerths = ports.reduce((a, p) => a + (p.berths ?? 0), 0);
    const maxDraft = ports.length ? Math.max(...ports.map((p) => p.draft_limit ?? 0)) : 0;
    const maxLOA = ports.length ? Math.max(...ports.map((p) => p.loa_limit ?? 0)) : 0;
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-semibold text-text-primary", children: "Ports & Infrastructure" }), _jsxs("p", { className: "text-sm text-text-secondary/60 mt-0.5", children: [ports.length.toLocaleString(), " port records \u00B7 Indian East Coast coal import corridor"] })] }), _jsxs(Badge, { variant: "default", children: [cargo.length.toLocaleString(), " cargo records"] })] }), _jsxs("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-5", children: [_jsx(StatCard, { title: "Total Ports", value: ports.length, icon: _jsx(Ship, { className: "h-5 w-5" }) }), _jsx(StatCard, { title: "Avg Cost/t", value: fmt(avgCost, { prefix: "$" }) }), _jsx(StatCard, { title: "Total Berths", value: totalBerths }), _jsx(StatCard, { title: "Max Draft (m)", value: fmt(maxDraft) }), _jsx(StatCard, { title: "Max LOA (m)", value: fmt(maxLOA) })] }), _jsx(CargoDemandChart, {}), _jsx(PortUtilizationChart, { ports: ports }), _jsxs(GlassCard, { className: "p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-lg font-medium text-text-primary", children: "Port Database" }), _jsxs(Badge, { variant: "default", children: [ports.length, " entries"] })] }), _jsx(DataTable, { columns: portColumns, data: ports, className: "border-0 bg-transparent" })] })] }));
}
