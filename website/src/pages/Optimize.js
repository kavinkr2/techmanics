import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Package, Ship, TrendingUp, BarChart3 } from "lucide-react";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import Input from "@/components/Input";
import Label from "@/components/Label";
import Select from "@/components/Select";
import StatCard from "@/components/StatCard";
import { api } from "@/lib/api";
import { fmt } from "@/lib/utils";
export default function OptimizePage() {
    const [cargo, setCargo] = useState(80000);
    const [shock, setShock] = useState(false);
    const [originRegion, setOriginRegion] = useState("Australia");
    const [destinationPort, setDestinationPort] = useState("Paradip");
    const [commodity, setCommodity] = useState("Iron Ore");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await api.optimize({
                cargo_tons: cargo,
                shock_scenario: shock,
                origin_region: originRegion,
                destination_port: destinationPort,
                commodity: commodity,
            });
            setResult(res);
        }
        catch (err) {
            setError(err?.message ?? "Optimization failed");
        }
        finally {
            setLoading(false);
        }
    };
    const originRegions = ["Australia", "Brazil", "South Africa", "Colombia", "USA", "Indonesia"];
    const destinationPorts = ["Paradip", "Visakhapatnam", "Mundra", "Krishnapatnam", "Kamarajar", "Chennai", "Kolkata", "Mumbai"];
    const commodities = ["Iron Ore", "Coal", "Bauxite", "Manganese Ore", "Limestone", "Fertilizer"];
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-semibold text-text-primary", children: "Vessel Optimizer" }), _jsx("p", { className: "text-sm text-text-secondary/60", children: "Enter cargo volume & shock scenario to find the optimal port + vessel combination." })] }), _jsx(GlassCard, { className: "p-6", children: _jsxs("form", { onSubmit: handleSubmit, className: "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3", children: [_jsxs("div", { className: "sm:col-span-2 lg:col-span-3", children: [_jsx(Label, { htmlFor: "cargo", children: "Cargo Volume (tonnes)" }), _jsx(Input, { id: "cargo", type: "number", min: 1000, max: 500000, step: 1000, value: cargo, onChange: (e) => setCargo(Number(e.target.value)), required: true })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "originRegion", children: "Origin Region" }), _jsx(Select, { id: "originRegion", value: originRegion, onChange: (e) => setOriginRegion(e.target.value), children: originRegions.map((r) => _jsx("option", { value: r, children: r }, r)) })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "destinationPort", children: "Destination Port" }), _jsx(Select, { id: "destinationPort", value: destinationPort, onChange: (e) => setDestinationPort(e.target.value), children: destinationPorts.map((p) => _jsx("option", { value: p, children: p }, p)) })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "commodity", children: "Commodity" }), _jsx(Select, { id: "commodity", value: commodity, onChange: (e) => setCommodity(e.target.value), children: commodities.map((c) => _jsx("option", { value: c, children: c }, c)) })] }), _jsxs("div", { className: "lg:col-span-3 flex items-center gap-3 rounded-xl border border-border bg-surface-2/40 px-4 py-2.5", children: [_jsx("input", { id: "shock", type: "checkbox", checked: shock, onChange: (e) => setShock(e.target.checked), className: "h-4 w-4 rounded border-border accent-accent focus:ring-accent/50" }), _jsx(Label, { htmlFor: "shock", className: "mb-0 text-sm font-medium cursor-pointer", children: "Shock scenario" })] }), _jsxs("div", { className: "lg:col-span-3 flex justify-end gap-3 border-t border-border/30 pt-4", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: () => {
                                        setCargo(80000);
                                        setShock(false);
                                        setResult(null);
                                        setError(null);
                                    }, children: "Reset" }), _jsx(Button, { type: "submit", variant: "primary", disabled: loading || cargo < 1, icon: loading ? _jsx("span", { className: "animate-spin", children: "\u22EF" }) : _jsx(TrendingUp, { className: "h-4 w-4" }), children: loading ? "Optimizing…" : "Run Optimizer" })] })] }) }), error && (_jsx("div", { className: "rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-400", children: error })), result?.status === "success" && result.data && (_jsx(ResultPanel, { data: result.data }))] }));
}
function ResultPanel({ data }) {
    const steps = [
        { label: "Optimal Port", value: data.optimal_port, icon: _jsx(Ship, { className: "h-4 w-4" }) },
        { label: "Optimal Vessel", value: data.optimal_vessel, icon: _jsx(Package, { className: "h-4 w-4" }) },
        { label: "Total Cost", value: fmt(data.total_cost, { prefix: "$", suffix: " k" }), icon: _jsx(BarChart3, { className: "h-4 w-4" }) },
    ];
    return (_jsxs(GlassCard, { className: "p-6", children: [_jsx("h3", { className: "text-sm font-medium text-text-secondary/70 uppercase tracking-wider", children: "Optimization Result" }), _jsx("div", { className: "mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3", children: steps.map((s) => (_jsx(StatCard, { title: s.label, value: s.value, icon: s.icon, trend: "up" }, s.label))) })] }));
}
