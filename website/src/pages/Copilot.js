import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from "react";
import { Send, Bot, User } from "lucide-react";
import Button from "@/components/Button";
import Input from "@/components/Input";
import GlassCard from "@/components/GlassCard";
import { api } from "@/lib/api";
import { sleep } from "@/lib/utils";
export default function CopilotPage() {
    const [messages, setMessages] = useState([
        {
            id: "welcome",
            role: "assistant",
            content: "Hello, I'm your maritime logistics copilot. I have access to freight forecasts and the vessel optimizer. How can I help you today?",
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const endRef = useRef(null);
    const handleSend = async () => {
        if (!input.trim() || loading)
            return;
        const q = input.trim();
        setInput("");
        const userMsg = { id: crypto.randomUUID(), role: "user", content: q };
        setMessages((m) => [...m, userMsg]);
        setLoading(true);
        try {
            const res = await api.copilot(q);
            const answer = res.answer ?? res.message ?? "(No response from copilot.)";
            // Simulated word-by-word streaming for a natural feel.
            const assistantMsg = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: "",
            };
            setMessages((m) => [...m, assistantMsg]);
            const words = answer.split(" ");
            for (let i = 0; i < words.length; i++) {
                const chunk = words.slice(0, i + 1).join(" ");
                setMessages((m) => m.map((msg) => msg.id === assistantMsg.id ? { ...msg, content: chunk } : msg));
                await sleep(15);
            }
        }
        catch (err) {
            const errMsg = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: `Sorry — I couldn't reach the copilot engine: ${err?.message ?? err}.`,
            };
            setMessages((m) => [...m, errMsg]);
        }
        finally {
            setLoading(false);
            endRef.current?.scrollTo({ top: endRef.current.scrollHeight, behavior: "smooth" });
        }
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-semibold text-text-primary", children: "Copilot" }), _jsx("p", { className: "text-sm text-text-secondary/60", children: "Ask about freight forecasts, port congestion, or vessel optimization." })] }), _jsxs(GlassCard, { className: "flex h-[520px] flex-col", children: [_jsxs("div", { ref: endRef, className: "flex-1 space-y-4 overflow-y-auto p-5 pb-2", children: [messages.map((m) => (_jsxs("div", { className: cn("flex gap-3 text-sm", m.role === "user" ? "justify-end" : "justify-start"), children: [m.role === "assistant" && (_jsx("div", { className: "mt-0.5 shrink-0 rounded-xl bg-accent/15 p-1.5 text-accent", children: _jsx(Bot, { className: "h-5 w-5" }) })), _jsx("div", { className: cn("max-w-[75%] rounded-2xl px-4 py-2.5", m.role === "user"
                                            ? "rounded-br-md bg-accent/25 text-text-primary"
                                            : "rounded-bl-md bg-surface/40 text-text-secondary"), children: m.content }), m.role === "user" && (_jsx("div", { className: "mt-0.5 shrink-0 rounded-xl bg-surface-2/40 p-1", children: _jsx(User, { className: "h-5 w-5 text-text-secondary/60" }) }))] }, m.id))), loading && (_jsxs("div", { className: "flex gap-3 justify-start", children: [_jsx("div", { className: "shrink-0 rounded-xl bg-accent/15 p-1.5 text-accent", children: _jsx(Bot, { className: "h-5 w-5 animate-pulse" }) }), _jsx("div", { className: "rounded-2xl rounded-bl-md bg-surface/40 px-4 py-2.5", children: _jsx("span", { className: "text-text-secondary/50", children: "Thinking\u2026" }) })] }))] }), _jsx("div", { className: "border-t border-border/40 p-4", children: _jsxs("form", { onSubmit: (e) => {
                                e.preventDefault();
                                handleSend();
                            }, className: "flex gap-2", children: [_jsx(Input, { value: input, onChange: (e) => setInput(e.target.value), placeholder: "Ask the maritime copilot\u2026", disabled: loading, className: "flex-1" }), _jsx(Button, { type: "submit", variant: "primary", size: "md", icon: _jsx(Send, { className: "h-4 w-4" }), disabled: loading || !input.trim(), children: "Send" })] }) })] })] }));
}
function cn(...cls) {
    return cls.filter(Boolean).join(" ");
}
