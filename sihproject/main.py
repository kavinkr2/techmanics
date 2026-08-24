from pydantic import BaseModel

class CopilotRequest(BaseModel):
    question: str

@app.post("/api/copilot/chat")
def copilot_chat(request: CopilotRequest):
    try:
        # Import inside the function to prevent startup crashes
        from llm_copilot import ask_copilot 
        
        answer = ask_copilot(request.question)
        return {"status": "success", "answer": answer}
    except Exception as e:
        return {"status": "error", "message": str(e)}