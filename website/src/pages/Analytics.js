import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, AlertTriangle, Shield, Zap, DollarSign, Ship, Settings, Download, RefreshCw, } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, } from "recharts";
import GlassCard from "@/components/GlassCard";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import { api } from "@/lib/api";
import { fmt } from "@/lib/utils";
const SCENARIOS = [
    { id: "base", label: "Base Case", shock: false, cargo: 80000, origin: "Australia", destination: "Paradip", commodity: "Iron Ore" },
    { id: "high", label: "High Volume", shock: false, cargo: 150000, origin: "Australia", destination: "Paradip", commodity: "Iron Ore" },
    { id: "shock", label: "Market Shock", shock: true, cargo: 80000, origin: "Australia", destination: "Paradip", commodity: "Iron Ore" },
    { id: "coal", label: "Coal Import", shock: false, cargo: 50000, origin: "Indonesia", destination: "Paradip", commodity: "Coal" },
    { id: "brazil", label: "Brazil Route", shock: false, cargo: 80000, origin: "Brazil", destination: "Paradip", commodity: "Iron Ore" },
];
function ScenarioCard({ scenario, result, selected, onClick }) {
    const riskLevel = result?.scenario_analysis?.length
        ? result.scenario_analysis.reduce((max, s) => Math.max(max, s.total_cost * s.probability), 0) / result.total_cost
        : 0;
    const riskLabel = riskLevel > 1.2 ? "High" : riskLevel > 1.0 ? "Medium" : "Low";
    const riskColor = riskLevel > 1.2 ? "text-rose-400" : riskLevel > 1.0 ? "text-amber-400" : "text-emerald-400";
    return (_jsxs(GlassCard, { className: `p-4 cursor-pointer transition-all ${selected ? "border-accent/50 bg-accent/5" : "hover:border-border/50"}`, onClick: onClick, children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: `w-10 h-10 rounded-lg flex items-center justify-center ${selected ? "bg-accent/20" : "bg-surface-2/40"}`, children: scenario.shock ? _jsx(Zap, { className: "h-5 w-5 text-amber-400" }) : _jsx(Ship, { className: "h-5 w-5 text-blue-400" }) }), _jsxs("div", { children: [_jsx("h4", { className: "font-medium text-text-primary", children: scenario.label }), _jsxs("p", { className: "text-xs text-text-secondary/60", children: [scenario.cargo.toLocaleString(), "t \u00B7 ", scenario.origin, " \u2192 ", scenario.destination] })] })] }), selected && _jsx("div", { className: "w-2 h-full bg-accent rounded-r-lg" })] }), result && (_jsxs("div", { className: "mt-4 pt-4 border-t border-border/30 space-y-2", children: [_jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-text-secondary", children: "Optimal" }), _jsxs("span", { className: "font-medium text-text-primary", children: [result.optimal_port, " \u00B7 ", result.optimal_vessel] })] }), _jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-text-secondary", children: "Expected Cost" }), _jsxs("span", { className: "font-bold text-text-primary", children: ["$", fmt(result.total_cost)] })] }), _jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-text-secondary", children: "Per Tonne" }), _jsxs("span", { className: "font-medium text-text-primary", children: ["$", fmt(result.expected_cost_per_tonne), "/t"] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-text-secondary", children: "Risk:" }), _jsx(Badge, { variant: "outline", className: `text-xs ${riskColor}`, children: riskLabel })] })] })), !result && (_jsx("div", { className: "mt-4 pt-4 border-t border-border/30 text-center text-text-secondary/60 text-sm", children: "Click to run optimization" }))] }));
}
function ScenarioComparisonChart({ results }) {
    const chartData = useMemo(() => {
        const data = [];
        results.forEach((result, key) => {
            if (!result)
                return;
            data.push({
                scenario: key,
                charter: result.total_cost * 0.4,
                fuel: result.total_cost * 0.25,
                port: result.total_cost * 0.2,
                risk: result.total_cost * 0.15,
                total: result.total_cost,
            });
        });
        return data;
    }, [results]);
    if (chartData.length === 0) {
        return (_jsx(GlassCard, { className: "p-8 h-full", children: _jsx("div", { className: "text-center text-text-secondary", children: "Run scenarios to compare costs" }) }));
    }
    return (_jsxs(GlassCard, { className: "p-6 h-full", children: [_jsx("h3", { className: "text-lg font-medium text-text-primary mb-4", children: "Cost Breakdown by Scenario" }), _jsx("div", { className: "h-[300px]", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: chartData, layout: "vertical", children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "oklch(0.9 0.005 260)", vertical: false }), _jsx(XAxis, { type: "number", tick: { fill: "oklch(0.45 0.01 260)", fontSize: 11 }, tickFormatter: (v) => `$${fmt(v / 1e6)}M` }), _jsx(YAxis, { dataKey: "scenario", type: "category", tick: { fill: "oklch(0.45 0.01 260)", fontSize: 11 }, width: 80 }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "oklch(0.15 0.02 260 / 0.9)",
                                    border: "1px solid oklch(0.9 0.005 260)",
                                    borderRadius: "0.75rem",
                                    color: "oklch(0.98 0 0)",
                                }, 
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                formatter: (value) => [value != null ? fmt(value) : "—", "USD"] }), _jsx(Legend, {}), _jsx(Bar, { dataKey: "charter", stackId: "a", fill: "#3b82f6", name: "Charter", radius: [0, 4, 4, 0] }), _jsx(Bar, { dataKey: "fuel", stackId: "a", fill: "#f59e0b", name: "Fuel" }), _jsx(Bar, { dataKey: "port", stackId: "a", fill: "#10b981", name: "Port" }), _jsx(Bar, { dataKey: "risk", stackId: "a", fill: "#ef4444", name: "Risk Premium", radius: [4, 0, 0, 4] })] }) }) })] }));
}
function RiskMetricsPanel({ result }) {
    if (!result?.scenario_analysis?.length) {
        return (_jsx(GlassCard, { className: "p-6 h-full", children: _jsx("div", { className: "text-center text-text-secondary", children: "Run a scenario to see risk metrics" }) }));
    }
    const scenarios = result.scenario_analysis;
    const expectedCost = scenarios.reduce((sum, s) => sum + s.total_cost * s.probability, 0);
    const worstCase = Math.max(...scenarios.map(s => s.total_cost));
    const bestCase = Math.min(...scenarios.map(s => s.total_cost));
    const var95 = scenarios
        .sort((a, b) => a.total_cost - b.total_cost)
        .reduce((acc, s, i, arr) => {
        acc += s.probability;
        if (acc >= 0.95)
            return s.total_cost;
        return 0;
    }, 0);
    const metrics = [
        { label: "Expected Cost", value: `$${fmt(expectedCost)}`, icon: DollarSign, color: "text-blue-400" },
        { label: "VaR (95%)", value: `$${fmt(var95 || worstCase)}`, icon: Shield, color: "text-amber-400" },
        { label: "Worst Case", value: `$${fmt(worstCase)}`, icon: AlertTriangle, color: "text-rose-400" },
        { label: "Best Case", value: `$${fmt(bestCase)}`, icon: TrendingDown, color: "text-emerald-400" },
        { label: "Cost Spread", value: `${((worstCase - bestCase) / expectedCost * 100).toFixed(1)}%`, icon: TrendingUp, color: "text-purple-400" },
        { label: "Solver Status", value: result.solver_status, icon: Settings, color: "text-cyan-400" },
    ];
    return (_jsxs(GlassCard, { className: "p-6 h-full", children: [_jsxs("h3", { className: "text-lg font-medium text-text-primary mb-4 flex items-center gap-2", children: [_jsx(Shield, { className: "h-5 w-5 text-amber-400" }), "Risk Metrics"] }), _jsx("div", { className: "grid grid-cols-2 gap-4", children: metrics.map((m, i) => (_jsxs("div", { className: "p-4 rounded-xl bg-surface-2/40", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(m.icon, { className: `h-4 w-4 ${m.color}` }), _jsx("span", { className: "text-xs text-text-secondary uppercase tracking-wider", children: m.label })] }), _jsx("p", { className: "text-xl font-bold text-text-primary", children: m.value })] }, i))) }), _jsxs("div", { className: "mt-6 pt-4 border-t border-border/30", children: [_jsx("h4", { className: "text-sm font-medium text-text-secondary mb-3", children: "Scenario Distribution" }), _jsx("div", { className: "space-y-2", children: scenarios.map((s) => (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-20 text-xs text-text-secondary", children: s.scenario_id }), _jsx("div", { className: "flex-1 h-2 bg-surface-2/40 rounded-full overflow-hidden", children: _jsx("div", { className: "h-full bg-accent/50 rounded-full transition-all", style: { width: `${s.probability * 100}%` } }) }), _jsxs("div", { className: "w-24 text-right text-sm font-mono text-text-primary", children: ["$", fmt(s.total_cost)] })] }, s.scenario_id))) })] })] }));
}
export default function AnalyticsPage() {
    const [results, setResults] = useState(new Map());
    const [selectedScenario, setSelectedScenario] = useState("base");
    const [loading, setLoading] = useState(null);
    const [error, setError] = useState(null);
    const runScenario = async (scenario) => {
        setLoading(scenario.id);
        setError(null);
        try {
            const res = await api.optimize({
                cargo_tons: scenario.cargo,
                shock_scenario: scenario.shock,
                origin_region: scenario.origin,
                destination_port: scenario.destination,
                commodity: scenario.commodity,
            });
            if (res.status === "success") {
                setResults(prev => new Map(prev).set(scenario.id, res.data));
            }
        }
        catch (err) {
            setError(err?.message ?? "Optimization failed");
        }
        finally {
            setLoading(null);
        }
    };
    const runAllScenarios = async () => {
        setError(null);
        for (const scenario of SCENARIOS) {
            if (!results.has(scenario.id)) {
                await runScenario(scenario);
            }
        }
    };
    const selectedResult = results.get(selectedScenario) || null;
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-semibold text-text-primary", children: "Scenario Analysis & Risk Metrics" }), _jsx("p", { className: "text-sm text-text-secondary/60", children: "Compare chartering strategies across market conditions and quantify risk exposure" })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Button, { variant: "secondary", onClick: runAllScenarios, disabled: loading !== null, icon: _jsx(RefreshCw, { className: `h-4 w-4 ${loading ? "animate-spin" : ""}` }), children: "Run All Scenarios" }), _jsx(Button, { variant: "primary", onClick: () => runScenario(SCENARIOS[0]), disabled: loading !== null, icon: _jsx(Download, { className: "h-4 w-4" }), children: "Export Report" })] })] }), error && (_jsx("div", { className: "rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-400", children: error })), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3", children: SCENARIOS.map((scenario) => (_jsx(ScenarioCard, { scenario: scenario, result: results.get(scenario.id) || null, selected: selectedScenario === scenario.id, onClick: () => {
                        setSelectedScenario(scenario.id);
                        if (!results.has(scenario.id)) {
                            runScenario(scenario);
                        }
                    } }, scenario.id))) }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-4", children: [_jsx("div", { className: "lg:col-span-2", children: _jsx(ScenarioComparisonChart, { results: results }) }), _jsx(RiskMetricsPanel, { result: selectedResult })] }), selectedResult && (_jsxs(GlassCard, { className: "p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsxs("h3", { className: "text-lg font-medium text-text-primary", children: ["Detailed Analysis: ", SCENARIOS.find(s => s.id === selectedScenario)?.label] }), _jsx(Badge, { variant: selectedResult.solver_status === "OPTIMAL" ? "success" : "warning", children: selectedResult.solver_status })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6 mb-6", children: [_jsxs(GlassCard, { className: "p-4", children: [_jsx("p", { className: "text-xs text-text-secondary uppercase tracking-wider", children: "Vessel Allocation" }), _jsx("div", { className: "mt-2 space-y-2", children: selectedResult.vessels_used.map((v, i) => (_jsxs("div", { className: "flex justify-between text-sm", children: [_jsxs("span", { className: "text-text-secondary", children: [v.vessel_class, " (", v.vessel_id, ")"] }), _jsxs("span", { className: "font-medium text-text-primary", children: [v.tonnes.toLocaleString(), "t / ", v.dwt.toLocaleString(), " DWT"] })] }, i))) })] }), _jsxs(GlassCard, { className: "p-4", children: [_jsx("p", { className: "text-xs text-text-secondary uppercase tracking-wider", children: "Route Details" }), _jsx("div", { className: "mt-2 space-y-2", children: selectedResult.routes_used.map((r, i) => (_jsxs("div", { className: "flex justify-between text-sm", children: [_jsxs("span", { className: "text-text-secondary", children: [r.origin, " \u2192 ", r.destination] }), _jsxs("span", { className: "font-medium text-text-primary", children: [r.distance_nm.toLocaleString(), " nm \u00B7 ", r.transit_days, "d"] })] }, i))) })] }), _jsxs(GlassCard, { className: "p-4", children: [_jsx("p", { className: "text-xs text-text-secondary uppercase tracking-wider", children: "Cost Summary" }), _jsxs("div", { className: "mt-2 space-y-2", children: [_jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-text-secondary", children: "Total Cost" }), _jsxs("span", { className: "font-bold text-text-primary", children: ["$", fmt(selectedResult.total_cost)] })] }), _jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-text-secondary", children: "Per Tonne" }), _jsxs("span", { className: "font-medium text-text-primary", children: ["$", fmt(selectedResult.expected_cost_per_tonne), "/t"] })] }), _jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-text-secondary", children: "Tranches" }), _jsx("span", { className: "font-medium text-text-primary", children: selectedResult.tranches })] })] })] })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30", children: [_jsx("th", { className: "text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-secondary", children: "Scenario" }), _jsx("th", { className: "text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-secondary", children: "Probability" }), _jsx("th", { className: "text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-secondary", children: "Freight Mult." }), _jsx("th", { className: "text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-secondary", children: "Fuel Cost" }), _jsx("th", { className: "text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-secondary", children: "Weather Delay" }), _jsx("th", { className: "text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-secondary", children: "Congestion" }), _jsx("th", { className: "text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-secondary", children: "Total Cost" }), _jsx("th", { className: "text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-secondary", children: "Weighted" })] }) }), _jsxs("tbody", { children: [selectedResult.scenario_analysis.map((s) => (_jsxs("tr", { className: "border-b border-border/20 hover:bg-surface-2/40", children: [_jsx("td", { className: "px-4 py-3 font-medium text-text-primary", children: s.scenario_id }), _jsxs("td", { className: "px-4 py-3 text-right text-text-secondary", children: [Math.round(s.probability * 100), "%"] }), _jsxs("td", { className: "px-4 py-3 text-right text-text-secondary", children: [s.freight_multiplier, "x"] }), _jsxs("td", { className: "px-4 py-3 text-right text-text-secondary", children: ["$", s.fuel_cost, "/t"] }), _jsxs("td", { className: "px-4 py-3 text-right text-text-secondary", children: [s.weather_delay, "d"] }), _jsxs("td", { className: "px-4 py-3 text-right text-text-secondary", children: [s.congestion_factor, "x"] }), _jsxs("td", { className: "px-4 py-3 text-right font-medium text-text-primary", children: ["$", fmt(s.total_cost)] }), _jsxs("td", { className: "px-4 py-3 text-right font-medium text-accent", children: ["$", fmt(Math.round(s.total_cost * s.probability))] })] }, s.scenario_id))), _jsxs("tr", { className: "bg-surface-2/40 font-bold", children: [_jsx("td", { className: "px-4 py-3", children: "Expected Value" }), _jsx("td", { className: "px-4 py-3 text-right", children: "100%" }), _jsx("td", { className: "px-4 py-3 text-right", children: "\u2014" }), _jsx("td", { className: "px-4 py-3 text-right", children: "\u2014" }), _jsx("td", { className: "px-4 py-3 text-right", children: "\u2014" }), _jsx("td", { className: "px-4 py-3 text-right", children: "\u2014" }), _jsx("td", { className: "px-4 py-3 text-right", children: "\u2014" }), _jsxs("td", { className: "px-4 py-3 text-right text-accent", children: ["$", fmt(selectedResult.scenario_analysis.reduce((sum, s) => sum + s.total_cost * s.probability, 0))] })] })] })] }) })] }))] }));
}
