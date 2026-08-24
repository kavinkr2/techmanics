import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Loader2, ArrowRight, ChevronDown, ChevronUp, Globe, Clock, CheckCircle } from "lucide-react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Label from "@/components/Label";
import Select from "@/components/Select";
import Badge from "@/components/Badge";
import { api } from "@/lib/api";
import { fmt } from "@/lib/utils";
export default function CoalBuyerPage() {
    const [quantity, setQuantity] = useState(80000);
    const [destination, setDestination] = useState("Paradip");
    const [shock, setShock] = useState(false);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);
    const [bestOption, setBestOption] = useState(null);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState({});
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await api.realtime.coalBuy({ quantity_tonnes: quantity, destination_port: destination, shock_scenario: shock });
            setResults(res.data.options);
            setBestOption(res.data.best_option);
        }
        catch (err) {
            setError(err?.message ?? "Failed to find coal options");
        }
        finally {
            setLoading(false);
        }
    };
    const ports = ["Paradip", "Visakhapatnam", "Mundra", "Krishnapatnam", "Kamarajar", "Chennai", "Kolkata", "Mumbai"];
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-semibold text-text-primary", children: "Coal Procurement" }), _jsx("p", { className: "text-sm text-text-secondary/60", children: "Enter quantity to find the least costly coal options from global origins." })] }), _jsx(Card, { className: "p-5", children: _jsxs("form", { onSubmit: handleSubmit, className: "grid grid-cols-1 gap-5 sm:grid-cols-3", children: [_jsxs("div", { className: "sm:col-span-2", children: [_jsx(Label, { htmlFor: "quantity", children: "Quantity (tonnes)" }), _jsx(Input, { id: "quantity", type: "number", min: 1000, max: 500000, step: 1000, value: quantity, onChange: (e) => setQuantity(Number(e.target.value)), required: true })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "destination", children: "Destination Port" }), _jsx(Select, { id: "destination", value: destination, onChange: (e) => setDestination(e.target.value), children: ports.map((p) => _jsx("option", { value: p, children: p }, p)) })] }), _jsx("div", { className: "sm:col-span-2 flex items-end gap-3", children: _jsxs("div", { className: "flex items-center gap-3 rounded-[10px] border border-border bg-surface-muted px-4 py-2.5", children: [_jsx("input", { id: "shock", type: "checkbox", checked: shock, onChange: (e) => setShock(e.target.checked), className: "h-4 w-4 rounded border-border accent-accent focus:ring-accent/30" }), _jsx(Label, { htmlFor: "shock", className: "mb-0 text-sm font-medium cursor-pointer", children: "Shock scenario (higher fuel, delays)" })] }) }), _jsxs("div", { className: "sm:col-span-3 flex justify-end gap-3 border-t border-border/50 pt-4", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: () => { setQuantity(80000); setDestination("Paradip"); setShock(false); setResults([]); setBestOption(null); setError(null); }, children: "Reset" }), _jsx(Button, { type: "submit", variant: "primary", disabled: loading || quantity < 1, icon: loading ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(ArrowRight, { className: "h-4 w-4" }), children: loading ? "Finding Options…" : "Find Best Options" })] })] }) }), error && (_jsx("div", { className: "rounded-[10px] border border-warning/30 bg-warning/5 p-4 text-sm text-warning", children: error })), bestOption && (_jsxs(Card, { className: "p-5 border-success/30 bg-success/5", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-lg font-medium text-text-primary", children: "Best Option" }), _jsxs(Badge, { variant: "success", children: [_jsx(CheckCircle, { className: "h-3.5 w-3.5" }), "Lowest Total Cost"] })] }), _jsx(OptionCard, { option: bestOption, highlight: true, destination: destination })] })), results.length > 0 && (_jsxs("div", { className: "space-y-4", children: [_jsxs("h3", { className: "text-lg font-medium text-text-primary", children: ["All Options (", results.length, " sources)"] }), results.map((opt, i) => (_jsx(OptionCard, { option: opt, index: i, destination: destination, expanded: expanded[i] || false, onToggle: () => setExpanded({ ...expanded, [i]: !expanded[i] }) }, `${opt.origin_country}-${opt.origin_port}`)))] })), results.length === 0 && !loading && (_jsxs(Card, { className: "p-8 text-center", children: [_jsx(Globe, { className: "h-12 w-12 mx-auto text-text-muted/50" }), _jsx("p", { className: "mt-3 text-text-secondary", children: "Enter quantity and click \"Find Best Options\" to see coal procurement options." })] }))] }));
}
function OptionCard({ option, index, highlight, destination, expanded, onToggle }) {
    const riskColor = option.draft_limit_m < 12 ? "text-warning" : "text-success";
    const dest = destination ?? "Paradip";
    return (_jsxs(Card, { className: highlight ? "border-success/30 bg-success/5" : "", children: [_jsxs("div", { className: "flex items-start justify-between gap-4 p-4", onClick: onToggle, style: { cursor: onToggle ? "pointer" : "default" }, children: [_jsxs("div", { className: "flex items-center gap-3 flex-1 min-w-0", children: [_jsx("div", { className: "w-12 h-12 rounded-[10px] bg-accent-light flex items-center justify-center shrink-0", children: _jsx(Globe, { className: "h-6 w-6 text-accent" }) }), _jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h4", { className: "font-medium text-text-primary truncate", children: option.origin_country }), _jsx(Badge, { variant: "info", className: "text-xs", children: option.coal_grade })] }), _jsxs("p", { className: "text-sm text-text-secondary truncate", children: [option.origin_port, " \u2192 ", dest] })] })] }), _jsxs("div", { className: "flex flex-col items-end gap-1 shrink-0", children: [_jsxs("div", { className: "text-2xl font-bold text-text-primary", children: ["$", option.total_cost_usd_per_tonne, "/t"] }), _jsxs("div", { className: "text-sm text-text-secondary", children: ["Total: $", fmt(option.total_cost_usd)] }), _jsxs("div", { className: "flex items-center gap-1 text-xs text-text-secondary", children: [_jsx(Clock, { className: "h-3.5 w-3.5" }), _jsxs("span", { children: [option.estimated_days, " days transit"] })] })] }), onToggle && (_jsx("div", { className: "flex shrink-0", children: expanded ? _jsx(ChevronUp, { className: "h-5 w-5 text-text-secondary" }) : _jsx(ChevronDown, { className: "h-5 w-5 text-text-secondary" }) }))] }), expanded && (_jsxs("div", { className: "border-t border-border/50 p-4 bg-surface-muted/50 grid grid-cols-2 gap-4 sm:grid-cols-4", children: [_jsx(DetailRow, { label: "FOB", value: `${option.fob_usd_per_tonne} $/t`, total: `Total: $${fmt(option.fob_total_usd)}` }), _jsx(DetailRow, { label: "Freight", value: `${option.freight_usd_per_tonne} $/t`, total: `Total: $${fmt(option.freight_total_usd)}` }), _jsx(DetailRow, { label: "Load Port", value: `${option.load_port_cost_usd_per_tonne} $/t` }), _jsx(DetailRow, { label: "Discharge Port", value: `${option.discharge_port_cost_usd_per_tonne} $/t` }), _jsx(DetailRow, { label: "Vessel", value: option.optimal_vessel, total: `Class: ${option.vessel_class}` }), _jsx(DetailRow, { label: "Draft Limit", value: `${option.draft_limit_m} m`, total: _jsxs("span", { className: riskColor, children: ["Draft: ", option.draft_limit_m, "m"] }) }), _jsx(DetailRow, { label: "Transit Time", value: `${option.estimated_days} days` }), _jsx(DetailRow, { label: "Grade", value: option.coal_grade })] }))] }));
}
function DetailRow({ label, value, total }) {
    return (_jsxs("div", { className: "space-y-0.5", children: [_jsx("p", { className: "text-xs uppercase tracking-wider text-text-secondary", children: label }), _jsx("p", { className: "font-medium text-text-primary", children: value }), total && _jsx("p", { className: "text-xs text-text-secondary", children: typeof total === "string" ? total : total })] }));
}
