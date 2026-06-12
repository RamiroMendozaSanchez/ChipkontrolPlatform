import requests
import os
from dotenv import load_dotenv
from datetime import datetime
from database import groups_collection, units_collection, history_collection
import math
import polyline

load_dotenv()

BASE_URL = os.getenv("BASE_URL")
TOKEN = os.getenv("WIALON_TOKEN")
OSRM_BASE_URL = "http://router.project-osrm.org/route/v1/driving"



def distancia(lat1, lon1, lat2, lon2):
    return math.sqrt((lat1 - lat2)**2 + (lon1 - lon2)**2)


def get_route_with_routing(points):
    """
    Obtiene ruta siguiendo carreteras usando OSRM
    points: lista de tuplas (lat, lon)
    retorna: lista de coordenadas [[lat, lon], ...]
    """
    if len(points) < 2:
        return points
    
    try:
        # OSRM espera formato: lon,lat;lon,lat;...
        coordinates = ";".join([f"{lon},{lat}" for lat, lon in points])
        url = f"{OSRM_BASE_URL}/{coordinates}?overview=full&geometries=polyline"
        
        response = requests.get(url, timeout=10)
        data = response.json()
        
        if data.get("code") != "Ok":
            print(f"Error OSRM: {data.get('message', 'Unknown error')}")
            return points
        
        # Decodificar polyline a coordenadas
        if "routes" in data and len(data["routes"]) > 0:
            geometry = data["routes"][0]["geometry"]
            decoded = polyline.decode(geometry)
            # polyline retorna (lat, lon), que es el formato que necesitamos
            return decoded
        
        return points
        
    except Exception as e:
        print(f"Error obteniendo ruta con routing: {e}")
        return points


def get_sid():
    url = f'{BASE_URL}?svc=token/login&params={{"token":"{TOKEN}"}}'
    res = requests.get(url)
    return res.json().get("eid")


def get_unit_ids(sid):
    groups = list(groups_collection.find())
    result = []

    for grupo in groups:
        try:
            url = f'{BASE_URL}?svc=core/search_items&params={{"spec":{{"itemsType":"avl_unit_group","propName":"sys_name","propValueMask":"{grupo["name"]}*","sortType":"sys_name"}},"force":1,"flags":1,"from":0,"to":0}}&sid={sid}'
            res = requests.get(url)
            items = res.json().get("items", [])

            for item in items:
                for u in item.get("u", []):
                    result.append({
                        "id": u,
                        "grupo": grupo["name"]
                    })

        except:
            print("Error grupo", grupo["name"])

    return result

def process_units():
    sid = get_sid()
    units_data = get_unit_ids(sid)
    for unit in units_data:
        try:
            unit_id = unit["id"]
            grupo = unit["grupo"]

            url = f'{BASE_URL}?svc=core/search_item&params={{"id":"{unit_id}","flags":4611686018427387903}}&sid={sid}'
            res = requests.get(url)
            item = res.json().get("item")
            #print(item)
            if not item or "pos" not in item:
                continue

            imei = item.get("uid")
            nombre = item.get("nm")

            lmsg = item.get("lmsg", {})
            params = lmsg.get("p", {})
            pos = lmsg.get("pos", item.get("pos", {}))

            lat = pos.get("y")
            lon = pos.get("x")
            velocidad = pos.get("s", 0)
            curso = pos.get("c", 0)
            satelites = pos.get("sc", 0)
            hora = datetime.utcfromtimestamp(
                lmsg.get("t", item["pos"]["t"])
            )
            voltaje = params.get("s_asgn1")


            # 🟢 guardar estado actual con grupo
            units_collection.update_one(
                {"imei": imei},
                {"$set": {
            "imei": imei,
            "nombre": nombre,
            "grupo": grupo,
            "lat": lat,
            "lon": lon,
            "velocidad": velocidad,
            "curso": curso,
            "satelites": satelites,
            "hora": hora,
            "voltaje": voltaje,
            "updatedAt": datetime.utcnow()
        }},
                upsert=True
            )
            
                        # buscar último registro
            ultimo = history_collection.find_one(
                {"imei": imei},
                sort=[("hora", -1)]
            )

            if ultimo:
                dist = distancia(
                    ultimo["lat"],
                    ultimo["lon"],
                    lat,
                    lon
                )

                # 👇 umbral de movimiento
                if dist < 0.0001:
                    print(f"⛔ sin movimiento real {imei}")
                    continue  # 👈 IMPORTANTE: usar continue (no return)


            # 🟡 histórico
            history_collection.insert_one({
                 "imei": imei,
    "nombre": nombre,
    "grupo": grupo,

    "lat": lat,
    "lon": lon,

    "velocidad": velocidad,
    "curso": curso,
    "satelites": satelites,

    "hora": hora,
            })

            print(f"✔ {nombre}")

        except Exception as e:
            print(f"❌ Error unidad {unit_id}: {str(e)}")