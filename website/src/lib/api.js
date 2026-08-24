/**
 * API client for the TechManics FastAPI backend.
 * Exposes typed wrappers around each endpoint.
 */
const base = (import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
class ApiError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
        this.name = "ApiError";
    }
}
async function request(path, options) {
    const res = await fetch(`${base}${path}`, {
        headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
        ...options,
    });
    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new ApiError(txt || `Request failed (${res.status})`, res.status);
    }
    return res.json();
}
export const api = {
    // Core endpoints
    health: () => request("/api/health"),
    forecast: (days = 30) => request(`/api/forecast?days=${days}`),
    optimize: (body) => request("/api/optimize", {
        method: "POST",
        body: JSON.stringify(body),
    }),
    copilot: (question) => request("/api/copilot/chat", {
        method: "POST",
        body: JSON.stringify({ question }),
    }),
    // Real-time endpoints
    realtime: {
        balticIndices: () => request("/api/realtime/baltic-indices"),
        freightRates: () => request("/api/realtime/freight-rates"),
        portCongestion: (ports) => request(`/api/realtime/port-congestion${ports ? `?ports=${encodeURIComponent(ports)}` : ""}`),
        vesselPositions: (mmsi) => request(`/api/realtime/vessel-positions${mmsi ? `?mmsi=${encodeURIComponent(mmsi)}` : ""}`),
        weatherAlerts: (region = "indian_ocean") => request(`/api/realtime/weather-alerts?region=${encodeURIComponent(region)}`),
        all: () => request("/api/realtime/all"),
        refresh: () => request("/api/realtime/refresh", {
            method: "POST",
        }),
        coalBuy: (body) => request("/api/coal/buy", {
            method: "POST",
            body: JSON.stringify(body),
        }),
    },
};
export { ApiError };
