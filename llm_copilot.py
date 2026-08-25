"""
LLM Copilot for Maritime Logistics.
Uses OpenRouter (OpenAI-compatible) with tools for real-time data access.
Falls back gracefully when no API key is configured.
"""
import os
from typing import Optional

from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from copilot_tools import (
    get_freight_forecast,
    run_vessel_optimizer,
    get_baltic_indices,
    get_freight_rates,
    get_port_congestion,
    get_vessel_positions,
    get_weather_alerts,
    find_coal_options,
    get_system_status,
)

# ─── Configuration ───
# Use OpenRouter (OpenAI-compatible API)
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_MODEL = "openai/gpt-4o"  # OpenRouter model format

# Detect redacted/placeholder keys and treat them as unconfigured
_INVALID_KEYS = {"***", "redacted", "", None}
if OPENROUTER_API_KEY in _INVALID_KEYS or (OPENROUTER_API_KEY or "").startswith("«redacted"):
    OPENROUTER_API_KEY = None


# ─── System Prompt ───
SYSTEM_PROMPT = """
You are an expert maritime logistics AI for the Ministry of Steel.
When a user asks a question, use your tools to fetch REAL data from the forecasting and optimization engines.
Do not make up numbers.
If they ask "Why did you choose Paradip?", call the optimizer, look at the demurrage costs and draft limits in the result, and explain it in plain English.

Available tools:
- get_freight_forecast: Probabilistic freight rate forecast with confidence intervals
- run_vessel_optimizer: MILP optimizer with multi-scenario analysis (charter, fuel, port, risk costs)
- get_baltic_indices: Live BDI, BCI, BPI, BSI, BHSI
- get_freight_rates: Major route rates ($/day & $/tonne)
- get_port_congestion: 20 major ports with wait times & demurrage risk
- get_vessel_positions: Live AIS vessel positions
- get_weather_alerts: NOAA weather alerts for shipping routes
- find_coal_options: Coal procurement from 14 global origins
- get_system_status: Model and optimizer configuration status

Always cite your data sources. Be precise with numbers.
"""


# ─── Lazy initialization ───
_llm = None
_agent = None


def _get_llm():
    """Initialize LLM with API key from environment (OpenRouter or OpenAI)."""
    api_key = OPENROUTER_API_KEY
    if not api_key:
        return None
    try:
        return ChatOpenAI(
            model=DEFAULT_MODEL,
            temperature=0,
            api_key=api_key,
            base_url=OPENROUTER_BASE_URL,
        )
    except Exception:
        return None


def _init_agent():
    """Initialize the LLM and agent. Called on first use."""
    global _llm, _agent
    
    if _agent is not None:
        return  # Already initialized
    
    _llm = _get_llm()
    if not _llm:
        return
    
    try:
        _tools = [
            get_freight_forecast,
            run_vessel_optimizer,
            get_baltic_indices,
            get_freight_rates,
            get_port_congestion,
            get_vessel_positions,
            get_weather_alerts,
            find_coal_options,
            get_system_status,
        ]
        
        # Use LangGraph's create_react_agent which handles tool calling internally
        _agent = create_react_agent(_llm, _tools, state_modifier=SYSTEM_PROMPT)
        print(f"[llm_copilot] Agent initialized successfully: {_agent is not None}")
    except Exception as e:
        print(f"[llm_copilot] Agent init failed: {e}")
        import traceback
        traceback.print_exc()
        _agent = None


def ask_copilot(user_question: str) -> str:
    """
    Ask the maritime logistics copilot a question.
    Falls back to a deterministic response if no API key is configured.
    """
    _init_agent()  # Lazy initialization
    
    if _agent is None:
        return _fallback_response(user_question)
    
    try:
        response = _agent.invoke({"messages": [{"role": "user", "content": user_question}]})
        # Extract the last message content
        messages = response.get("messages", [])
        if messages:
            last_msg = messages[-1]
            return last_msg.content if hasattr(last_msg, 'content') else str(last_msg)
        return str(response)
    except Exception as e:
        return f"I encountered an error: {str(e)}. Please check your API key configuration."


def _fallback_response(question: str) -> str:
    """Provide a helpful response without LLM when no API key is set."""
    q = question.lower()
    
    if any(kw in q for kw in ["forecast", "rate", "price", "trend", "future", "predict"]):
        return (
            "I don't have an API key configured, so I can't run the full AI agent. "
            "However, you can access real-time freight forecasts via the API:\n\n"
            "- **GET /api/forecast?days=30** — Probabilistic 30-day forecast with confidence intervals\n"
            "- **GET /api/realtime/baltic-indices** — Live BDI, BCI, BPI, BSI, BHSI\n"
            "- **GET /api/realtime/freight-rates** — Major route rates ($/day & $/tonne)\n\n"
            "To enable the full AI copilot, set the `OPENROUTER_API_KEY` environment variable and restart the backend."
        )
    
    if any(kw in q for kw in ["optimize", "vessel", "port", "cost", "cheapest", "best route"]):
        return (
            "I don't have an API key configured, so I can't run the full AI agent. "
            "You can run the optimizer directly:\n\n"
            "- **POST /api/optimize** — `{ \"cargo_tons\": 80000, \"shock_scenario\": false, \"origin_region\": \"Australia\", \"destination_port\": \"Paradip\", \"commodity\": \"Iron Ore\" }`\n\n"
            "Returns optimal port, vessel class, total cost, and full scenario analysis. "
            "Set `OPENROUTER_API_KEY` to enable the conversational copilot."
        )
    
    if any(kw in q for kw in ["congestion", "port", "wait", "demurrage", "berth"]):
        return (
            "I don't have an API key configured. You can check port congestion directly:\n\n"
            "- **GET /api/realtime/port-congestion** — 20 major ports with wait times & demurrage risk\n\n"
            "Set `OPENROUTER_API_KEY` to enable the full AI copilot."
        )
    
    if any(kw in q for kw in ["coal", "procure", "buy coal"]):
        return (
            "I don't have an API key configured. You can check coal procurement options:\n\n"
            "- **POST /api/coal/buy** — `{ \"quantity_tonnes\": 50000, \"destination_port\": \"Paradip\", \"shock_scenario\": false }`\n\n"
            "Returns ranked options from 14 global origins with vessel recommendations. "
            "Set `OPENROUTER_API_KEY` to enable the full AI copilot."
        )
    
    return (
        "I'm the maritime logistics copilot, but I need an API key to function fully. "
        "Please set the `OPENROUTER_API_KEY` environment variable and restart the backend.\n\n"
        "In the meantime, you can use these direct API endpoints:\n"
        "- `GET /api/forecast` — Freight rate forecasts\n"
        "- `POST /api/optimize` — Vessel/port optimization\n"
        "- `GET /api/realtime/baltic-indices` — BDI & sub-indices\n"
        "- `GET /api/realtime/freight-rates` — Route rates\n"
        "- `GET /api/realtime/port-congestion` — Port congestion\n"
        "- `GET /api/realtime/weather-alerts` — Route weather alerts\n"
        "- `POST /api/coal/buy` — Coal procurement options"
    )


def is_configured() -> bool:
    """Check if the copilot is fully configured with API key."""
    _init_agent()
    return _agent is not None