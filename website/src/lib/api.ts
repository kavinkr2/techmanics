/**
 * API client for the TechManics FastAPI backend.
 * Exposes typed wrappers around each endpoint.
 */

declare global {
  interface ImportMetaEnv {
    VITE_API_BASE: string;
  }
  interface ImportMeta {
    env: ImportMetaEnv;
  }
}

const base = (import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000").replace(/\/+$/, "");

export type HealthStatus = { status: string; timestamp?: string };

export type ForecastRecord = {
  date: string;
  base_forecast: number;
  lower_bound: number;
  upper_bound: number;
};

export type ForecastResponse = {
  status: string;
  data: ForecastRecord[];
};

export type OptimizeRequest = {
  cargo_tons: number;
  shock_scenario?: boolean;
  origin_region?: string;
  destination_port?: string;
  commodity?: string;
};

export type OptimizeResult = {
  optimal_port: string;
  optimal_vessel: string;
  total_cost: number;
  total_tonnes: number;
  tranches: number;
  vessels_used: Array<{
    vessel_class: string;
    vessel_id: string;
    tonnes: number;
    dwt: number;
    draft: number;
  }>;
  routes_used: Array<{
    route_id: string;
    origin: string;
    destination: string;
    distance_nm: number;
    transit_days: number;
  }>;
  scenario_analysis: Array<{
    scenario_id: string;
    probability: number;
    freight_multiplier: number;
    fuel_cost: number;
    weather_delay: number;
    congestion_factor: number;
    total_cost: number;
  }>;
  expected_cost_per_tonne: number;
  solver_status: string;
};

export type OptimizeResponse = {
  status: string;
  data: OptimizeResult;
};

export type CopilotResponse = {
  status: string;
  answer?: string;
  message?: string;
};

// ──────────────────────────────────────────────────
// Real-time data types
// ──────────────────────────────────────────────────

export type BalticIndices = {
  BDI: number;
  BCI: number;
  BPI: number;
  BSI: number;
  BHSI: number;
  timestamp: string;
  change: number;
  change_pct: number;
};

export type FreightRate = {
  route: string;
  vessel_type: string;
  rate_usd_per_day: number;
  rate_usd_per_tonne: number;
  source: string;
  timestamp: string;
};

export type PortCongestion = {
  port: string;
  congestion_pct: number;
  avg_wait_days: number;
  vessels_waiting: number;
  berth_utilization_pct: number;
  demurrage_risk: string;
  last_updated: string;
  source: string;
};

export type VesselPosition = {
  mmsi: string;
  imo: string;
  name: string;
  type: string;
  lat: number;
  lon: number;
  speed: number;
  course: number;
  status: string;
  draught: number;
  destination: string;
  eta: string;
  timestamp: string;
  source: string;
};

export type WeatherAlert = {
  event: string | null;
  severity: string | null;
  certainty: string | null;
  urgency: string | null;
  area: string | null;
  description: string;
  effective: string | null;
  expires: string | null;
};

export type RealtimeAll = {
  baltic_indices: BalticIndices;
  freight_rates: FreightRate[];
  port_congestion: PortCongestion[];
  weather_alerts: WeatherAlert[];
  fetched_at: string;
  server_time: string;
};

export type CoalBuyRequest = {
  quantity_tonnes: number;
  destination_port?: string;
  shock_scenario?: boolean;
};

export type CoalOption = {
  origin_country: string;
  origin_port: string;
  coal_grade: string;
  quantity_tonnes: number;
  fob_usd_per_tonne: number;
  fob_total_usd: number;
  freight_usd_per_tonne: number;
  freight_total_usd: number;
  load_port_cost_usd_per_tonne: number;
  discharge_port_cost_usd_per_tonne: number;
  total_cost_usd: number;
  total_cost_usd_per_tonne: number;
  optimal_vessel: string;
  vessel_class: string;
  estimated_days: number;
  draft_limit_m: number;
};

export type CoalBuyResponse = {
  status: string;
  data: {
    quantity_tonnes: number;
    destination_port: string;
    shock_scenario: boolean;
    options: CoalOption[];
    best_option: CoalOption | null;
  };
};

class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new ApiError(txt || `Request failed (${res.status})`, res.status);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Core endpoints
  health: () => request<HealthStatus>("/api/health"),
  forecast: (days: number = 30) =>
    request<ForecastResponse>(`/api/forecast?days=${days}`),
  optimize: (body: OptimizeRequest) =>
    request<OptimizeResponse>("/api/optimize", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  copilot: (question: string) =>
    request<CopilotResponse>("/api/copilot/chat", {
      method: "POST",
      body: JSON.stringify({ question }),
    }),

  // Real-time endpoints
  realtime: {
    balticIndices: () => request<BalticIndices>("/api/realtime/baltic-indices"),
    freightRates: () => request<FreightRate[]>("/api/realtime/freight-rates"),
    portCongestion: (ports?: string) =>
      request<PortCongestion[]>(`/api/realtime/port-congestion${ports ? `?ports=${encodeURIComponent(ports)}` : ""}`),
    vesselPositions: (mmsi?: string) =>
      request<VesselPosition[]>(`/api/realtime/vessel-positions${mmsi ? `?mmsi=${encodeURIComponent(mmsi)}` : ""}`),
    weatherAlerts: (region: string = "indian_ocean") =>
      request<WeatherAlert[]>(`/api/realtime/weather-alerts?region=${encodeURIComponent(region)}`),
    all: () => request<RealtimeAll>("/api/realtime/all"),
    refresh: () =>
      request<{ status: string; data: RealtimeAll; timestamp: string }>("/api/realtime/refresh", {
        method: "POST",
      }),
    coalBuy: (body: CoalBuyRequest) =>
      request<CoalBuyResponse>("/api/coal/buy", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
};

export { ApiError };