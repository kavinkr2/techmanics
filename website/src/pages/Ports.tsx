import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Ship, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from "recharts";
import DataTable from "@/components/DataTable";
import GlassCard from "@/components/GlassCard";
import StatCard from "@/components/StatCard";
import Badge from "@/components/Badge";
import { fmt } from "@/lib/utils";
import portData from "@/assets/port_data.json";

type Port = {
  port_id: string;
  name: string;
  draft_limit: number;
  loa_limit: number;
  beam_limit: number;
  berths: number;
  port_cost_per_tonne: number;
};

type Cargo = {
  cargo_id: string;
  commodity: string;
  demand_tonnes: number;
  min_parcel_size: number;
  max_tranches: number;
};

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
    header: "Draft (m)",
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

function CargoDemandChart() {
  const cargo = (portData.cargo ?? []) as Cargo[];
  const byCommodity = useMemo(() => {
    const m = new Map<string, number>();
    cargo.forEach((c) => m.set(c.commodity, (m.get(c.commodity) ?? 0) + c.demand_tonnes));
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([commodity, demand]) => ({ commodity, demand }));
  }, [cargo]);

  const colors = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4"];

  return (
    <GlassCard className="p-5 mb-6">
      <h3 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-accent" />
        Cargo Demand by Commodity
      </h3>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byCommodity} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.005 260)" vertical={false} />
            <XAxis dataKey="commodity" tick={{ fill: "oklch(0.45 0.01 260)", fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "oklch(0.45 0.01 260)", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1e6}M`} />
            <Tooltip
              contentStyle={{ backgroundColor: "oklch(0.15 0.02 260 / 0.9)", border: "1px solid oklch(0.9 0.005 260)", borderRadius: "0.75rem", color: "oklch(0.98 0 0)" }}
              formatter={(value: any) => [fmt(value, { suffix: " t" }), "Demand"]}
            />
            <Bar dataKey="demand" radius={[4, 4, 0, 0]}>
              {byCommodity.map((_, i) => <Cell key={`cell-${i}`} fill={colors[i % colors.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

function PortUtilizationChart({ ports }: { ports: Port[] }) {
  const berthLoad = useMemo(() => {
    return ports
      .filter((p) => p.berths > 0)
      .map((p) => ({
        name: p.name,
        berths: p.berths,
        cost: p.port_cost_per_tonne,
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 8);
  }, [ports]);

  if (!berthLoad.length) {
    return null;
  }

  return (
    <GlassCard className="p-5 mb-6">
      <h3 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2">
        <PieChartIcon className="h-5 w-5 text-accent" />
        Port Cost Overview
      </h3>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={berthLoad} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.005 260)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "oklch(0.45 0.01 260)", fontSize: 9 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "oklch(0.45 0.01 260)", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              contentStyle={{ backgroundColor: "oklch(0.15 0.02 260 / 0.9)", border: "1px solid oklch(0.9 0.005 260)", borderRadius: "0.75rem", color: "oklch(0.98 0 0)" }}
              formatter={(value: any) => [`$${value}/t`, "Cost"]}
            />
            <Bar dataKey="cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

export default function PortsPage() {
  const ports: Port[] = (portData.ports ?? []) as Port[];
  const cargo = (portData.cargo ?? []) as Cargo[];
  const avgCost = ports.length
    ? ports.reduce((a, p) => a + p.port_cost_per_tonne, 0) / ports.length
    : 0;
  const totalBerths = ports.reduce((a, p) => a + (p.berths ?? 0), 0);
  const maxDraft = ports.length ? Math.max(...ports.map((p) => p.draft_limit ?? 0)) : 0;
  const maxLOA = ports.length ? Math.max(...ports.map((p) => p.loa_limit ?? 0)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">Ports & Infrastructure</h2>
          <p className="text-sm text-text-secondary/60 mt-0.5">
            {ports.length.toLocaleString()} port records · Indian East Coast coal import corridor
          </p>
        </div>
        <Badge variant="default">{cargo.length.toLocaleString()} cargo records</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
        <StatCard
          title="Total Ports"
          value={ports.length}
          icon={<Ship className="h-5 w-5" />}
        />
        <StatCard
          title="Avg Cost/t"
          value={fmt(avgCost, { prefix: "$" })}
        />
        <StatCard
          title="Total Berths"
          value={totalBerths}
        />
        <StatCard
          title="Max Draft (m)"
          value={fmt(maxDraft)}
        />
        <StatCard
          title="Max LOA (m)"
          value={fmt(maxLOA)}
        />
      </div>

      <CargoDemandChart />
      <PortUtilizationChart ports={ports} />

      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-text-primary">Port Database</h3>
          <Badge variant="default">{ports.length} entries</Badge>
        </div>
        <DataTable
          columns={portColumns}
          data={ports}
          className="border-0 bg-transparent"
        />
      </GlassCard>
    </div>
  );
}
