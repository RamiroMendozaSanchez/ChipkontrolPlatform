from fastapi import APIRouter, Response, HTTPException
from database import users_collection, sessions_collection
from schemas.login import LoginRequest
from utils.security import verify_password, create_session, session_expiration
from datetime import datetime

router = APIRouter()

@router.post("/login")
def login(data: LoginRequest, response: Response):
    user = users_collection.find_one({"email": data.email})

    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    session_id = create_session()

    sessions_collection.insert_one({
        "user_id": user["_id"],
        "session_id": session_id,
        "expires_at": session_expiration()
    })

    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        secure=False  # true en producción
    )

    return {"message": "Login exitoso"}