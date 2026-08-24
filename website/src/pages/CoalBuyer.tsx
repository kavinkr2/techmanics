import { useState } from "react";
import { Loader2, ArrowRight, ChevronDown, ChevronUp, Globe, Ship, Clock, DollarSign, TrendingDown, CheckCircle, AlertTriangle } from "lucide-react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Label from "@/components/Label";
import Select from "@/components/Select";
import Badge from "@/components/Badge";
import { api } from "@/lib/api";
import { fmt } from "@/lib/utils";

export default function CoalBuyerPage() {
  const [quantity, setQuantity] = useState(80000);
  const [destination, setDestination] = useState("Paradip");
  const [shock, setShock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [bestOption, setBestOption] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.realtime.coalBuy({ quantity_tonnes: quantity, destination_port: destination, shock_scenario: shock });
      setResults(res.data.options);
      setBestOption(res.data.best_option);
    } catch (err: any) {
      setError(err?.message ?? "Failed to find coal options");
    } finally {
      setLoading(false);
    }
  };

  const ports = ["Paradip", "Visakhapatnam", "Mundra", "Krishnapatnam", "Kamarajar", "Chennai", "Kolkata", "Mumbai"];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-text-primary">Coal Procurement</h2>
        <p className="text-sm text-text-secondary/60">
          Enter quantity to find the least costly coal options from global origins.
        </p>
      </div>

      <Card className="p-5">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Label htmlFor="quantity">Quantity (tonnes)</Label>
            <Input
              id="quantity"
              type="number"
              min={1000}
              max={500000}
              step={1000}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <Label htmlFor="destination">Destination Port</Label>
            <Select id="destination" value={destination} onChange={(e) => setDestination(e.target.value)}>
              {ports.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </div>
          <div className="sm:col-span-2 flex items-end gap-3">
            <div className="flex items-center gap-3 rounded-[10px] border border-border bg-surface-muted px-4 py-2.5">
              <input
                id="shock"
                type="checkbox"
                checked={shock}
                onChange={(e) => setShock(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-accent focus:ring-accent/30"
              />
              <Label htmlFor="shock" className="mb-0 text-sm font-medium cursor-pointer">
                Shock scenario (higher fuel, delays)
              </Label>
            </div>
          </div>

          <div className="sm:col-span-3 flex justify-end gap-3 border-t border-border/50 pt-4">
            <Button type="button" variant="secondary" onClick={() => { setQuantity(80000); setDestination("Paradip"); setShock(false); setResults([]); setBestOption(null); setError(null); }}>
              Reset
            </Button>
            <Button type="submit" variant="primary" disabled={loading || quantity < 1} icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}>
              {loading ? "Finding Options…" : "Find Best Options"}
            </Button>
          </div>
        </form>
      </Card>

      {error && (
        <div className="rounded-[10px] border border-warning/30 bg-warning/5 p-4 text-sm text-warning">
          {error}
        </div>
      )}

      {bestOption && (
              <Card className="p-5 border-success/30 bg-success/5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-text-primary">Best Option</h3>
                  <Badge variant="success">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Lowest Total Cost
                  </Badge>
                </div>
                <OptionCard option={bestOption} highlight destination={destination} />
              </Card>
            )}

      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-text-primary">
            All Options ({results.length} sources)
          </h3>
          {results.map((opt, i) => (
                      <OptionCard key={`${opt.origin_country}-${opt.origin_port}`} option={opt} index={i} destination={destination} expanded={expanded[i] || false} onToggle={() => setExpanded({ ...expanded, [i]: !expanded[i] })} />
                    ))}
        </div>
      )}

      {results.length === 0 && !loading && (
        <Card className="p-8 text-center">
          <Globe className="h-12 w-12 mx-auto text-text-muted/50" />
          <p className="mt-3 text-text-secondary">Enter quantity and click "Find Best Options" to see coal procurement options.</p>
        </Card>
      )}
    </div>
  );
}

function OptionCard({ option, index, highlight, destination, expanded, onToggle }: { option: any; index?: number; highlight?: boolean; destination?: string; expanded?: boolean; onToggle?: () => void }) {
  const riskColor = option.draft_limit_m < 12 ? "text-warning" : "text-success";
  const dest = destination ?? "Paradip";
  
  return (
    <Card className={highlight ? "border-success/30 bg-success/5" : ""}>
      <div className="flex items-start justify-between gap-4 p-4" onClick={onToggle} style={{ cursor: onToggle ? "pointer" : "default" }}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-[10px] bg-accent-light flex items-center justify-center shrink-0">
            <Globe className="h-6 w-6 text-accent" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-text-primary truncate">{option.origin_country}</h4>
              <Badge variant="info" className="text-xs">{option.coal_grade}</Badge>
            </div>
            <p className="text-sm text-text-secondary truncate">{option.origin_port} → {dest}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="text-2xl font-bold text-text-primary">${option.total_cost_usd_per_tonne}/t</div>
          <div className="text-sm text-text-secondary">Total: ${fmt(option.total_cost_usd)}</div>
          <div className="flex items-center gap-1 text-xs text-text-secondary">
            <Clock className="h-3.5 w-3.5" />
            <span>{option.estimated_days} days transit</span>
          </div>
        </div>
        {onToggle && (
          <div className="flex shrink-0">
            {expanded ? <ChevronUp className="h-5 w-5 text-text-secondary" /> : <ChevronDown className="h-5 w-5 text-text-secondary" />}
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-border/50 p-4 bg-surface-muted/50 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <DetailRow label="FOB" value={`${option.fob_usd_per_tonne} $/t`} total={`Total: $${fmt(option.fob_total_usd)}`} />
          <DetailRow label="Freight" value={`${option.freight_usd_per_tonne} $/t`} total={`Total: $${fmt(option.freight_total_usd)}`} />
          <DetailRow label="Load Port" value={`${option.load_port_cost_usd_per_tonne} $/t`} />
          <DetailRow label="Discharge Port" value={`${option.discharge_port_cost_usd_per_tonne} $/t`} />
          <DetailRow label="Vessel" value={option.optimal_vessel} total={`Class: ${option.vessel_class}`} />
          <DetailRow label="Draft Limit" value={`${option.draft_limit_m} m`} total={<span className={riskColor}>Draft: {option.draft_limit_m}m</span>} />
          <DetailRow label="Transit Time" value={`${option.estimated_days} days`} />
          <DetailRow label="Grade" value={option.coal_grade} />
        </div>
      )}
    </Card>
  );
}

function DetailRow({ label, value, total }: { label: string; value: string; total?: string | React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs uppercase tracking-wider text-text-secondary">{label}</p>
      <p className="font-medium text-text-primary">{value}</p>
      {total && <p className="text-xs text-text-secondary">{typeof total === "string" ? total : total}</p>}
    </div>
  );
}