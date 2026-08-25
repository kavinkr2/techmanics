import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  BarChart3,
  Package,
  Ship,
  TrendingUp,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Pie,
  PieChart,
  Cell,
} from "recharts";
import DataTable from "@/components/DataTable";
import GlassCard from "@/components/GlassCard";
import StatCard from "@/components/StatCard";
import Badge from "@/components/Badge";
import { fmt } from "@/lib/utils";
import portData from "@/assets/port_data.json";

type Cargo = {
  cargo_id: string;
  commodity: string;
  demand_tonnes: number;
  min_parcel_size: number;
  max_tranches: number;
};

type Port = {
  port_id: string;
  name: string;
  draft_limit: number;
  loa_limit: number;
  beam_limit: number;
  berths: number;
  port_cost_per_tonne: number;
};

const cargoColumns: ColumnDef<Cargo>[] = [
  {
    accessorKey: "cargo_id",
    header: "Cargo ID",
    cell: (info) => (
      <span className="font-mono text-xs text-accent">
        {info.getValue<string>()}
      </span>
    ),
  },
  { accessorKey: "commodity", header: "Commodity" },
  {
    accessorKey: "demand_tonnes",
    header: "Demand (t)",
    cell: (info) => fmt(info.getValue<number>()),
  },
  {
    accessorKey: "min_parcel_size",
    header: "Min Parcel (t)",
    cell: (info) => fmt(info.getValue<number>()),
  },
  { accessorKey: "max_tranches", header: "Tranches" },
];

const portColumns: ColumnDef<Port>[] = [
  {
    accessorKey: "port_id",
    header: "Port ID",
    cell: (info) => (
      <span className="font-mono text-xs text-accent">
        {info.getValue<string>()}
      </span>
    ),
  },
  { accessorKey: "name", header: "Name" },
  {
    accessorKey: "draft_limit",
    header: "Draft Limit (m)",
    cell: (info) => fmt(info.getValue<number>()),
  },
  {
    accessorKey: "loa_limit",
    header: "LOA (m)",
    cell: (info) => fmt(info.getValue<number>()),
  },
  {
    accessorKey: "beam_limit",
    header: "Beam (m)",
    cell: (info) => fmt(info.getValue<number>()),
  },
  { accessorKey: "berths", header: "Berths" },
  {
    accessorKey: "port_cost_per_tonne",
    header: "Cost/t",
    cell: (info) => fmt(info.getValue<number>(), { prefix: "$" }),
  },
];

function CargoChart() {
  const cargo: Cargo[] = (portData.cargo ?? []) as Cargo[];

  const byCommodity = useMemo(() => {
    const m = new Map<string, number>();
    cargo.forEach((c) => m.set(c.commodity, (m.get(c.commodity) ?? 0) + c.demand_tonnes));
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([commodity, demand]) => ({ commodity, demand }));
  }, [cargo]);

  const byParcelSize = useMemo(() => {
    const buckets = [
      { label: "<50k t", min: 0, max: 50000 },
      { label: "50k-100k t", min: 50001, max: 100000 },
      { label: "100k-150k t", min: 100001, max: 150000 },
      { label: "150k+ t", min: 150001, max: Infinity },
    ];
    return buckets.map((b) => ({
      label: b.label,
      count: cargo.filter((c) => c.demand_tonnes >= b.min && c.demand_tonnes <= b.max).length,
    }));
  }, [cargo]);

  const colors = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#f97316", "#06b6d4", "#4f46e5"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <GlassCard className="p-5">
        <h3 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-accent" />
          Demand by Commodity
        </h3>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byCommodity} layout="vertical" margin={{ top: 5, right: 24, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.005 260)" horizontal={true} vertical={false} />
              <XAxis type="number" tick={{ fill: "oklch(0.45 0.01 260)", fontSize: 10 }} tickFormatter={(v) => `${v / 1e6}M`} />
              <YAxis type="category" dataKey="commodity" tick={{ fill: "oklch(0.45 0.01 260)", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "oklch(0.15 0.02 260 / 0.9)", border: "1px solid oklch(0.9 0.005 260)", borderRadius: "0.75rem", color: "oklch(0.98 0 0)" }}
                formatter={(value: any) => [fmt(value, { suffix: " t" }), "Demand"]}
              />
              <Bar dataKey="demand" radius={[0, 4, 4, 0]}>
                {byCommodity.map((_, i) => <Cell key={`cell-${i}`} fill={colors[i % colors.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <h3 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-accent" />
          Parcel Size Distribution
        </h3>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={byParcelSize}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#3b82f6"
                paddingAngle={2}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {byParcelSize.map((_, i) => <Cell key={`cell-${i}`} fill={colors[i % colors.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "oklch(0.15 0.02 260 / 0.9)", border: "1px solid oklch(0.9 0.005 260)", borderRadius: "0.75rem", color: "oklch(0.98 0 0)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </div>
  );
}

export default function CargoPage() {
  const cargo: Cargo[] = (portData.cargo ?? []) as Cargo[];
  const totalDemand = cargo.reduce((a, c) => a + c.demand_tonnes, 0);
  const byCommodity = (() => {
    const m = new Map<string, number>();
    cargo.forEach((c) => m.set(c.commodity, (m.get(c.commodity) ?? 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  })();

  const topCommodities = byCommodity.slice(0, 5);
  const avgParcel = cargo.length > 0 ? cargo.reduce((a, c) => a + c.demand_tonnes, 0) / cargo.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">Cargo Management</h2>
          <p className="text-sm text-text-secondary/60 mt-0.5">
            {cargo.length.toLocaleString()} cargo records · Iron Ore & coal import pipeline for Ministry of Steel
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Package className="h-4 w-4" />
          <span>Avg Parcel: {fmt(avgParcel, { suffix: " t" })}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard
          title="Total Demand"
          value={fmt(totalDemand, { suffix: " t" })}
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          title="Top Commodity"
          value={byCommodity[0]?.[0] ?? "—"}
          subtitle={byCommodity[0]?.[1] ? `${byCommodity[0][1]} records` : undefined}
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <StatCard
          title="Commodity Types"
          value={byCommodity.length}
          icon={<Ship className="h-5 w-5" />}
        />
        <StatCard
          title="Avg Parcel Size"
          value={fmt(avgParcel, { suffix: " t" })}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <CargoChart />

      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-text-primary">Cargo Records</h3>
          <Badge variant="default">{cargo.length} entries</Badge>
        </div>
        <DataTable
          columns={cargoColumns}
          data={cargo}
          className="border-0 bg-transparent"
        />
      </GlassCard>
    </div>
  );
}
