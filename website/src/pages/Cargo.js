import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BarChart3, Package, Ship } from "lucide-react";
import DataTable from "@/components/DataTable";
import GlassCard from "@/components/GlassCard";
import StatCard from "@/components/StatCard";
import { fmt } from "@/lib/utils";
import portData from "@/assets/port_data.json";
const cargoColumns = [
    {
        accessorKey: "cargo_id",
        header: "Cargo ID",
        cell: (info) => (_jsx("span", { className: "font-mono text-xs text-accent", children: info.getValue() })),
    },
    { accessorKey: "commodity", header: "Commodity" },
    {
        accessorKey: "demand_tonnes",
        header: "Demand (t)",
        cell: (info) => fmt(info.getValue()),
    },
    {
        accessorKey: "min_parcel_size",
        header: "Min Parcel (t)",
        cell: (info) => fmt(info.getValue()),
    },
    { accessorKey: "max_tranches", header: "Tranches" },
];
const portColumns = [
    {
        accessorKey: "port_id",
        header: "Port ID",
        cell: (info) => (_jsx("span", { className: "font-mono text-xs text-accent", children: info.getValue() })),
    },
    { accessorKey: "name", header: "Name" },
    {
        accessorKey: "draft_limit",
        header: "Draft Limit (m)",
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
export default function CargoPage() {
    const cargo = (portData.cargo ?? []);
    const totalDemand = cargo.reduce((a, c) => a + c.demand_tonnes, 0);
    const byCommodity = (() => {
        const m = new Map();
        cargo.forEach((c) => m.set(c.commodity, (m.get(c.commodity) ?? 0) + 1));
        return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
    })();
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-semibold text-text-primary", children: "Cargo" }), _jsxs("p", { className: "text-sm text-text-secondary/60", children: [cargo.length.toLocaleString(), " cargo records in the database."] })] }), _jsxs("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-3", children: [_jsx(StatCard, { title: "Total Demand", value: fmt(totalDemand, { suffix: " t" }), icon: _jsx(Package, { className: "h-5 w-5" }) }), _jsx(StatCard, { title: "Top Commodity", value: byCommodity[0]?.[0] ?? "—", subtitle: byCommodity[0]?.[1] ? `${byCommodity[0][1]} records` : undefined, icon: _jsx(BarChart3, { className: "h-5 w-5" }) }), _jsx(StatCard, { title: "Commodity Types", value: byCommodity.length, icon: _jsx(Ship, { className: "h-5 w-5" }) })] }), _jsx(GlassCard, { className: "p-6", children: _jsx(DataTable, { columns: cargoColumns, data: cargo, className: "border-0 bg-transparent" }) })] }));
}
