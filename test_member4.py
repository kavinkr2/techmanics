from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class CargoRequest(BaseModel):
    cargo_tons: int


req = CargoRequest(cargo_tons=150000)
print(
    f" Member 4 (Backend Pack): FastAPI/Pydantic ready with test payload: {req.cargo_tons}T"
)