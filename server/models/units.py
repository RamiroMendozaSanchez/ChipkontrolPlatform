from typing import Optional

from pydantic import BaseModel
from datetime import datetime

class Unit(BaseModel):
    imei: str
    nombre: str
    lat: float
    lon: float
    velocidad: float
    updatedAt: datetime

class History(BaseModel):
    imei: str
    nombre: str
    lat: float
    lon: float
    velocidad: float
    hora: datetime
    voltaje_bateria: str
    gps_validity: str

class GroupModel(BaseModel):
    name: str

class UserCreate(BaseModel):
    username: str
    password: str
    grupo: Optional[str] = None
    role: str = "user"