import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route } from "react-router-dom";
import Layout from "@/layout/Layout";
import { NavProvider } from "@/components/NavContext";
import DashboardPage from "@/pages/Dashboard";
import OptimizePage from "@/pages/Optimize";
import CopilotPage from "@/pages/Copilot";
import CargoPage from "@/pages/Cargo";
import PortsPage from "@/pages/Ports";
import AnalyticsPage from "@/pages/Analytics";
import SettingsPage from "@/pages/Settings";
import CoalBuyerPage from "@/pages/CoalBuyer";
import NotFoundPage from "@/pages/NotFound";
export default function App() {
    return (_jsx(NavProvider, { children: _jsxs(Routes, { children: [_jsxs(Route, { path: "/", element: _jsx(Layout, {}), children: [_jsx(Route, { index: true, element: _jsx(DashboardPage, {}) }), _jsx(Route, { path: "optimize", element: _jsx(OptimizePage, {}) }), _jsx(Route, { path: "copilot", element: _jsx(CopilotPage, {}) }), _jsx(Route, { path: "cargo", element: _jsx(CargoPage, {}) }), _jsx(Route, { path: "ports", element: _jsx(PortsPage, {}) }), _jsx(Route, { path: "coal-buyer", element: _jsx(CoalBuyerPage, {}) }), _jsx(Route, { path: "analytics", element: _jsx(AnalyticsPage, {}) }), _jsx(Route, { path: "settings", element: _jsx(SettingsPage, {}) })] }), _jsx(Route, { path: "*", element: _jsx(NotFoundPage, {}) })] }) }));
}
