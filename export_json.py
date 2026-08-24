import mysql.connector
import json

db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="",
    database="port_data"
)

cursor = db.cursor(dictionary=True)

# Get data from each table
cursor.execute("SELECT * FROM cargo")
cargo = cursor.fetchall()

cursor.execute("SELECT * FROM ports")
ports = cursor.fetchall()

cursor.execute("SELECT * FROM vessels")
vessels = cursor.fetchall()

cursor.execute("SELECT * FROM scenarios")
scenarios = cursor.fetchall()

# Change database column back to JSON name
for vessel in vessels:
    vessel["class"] = vessel.pop("vessel_class")

# Create JSON structure
data = {
    "cargo": cargo,
    "ports": ports,
    "vessels": vessels,
    "scenarios": scenarios
}

# Create JSON file
with open("port_data.json", "w") as file:
    json.dump(data, file, indent=2)

cursor.close()
db.close()

print("JSON file created successfully!")