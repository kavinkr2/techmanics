import { Anchor, Clock, MapPin, TrendingUp, ArrowRight, Ship } from "lucide-react";
import GlassCard from "@/components/GlassCard";

const idleVessels = [
  {
    name: "MV Ocean Pioneer",
    idleDays: 4,
    location: "Port of Mundra",
    costPerDay: 18400,
    aiSuggestion: "Backhaul coal from Paradip to Chittagong — $3.20/MT rate active",
    aiMatch: "Iron Ore / Coal",
  },
  {
    name: "MV Pacific Drift",
    idleDays: 7,
    location: "Visakhapatnam Anchorage",
    costPerDay: 22100,
    aiSuggestion: "Reposition to Chennai for coke load — 2-day transit",
    aiMatch: "Coke / Limestone",
  },
  {
    name: "MV Atlantic Tide",
    idleDays: 2,
    location: "Port of Paradip",
    costPerDay: 16800,
    aiSuggestion: "Backhaul limestone to Kamarajar — immediate cargo available",
    aiMatch: "Coal / Coke",
  },
  {
    name: "MV Indian Star",
    idleDays: 9,
    location: "Mundra Outer Anchorage",
    costPerDay: 25400,
    aiSuggestion: "Reposition to Mumbai for coal cargo — shock scenario favorable",
    aiMatch: "Coal / Iron Ore",
  },
];

export default function IdleVesselPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-text-primary">Idle Vessel Management</h2>
        <p className="text-sm text-text-secondary/60">
          Monitor idle vessels, holding costs, and AI-recommended backhaul/repositioning matches.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <GlassCard className="p-5">
          <p className="text-xs uppercase tracking-wider text-text-secondary/60">Idle Vessels</p>
          <p className="text-2xl font-semibold text-text-primary">{idleVessels.length}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-xs uppercase tracking-wider text-text-secondary/60">Total Idle Days</p>
          <p className="text-2xl font-semibold text-text-primary">{idleVessels.reduce((a,b)=>a+b.idleDays,0)}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-xs uppercase tracking-wider text-text-secondary/60">Avg Daily Cost</p>
          <p className="text-2xl font-semibold text-text-primary">${(idleVessels.reduce((a,b)=>a+b.costPerDay,0)/idleVessels.length/1000).toFixed(1)}k</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-xs uppercase tracking-wider text-text-secondary/60">AI Matches</p>
          <p className="text-2xl font-semibold text-text-primary">{idleVessels.length}</p>
        </GlassCard>
      </div>

      <div className="space-y-4">
        {idleVessels.map((v) => (
          <GlassCard key={v.name} className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-accent/15 p-2 text-accent"><Ship className="h-5 w-5" /></div>
                <div>
                  <h3 className="font-semibold text-text-primary">{v.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-text-secondary/60 mt-1">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{v.location}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{v.idleDays} days idle</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-text-primary">${v.costPerDay.toLocaleString()}/day</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-border/30 bg-surface-2/30 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-accent" />
                <span className="text-xs font-semibold uppercase tracking-wider text-accent">AI Suggestion</span>
              </div>
              <p className="text-sm text-text-primary">{v.aiSuggestion}</p>
              <p className="text-xs text-text-secondary/50 mt-1">Match: {v.aiMatch}</p>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
