import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useMemo } from "react";
import { Anchor, Globe, Loader2, Package, Ship, TrendingUp, AlertTriangle, ExternalLink, Download, } from "lucide-react";
import Button from "@/components/Button";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, } from "recharts";
import StatCard from "@/components/StatCard";
import QuickActions from "@/components/QuickActions";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import { api } from "@/lib/api";
import { fmt, fmtInt } from "@/lib/utils";
// ForecastResponse is imported from @/lib/api
function StatusDot({ status }) {
    const map = {
        healthy: "bg-success",
        loading: "bg-warning animate-pulse",
        unreachable: "bg-danger",
    };
    const cls = map[status] ?? "bg-text-muted";
    return (_jsxs("div", { className: "flex items-center gap-2 text-sm text-text-secondary", children: [_jsx("span", { className: `h-2.5 w-2.5 rounded-full ${cls}` }), _jsx("span", { className: "hidden sm:inline", children: status === "loading" ? "Checking…" : status })] }));
}
function ForecastChart({ data, days, onDaysChange, loading }) {
    if (!data || data.length === 0) {
        return (_jsx(Card, { className: "p-5", children: _jsx("div", { className: "flex items-center justify-center h-64 text-text-muted", children: _jsx("p", { children: "No forecast data available" }) }) }));
    }
    const chartData = useMemo(() => {
        const sliced = data.slice(0, days);
        return sliced.map((r) => ({
            date: r.date.slice(5),
            full: r.date,
            forecast: r.base_forecast,
            lower: r.lower_bound,
            upper: r.upper_bound,
        }));
    }, [data, days]);
    const chartAvg = chartData.length
        ? chartData.reduce((a, r) => a + r.forecast, 0) / chartData.length
        : 0;
    const chartLatest = chartData[chartData.length - 1];
    return (_jsxs(Card, { className: "p-5", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-medium text-text-primary", children: "Freight Rate Forecast" }), _jsxs("p", { className: "text-sm text-text-secondary/60", children: ["Probabilistic ", days, "-day outlook (USD/tonne)"] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "flex items-center gap-1 rounded-[10px] border border-border bg-surface-muted p-1 text-xs", children: [7, 14, 30, 90].map((d) => (_jsxs("button", { onClick: () => onDaysChange(d), className: `rounded-[8px] px-3 py-1.5 text-xs font-medium transition-all ${days === d
                                        ? "bg-accent-light text-accent"
                                        : "text-text-secondary hover:text-text-primary hover:bg-surface-muted"}`, children: [d, "d"] }, d))) }), _jsx(Button, { variant: "ghost", size: "sm", icon: _jsx(Download, { className: "h-4 w-4" }), onClick: () => {
                                    const csv = [
                                        "date,forecast,lower_bound,upper_bound",
                                        ...chartData.map((r) => `${r.full},${r.forecast},${r.lower},${r.upper}`),
                                    ].join("\n");
                                    const blob = new Blob([csv], { type: "text/csv" });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = "freight-forecast.csv";
                                    a.click();
                                    URL.revokeObjectURL(url);
                                }, children: "Export" })] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4", children: [_jsxs("div", { className: "p-3 rounded-[10px] bg-accent-light text-center", children: [_jsx("p", { className: "text-xs uppercase tracking-wider text-accent", children: "Current" }), _jsx("p", { className: "text-xl font-bold text-text-primary mt-1", children: chartLatest ? fmt(chartLatest.forecast, { suffix: " $/t" }) : "—" })] }), _jsxs("div", { className: "p-3 rounded-[10px] bg-surface-muted text-center", children: [_jsxs("p", { className: "text-xs uppercase tracking-wider text-text-secondary", children: ["Avg (", days, "d)"] }), _jsx("p", { className: "text-xl font-bold text-text-primary mt-1", children: fmt(chartAvg, { suffix: " $/t" }) })] }), _jsxs("div", { className: "p-3 rounded-[10px] bg-surface-muted text-center", children: [_jsx("p", { className: "text-xs uppercase tracking-wider text-text-secondary", children: "Confidence" }), _jsx("p", { className: "text-xl font-bold text-text-primary mt-1", children: chartLatest ? `${fmt(chartLatest.lower)}–${fmt(chartLatest.upper)}` : "—" })] })] }), _jsx("div", { className: "h-[320px]", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(AreaChart, { data: chartData, margin: { top: 10, right: 24, left: 0, bottom: 0 }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "fcGradient", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "#3b82f6", stopOpacity: 0.35 }), _jsx("stop", { offset: "100%", stopColor: "#3b82f6", stopOpacity: 0 })] }) }), _jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "oklch(0.9 0.005 260)", vertical: false }), _jsx(XAxis, { dataKey: "date", tick: { fill: "oklch(0.45 0.01 260)", fontSize: 11 }, tickLine: false, axisLine: false }), _jsx(YAxis, { tick: { fill: "oklch(0.45 0.01 260)", fontSize: 11 }, tickLine: false, axisLine: false, tickFormatter: (v) => `${v}`, domain: ["dataMin - 1", "dataMax + 1"] }), _jsx(Tooltip, { contentStyle: {
                                    backgroundColor: "oklch(0.15 0.02 260 / 0.9)",
                                    border: "1px solid oklch(0.9 0.005 260)",
                                    borderRadius: "0.75rem",
                                    color: "oklch(0.98 0 0)",
                                }, 
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                formatter: (value) => [value != null ? fmt(value) : "—", "Rate"], labelFormatter: (label) => `Date: ${String(label)}` }), _jsx(Area, { type: "monotone", dataKey: "forecast", stroke: "oklch(0.55 0.18 250)", strokeWidth: 2.5, fill: "url(#fcGradient)", fillOpacity: 1, dot: false, isAnimationActive: !loading }), _jsx(Area, { type: "monotone", dataKey: "upper", stroke: "oklch(0.55 0.18 250 / 0.4)", strokeWidth: 1, fill: "none", strokeDasharray: "4 4", dot: false }), _jsx(Area, { type: "monotone", dataKey: "lower", stroke: "oklch(0.55 0.18 250 / 0.4)", strokeWidth: 1, fill: "none", strokeDasharray: "4 4", dot: false })] }) }) })] }));
}
export default function DashboardPage() {
    const [health, setHealth] = useState(null);
    const [forecast, setForecast] = useState(null);
    const [baltic, setBaltic] = useState(null);
    const [freightRates, setFreightRates] = useState([]);
    const [portCongestion, setPortCongestion] = useState([]);
    const [weatherAlerts, setWeatherAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [chartDays, setChartDays] = useState(30);
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                setError(null);
                const [h, f, bdi, rates, congestion, alerts,] = await Promise.allSettled([
                    api.health(),
                    api.forecast(90),
                    api.realtime.balticIndices(),
                    api.realtime.freightRates(),
                    api.realtime.portCongestion(),
                    api.realtime.weatherAlerts(),
                ]);
                if (cancelled)
                    return;
                if (h.status === "fulfilled")
                    setHealth(h.value);
                if (f.status === "fulfilled")
                    setForecast(f.value);
                if (bdi.status === "fulfilled")
                    setBaltic(bdi.value);
                if (rates.status === "fulfilled")
                    setFreightRates(rates.value);
                if (congestion.status === "fulfilled")
                    setPortCongestion(congestion.value);
                if (alerts.status === "fulfilled")
                    setWeatherAlerts(alerts.value);
                const errors = [h, f, bdi, rates, congestion, alerts]
                    .filter((r) => r.status === "rejected")
                    .map((r) => r.reason?.message);
                if (errors.length > 0) {
                    setError(errors.join("; "));
                }
            }
            catch (e) {
                if (!cancelled)
                    setError(e?.message ?? "Failed to load dashboard");
            }
            finally {
                if (!cancelled)
                    setLoading(false);
            }
        };
        load();
        const iv = setInterval(load, 60000);
        return () => {
            cancelled = true;
            clearInterval(iv);
        };
    }, []);
    const latest = forecast?.data?.[forecast.data.length - 1];
    const avgForecast = forecast?.data
        ? forecast.data.reduce((a, r) => a + r.base_forecast, 0) / forecast.data.length
        : 0;
    const topCongested = [...portCongestion]
        .sort((a, b) => b.congestion_pct - a.congestion_pct)
        .slice(0, 5);
    const severeAlerts = weatherAlerts.filter((a) => a.severity === "Severe" || a.severity === "Extreme" || a.urgency === "Immediate").slice(0, 3);
    if (loading) {
        return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-2xl font-semibold text-text-primary", children: "Maritime Logistics Dashboard" }), _jsx(Loader2, { className: "h-6 w-6 animate-spin text-accent" })] }), _jsx("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4", children: [1, 2, 3, 4].map((i) => (_jsxs(Card, { className: "stat-card animate-pulse", children: [_jsx("div", { className: "h-5 w-5 bg-surface-muted rounded shrink-0" }), _jsxs("div", { className: "flex-1 space-y-2", children: [_jsx("div", { className: "h-4 w-1/4 bg-surface-muted rounded" }), _jsx("div", { className: "h-8 w-1/2 bg-surface-muted rounded" })] })] }, i))) })] }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-semibold text-text-primary", children: "Maritime Logistics Dashboard" }), _jsxs("p", { className: "text-sm text-text-secondary mt-0.5", children: ["Real-time market intelligence \u2022 Updated ", new Date().toLocaleTimeString()] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(StatusDot, { status: health?.status ?? "unknown" }), _jsx(Badge, { variant: health?.status === "healthy" ? "success" : "danger", className: "hidden sm:inline-flex", children: health?.status ?? "Unknown" })] })] }), error && (_jsxs("div", { className: "rounded-[10px] border border-warning/30 bg-warning/5 p-4 text-sm text-warning", children: ["\u26A0 Some data sources unavailable: ", error] })), _jsxs("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5", children: [_jsx(StatCard, { title: "Baltic Dry Index", value: baltic ? fmtInt(baltic.BDI) : "—", icon: _jsx(TrendingUp, { className: "h-5 w-5 text-accent" }), trend: baltic && baltic.change >= 0 ? "up" : "down", subtitle: baltic ? `${baltic.change >= 0 ? "+" : ""}${fmtInt(baltic.change)} (${baltic.change_pct >= 0 ? "+" : ""}${baltic.change_pct}%)` : undefined }), _jsx(StatCard, { title: "Capesize (BCI)", value: baltic ? fmtInt(baltic.BCI) : "—", icon: _jsx(Ship, { className: "h-5 w-5" }), subtitle: "180k DWT" }), _jsx(StatCard, { title: "Panamax (BPI)", value: baltic ? fmtInt(baltic.BPI) : "—", icon: _jsx(Package, { className: "h-5 w-5" }), subtitle: "82k DWT" }), _jsx(StatCard, { title: "Supramax (BSI)", value: baltic ? fmtInt(baltic.BSI) : "—", icon: _jsx(Anchor, { className: "h-5 w-5" }), subtitle: "58k DWT" }), _jsx(StatCard, { title: "Handysize (BHSI)", value: baltic ? fmtInt(baltic.BHSI) : "—", icon: _jsx(Anchor, { className: "h-5 w-5" }), subtitle: "38k DWT" })] }), _jsx(ForecastChart, { data: forecast?.data ?? null, days: chartDays, onDaysChange: setChartDays, loading: loading }), _jsxs(Card, { className: "p-5", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-lg font-medium text-text-primary", children: "Major Route Freight Rates" }), _jsxs("div", { className: "flex items-center gap-2 text-sm text-text-secondary", children: [_jsx(Globe, { className: "h-4 w-4" }), _jsx("span", { children: "Source: Baltic Exchange / Ship&Bunker" })] })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full border-collapse text-sm", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-secondary border-b border-border", children: "Route" }), _jsx("th", { className: "text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-secondary border-b border-border", children: "Vessel" }), _jsx("th", { className: "text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-secondary border-b border-border", children: "$/day" }), _jsx("th", { className: "text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-secondary border-b border-border", children: "$/tonne" })] }) }), _jsxs("tbody", { children: [freightRates.slice(0, 8).map((rate, i) => (_jsxs("tr", { className: i % 2 === 0 ? "bg-surface-muted/50" : "", children: [_jsx("td", { className: "px-4 py-3 border-b border-border/50", children: _jsx("span", { className: "font-medium text-text-primary", children: rate.route }) }), _jsx("td", { className: "px-4 py-3 border-b border-border/50 text-text-secondary", children: rate.vessel_type }), _jsx("td", { className: "px-4 py-3 border-b border-border/50 text-right font-mono text-text-primary", children: fmt(rate.rate_usd_per_day) }), _jsx("td", { className: "px-4 py-3 border-b border-border/50 text-right font-mono text-text-secondary", children: fmt(rate.rate_usd_per_tonne, { suffix: " $/t" }) })] }, rate.route))), freightRates.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 4, className: "text-center py-8 text-text-muted", children: "No freight rate data available" }) }))] })] }) })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4", children: [_jsxs(Card, { className: "p-5", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-lg font-medium text-text-primary", children: "Port Congestion (Top 5)" }), _jsxs(Badge, { variant: "default", children: [portCongestion.length, " ports tracked"] })] }), _jsxs("div", { className: "space-y-3", children: [topCongested.map((port) => (_jsxs("div", { className: "flex items-center justify-between p-3 rounded-[10px] bg-surface-muted", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-10 h-10 rounded-full bg-accent-light flex items-center justify-center", children: _jsx(Anchor, { className: "h-5 w-5 text-accent" }) }), _jsxs("div", { children: [_jsx("p", { className: "font-medium text-text-primary", children: port.port }), _jsxs("p", { className: "text-xs text-text-secondary", children: [port.vessels_waiting, " vessels waiting \u2022 ", port.avg_wait_days, "d avg"] })] })] }), _jsx("div", { className: "text-right", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${port.demurrage_risk === "High" ? "bg-danger/15 text-danger" :
                                                                port.demurrage_risk === "Moderate" ? "bg-warning/15 text-warning" :
                                                                    "bg-success/15 text-success"}`, children: port.demurrage_risk }), _jsxs("span", { className: "text-lg font-bold text-text-primary", children: [port.congestion_pct, "%"] })] }) })] }, port.port))), portCongestion.length === 0 && (_jsx("p", { className: "text-center text-text-muted py-8", children: "No congestion data available" }))] })] }), _jsxs(Card, { className: "p-5", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-lg font-medium text-text-primary", children: "Weather & Route Alerts" }), _jsx(Badge, { variant: severeAlerts.length > 0 ? "danger" : "success", children: severeAlerts.length > 0 ? `${severeAlerts.length} Active` : "All Clear" })] }), _jsx("div", { className: "space-y-3", children: severeAlerts.length > 0 ? (severeAlerts.map((alert, i) => (_jsx("div", { className: "p-3 rounded-[10px] border border-danger/20 bg-danger/5", children: _jsxs("div", { className: "flex items-start gap-2", children: [_jsx(AlertTriangle, { className: "h-5 w-5 text-danger shrink-0 mt-0.5" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "font-medium text-text-primary", children: alert.event ?? "Weather Alert" }), _jsx("p", { className: "text-xs text-text-secondary mt-0.5", children: alert.area ?? "Regional" }), _jsx("p", { className: "text-sm text-text-secondary mt-1 line-clamp-2", children: alert.description })] })] }) }, i)))) : (_jsxs("div", { className: "flex items-center justify-center py-8 text-text-muted", children: [_jsx(Anchor, { className: "h-8 w-8 opacity-30" }), _jsx("p", { className: "ml-3", children: "No active weather alerts affecting major routes" })] })) })] })] }), _jsx(QuickActions, {}), _jsx(Card, { className: "p-4 border-border/50", children: _jsxs("div", { className: "flex items-center justify-between text-sm text-text-secondary", children: [_jsx("span", { children: "Data refreshes every 60 seconds \u2022 Baltic indices from investing.com/TradingView \u2022 Freight rates from Baltic Exchange route assessments \u2022 Port congestion estimated from MarineTraffic patterns" }), _jsxs("a", { href: "/api/realtime/all", target: "_blank", rel: "noopener noreferrer", className: "flex items-center gap-1 text-accent hover:underline", children: [_jsx(ExternalLink, { className: "h-3.5 w-3.5" }), "View Raw API"] })] }) })] }));
}
