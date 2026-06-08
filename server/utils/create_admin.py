from database import users_collection
from utils.security import hash_password
from datetime import datetime

def create_admin():
    admin_email = "admin@mail.com"

    if users_collection.find_one({"email": admin_email}):
        print("⚠️ El admin ya existe")
        return

    admin = {
        "email": admin_email,
        "password": hash_password("123456"),
        "nombre": "Admin",
        "rol": "admin",
        "empresa_id": None,
        "activo": True,
        "created_at": datetime.utcnow()
    }

    users_collection.insert_one(admin)

    print("✅ Admin creado correctamente")

if __name__ == "__main__":
    create_admin()