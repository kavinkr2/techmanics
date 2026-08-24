import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_classic.agents import AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from copilot_tools import get_freight_forecast, run_vessel_optimizer

load_dotenv()

# Setup OpenRouter LLM (OpenAI-compatible)
llm = ChatOpenAI(
    temperature=0,
    model="meta-llama/llama-3.3-70b-instruct",
    openai_api_key=os.getenv("OPENROUTER_API_KEY"),
    openai_api_base="https://openrouter.ai/api/v1",
    default_headers={
        "HTTP-Referer": "http://localhost:8002", 
        "X-Title": "Techmanics Freight Optimizer"
    }
)

tools = [get_freight_forecast, run_vessel_optimizer]
llm_with_tools = llm.bind_tools(tools)

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an expert maritime logistics AI for the Ministry of Steel. Answer questions using your tools and cite real numbers."),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])

from langchain_classic.agents.format_scratchpad.openai_tools import format_to_openai_tool_messages
from langchain_classic.agents.output_parsers.openai_tools import OpenAIToolsAgentOutputParser

agent = (
    {
        "input": lambda x: x["input"],
        "agent_scratchpad": lambda x: format_to_openai_tool_messages(x["intermediate_steps"]),
    }
    | prompt
    | llm_with_tools
    | OpenAIToolsAgentOutputParser()
)

agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

def ask_copilot(user_question: str) -> str:
    try:
        response = agent_executor.invoke({"input": user_question})
        return response.get("output", "No response from agent")
    except Exception as e:
        return f"Agent error: {str(e)}"
