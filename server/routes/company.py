from fastapi import APIRouter, Depends
from database import companies_collection
from utils.deps import get_current_user
from datetime import datetime

router = APIRouter()

@router.post("/empresa")
def crear_empresa(nombre: str, user=Depends(get_current_user)):
    if user["rol"] != "admin":
        return {"error": "No autorizado"}

    empresa = {
        "nombre": nombre,
        "owner_id": user["_id"],
        "created_at": datetime.utcnow()
    }

    companies_collection.insert_one(empresa)

    return {"message": "Empresa creada"}