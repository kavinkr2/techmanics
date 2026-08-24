import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
        }
        catch {
            setHealth("unreachable");
        }
    }
    function saveSettings() {
        setSaving(true);
        setTimeout(() => setSaving(false), 800);
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-semibold text-text-primary", children: "Settings" }), _jsx("p", { className: "text-sm text-text-secondary/60", children: "Configure your maritime logistics environment." })] }), _jsxs(GlassCard, { className: "p-6", children: [_jsx("h3", { className: "mb-4 text-sm font-medium text-text-secondary/70 uppercase tracking-wider", children: "Backend Connection" }), _jsxs("p", { className: "text-sm text-text-secondary", children: ["API endpoint:", " ", _jsx("span", { className: "font-mono text-text-primary", children: import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000" })] }), _jsxs("p", { className: "mt-1 text-sm", children: ["Status:", " ", _jsx("span", { className: "font-medium text-text-primary", children: health })] }), _jsxs("div", { className: "mt-4 flex gap-3", children: [_jsx(Button, { variant: "secondary", size: "sm", icon: _jsx(Server, { className: "h-4 w-4" }), onClick: checkHealth, children: "Check Health" }), _jsx(Button, { variant: "secondary", size: "sm", icon: _jsx(Database, { className: "h-4 w-4" }), children: "Reload Data" })] })] }), _jsxs(GlassCard, { className: "p-6", children: [_jsx("h3", { className: "mb-4 text-sm font-medium text-text-secondary/70 uppercase tracking-wider", children: "Preferences" }), _jsxs("div", { className: "space-y-4 text-sm", children: [_jsxs("label", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-text-secondary", children: "Dark mode" }), _jsx("input", { type: "checkbox", defaultChecked: true, className: "h-4 w-4 rounded border-border accent-accent" })] }), _jsxs("label", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-text-secondary", children: "Enable Copilot" }), _jsx("input", { type: "checkbox", defaultChecked: true, className: "h-4 w-4 rounded border-border accent-accent" })] })] }), _jsxs("div", { className: "mt-5 flex justify-end gap-3 border-t border-border/30 pt-4", children: [_jsx(Button, { variant: "secondary", size: "sm", icon: _jsx(Shield, { className: "h-4 w-4" }), children: "Reset" }), _jsx(Button, { variant: "primary", size: "sm", icon: _jsx(Save, { className: "h-4 w-4" }), onClick: saveSettings, disabled: saving, children: saving ? "Saving…" : "Save Changes" })] })] })] }));
}
