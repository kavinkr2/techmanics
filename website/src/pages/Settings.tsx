import { useState } from "react";
import { Database, Save, Server, Shield } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import Button from "@/components/Button";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const [health, setHealth] = useState("—");
  const [saving, setSaving] = useState(false);

  async function checkHealth() {
    try {
      const h = await api.health();
      setHealth(h.status);
    } catch {
      setHealth("unreachable");
    }
  }

  function saveSettings() {
    setSaving(true);
    setTimeout(() => setSaving(false), 800);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-text-primary">Settings</h2>
        <p className="text-sm text-text-secondary/60">
          Configure your maritime logistics environment.
        </p>
      </div>

      <GlassCard className="p-6">
        <h3 className="mb-4 text-sm font-medium text-text-secondary/70 uppercase tracking-wider">
          Backend Connection
        </h3>
        <p className="text-sm text-text-secondary">
          API endpoint:{" "}
          <span className="font-mono text-text-primary">
            {import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000"}
          </span>
        </p>
        <p className="mt-1 text-sm">
          Status:{" "}
          <span className="font-medium text-text-primary">{health}</span>
        </p>
        <div className="mt-4 flex gap-3">
          <Button
            variant="secondary"
            size="sm"
            icon={<Server className="h-4 w-4" />}
            onClick={checkHealth}
          >
            Check Health
          </Button>
          <Button variant="secondary" size="sm" icon={<Database className="h-4 w-4" />}>
            Reload Data
          </Button>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="mb-4 text-sm font-medium text-text-secondary/70 uppercase tracking-wider">
          Preferences
        </h3>
        <div className="space-y-4 text-sm">
          <label className="flex items-center justify-between">
            <span className="text-text-secondary">Dark mode</span>
            <input
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-border accent-accent"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-text-secondary">Enable Copilot</span>
            <input
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-border accent-accent"
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-3 border-t border-border/30 pt-4">
          <Button
            variant="secondary"
            size="sm"
            icon={<Shield className="h-4 w-4" />}
          >
            Reset
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Save className="h-4 w-4" />}
            onClick={saveSettings}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
