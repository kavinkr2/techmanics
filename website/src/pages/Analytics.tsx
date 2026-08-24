import { useEffect, useState, useMemo } from "react";
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  Zap,
  DollarSign,
  Ship,
  Settings,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import GlassCard from "@/components/GlassCard";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import Select from "@/components/Select";
import { api, type OptimizeResult } from "@/lib/api";
import { fmt, fmtInt } from "@/lib/utils";

type Scenario = {
  id: string;
  label: string;
  shock: boolean;
  cargo: number;
  origin: string;
  destination: string;
  commodity: string;
};

const SCENARIOS: Scenario[] = [
  { id: "base", label: "Base Case", shock: false, cargo: 80000, origin: "Australia", destination: "Paradip", commodity: "Iron Ore" },
  { id: "high", label: "High Volume", shock: false, cargo: 150000, origin: "Australia", destination: "Paradip", commodity: "Iron Ore" },
  { id: "shock", label: "Market Shock", shock: true, cargo: 80000, origin: "Australia", destination: "Paradip", commodity: "Iron Ore" },
  { id: "coal", label: "Coal Import", shock: false, cargo: 50000, origin: "Indonesia", destination: "Paradip", commodity: "Coal" },
  { id: "brazil", label: "Brazil Route", shock: false, cargo: 80000, origin: "Brazil", destination: "Paradip", commodity: "Iron Ore" },
];

function ScenarioCard({ scenario, result, selected, onClick }: { 
  scenario: Scenario; 
  result: OptimizeResult | null; 
  selected: boolean; 
  onClick: () => void;
}) {
  const riskLevel = result?.scenario_analysis?.length 
    ? result.scenario_analysis.reduce((max, s) => Math.max(max, s.total_cost * s.probability), 0) / result.total_cost
    : 0;
  
  const riskLabel = riskLevel > 1.2 ? "High" : riskLevel > 1.0 ? "Medium" : "Low";
  const riskColor = riskLevel > 1.2 ? "text-rose-400" : riskLevel > 1.0 ? "text-amber-400" : "text-emerald-400";
  
  return (
    <GlassCard 
      className={`p-4 cursor-pointer transition-all ${selected ? "border-accent/50 bg-accent/5" : "hover:border-border/50"}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selected ? "bg-accent/20" : "bg-surface-2/40"}`}>
            {scenario.shock ? <Zap className="h-5 w-5 text-amber-400" /> : <Ship className="h-5 w-5 text-blue-400" />}
          </div>
          <div>
            <h4 className="font-medium text-text-primary">{scenario.label}</h4>
            <p className="text-xs text-text-secondary/60">
              {scenario.cargo.toLocaleString()}t · {scenario.origin} → {scenario.destination}
            </p>
          </div>
        </div>
        {selected && <div className="w-2 h-full bg-accent rounded-r-lg" />}
      </div>
      
      {result && (
        <div className="mt-4 pt-4 border-t border-border/30 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Optimal</span>
            <span className="font-medium text-text-primary">{result.optimal_port} · {result.optimal_vessel}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Expected Cost</span>
            <span className="font-bold text-text-primary">${fmt(result.total_cost)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Per Tonne</span>
            <span className="font-medium text-text-primary">${fmt(result.expected_cost_per_tonne)}/t</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">Risk:</span>
            <Badge variant="outline" className={`text-xs ${riskColor}`}>
              {riskLabel}
            </Badge>
          </div>
        </div>
      )}
      
      {!result && (
        <div className="mt-4 pt-4 border-t border-border/30 text-center text-text-secondary/60 text-sm">
          Click to run optimization
        </div>
      )}
    </GlassCard>
  );
}

function ScenarioComparisonChart({ results }: { results: Map<string, OptimizeResult> }) {
  const chartData = useMemo(() => {
    const data: Array<{
      scenario: string;
      charter: number;
      fuel: number;
      port: number;
      risk: number;
      total: number;
    }> = [];
    results.forEach((result, key) => {
      if (!result) return;
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
    return (
      <GlassCard className="p-8 h-full">
        <div className="text-center text-text-secondary">Run scenarios to compare costs</div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6 h-full">
      <h3 className="text-lg font-medium text-text-primary mb-4">Cost Breakdown by Scenario</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.005 260)" vertical={false} />
            <XAxis type="number" tick={{ fill: "oklch(0.45 0.01 260)", fontSize: 11 }} tickFormatter={(v) => `$${fmt(v/1e6)}M`} />
            <YAxis dataKey="scenario" type="category" tick={{ fill: "oklch(0.45 0.01 260)", fontSize: 11 }} width={80} />
            <Tooltip
                          contentStyle={{
                            backgroundColor: "oklch(0.15 0.02 260 / 0.9)",
                            border: "1px solid oklch(0.9 0.005 260)",
                            borderRadius: "0.75rem",
                            color: "oklch(0.98 0 0)",
                          }}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          formatter={(value: any) => [value != null ? fmt(value) : "—", "USD"]}
            />
            <Legend />
            <Bar dataKey="charter" stackId="a" fill="#3b82f6" name="Charter" radius={[0, 4, 4, 0]} />
            <Bar dataKey="fuel" stackId="a" fill="#f59e0b" name="Fuel" />
            <Bar dataKey="port" stackId="a" fill="#10b981" name="Port" />
            <Bar dataKey="risk" stackId="a" fill="#ef4444" name="Risk Premium" radius={[4, 0, 0, 4]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

function RiskMetricsPanel({ result }: { result: OptimizeResult | null }) {
  if (!result?.scenario_analysis?.length) {
    return (
      <GlassCard className="p-6 h-full">
        <div className="text-center text-text-secondary">Run a scenario to see risk metrics</div>
      </GlassCard>
    );
  }

  const scenarios = result.scenario_analysis;
  const expectedCost = scenarios.reduce((sum, s) => sum + s.total_cost * s.probability, 0);
  const worstCase = Math.max(...scenarios.map(s => s.total_cost));
  const bestCase = Math.min(...scenarios.map(s => s.total_cost));
  const var95 = scenarios
    .sort((a, b) => a.total_cost - b.total_cost)
    .reduce((acc, s, i, arr) => {
      acc += s.probability;
      if (acc >= 0.95) return s.total_cost;
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

  return (
    <GlassCard className="p-6 h-full">
      <h3 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2">
        <Shield className="h-5 w-5 text-amber-400" />
        Risk Metrics
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((m, i) => (
          <div key={i} className="p-4 rounded-xl bg-surface-2/40">
            <div className="flex items-center gap-2 mb-2">
              <m.icon className={`h-4 w-4 ${m.color}`} />
              <span className="text-xs text-text-secondary uppercase tracking-wider">{m.label}</span>
            </div>
            <p className="text-xl font-bold text-text-primary">{m.value}</p>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-border/30">
        <h4 className="text-sm font-medium text-text-secondary mb-3">Scenario Distribution</h4>
        <div className="space-y-2">
          {scenarios.map((s) => (
            <div key={s.scenario_id} className="flex items-center gap-3">
              <div className="w-20 text-xs text-text-secondary">{s.scenario_id}</div>
              <div className="flex-1 h-2 bg-surface-2/40 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent/50 rounded-full transition-all"
                  style={{ width: `${s.probability * 100}%` }}
                />
              </div>
              <div className="w-24 text-right text-sm font-mono text-text-primary">
                ${fmt(s.total_cost)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

export default function AnalyticsPage() {
  const [results, setResults] = useState<Map<string, OptimizeResult>>(new Map());
  const [selectedScenario, setSelectedScenario] = useState<string>("base");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runScenario = async (scenario: Scenario) => {
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
    } catch (err: any) {
      setError(err?.message ?? "Optimization failed");
    } finally {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">Scenario Analysis & Risk Metrics</h2>
          <p className="text-sm text-text-secondary/60">
            Compare chartering strategies across market conditions and quantify risk exposure
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={runAllScenarios} disabled={loading !== null} icon={<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />}>
            Run All Scenarios
          </Button>
          <Button variant="primary" onClick={() => runScenario(SCENARIOS[0])} disabled={loading !== null} icon={<Download className="h-4 w-4" />}>
            Export Report
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-400">
          {error}
        </div>
      )}

      {/* Scenario Selector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {SCENARIOS.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            result={results.get(scenario.id) || null}
            selected={selectedScenario === scenario.id}
            onClick={() => {
              setSelectedScenario(scenario.id);
              if (!results.has(scenario.id)) {
                runScenario(scenario);
              }
            }}
          />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Scenario Comparison Chart */}
        <div className="lg:col-span-2">
          <ScenarioComparisonChart results={results} />
        </div>

        {/* Risk Metrics Panel */}
        <RiskMetricsPanel result={selectedResult} />
      </div>

      {/* Detailed Scenario View */}
      {selectedResult && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-text-primary">Detailed Analysis: {SCENARIOS.find(s => s.id === selectedScenario)?.label}</h3>
            <Badge variant={selectedResult.solver_status === "OPTIMAL" ? "success" : "warning"}>
              {selectedResult.solver_status}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <GlassCard className="p-4">
              <p className="text-xs text-text-secondary uppercase tracking-wider">Vessel Allocation</p>
              <div className="mt-2 space-y-2">
                {selectedResult.vessels_used.map((v, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-text-secondary">{v.vessel_class} ({v.vessel_id})</span>
                    <span className="font-medium text-text-primary">{v.tonnes.toLocaleString()}t / {v.dwt.toLocaleString()} DWT</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <p className="text-xs text-text-secondary uppercase tracking-wider">Route Details</p>
              <div className="mt-2 space-y-2">
                {selectedResult.routes_used.map((r, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-text-secondary">{r.origin} → {r.destination}</span>
                    <span className="font-medium text-text-primary">{r.distance_nm.toLocaleString()} nm · {r.transit_days}d</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <p className="text-xs text-text-secondary uppercase tracking-wider">Cost Summary</p>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Total Cost</span>
                  <span className="font-bold text-text-primary">${fmt(selectedResult.total_cost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Per Tonne</span>
                  <span className="font-medium text-text-primary">${fmt(selectedResult.expected_cost_per_tonne)}/t</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Tranches</span>
                  <span className="font-medium text-text-primary">{selectedResult.tranches}</span>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Scenario Analysis Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-secondary">Scenario</th>
                  <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-secondary">Probability</th>
                  <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-secondary">Freight Mult.</th>
                  <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-secondary">Fuel Cost</th>
                  <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-secondary">Weather Delay</th>
                  <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-secondary">Congestion</th>
                  <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-secondary">Total Cost</th>
                  <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-secondary">Weighted</th>
                </tr>
              </thead>
              <tbody>
                {selectedResult.scenario_analysis.map((s) => (
                  <tr key={s.scenario_id} className="border-b border-border/20 hover:bg-surface-2/40">
                    <td className="px-4 py-3 font-medium text-text-primary">{s.scenario_id}</td>
                    <td className="px-4 py-3 text-right text-text-secondary">{Math.round(s.probability * 100)}%</td>
                    <td className="px-4 py-3 text-right text-text-secondary">{s.freight_multiplier}x</td>
                    <td className="px-4 py-3 text-right text-text-secondary">${s.fuel_cost}/t</td>
                    <td className="px-4 py-3 text-right text-text-secondary">{s.weather_delay}d</td>
                    <td className="px-4 py-3 text-right text-text-secondary">{s.congestion_factor}x</td>
                    <td className="px-4 py-3 text-right font-medium text-text-primary">${fmt(s.total_cost)}</td>
                    <td className="px-4 py-3 text-right font-medium text-accent">${fmt(Math.round(s.total_cost * s.probability))}</td>
                  </tr>
                ))}
                <tr className="bg-surface-2/40 font-bold">
                  <td className="px-4 py-3">Expected Value</td>
                  <td className="px-4 py-3 text-right">100%</td>
                  <td className="px-4 py-3 text-right">—</td>
                  <td className="px-4 py-3 text-right">—</td>
                  <td className="px-4 py-3 text-right">—</td>
                  <td className="px-4 py-3 text-right">—</td>
                  <td className="px-4 py-3 text-right">—</td>
                  <td className="px-4 py-3 text-right text-accent">${fmt(selectedResult.scenario_analysis.reduce((sum, s) => sum + s.total_cost * s.probability, 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}