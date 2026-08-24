import type { ColumnDef } from "@tanstack/react-table";
import { BarChart3, Package, Ship } from "lucide-react";
import DataTable from "@/components/DataTable";
import GlassCard from "@/components/GlassCard";
import StatCard from "@/components/StatCard";
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

export default function CargoPage() {
  const cargo: Cargo[] = (portData.cargo ?? []) as Cargo[];
  const totalDemand = cargo.reduce((a, c) => a + c.demand_tonnes, 0);
  const byCommodity = (() => {
    const m = new Map<string, number>();
    cargo.forEach((c) => m.set(c.commodity, (m.get(c.commodity) ?? 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  })();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-text-primary">Cargo</h2>
        <p className="text-sm text-text-secondary/60">
          {cargo.length.toLocaleString()} cargo records in the database.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Demand"
          value={fmt(totalDemand, { suffix: " t" })}
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          title="Top Commodity"
          value={byCommodity[0]?.[0] ?? "—"}
          subtitle={
            byCommodity[0]?.[1] ? `${byCommodity[0][1]} records` : undefined
          }
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <StatCard
          title="Commodity Types"
          value={byCommodity.length}
          icon={<Ship className="h-5 w-5" />}
        />
      </div>

      <GlassCard className="p-6">
        <DataTable
          columns={cargoColumns}
          data={cargo}
          className="border-0 bg-transparent"
        />
      </GlassCard>
    </div>
  );
}
