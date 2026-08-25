from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="Freight Optimizer API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class OptimizeRequest(BaseModel):
    cargo_tons: float
    shock_scenario: bool = False

class CopilotRequest(BaseModel):
    question: str

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

@app.get("/api/forecast")
def get_forecast(days: int = 30):
    return {
        "status": "success",
        "data": [
            {"date": "2026-08-24", "base_forecast": 15.2, "lower_bound": 13.5, "upper_bound": 17.8},
            {"date": "2026-08-25", "base_forecast": 15.8, "lower_bound": 14.0, "upper_bound": 18.2},
        ]
    }

@app.post("/api/optimize")
def run_optimizer(request: OptimizeRequest):
    return {
        "status": "success",
        "data": {
            "optimal_port": "Paradip",
            "optimal_vessel": "2x Panamax",
            "total_cost": 2450000
        }
    }

@app.post("/api/copilot/chat")
def copilot_chat(request: CopilotRequest):
    try:
        from llm_copilot import ask_copilot
        answer = ask_copilot(request.question)
        return {"status": "success", "answer": answer}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)