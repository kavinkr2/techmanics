from langchain_openai import ChatOpenAI
from langchain.agents import initialize_agent, AgentType
from copilot_tools import get_freight_forecast, run_vessel_optimizer, get_port_congestion

# 1. Initialize the LLM (Use GPT-4o, Claude Sonnet, or Groq Llama 3.3)
llm = ChatOpenAI(model="gpt-4o", temperature=0)

# 2. Give the LLM the tools
tools = [get_freight_forecast, run_vessel_optimizer, get_port_congestion]

# 3. Initialize the Agent
agent = initialize_agent(
    tools, 
    llm, 
    agent=AgentType.OPENAI_FUNCTIONS, # This enables tool calling
    verbose=True,
    handle_parsing_errors=True
)

# 4. The System Prompt (This is where the magic happens)
SYSTEM_PROMPT = """
You are an expert maritime logistics AI for the Ministry of Steel. 
When a user asks a question, use your tools to fetch REAL data from the forecasting and optimization engines. 
Do not make up numbers. 
If they ask "Why did you choose Paradip?", call the optimizer, look at the demurrage costs and draft limits in the result, and explain it in plain English.
"""

def ask_copilot(user_question: str) -> str:
    response = agent.run(f"{SYSTEM_PROMPT}\n\nUser Question: {user_question}")
    return response