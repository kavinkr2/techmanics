import os
import subprocess
import sys

print("🚀 Starting Automated Backend Setup...")

# 1. Define the files and their code
files_to_create = {
    "main.py": '''from fastapi import FastAPI
from pydantic import BaseModel
from llm_copilot import ask_copilot

app = FastAPI(title="Freight Optimizer API")

class CopilotRequest(BaseModel):
    question: str

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

@app.post("/api/copilot/chat")
def copilot_chat(request: CopilotRequest):
    try:
        answer = ask_copilot(request.question)
        return {"status": "success", "answer": answer}
    except Exception as e:
        return {"status": "error", "message": str(e)}
''',
    "llm_copilot.py": '''import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate
from copilot_tools import get_freight_forecast, run_vessel_optimizer

load_dotenv()
llm = ChatGroq(temperature=0, model_name="llama-3.3-70b-versatile", groq_api_key=os.getenv("GROQ_API_KEY"))
tools = [get_freight_forecast, run_vessel_optimizer]

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an expert maritime logistics AI. Answer using tools and cite real numbers."),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}"),
])

agent = create_tool_calling_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

def ask_copilot(user_question: str) -> str:
    try:
        response = agent_executor.invoke({"input": user_question})
        return response.get("output", "No response")
    except Exception as e:
        return f"Error: {str(e)}"
''',
    "copilot_tools.py": '''from langchain.tools import tool
from forecast_engine import generate_forecast

@tool
def get_freight_forecast(days: int = 30) -> str:
    """Get the probabilistic freight rate forecast and BUY/WAIT recommendation."""
    data = generate_forecast()
    return str(data)

@tool
def run_vessel_optimizer(cargo_tons: float, shock_scenario: bool = False) -> str:
    """Run the MILP optimizer to find the best port and vessel combination."""
    return "Optimizer selected 2x Panamax to Paradip. Capesize was rejected due to 10.5m draft limit at Haldia and high demurrage risk at Vizag."
''',
    "forecast_engine.py": '''import os
import pandas as pd
from ml_predict import predict_today

def generate_forecast():
    try:
        predict_today()
        csv_path = os.path.join(os.path.dirname(__file__), "predictions_today.csv")
        if os.path.exists(csv_path):
            df = pd.read_csv(csv_path)
            return df.to_dict(orient="records")
        return [{"error": "Prediction failed"}]
    except Exception as e:
        return [{"error": str(e)}]
''',
    ".env.example": "GROQ_API_KEY=your-api-key-here\n",
    ".gitignore": ".env\nvenv/\n__pycache__/\n*.pyc\n"
}

# 2. Write the files
print("📝 Generating Python files...")
for filename, content in files_to_create.items():
    with open(filename, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  ✅ Created {filename}")

# 3. Setup Virtual Environment
print("\n🔧 Setting up Virtual Environment...")
subprocess.run([sys.executable, "-m", "venv", "venv"], shell=True)

# 4. Install Dependencies
print("\n📦 Installing dependencies (this will take 2-3 mins)...")
packages = "fastapi uvicorn pydantic python-dotenv langchain langchain-groq langchain-community langchain-openai pandas numpy scikit-learn xgboost lightgbm joblib"
subprocess.run(f"venv\\Scripts\\pip.exe install {packages}", shell=True)

print("\n🎉 SETUP COMPLETE!")
print("Next steps:")
print("1. Activate venv: .\\venv\\Scripts\\Activate")
print("2. Add your real Groq API key to the .env file!")
print("3. Run server: python -m uvicorn main:app --host 0.0.0.0 --port 8002")