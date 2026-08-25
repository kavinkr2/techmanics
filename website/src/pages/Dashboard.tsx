import { useEffect, useState, useMemo } from "react";
import {
  Activity,
  Anchor,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Globe,
  Loader2,
  Package,
  Ship,
  TrendingDown,
  TrendingUp,
  Waves,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Calendar,
  Download,
  RefreshCw,
  Wind,
} from "lucide-react";
import Button from "@/components/Button";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  Cell,
  Pie,
  PieChart,
} from "recharts";
import StatCard from "@/components/StatCard";
import QuickActions from "@/components/QuickActions";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import { api, type HealthStatus, type ForecastResponse, type VesselPosition } from "@/lib/api";
import { fmt, fmtInt } from "@/lib/utils";

// Real-time types
type BalticIndices = {
  BDI: number;
  BCI: number;
  BPI: number;
  BSI: number;
  BHSI: number;
  timestamp: string;
  change: number;
  change_pct: number;
};

type FreightRate = {
  route: string;
  vessel_type: string;
  rate_usd_per_day: number;
  rate_usd_per_tonne: number;
  source: string;
  timestamp: string;
};

type PortCongestion = {
  port: string;
  congestion_pct: number;
  avg_wait_days: number;
  vessels_waiting: number;
  berth_utilization_pct: number;
  demurrage_risk: string;
  last_updated: string;
  source: string;
};

type WeatherAlert = {
  event: string | null;
  severity: string | null;
  certainty: string | null;
  urgency: string | null;
  area: string | null;
  description: string;
  effective: string | null;
  expires: string | null;
};

type ForecastRecord = {
  date: string;
  base_forecast: number;
  lower_bound: number;
  upper_bound: number;
};

// ForecastResponse is imported from @/lib/api

function StatusDot({ status }: { status: "healthy" | "loading" | string }) {
  const map: Record<string, string> = {
    healthy: "bg-success",
    loading: "bg-warning animate-pulse",
    unreachable: "bg-danger",
  };
  const cls = map[status] ?? "bg-text-muted";
  return (
    <div className="flex items-center gap-2 text-sm text-text-secondary">
      <span className={`h-2.5 w-2.5 rounded-full ${cls}`}></span>
      <span className="hidden sm:inline">{status === "loading" ? "Checking…" : status}</span>
    </div>
  );
}

function FreightRateTrendChart({ data, loading }: { data: FreightRate[]; loading: boolean }) {
  const grouped = useMemo(() => {
    const byRoute = new Map<string, { route: string; rates: number[] }>();
    data.forEach((r) => {
      if (!byRoute.has(r.route)) byRoute.set(r.route, { route: r.route, rates: [] });
      byRoute.get(r.route)!.rates.push(r.rate_usd_per_tonne);
    });
    return Array.from(byRoute.values()).map((g) => ({
      route: g.route,
      avg: g.rates.reduce((a, b) => a + b, 0) / (g.rates.length || 1),
      latest: g.rates[g.rates.length - 1],
    }));
  }, [data]);

  const chartData = grouped.slice(0, 8);
  const colors = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#f97316", "#06b6d4", "#4f46e5"];

  if (loading) {
    return (
      <Card className="p-5">
        <div className="flex items-center justify-center h-64 text-text-muted">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </Card>
    );
  }

  if (!chartData.length) {
    return (
      <Card className="p-5">
        <div className="flex items-center justify-center h-64 text-text-muted">
          <p>No freight rate data available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-text-primary">Freight Rate Trends</h3>
          <p className="text-sm text-text-secondary/60">Average rate (USD/tonne) by route</p>
        </div>
        <Badge variant="default">{chartData.length} routes</Badge>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.005 260)" vertical={false} />
            <XAxis
              dataKey="route"
              tick={{ fill: "oklch(0.45 0.01 260)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: "oklch(0.45 0.01 260)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "oklch(0.15 0.02 260 / 0.9)",
                border: "1px solid oklch(0.9 0.005 260)",
                borderRadius: "0.75rem",
                color: "oklch(0.98 0 0)",
              }}
              formatter={(value: any) => [`$${value.toFixed(1)}/t`, "Rate"]}
            />
            <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={`cell-${i}`} fill={colors[i % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function VesselPositionsPanel({ data, loading }: { data: VesselPosition[]; loading: boolean }) {
  const byType = useMemo(() => {
    const m = new Map<string, number>();
    data.forEach((v) => {
      m.set(v.type, (m.get(v.type) ?? 0) + 1);
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [data]);

  const total = byType.reduce((a, [, n]) => a + n, 0);

  if (loading) {
    return (
      <Card className="p-5 mb-6">
        <div className="flex items-center justify-center h-40 text-text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-text-primary">Live Vessel Positions</h3>
          <p className="text-sm text-text-secondary/60">{total} vessels tracked globally</p>
        </div>
        <Badge variant="default">{byType.length} types</Badge>
      </div>
      <div className="space-y-3">
        {data.slice(0, 6).map((v) => (
          <div key={v.mmsi} className="flex items-center gap-3 p-3 rounded-[10px] bg-surface-muted">
            <div className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center shrink-0">
              <Ship className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-text-primary">{v.name}</p>
              <p className="text-xs text-text-secondary">{v.type} · {v.destination || "At sea"}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-text-primary">{v.speed} kn</p>
              <p className="text-xs text-text-secondary">ETA: {v.eta}</p>
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <p className="text-center text-text-muted py-6">No vessel data available</p>
        )}
      </div>
      {total > 0 && (
        <div className="mt-4 pt-4 border-t border-border/30">
          <p className="text-xs text-text-secondary uppercase tracking-wider mb-2">By Vessel Type</p>
          <div className="space-y-2">
            {byType.slice(0, 5).map(([type, count]) => (
              <div key={type} className="flex items-center gap-3">
                <span className="w-24 text-xs text-text-secondary">{type}</span>
                <div className="flex-1 h-2 bg-surface-2/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent/50 rounded-full transition-all"
                    style={{ width: `${(count / total) * 100}%` }}
                  />
                </div>
                <span className="w-12 text-right text-xs font-mono text-text-primary">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function ForecastChart({ data, days, onDaysChange, loading }: { 
  data: ForecastRecord[] | null; 
  days: 7 | 14 | 30 | 90;
  onDaysChange: (d: 7 | 14 | 30 | 90) => void;
  loading: boolean;
}) {
  if (!data || data.length === 0) {
    return (
      <Card className="p-5">
        <div className="flex items-center justify-center h-64 text-text-muted">
          <p>No forecast data available</p>
        </div>
      </Card>
    );
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

  return (
    <Card className="p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
        <div>
          <h3 className="text-lg font-medium text-text-primary">Freight Rate Forecast</h3>
          <p className="text-sm text-text-secondary/60">Probabilistic {days}-day outlook (USD/tonne)</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-[10px] border border-border bg-surface-muted p-1 text-xs">
            {([7, 14, 30, 90] as const).map((d) => (
              <button
                key={d}
                onClick={() => onDaysChange(d)}
                className={`rounded-[8px] px-3 py-1.5 text-xs font-medium transition-all ${
                  days === d
                    ? "bg-accent-light text-accent"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-muted"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" icon={<Download className="h-4 w-4" />} onClick={() => {
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
          }}>
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="p-3 rounded-[10px] bg-accent-light text-center">
          <p className="text-xs uppercase tracking-wider text-accent">Current</p>
          <p className="text-xl font-bold text-text-primary mt-1">{chartLatest ? fmt(chartLatest.forecast, { suffix: " $/t" }) : "—"}</p>
        </div>
        <div className="p-3 rounded-[10px] bg-surface-muted text-center">
          <p className="text-xs uppercase tracking-wider text-text-secondary">Avg ({days}d)</p>
          <p className="text-xl font-bold text-text-primary mt-1">{fmt(chartAvg, { suffix: " $/t" })}</p>
        </div>
        <div className="p-3 rounded-[10px] bg-surface-muted text-center">
          <p className="text-xs uppercase tracking-wider text-text-secondary">Confidence</p>
          <p className="text-xl font-bold text-text-primary mt-1">
            {chartLatest ? `${fmt(chartLatest.lower)}–${fmt(chartLatest.upper)}` : "—"}
          </p>
        </div>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fcGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.9 0.005 260)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "oklch(0.45 0.01 260)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: "oklch(0.45 0.01 260)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
              domain={["dataMin - 1", "dataMax + 1"]}
            />
            <Tooltip
                          contentStyle={{
                            backgroundColor: "oklch(0.15 0.02 260 / 0.9)",
                            border: "1px solid oklch(0.9 0.005 260)",
                            borderRadius: "0.75rem",
                            color: "oklch(0.98 0 0)",
                          }}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          formatter={(value: any) => [value != null ? fmt(value) : "—", "Rate"]}
                          labelFormatter={(label: string | number | React.ReactNode) => `Date: ${String(label)}`}
            />
            <Area
              type="monotone"
              dataKey="forecast"
              stroke="oklch(0.55 0.18 250)"
              strokeWidth={2.5}
              fill="url(#fcGradient)"
              fillOpacity={1}
              dot={false}
              isAnimationActive={!loading}
            />
            <Area
              type="monotone"
              dataKey="upper"
              stroke="oklch(0.55 0.18 250 / 0.4)"
              strokeWidth={1}
              fill="none"
              strokeDasharray="4 4"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="lower"
              stroke="oklch(0.55 0.18 250 / 0.4)"
              strokeWidth={1}
              fill="none"
              strokeDasharray="4 4"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [baltic, setBaltic] = useState<BalticIndices | null>(null);
  const [freightRates, setFreightRates] = useState<FreightRate[]>([]);
  const [portCongestion, setPortCongestion] = useState<PortCongestion[]>([]);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
  const [vesselPositions, setVesselPositions] = useState<VesselPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartDays, setChartDays] = useState<7 | 14 | 30 | 90>(30);

  const load = async () => {
    try {
      setError(null);
      const [
        h,
        f,
        bdi,
        rates,
        congestion,
        vessels,
        alerts,
      ] = await Promise.allSettled([
        api.health(),
        api.forecast(90),
        api.realtime.balticIndices(),
        api.realtime.freightRates(),
        api.realtime.portCongestion(),
        api.realtime.vesselPositions(),
        api.realtime.weatherAlerts(),
      ]);

      setHealth(h.status === "fulfilled" ? h.value : null);
      setForecast(f.status === "fulfilled" ? f.value : null);
      setBaltic(bdi.status === "fulfilled" ? bdi.value : null);
      setFreightRates(rates.status === "fulfilled" ? rates.value : []);
      setPortCongestion(congestion.status === "fulfilled" ? congestion.value : []);
      setVesselPositions(vessels.status === "fulfilled" ? vessels.value : []);
      setWeatherAlerts(alerts.status === "fulfilled" ? alerts.value : []);

      const errors = [h, f, bdi, rates, congestion, vessels, alerts]
        .filter((r): r is PromiseRejectedResult => r.status === "rejected")
        .map((r) => r.reason?.message);
      if (errors.length > 0) {
        setError(errors.join("; "));
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      await load();
      if (cancelled) return;
    };
    tick();
    const iv = setInterval(tick, 60000);
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

  const severeAlerts = weatherAlerts.filter(
    (a) => a.severity === "Severe" || a.severity === "Extreme" || a.urgency === "Immediate"
  ).slice(0, 3);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-text-primary">Maritime Logistics Dashboard</h2>
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="stat-card animate-pulse">
              <div className="h-5 w-5 bg-surface-muted rounded shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/4 bg-surface-muted rounded" />
                <div className="h-8 w-1/2 bg-surface-muted rounded" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">Maritime Logistics Dashboard</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            Real-time market intelligence • Updated {new Date().toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setLoading(true);
              load();
            }}
            className="p-2 rounded-[10px] bg-surface-2/40 hover:bg-accent/10 transition-colors"
            title="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 text-text-secondary ${loading ? "animate-spin" : ""}`} />
          </button>
          <StatusDot status={health?.status ?? "unknown"} />
          <Badge variant={health?.status === "healthy" ? "success" : "danger"} className="hidden sm:inline-flex">
            {health?.status ?? "Unknown"}
          </Badge>
        </div>
      </div>

      {error && (
        <div className="rounded-[10px] border border-warning/30 bg-warning/5 p-4 text-sm text-warning">
          ⚠ Some data sources unavailable: {error}
        </div>
      )}

      {/* Top KPIs - Baltic Indices */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Baltic Dry Index"
          value={baltic ? fmtInt(baltic.BDI) : "—"}
          icon={<TrendingUp className="h-5 w-5 text-accent" />}
          trend={baltic && baltic.change >= 0 ? "up" : "down"}
          subtitle={baltic ? `${baltic.change >= 0 ? "+" : ""}${fmtInt(baltic.change)} (${baltic.change_pct >= 0 ? "+" : ""}${baltic.change_pct}%)` : undefined}
        />
        <StatCard
          title="Capesize (BCI)"
          value={baltic ? fmtInt(baltic.BCI) : "—"}
          icon={<Ship className="h-5 w-5" />}
          subtitle="180k DWT"
        />
        <StatCard
          title="Panamax (BPI)"
          value={baltic ? fmtInt(baltic.BPI) : "—"}
          icon={<Package className="h-5 w-5" />}
          subtitle="82k DWT"
        />
        <StatCard
          title="Supramax (BSI)"
          value={baltic ? fmtInt(baltic.BSI) : "—"}
          icon={<Anchor className="h-5 w-5" />}
          subtitle="58k DWT"
        />
        <StatCard
          title="Handysize (BHSI)"
          value={baltic ? fmtInt(baltic.BHSI) : "—"}
          icon={<Anchor className="h-5 w-5" />}
          subtitle="38k DWT"
        />
      </div>

      {/* Freight Rate Forecast Chart */}
      <ForecastChart 
        data={forecast?.data ?? null} 
        days={chartDays} 
        onDaysChange={setChartDays} 
        loading={loading} 
      />

      {/* Freight Rate Trends (new) */}
      <FreightRateTrendChart data={freightRates} loading={loading} />

      {/* Vessel Positions (new) */}
      <VesselPositionsPanel data={vesselPositions} loading={loading} />

      {/* Freight Rates Table */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-text-primary">Major Route Freight Rates</h3>
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Globe className="h-4 w-4" />
            <span>Source: Baltic Exchange / Ship&Bunker</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-secondary border-b border-border">Route</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-secondary border-b border-border">Vessel</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-secondary border-b border-border">$/day</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-secondary border-b border-border">$/tonne</th>
              </tr>
            </thead>
            <tbody>
              {freightRates.slice(0, 8).map((rate, i) => (
                <tr key={rate.route} className={i % 2 === 0 ? "bg-surface-muted/50" : ""}>
                  <td className="px-4 py-3 border-b border-border/50">
                    <span className="font-medium text-text-primary">{rate.route}</span>
                  </td>
                  <td className="px-4 py-3 border-b border-border/50 text-text-secondary">{rate.vessel_type}</td>
                  <td className="px-4 py-3 border-b border-border/50 text-right font-mono text-text-primary">{fmt(rate.rate_usd_per_day)}</td>
                  <td className="px-4 py-3 border-b border-border/50 text-right font-mono text-text-secondary">{fmt(rate.rate_usd_per_tonne, { suffix: " $/t" })}</td>
                </tr>
              ))}
              {freightRates.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-text-muted">No freight rate data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-text-primary">Port Congestion (Top 5)</h3>
            <Badge variant="default">{portCongestion.length} ports tracked</Badge>
          </div>
          <div className="space-y-3">
            {topCongested.map((port) => (
              <div key={port.port} className="flex items-center justify-between p-3 rounded-[10px] bg-surface-muted">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center">
                    <Anchor className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">{port.port}</p>
                    <p className="text-xs text-text-secondary">{port.vessels_waiting} vessels waiting • {port.avg_wait_days}d avg</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      port.demurrage_risk === "High" ? "bg-danger/15 text-danger" :
                      port.demurrage_risk === "Moderate" ? "bg-warning/15 text-warning" :
                      "bg-success/15 text-success"
                    }`}>
                      {port.demurrage_risk}
                    </span>
                    <span className="text-lg font-bold text-text-primary">{port.congestion_pct}%</span>
                  </div>
                </div>
              </div>
            ))}
            {portCongestion.length === 0 && (
              <p className="text-center text-text-muted py-8">No congestion data available</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-text-primary">Weather & Route Alerts</h3>
            <Badge variant={severeAlerts.length > 0 ? "danger" : "success"}>
              {severeAlerts.length > 0 ? `${severeAlerts.length} Active` : "All Clear"}
            </Badge>
          </div>
          <div className="space-y-3">
            {severeAlerts.length > 0 ? (
              severeAlerts.map((alert, i) => (
                <div key={i} className="p-3 rounded-[10px] border border-danger/20 bg-danger/5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary">{alert.event ?? "Weather Alert"}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{alert.area ?? "Regional"}</p>
                      <p className="text-sm text-text-secondary mt-1 line-clamp-2">{alert.description}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center py-8 text-text-muted">
                <Anchor className="h-8 w-8 opacity-30" />
                <p className="ml-3">No active weather alerts affecting major routes</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <QuickActions />

      <Card className="p-4 border-border/50">
        <div className="flex items-center justify-between text-sm text-text-secondary">
          <span>Data refreshes every 60 seconds • Baltic indices from investing.com/TradingView • Freight rates from Baltic Exchange route assessments • Port congestion estimated from MarineTraffic patterns</span>
          <a
            href="/api/realtime/all"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-accent hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View Raw API
          </a>
        </div>
      </Card>
    </div>
  );
}