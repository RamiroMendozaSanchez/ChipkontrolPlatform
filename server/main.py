from collections import defaultdict
from datetime import datetime
import hashlib
from fastapi import HTTPException
from fastapi import FastAPI, Query, Body, Header, Depends
from fastapi.responses import JSONResponse
from threading import Thread
import time
import logging

from models.units import GroupModel, UserCreate
from schemas.login import LoginRequest
from services.wialon_service import process_units, get_route_with_routing
from database import units_collection, history_collection, groups_collection, users_collection, session_collection
from fastapi.middleware.cors import CORSMiddleware
from utils.security import verify_password, create_session, session_expiration, hash_password

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Sitrack API", root_path="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 🔥 en desarrollo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ======================
# 🔄 BACKGROUND TASK
# ======================
def scheduler():
    while True:
        logger.info("🔄 Ejecutando proceso de unidades...")
        process_units()
        time.sleep(60)

# ======================
# 🛡️ EXCEPTION HANDLER
# ======================
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Error no manejado: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor"}
    )


@app.on_event("startup")
def startup_event():
    Thread(target=scheduler, daemon=True).start()

def get_current_user(x_session: str = Header(...)):
    session = session_collection.find_one({"session_id": x_session})

    if not session:
        raise HTTPException(status_code=401, detail="Sesión invalida")

    if session["expiresAt"] < datetime.utcnow():
        session_collection.delete_one({
            "_id": session["_id"]
        })

        raise HTTPException(
            status_code=401,
            detail="Sesión expirada"
        )

    user = users_collection.find_one({
        "username": session["username"]
    })

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Usuario no encontrado"
        )

    return user

def only_admin(user):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")


def build_filter(user):
    # 👑 admin ve todo
    if user["role"] == "admin":
        return {}

    # 👤 usuario normal
    return {"grupo": user["grupo"]}

from bson import ObjectId

def serialize_doc(doc):
    if isinstance(doc, list):
        return [serialize_doc(i) for i in doc]

    if isinstance(doc, dict):
        return {
            k: serialize_doc(v)
            for k, v in doc.items()
            if k != "_id"
        }

    if isinstance(doc, ObjectId):
        return str(doc)

    return doc

# ======================
# 📡 ENDPOINTS
# ======================
@app.get("/units")
def get_units_grouped(user = Depends(get_current_user)):

    filtro = build_filter(user)

    units = list(units_collection.find(filtro, {"_id": 0}))

    grupos = defaultdict(list)

    for unit in units:
        grupo = unit.get("grupo", "Sin grupo")
        grupos[grupo].append(unit)

    return [
        {"grupo": g, "unidades": u}
        for g, u in grupos.items()
    ]


@app.get("/history")
def get_history(
    user = Depends(get_current_user),
    imei: str = Query(None),
    fecha_inicio: str = Query(None),
    fecha_fin: str = Query(None),
    limit: int = 100
):
    filtro = build_filter(user)
    print(filtro)

    if imei:
        filtro["imei"] = imei

    if fecha_inicio or fecha_fin:
        filtro["hora"] = {}

        if fecha_inicio:
            filtro["hora"]["$gte"] = datetime.fromisoformat(fecha_inicio)

        if fecha_fin:
            filtro["hora"]["$lte"] = datetime.fromisoformat(fecha_fin)

    data = list(
        history_collection
        .find(filtro, {"_id": 0})
        .sort("hora", -1)
        .limit(limit)
    )

    return {
        "total": len(data),
        "data": data
    }
@app.get("/groups")
def get_groups_with_count(user = Depends(get_current_user)):

    filtro = build_filter(user)

    pipeline = []

    if filtro:
        pipeline.append({"$match": filtro})

    pipeline += [
        {
            "$group": {
                "_id": "$grupo",
                "total_unidades": { "$sum": 1 }
            }
        },
        {
            "$project": {
                "_id": 0,
                "grupo": "$_id",
                "total_unidades": 1
            }
        }
    ]

    return list(units_collection.aggregate(pipeline))
@app.get("/groups/detail")
def get_groups_detail(user = Depends(get_current_user)):

    filtro = build_filter(user)

    pipeline = []

    if filtro:
        pipeline.append({"$match": filtro})

    pipeline += [
        {
            "$group": {
                "_id": "$grupo",
                "unidades": { "$push": "$$ROOT" },
                "total": { "$sum": 1 }
            }
        },
        {
            "$project": {
                "_id": 0,
                "grupo": "$_id",
                "total": 1,
                "unidades": 1
            }
        }
    ]

    result = list(units_collection.aggregate(pipeline))
    return serialize_doc(result)

@app.get("/history/route")
def get_route(
    imei: str,
    user = Depends(get_current_user),
    fecha_inicio: str = None,
    fecha_fin: str = None
):
    filtro = build_filter(user)
    filtro["imei"] = imei

    if fecha_inicio or fecha_fin:
        filtro["hora"] = {}

        if fecha_inicio:
            filtro["hora"]["$gte"] = datetime.fromisoformat(fecha_inicio)

        if fecha_fin:
            filtro["hora"]["$lte"] = datetime.fromisoformat(fecha_fin)

    data = list(
        history_collection
        .find(filtro, {"_id": 0, "lat": 1, "lon": 1, "hora": 1})
        .sort("hora", 1)
    )

    return {
        "imei": imei,
        "total_puntos": len(data),
        "ruta": data
    }
    
@app.get("/units/live")
def get_units_live(user = Depends(get_current_user)):
    filtro = build_filter(user)
    data = list(
        units_collection.find(
            filtro,
            {"_id": 0, "imei": 1, "nombre": 1, "lat": 1, "lon": 1, "velocidad": 1, "grupo": 1}
        )
    )

    return data

@app.get("/units/route/today")
def get_units_route_today(user = Depends(get_current_user)):
    """Obtiene la ruta del día de hoy para todas las unidades con routing por carretera"""
    filtro = build_filter(user)
    
    # Obtener el inicio del día de hoy en UTC
    from datetime import datetime, timedelta
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    # Obtener todos los IMEIs del usuario
    units = list(units_collection.find(filtro, {"_id": 0, "imei": 1, "nombre": 1}))
    
    routes = []
    for unit in units:
        imei = unit["imei"]
        nombre = unit["nombre"]
        
        # Obtener historial del día de hoy
        history = list(
            history_collection.find(
                {
                    "imei": imei,
                    "hora": {"$gte": today_start, "$lt": today_end}
                },
                {"_id": 0, "lat": 1, "lon": 1, "hora": 1, "velocidad": 1}
            ).sort("hora", 1)
        )
        
        if len(history) > 1:
            # Obtener puntos originales
            points = [(p["lat"], p["lon"]) for p in history]
            
            # Aplicar routing con OSRM para seguir carreteras
            routed_points = get_route_with_routing(points)
            
            routes.append({
                "imei": imei,
                "nombre": nombre,
                "ruta": routed_points,
                "total_puntos": len(history)
            })
    
    return {
        "fecha": today_start.isoformat(),
        "total_rutas": len(routes),
        "rutas": routes
    }
@app.put("/units/login-code")
def set_login_code(
    user = Depends(get_current_user),
    imei: str = Body(...),
    loginCode: str = Body(...),
    crear_si_no_existe: bool = False
):

    only_admin(user)

    result = units_collection.update_one(
        {"imei": imei},
        {
            "$set": {
                "loginCode": loginCode,
                "updatedAt": datetime.utcnow()
            }
        },
        upsert=crear_si_no_existe
    )

    if result.matched_count == 0 and not crear_si_no_existe:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")

    return {
        "message": "loginCode actualizado",
        "imei": imei,
        "loginCode": loginCode
    }

@app.post("/groups")
def create_group(
    group: GroupModel,
    user = Depends(get_current_user)
):
    existe = groups_collection.find_one({"name": group.name})

    if existe:
        raise HTTPException(status_code=400, detail="El grupo ya existe")

    nuevo = {
        "name": group.name,
        "createdAt": datetime.utcnow(),
        "createdBy": user["username"] if user else None
    }

    groups_collection.insert_one(nuevo)

    return {
        "message": "Grupo creado",
        "grupo": serialize_doc(nuevo)
    }
@app.post("/users")
def create_user(
    payload: UserCreate,
    current_user = Depends(get_current_user)
):
    # 🔐 solo admin puede crear usuarios
    only_admin(current_user)

    # 🔎 validar duplicado
    existe = users_collection.find_one({"username": payload.username})
    if existe:
        raise HTTPException(status_code=400, detail="Usuario ya existe")

    # 🧠 normalizar grupo
    grupo = payload.grupo.strip() if payload.grupo else None

    # 🧠 validar grupo SOLO si viene informado
    if grupo:
        grupo_existe = groups_collection.find_one({"name": grupo})
        if not grupo_existe:
            raise HTTPException(status_code=404, detail="Grupo no existe")

    # 🧠 crear usuario
    new_user = {
        "username": payload.username,
        "password": hash_password(payload.password),
        "grupo": grupo,  # puede ser None o ""
        "role": payload.role,
        "createdAt": datetime.utcnow()
    }

    users_collection.insert_one(new_user)

    return {
        "message": "Usuario creado correctamente",
        "user": {
            "username": payload.username,
            "grupo": grupo,
            "role": payload.role
        }
    }
    
@app.post("/login")
def login(data: LoginRequest
):
    user = users_collection.find_one({"username": data.username})

    if not user:
        raise HTTPException(status_code=404, detail="Usuario no existe")

    if not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    session_id= create_session()

    session_collection.insert_one({
        "session_id": session_id,
        "username": user["username"],
        "role": user["role"],
        "grupo": user["grupo"],
        "expiresAt": session_expiration(),
        "createdAt": datetime.utcnow()
    })

    return {
        "message": "Login correcto",
        "session_id": session_id,
        "username": user["username"],
        "role": user["role"],
        "grupo": user.get("grupo"),
    }

@app.patch("/users/{username}")
def patch_user(
    username: str,
    user = Depends(get_current_user),
    data: dict = Body(...)
):
    only_admin(user)

    usuario = users_collection.find_one({"username": username})
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no existe")

    update_data = {}

    # 🔐 password
    if "password" in data:
        update_data["password"] = hash_password(data["password"])

    # 🏷️ grupo
    if "grupo" in data:
        grupo_existe = groups_collection.find_one({"name": data["grupo"]})
        if not grupo_existe:
            raise HTTPException(status_code=404, detail="Grupo no existe")
        update_data["grupo"] = data["grupo"]

    # 👑 role
    if "role" in data:
        if data["role"] not in ["admin", "user"]:
            raise HTTPException(status_code=400, detail="Role inválido")
        update_data["role"] = data["role"]

    if not update_data:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar")

    users_collection.update_one(
        {"username": username},
        {"$set": update_data}
    )

    return {
        "message": "Usuario actualizado",
        "updated_fields": list(update_data.keys())
    }

@app.delete("/users/{username}")
def delete_user(
    username: str,
    user = Depends(get_current_user)
):
    only_admin(user)

    result = users_collection.delete_one({"username": username})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no existe")

    return {"message": "Usuario eliminado"}

@app.put("/groups/{name}")
def update_group(
    name: str,
    new_name: str = Body(...),
    user = Depends(get_current_user)
):
    only_admin(user)

    existe = groups_collection.find_one({"name": name})
    if not existe:
        raise HTTPException(status_code=404, detail="Grupo no existe")

    if groups_collection.find_one({"name": new_name}):
        raise HTTPException(status_code=400, detail="El nuevo nombre ya existe")

    # actualizar grupo
    groups_collection.update_one(
        {"name": name},
        {"$set": {"name": new_name}}
    )

    # 🔥 actualizar en unidades
    units_collection.update_many(
        {"grupo": name},
        {"$set": {"grupo": new_name}}
    )

    # 🔥 actualizar histórico
    history_collection.update_many(
        {"grupo": name},
        {"$set": {"grupo": new_name}}
    )

    # 🔥 actualizar usuarios
    users_collection.update_many(
        {"grupo": name},
        {"$set": {"grupo": new_name}}
    )

    return {"message": "Grupo actualizado"}

@app.delete("/groups/{name}")
def delete_group(
    name: str,
    user = Depends(get_current_user)
):
    only_admin(user)

    result = groups_collection.delete_one({"name": name})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Grupo no existe")

    # opcional: limpiar referencias
    units_collection.update_many(
        {"grupo": name},
        {"$set": {"grupo": "Sin grupo"}}
    )

    users_collection.update_many(
        {"grupo": name},
        {"$set": {"grupo": None}}
    )

    return {"message": "Grupo eliminado"}