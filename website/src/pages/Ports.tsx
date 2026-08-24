import type { ColumnDef } from "@tanstack/react-table";
import { Ship } from "lucide-react";
import DataTable from "@/components/DataTable";
import GlassCard from "@/components/GlassCard";
import StatCard from "@/components/StatCard";
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

export default function PortsPage() {
  const ports: Port[] = (portData.ports ?? []) as Port[];
  const avgCost = ports.length
    ? ports.reduce((a, p) => a + p.port_cost_per_tonne, 0) / ports.length
    : 0;
  const totalBerths = ports.reduce((a, p) => a + (p.berths ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-text-primary">Ports</h2>
        <p className="text-sm text-text-secondary/60">
          {ports.length.toLocaleString()} port records in the database.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
      </div>

      <GlassCard className="p-6">
        <DataTable
          columns={portColumns}
          data={ports}
          className="border-0 bg-transparent"
        />
      </GlassCard>
    </div>
  );
}
