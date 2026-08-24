import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Calendar, Download, TrendingUp } from "lucide-react";
import { useForecast } from "@/hooks/useForecast";
import StatCard from "@/components/StatCard";
import GlassCard from "@/components/GlassCard";
import Button from "@/components/Button";
import { fmt } from "@/lib/utils";

type RangeOption = 7 | 14 | 30 | 90;

export default function ForecastPage() {
  const [days, setDays] = useState<RangeOption>(30);
  const { data, loading, error } = useForecast(days);

  const chartData = useMemo(
    () =>
      data.map((r) => ({
        date: r.date.slice(5), // MM-DD
        full: r.date,
        forecast: r.base_forecast,
        lower: r.lower_bound,
        upper: r.upper_bound,
      })),
    [data]
  );

  const avg = data.length
    ? data.reduce((a, r) => a + r.base_forecast, 0) / data.length
    : 0;
  const latest = data[data.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">
            Freight Rate Forecast
          </h2>
          <p className="text-sm text-text-secondary/60">
            Probabilistic 30-day outlook (USD/tonne)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-border bg-surface-2/40 p-1 text-xs">
            {(
              [7, 14, 30, 90] as RangeOption[]
            ).map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cn(
                  "rounded-lg px-3 py-1.5 font-medium transition-all",
                  days === d
                    ? "bg-accent/20 text-accent"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface/40"
                )}
              >
                {d}d
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon={<Calendar className="h-4 w-4" />}
            onClick={() => {}}
          >
            {new Date().toLocaleDateString()}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Download className="h-4 w-4" />}
            onClick={() => {
              const csv = [
                "date,forecast,lower_bound,upper_bound",
                ...data.map(
                  (r) =>
                    `${r.date},${r.base_forecast},${r.lower_bound},${r.upper_bound}`
                ),
              ].join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "freight-forecast.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-amber-400">{error}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                title="Current Rate"
                value={latest ? fmt(latest.base_forecast, { suffix: " $/t" }) : "—"}
                icon={<TrendingUp className="h-5 w-5" />}
              />
              <StatCard
          title="Confidence Band"
          value={
            latest
              ? `${fmt(latest.lower_bound)}–${fmt(latest.upper_bound)}`
              : "—"
          }
          subtitle="$/tonne"
        />
        <StatCard
          title="Period Avg"
          value={fmt(avg, { suffix: " $/t" })}
        />
      </div>

      <GlassCard className="p-6">
        <ResponsiveContainer width="100%" height={360}>
          <AreaChart data={chartData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fcGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.27 0.01 260)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "oklch(0.72 0 0)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: "oklch(0.72 0 0)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
              domain={["dataMin - 1", "dataMax + 1"]}
            />
            <Tooltip
                          contentStyle={{
                            backgroundColor: "oklch(0.18 0.02 260 / 0.85)",
                            border: "1px solid oklch(0.30 0.01 260)",
                            borderRadius: "0.75rem",
                            color: "oklch(0.92 0 0)",
                          }}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          formatter={(value: any) => [
                            value != null && typeof value === "number" ? fmt(value) : "—",
                            "Rate",
                          ]}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          labelFormatter={(label: any) => `Date: ${label}`}
                        />
            <Area
              type="monotone"
              dataKey="forecast"
              stroke="oklch(0.70 0.20 250)"
              strokeWidth={2.5}
              fill="url(#fcGradient)"
              fillOpacity={1}
              dot={false}
              isAnimationActive={!loading}
            />
            <Area
              type="monotone"
              dataKey="upper"
              stroke="oklch(0.70 0.20 250 / 0.4)"
              strokeWidth={1}
              fill="none"
              strokeDasharray="4 4"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="lower"
              stroke="oklch(0.70 0.20 250 / 0.4)"
              strokeWidth={1}
              fill="none"
              strokeDasharray="4 4"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>
  );
}

function cn(...cls: string[]) {
  return cls.filter(Boolean).join(" ");
}
