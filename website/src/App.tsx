import { Routes, Route, Navigate, useLocation } from "react-router-dom";
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
  return (
    <NavProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="optimize" element={<OptimizePage />} />
          <Route path="copilot" element={<CopilotPage />} />
          <Route path="cargo" element={<CargoPage />} />
          <Route path="ports" element={<PortsPage />} />
          <Route path="coal-buyer" element={<CoalBuyerPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </NavProvider>
  );
}