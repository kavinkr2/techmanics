import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Ship } from "lucide-react";
import DataTable from "@/components/DataTable";
import GlassCard from "@/components/GlassCard";
import StatCard from "@/components/StatCard";
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
export default function PortsPage() {
    const ports = (portData.ports ?? []);
    const avgCost = ports.length
        ? ports.reduce((a, p) => a + p.port_cost_per_tonne, 0) / ports.length
        : 0;
    const totalBerths = ports.reduce((a, p) => a + (p.berths ?? 0), 0);
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-semibold text-text-primary", children: "Ports" }), _jsxs("p", { className: "text-sm text-text-secondary/60", children: [ports.length.toLocaleString(), " port records in the database."] })] }), _jsxs("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-3", children: [_jsx(StatCard, { title: "Total Ports", value: ports.length, icon: _jsx(Ship, { className: "h-5 w-5" }) }), _jsx(StatCard, { title: "Avg Cost/t", value: fmt(avgCost, { prefix: "$" }) }), _jsx(StatCard, { title: "Total Berths", value: totalBerths })] }), _jsx(GlassCard, { className: "p-6", children: _jsx(DataTable, { columns: portColumns, data: ports, className: "border-0 bg-transparent" }) })] }));
}
