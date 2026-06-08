from fastapi import Request, HTTPException
from database import sessions_collection, users_collection
from datetime import datetime

def get_current_user(request: Request):
    session_id = request.cookies.get("session_id")

    if not session_id:
        raise HTTPException(status_code=401, detail="No autenticado")

    session = sessions_collection.find_one({"session_id": session_id})

    if not session or session["expires_at"] < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Sesión expirada")

    user = users_collection.find_one({"_id": session["user_id"]})
    return user