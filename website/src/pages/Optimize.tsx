import { useState } from "react";
import { Package, Ship, TrendingUp, BarChart3 } from "lucide-react";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import Input from "@/components/Input";
import Label from "@/components/Label";
import Select from "@/components/Select";
import StatCard from "@/components/StatCard";
import { api, type OptimizeResponse } from "@/lib/api";
import { fmt } from "@/lib/utils";

export default function OptimizePage() {
  const [cargo, setCargo] = useState(80000);
  const [shock, setShock] = useState(false);
  const [originRegion, setOriginRegion] = useState("Australia");
  const [destinationPort, setDestinationPort] = useState("Paradip");
  const [commodity, setCommodity] = useState("Iron Ore");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.optimize({ 
        cargo_tons: cargo, 
        shock_scenario: shock,
        origin_region: originRegion,
        destination_port: destinationPort,
        commodity: commodity,
      });
      setResult(res);
    } catch (err: any) {
      setError(err?.message ?? "Optimization failed");
    } finally {
      setLoading(false);
    }
  };

  const originRegions = ["Australia", "Brazil", "South Africa", "Colombia", "USA", "Indonesia"];
  const destinationPorts = ["Paradip", "Visakhapatnam", "Mundra", "Krishnapatnam", "Kamarajar", "Chennai", "Kolkata", "Mumbai"];
  const commodities = ["Iron Ore", "Coal", "Bauxite", "Manganese Ore", "Limestone", "Fertilizer"];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-text-primary">
          Vessel Optimizer
        </h2>
        <p className="text-sm text-text-secondary/60">
          Enter cargo volume & shock scenario to find the optimal port + vessel
          combination.
        </p>
      </div>

      <GlassCard className="p-6">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div className="sm:col-span-2 lg:col-span-3">
                  <Label htmlFor="cargo">Cargo Volume (tonnes)</Label>
                  <Input
                    id="cargo"
                    type="number"
                    min={1000}
                    max={500000}
                    step={1000}
                    value={cargo}
                    onChange={(e) => setCargo(Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="originRegion">Origin Region</Label>
                  <Select id="originRegion" value={originRegion} onChange={(e) => setOriginRegion(e.target.value)}>
                    {originRegions.map((r) => <option key={r} value={r}>{r}</option>)}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="destinationPort">Destination Port</Label>
                  <Select id="destinationPort" value={destinationPort} onChange={(e) => setDestinationPort(e.target.value)}>
                    {destinationPorts.map((p) => <option key={p} value={p}>{p}</option>)}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="commodity">Commodity</Label>
                  <Select id="commodity" value={commodity} onChange={(e) => setCommodity(e.target.value)}>
                    {commodities.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </div>
                <div className="lg:col-span-3 flex items-center gap-3 rounded-xl border border-border bg-surface-2/40 px-4 py-2.5">
                  <input
                    id="shock"
                    type="checkbox"
                    checked={shock}
                    onChange={(e) => setShock(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-accent focus:ring-accent/50"
                  />
                  <Label htmlFor="shock" className="mb-0 text-sm font-medium cursor-pointer">
                    Shock scenario
                  </Label>
                </div>

                <div className="lg:col-span-3 flex justify-end gap-3 border-t border-border/30 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCargo(80000);
                setShock(false);
                setResult(null);
                setError(null);
              }}
            >
              Reset
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading || cargo < 1}
              icon={loading ? <span className="animate-spin">⋯</span> : <TrendingUp className="h-4 w-4" />}
            >
              {loading ? "Optimizing…" : "Run Optimizer"}
            </Button>
          </div>
        </form>
      </GlassCard>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-400">
          {error}
        </div>
      )}

      {result?.status === "success" && result.data && (
        <ResultPanel data={result.data} />
      )}
    </div>
  );
}

function ResultPanel({ data }: { data: NonNullable<OptimizeResponse["data"]> }) {
  const steps = [
    { label: "Optimal Port", value: data.optimal_port, icon: <Ship className="h-4 w-4" /> },
    { label: "Optimal Vessel", value: data.optimal_vessel, icon: <Package className="h-4 w-4" /> },
    { label: "Total Cost", value: fmt(data.total_cost, { prefix: "$", suffix: " k" }), icon: <BarChart3 className="h-4 w-4" /> },
  ];
  return (
    <GlassCard className="p-6">
      <h3 className="text-sm font-medium text-text-secondary/70 uppercase tracking-wider">
        Optimization Result
      </h3>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {steps.map((s) => (
          <StatCard
            key={s.label}
            title={s.label}
            value={s.value}
            icon={s.icon}
            trend="up"
          />
        ))}
      </div>
    </GlassCard>
  );
}
