from fastapi import (
    Header,
    HTTPException
)

from database import (
    session_collection,
    users_collection
)

from utils.security import (
    session_is_expired
)


def get_current_user(
    x_session: str = Header(...)
):

    session = (
        session_collection.find_one({
            "session_id": x_session
        })
    )

    if not session:

        raise HTTPException(
            status_code=401,
            detail="Sesión inválida"
        )

    if session_is_expired(
        session["expires_at"]
    ):

        session_collection.delete_one({
            "_id": session["_id"]
        })

        raise HTTPException(
            status_code=401,
            detail="Sesión expirada"
        )

    user = users_collection.find_one({
        "username":
        session["username"]
    })

    if not user:

        raise HTTPException(
            status_code=401,
            detail="Usuario inexistente"
        )

    return user