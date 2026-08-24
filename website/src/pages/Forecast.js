import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, } from "recharts";
import { Calendar, Download, TrendingUp } from "lucide-react";
import { useForecast } from "@/hooks/useForecast";
import StatCard from "@/components/StatCard";
import GlassCard from "@/components/GlassCard";
import Button from "@/components/Button";
import { fmt } from "@/lib/utils";
export default function ForecastPage() {
    const [days, setDays] = useState(30);
    const { data, loading, error } = useForecast(days);
    const chartData = useMemo(() => data.map((r) => ({
        date: r.date.slice(5), // MM-DD
        full: r.date,
        forecast: r.base_forecast,
        lower: r.lower_bound,
        upper: r.upper_bound,
    })), [data]);
    const avg = data.length
        ? data.reduce((a, r) => a + r.base_forecast, 0) / data.length
        : 0;
    const latest = data[data.length - 1];
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-semibold text-text-primary", children: "Freight Rate Forecast" }), _jsx("p", { className: "text-sm text-text-secondary/60", children: "Probabilistic 30-day outlook (USD/tonne)" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "flex items-center gap-1 rounded-xl border border-border bg-surface-2/40 p-1 text-xs", children: [7, 14, 30, 90].map((d) => (_jsxs("button", { onClick: () => setDays(d), className: cn("rounded-lg px-3 py-1.5 font-medium transition-all", days === d
                                        ? "bg-accent/20 text-accent"
                                        : "text-text-secondary hover:text-text-primary hover:bg-surface/40"), children: [d, "d"] }, d))) }), _jsx(Button, { variant: "ghost", size: "sm", icon: _jsx(Calendar, { className: "h-4 w-4" }), onClick: () => { }, children: new Date().toLocaleDateString() }), _jsx(Button, { variant: "ghost", size: "sm", icon: _jsx(Download, { className: "h-4 w-4" }), onClick: () => {
                                    const csv = [
                                        "date,forecast,lower_bound,upper_bound",
                                        ...data.map((r) => `${r.date},${r.base_forecast},${r.lower_bound},${r.upper_bound}`),
                                    ].join("\n");
                                    const blob = new Blob([csv], { type: "text/csv" });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = "freight-forecast.csv";
                                    a.click();
                                    URL.revokeObjectURL(url);
                                }, children: "Export" })] })] }), error && (_jsx("p", { className: "text-sm text-amber-400", children: error })), _jsxs("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-3", children: [_jsx(StatCard, { title: "Current Rate", value: latest ? fmt(latest.base_forecast, { suffix: " $/t" }) : "—", icon: _jsx(TrendingUp, { className: "h-5 w-5" }) }), _jsx(StatCard, { title: "Confidence Band", value: latest
                            ? `${fmt(latest.lower_bound)}–${fmt(latest.upper_bound)}`
                            : "—", subtitle: "$/tonne" }), _jsx(StatCard, { title: "Period Avg", value: fmt(avg, { suffix: " $/t" }) })] }), _jsx(GlassCard, { className: "p-6", children: _jsx(ResponsiveContainer, { width: "100%", height: 360, children: _jsxs(AreaChart, { data: chartData, margin: { top: 10, right: 24, left: 0, bottom: 0 }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "fcGradient", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "#3b82f6", stopOpacity: 0.35 }), _jsx("stop", { offset: "100%", stopColor: "#3b82f6", stopOpacity: 0 })] }) }), _jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "oklch(0.27 0.01 260)", vertical: false }), _jsx(XAxis, { dataKey: "date", tick: { fill: "oklch(0.72 0 0)", fontSize: 11 }, tickLine: false, axisLine: false }), _jsx(YAxis, { tick: { fill: "oklch(0.72 0 0)", fontSize: 11 }, tickLine: false, axisLine: false, tickFormatter: (v) => `${v}`, domain: ["dataMin - 1", "dataMax + 1"] }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "oklch(0.18 0.02 260 / 0.85)",
                                    border: "1px solid oklch(0.30 0.01 260)",
                                    borderRadius: "0.75rem",
                                    color: "oklch(0.92 0 0)",
                                }, 
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                formatter: (value) => [
                                    value != null && typeof value === "number" ? fmt(value) : "—",
                                    "Rate",
                                ], 
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                labelFormatter: (label) => `Date: ${label}` }), _jsx(Area, { type: "monotone", dataKey: "forecast", stroke: "oklch(0.70 0.20 250)", strokeWidth: 2.5, fill: "url(#fcGradient)", fillOpacity: 1, dot: false, isAnimationActive: !loading }), _jsx(Area, { type: "monotone", dataKey: "upper", stroke: "oklch(0.70 0.20 250 / 0.4)", strokeWidth: 1, fill: "none", strokeDasharray: "4 4", dot: false }), _jsx(Area, { type: "monotone", dataKey: "lower", stroke: "oklch(0.70 0.20 250 / 0.4)", strokeWidth: 1, fill: "none", strokeDasharray: "4 4", dot: false })] }) }) })] }));
}
function cn(...cls) {
    return cls.filter(Boolean).join(" ");
}
