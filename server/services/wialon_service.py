import os
import json
import math
import time
import requests
import polyline

from datetime import datetime, timezone
from dotenv import load_dotenv

from database import (
    groups_collection,
    units_collection,
    history_collection
)


# ============================================================
# CONFIGURACIÓN
# ============================================================

load_dotenv()

BASE_URL = os.getenv("BASE_URL")
TOKEN = os.getenv("WIALON_TOKEN")

OSRM_BASE_URL = "http://router.project-osrm.org/route/v1/driving"

REQUEST_TIMEOUT = 15

# Distancia mínima para crear un registro histórico.
# 10 metros.
MIN_DISTANCE_METERS = 10


# ============================================================
# SESIÓN HTTP
# ============================================================

session = requests.Session()


# ============================================================
# DISTANCIA HAVERSINE
# ============================================================

def distancia_metros(lat1, lon1, lat2, lon2):
    """
    Calcula distancia entre dos coordenadas GPS en metros.
    """

    if None in (lat1, lon1, lat2, lon2):
        return 0

    R = 6371000  # Radio de la Tierra en metros

    lat1 = math.radians(lat1)
    lat2 = math.radians(lat2)

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2
        +
        math.cos(lat1)
        * math.cos(lat2)
        * math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a)
    )

    return R * c


# ============================================================
# OSRM
# ============================================================

def get_route_with_routing(points):
    """
    Obtiene una ruta siguiendo carreteras usando OSRM.

    points:
        [(lat, lon), ...]

    retorna:
        [(lat, lon), ...]
    """

    if len(points) < 2:
        return points

    try:

        coordinates = ";".join(
            f"{lon},{lat}"
            for lat, lon in points
        )

        url = (
            f"{OSRM_BASE_URL}/"
            f"{coordinates}"
            f"?overview=full"
            f"&geometries=polyline"
        )

        response = session.get(
            url,
            timeout=10
        )

        response.raise_for_status()

        data = response.json()

        if data.get("code") != "Ok":

            print(
                "❌ Error OSRM:",
                data.get("message", "Unknown error")
            )

            return points

        routes = data.get("routes", [])

        if not routes:
            return points

        geometry = routes[0].get("geometry")

        if not geometry:
            return points

        return polyline.decode(geometry)

    except Exception as e:

        print(
            f"❌ Error obteniendo ruta OSRM: {e}"
        )

        return points


# ============================================================
# LOGIN WIALON
# ============================================================

def get_sid():

    if not BASE_URL:
        raise Exception("BASE_URL no está configurado")

    if not TOKEN:
        raise Exception("WIALON_TOKEN no está configurado")

    params = {
        "token": TOKEN
    }

    try:

        response = session.get(
            BASE_URL,
            params={
                "svc": "token/login",
                "params": json.dumps(params)
            },
            timeout=REQUEST_TIMEOUT
        )

        response.raise_for_status()

        data = response.json()

        sid = data.get("eid")

        if not sid:

            raise Exception(
                f"Wialon no devolvió SID: {data}"
            )

        print("✔ SID obtenido")

        return sid

    except Exception as e:

        print(
            f"❌ Error obteniendo SID: {e}"
        )

        return None


# ============================================================
# PETICIÓN GENÉRICA WIALON
# ============================================================

def wialon_request(sid, service, params):

    try:

        response = session.get(
            BASE_URL,
            params={
                "svc": service,
                "params": json.dumps(params),
                "sid": sid
            },
            timeout=REQUEST_TIMEOUT
        )

        response.raise_for_status()

        data = response.json()

        # Wialon puede devolver error dentro del JSON
        if isinstance(data, dict):

            error = data.get("error")

            if error:
                raise Exception(
                    f"Wialon error {error}: {data}"
                )

        return data

    except requests.RequestException as e:

        raise Exception(
            f"HTTP Wialon: {e}"
        )

    except ValueError:

        raise Exception(
            "Wialon devolvió JSON inválido"
        )


# ============================================================
# OBTENER GRUPOS Y RELACIÓN UNIDAD → GRUPO
# ============================================================

def get_unit_groups(sid):

    groups = list(
        groups_collection.find()
    )

    unit_groups = {}

    print(
        f"🔎 Grupos configurados en MongoDB: "
        f"{len(groups)}"
    )

    for grupo in groups:

        group_name = grupo.get("name")

        if not group_name:
            continue

        try:

            params = {

                "spec": {

                    "itemsType":
                        "avl_unit_group",

                    "propName":
                        "sys_name",

                    "propValueMask":
                        f"{group_name}*",

                    "sortType":
                        "sys_name"
                },

                "force": 1,

                "flags": 1,

                "from": 0,

                "to": 0
            }

            data = wialon_request(
                sid,
                "core/search_items",
                params
            )

            items = data.get(
                "items",
                []
            )

            for item in items:

                for unit_id in item.get(
                    "u",
                    []
                ):

                    unit_groups[
                        int(unit_id)
                    ] = group_name

        except Exception as e:

            print(
                f"❌ Error grupo "
                f"{group_name}: {e}"
            )

    print(
        f"✔ Unidades encontradas en grupos: "
        f"{len(unit_groups)}"
    )

    return unit_groups


# ============================================================
# OBTENER TODAS LAS UNIDADES
# ============================================================

def get_wialon_units(sid):

    """
    Obtiene las unidades en una sola petición.

    Los flags solicitan:

    1        → datos básicos
    256      → propiedades avanzadas
    1024     → posición
    1048576  → parámetros del último mensaje
    """

    flags = (
        1
        + 256
        + 1024
        + 1048576
    )

    params = {

        "spec": {

            "itemsType":
                "avl_unit",

            "propName":
                "sys_id",

            "propValueMask":
                "*",

            "sortType":
                "sys_name"
        },

        "force": 1,

        "flags": flags,

        "from": 0,

        "to": 0
    }

    data = wialon_request(
        sid,
        "core/search_items",
        params
    )

    return data.get(
        "items",
        []
    )


# ============================================================
# OBTENER UID DESDE EL ITEM
# ============================================================

def get_uid_from_item(item):

    """
    Intenta encontrar el UID/IMEI
    en las diferentes estructuras disponibles.
    """

    # Forma estándar
    uid = item.get("uid")

    if uid:
        return uid

    # UID secundario
    uid2 = item.get("uid2")

    if uid2:
        return uid2

    # Algunas configuraciones pueden
    # contener propiedades adicionales.
    prp = item.get("prp", {})

    for key in (
        "uid",
        "uid2",
        "sys_unique_id"
    ):

        value = prp.get(key)

        if value:
            return value

    return None


# ============================================================
# OBTENER UID GUARDADO EN MONGO
# ============================================================

def get_existing_uid(wialon_id):

    document = units_collection.find_one(
        {
            "wialon_id": wialon_id
        },
        {
            "uid": 1
        }
    )

    if document:
        return document.get("uid")

    return None


# ============================================================
# CONVERTIR TIMESTAMP
# ============================================================

def timestamp_to_datetime(timestamp):

    if not timestamp:
        return None

    try:

        return datetime.fromtimestamp(
            timestamp,
            tz=timezone.utc
        ).replace(
            tzinfo=None
        )

    except Exception:

        return None


# ============================================================
# PROCESAR UNA UNIDAD
# ============================================================

def process_unit(
    item,
    grupo
):

    unit_id = item.get("id")

    nombre = item.get(
        "nm",
        "SIN NOMBRE"
    )

    # --------------------------------------------------------
    # UID / IMEI
    # --------------------------------------------------------

    uid = get_uid_from_item(item)

    # Si Wialon no lo entregó,
    # conservamos el que ya conocemos.
    if not uid and unit_id:

        uid = get_existing_uid(
            unit_id
        )

    # --------------------------------------------------------
    # POSICIÓN
    # --------------------------------------------------------

    pos = item.get(
        "pos",
        {}
    )

    lmsg = item.get(
        "lmsg",
        {}
    )

    # Preferimos posición del último mensaje
    msg_pos = lmsg.get(
        "pos",
        {}
    )

    if msg_pos:
        pos = msg_pos

    lat = pos.get("y")
    lon = pos.get("x")

    if lat is None or lon is None:

        raise Exception(
            "sin posición"
        )

    velocidad = pos.get(
        "s",
        0
    )

    curso = pos.get(
        "c",
        0
    )

    satelites = pos.get(
        "sc",
        0
    )

    # --------------------------------------------------------
    # HORA
    # --------------------------------------------------------

    timestamp = (
        lmsg.get("t")
        or item.get(
            "pos",
            {}
        ).get("t")
    )

    hora = timestamp_to_datetime(
        timestamp
    )

    # --------------------------------------------------------
    # PARÁMETROS
    # --------------------------------------------------------

    params = lmsg.get(
        "p",
        {}
    )

    # En tu dispositivo el parámetro
    # parece ser pwr_ext.
    voltaje = params.get(
        "pwr_ext"
    )

    # --------------------------------------------------------
    # ACTUALIZAR ESTADO ACTUAL
    # --------------------------------------------------------
    print(
        f"📡 {nombre} | "
        f"Lat: {lat} | "
        f"Lon: {lon} | "
        f"Velocidad Wialon: {velocidad} km/h"
    )
    units_collection.update_one(

        {
            "wialon_id": unit_id
        },

        {
            "$set": {

                "wialon_id":
                    unit_id,

                "uid":
                    uid,

                "nombre":
                    nombre,

                "grupo":
                    grupo,

                "lat":
                    lat,

                "lon":
                    lon,

                "velocidad":
                    velocidad,

                "curso":
                    curso,

                "satelites":
                    satelites,

                "hora":
                    hora,

                "voltaje":
                    voltaje,

                "updatedAt":
                    datetime.utcnow()
            }
        },

        upsert=True
    )

    # --------------------------------------------------------
    # HISTÓRICO
    # --------------------------------------------------------

    ultimo = history_collection.find_one(

        {
            "wialon_id":
                unit_id
        },

        sort=[
            (
                "hora",
                -1
            )
        ]
    )

    guardar_historico = True

    if ultimo:

        dist = distancia_metros(

            ultimo.get("lat"),
            ultimo.get("lon"),

            lat,
            lon
        )

        if dist < MIN_DISTANCE_METERS:

            guardar_historico = False

    # --------------------------------------------------------
    # GUARDAR HISTÓRICO
    # --------------------------------------------------------

    if guardar_historico:

        history_collection.insert_one(

            {

                "wialon_id":
                    unit_id,

                "uid":
                    uid,

                "nombre":
                    nombre,

                "grupo":
                    grupo,

                "lat":
                    lat,

                "lon":
                    lon,

                "velocidad":
                    velocidad,

                "curso":
                    curso,

                "satelites":
                    satelites,

                "hora":
                    hora,

                "voltaje":
                    voltaje,

                "createdAt":
                    datetime.utcnow()
            }
        )

        return True

    return False


# ============================================================
# PROCESO PRINCIPAL
# ============================================================

def process_units():

    print()
    print(
        "====================================="
    )
    print(
        " INICIANDO ACTUALIZACIÓN WIALON"
    )
    print(
        "====================================="
    )

    # --------------------------------------------------------
    # LOGIN
    # --------------------------------------------------------

    sid = get_sid()

    if not sid:
        return

    try:

        # ----------------------------------------------------
        # GRUPOS
        # ----------------------------------------------------

        unit_groups = get_unit_groups(
            sid
        )

        # ----------------------------------------------------
        # TODAS LAS UNIDADES
        # ----------------------------------------------------

        items = get_wialon_units(
            sid
        )

        print(
            f"✔ Unidades recibidas de Wialon: "
            f"{len(items)}"
        )

        # ----------------------------------------------------
        # CONTADORES
        # ----------------------------------------------------

        procesadas = 0
        historicos_nuevos = 0
        sin_cambio = 0
        errores = 0

        # ----------------------------------------------------
        # PROCESAR
        # ----------------------------------------------------

        for item in items:

            unit_id = item.get("id")

            if unit_id not in unit_groups:
                continue

            grupo = unit_groups[
                unit_id
            ]

            nombre = item.get(
                "nm",
                str(unit_id)
            )

            try:

                nuevo_historico = process_unit(
                    item,
                    grupo
                )

                procesadas += 1

                if nuevo_historico:

                    historicos_nuevos += 1

                    # Mostrar solamente unidades
                    # que generaron histórico
                    uid = get_uid_from_item(
                        item
                    )

                    print(
                        f"📍 {nombre} | "
                        f"UID: {uid} | "
                        f"ID: {unit_id}"
                    )

                else:

                    sin_cambio += 1

            except Exception as e:

                errores += 1

                print(
                    f"❌ {nombre} | {e}"
                )

        # ----------------------------------------------------
        # RESUMEN
        # ----------------------------------------------------

        print(
            "-------------------------------------"
        )

        print(
            f"✔ Procesadas: {procesadas}"
        )

        print(
            f"📍 Históricos nuevos: "
            f"{historicos_nuevos}"
        )

        print(
            f"⏸ Sin cambio: "
            f"{sin_cambio}"
        )

        if errores > 0:

            print(
                f"❌ Errores: "
                f"{errores}"
            )

        print(
            "====================================="
        )

    except Exception as e:

        print(
            f"❌ Error general: {e}"
        )


# ============================================================
# ÍNDICES MONGODB
# ============================================================

def create_indexes():

    try:

        # Una unidad actual por ID Wialon
        units_collection.create_index(
            [
                (
                    "wialon_id",
                    1
                )
            ],
            unique=True
        )

        # Histórico eficiente
        history_collection.create_index(
            [
                (
                    "wialon_id",
                    1
                ),
                (
                    "hora",
                    -1
                )
            ]
        )

        # UID
        units_collection.create_index(
            [
                (
                    "uid",
                    1
                )
            ],
            sparse=True
        )

        print(
            "✔ Índices MongoDB creados"
        )

    except Exception as e:

        print(
            f"⚠ Error creando índices: {e}"
        )


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    create_indexes()

    process_units()