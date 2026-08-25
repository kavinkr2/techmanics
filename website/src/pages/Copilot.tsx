import { useRef, useState } from "react";
import { Send, Bot, User } from "lucide-react";
import Button from "@/components/Button";
import Input from "@/components/Input";
import GlassCard from "@/components/GlassCard";
import { api } from "@/lib/api";
import { sleep } from "@/lib/utils";

type Msg = { id: string; role: "user" | "assistant"; content: string };

export default function CopilotPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello, I'm your maritime logistics copilot. I have access to freight forecasts and the vessel optimizer. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const q = input.trim();
    setInput("");
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: q };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);

    try {
      const res = await api.copilot(q);
      const answer = res.answer ?? res.message ?? "(No response from copilot.)";

      // Simulated word-by-word streaming for a natural feel.
      const assistantMsg: Msg = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
      };
      setMessages((m) => [...m, assistantMsg]);
      const words = answer.split(" ");
      for (let i = 0; i < words.length; i++) {
        const chunk = words.slice(0, i + 1).join(" ");
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantMsg.id ? { ...msg, content: chunk } : msg
          )
        );
        await sleep(15);
      }
    } catch (err: any) {
      const errMsg: Msg = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Sorry — I couldn't reach the copilot engine: ${err?.message ?? err}.`,
      };
      setMessages((m) => [...m, errMsg]);
    } finally {
      setLoading(false);
      endRef.current?.scrollTo({ top: endRef.current.scrollHeight, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-text-primary">Copilot</h2>
        <p className="text-sm text-text-secondary/60">
          Ask about freight forecasts, port congestion, or vessel optimization.
        </p>
      </div>
      <div className="flex justify-end">
        <button
          onClick={() =>
            setMessages([
              {
                id: "welcome",
                role: "assistant",
                content:
                  "Hello, I'm your maritime logistics copilot. I have access to freight forecasts and the vessel optimizer. How can I help you today?",
              },
            ])
          }
          className="text-xs text-text-secondary hover:text-text-primary underline"
        >
          Clear conversation
        </button>
      </div>

      <GlassCard className="flex h-[520px] flex-col">
        <div
          ref={endRef}
          className="flex-1 space-y-4 overflow-y-auto p-5 pb-2"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex gap-3 text-sm",
                m.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {m.role === "assistant" && (
                <div className="mt-0.5 shrink-0 rounded-xl bg-accent/15 p-1.5 text-accent">
                  <Bot className="h-5 w-5" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2.5",
                  m.role === "user"
                    ? "rounded-br-md bg-accent/25 text-text-primary"
                    : "rounded-bl-md bg-surface/40 text-text-secondary"
                )}
              >
                {m.content}
              </div>
              {m.role === "user" && (
                <div className="mt-0.5 shrink-0 rounded-xl bg-surface-2/40 p-1">
                  <User className="h-5 w-5 text-text-secondary/60" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="shrink-0 rounded-xl bg-accent/15 p-1.5 text-accent">
                <Bot className="h-5 w-5 animate-pulse" />
              </div>
              <div className="rounded-2xl rounded-bl-md bg-surface/40 px-4 py-2.5">
                <span className="text-text-secondary/50">Thinking…</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border/40 p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {[
              "What's the current Baltic Dry Index?",
              "Show me vessel positions near Paradip",
              "Are there weather alerts in the Indian Ocean?",
              "Predict freight rates for the next 30 days",
              "How is port congestion affecting Paradip?",
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setInput(suggestion);
                }}
                className="px-3 py-1.5 rounded-[8px] text-xs text-text-secondary hover:text-text-primary hover:bg-surface-2/50 transition-colors border border-border/30"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the maritime copilot…"
              disabled={loading}
              className="flex-1"
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              icon={<Send className="h-4 w-4" />}
              disabled={loading || !input.trim()}
            >
              Send
            </Button>
          </form>
        </div>
      </GlassCard>
    </div>
  );
}

function cn(...cls: string[]) {
  return cls.filter(Boolean).join(" ");
}
