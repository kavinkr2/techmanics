import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { FileQuestion } from "lucide-react";
import GlassCard from "@/components/GlassCard";
export default function NotFoundPage() {
    return (_jsx("div", { className: "flex min-h-[60vh] items-center justify-center", children: _jsxs(GlassCard, { className: "mx-auto max-w-md p-10 text-center", children: [_jsx("div", { className: "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent", children: _jsx(FileQuestion, { className: "h-7 w-7" }) }), _jsx("h2", { className: "text-2xl font-semibold text-text-primary", children: "404" }), _jsx("p", { className: "mt-2 text-sm text-text-secondary", children: "The page you're looking for doesn't exist or hasn't been built yet." })] }) }));
}
