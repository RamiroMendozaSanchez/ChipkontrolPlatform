from fastapi import APIRouter, Depends, HTTPException
from database import users_collection
from utils.security import hash_password
from utils.deps import get_current_user
from utils.email import send_welcome_email
from datetime import datetime

router = APIRouter()

@router.post("/usuarios")
def crear_usuario(email: str, nombre: str, password: str, user=Depends(get_current_user)):
    
    if user["rol"] != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    new_user = {
        "email": email,
        "nombre": nombre,
        "password": hash_password(password),
        "empresa_id": user["empresa_id"],
        "rol": "user",
        "activo": True,
        "created_at": datetime.utcnow()
    }

    users_collection.insert_one(new_user)

    send_welcome_email(email, password)

    return {"message": "Usuario creado"}

@router.put("/usuarios/{user_id}")
def editar_usuario(user_id: str, nombre: str, user=Depends(get_current_user)):

    if user["rol"] != "admin":
        raise HTTPException(status_code=403)

    users_collection.update_one(
        {"_id": user_id},
        {"$set": {"nombre": nombre}}
    )

    return {"message": "Usuario actualizado"}