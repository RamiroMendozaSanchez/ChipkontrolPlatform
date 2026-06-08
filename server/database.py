
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db = client[os.getenv("DB_NAME")]

groups_collection = db["groups"]
units_collection = db["units"]
history_collection = db["history"]
users_collection = db["users"]
session_collection = db["sessions"]