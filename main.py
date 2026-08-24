from fastapi import FastAPI
from pydantic import BaseModel
from llm_copilot import ask_copilot
from optimizer_engine import run_optimizer

app = FastAPI(title="Freight Optimizer API")

class CopilotRequest(BaseModel):
    question: str

class OptimizeRequest(BaseModel):
    cargo_tons: float
    shock_scenario: bool = False

@app.post("/api/optimize")
def optimize(request: OptimizeRequest):
    return run_optimizer(cargo_tons=request.cargo_tons, shock_scenario=request.shock_scenario)

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
