/**
 * Lightweight forecasting data hook.
 * Falls back to synthetic data so the UI is usable even if the backend
 * forecast endpoint returns only a stub or is unreachable.
 */
import { useEffect, useState } from "react";
import { api, type ForecastRecord, type ForecastResponse } from "@/lib/api";

export function useForecast(days: number = 30) {
  const [data, setData] = useState<ForecastRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = true;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    // Always try the live backend first.
    api
      .forecast(days)
      .then((res: ForecastResponse) => {
        if (!cancelled || controller.signal.aborted) return;
        const live = res.data ?? [];
        if (live.length >= 2) {
          setData(live);
          setError(null);
        } else {
          // stub response -> fall back to synthetic
          throw new Error("stub");
        }
      })
      .catch(() => {
        if (!cancelled || controller.signal.aborted) return;
        // Fallback synthetic forecast so charts are never empty.
        const today = new Date();
        const synthetic: ForecastRecord[] = Array.from({ length: days }).map(
          (_, i) => {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            const base = 14 + Math.sin(i / 5) * 1.5 + i * 0.05;
            const jitter = (Math.random() * 2 - 1) * 1.2;
            return {
              date: d.toISOString().slice(0, 10),
              base_forecast: +(base + jitter).toFixed(1),
              lower_bound: +(base + jitter - 1.3).toFixed(1),
              upper_bound: +(base + jitter + 1.3).toFixed(1),
            };
          }
        );
        setData(synthetic);
        setError("Showing simulated forecast — backend not reachable.");
      })
      .finally(() => {
        if (!cancelled || controller.signal.aborted) return;
        setLoading(false);
      });

    return () => {
      cancelled = false;
      controller.abort();
    };
  }, [days]);

  return { data, loading, error };
}
