import mysql.connector
import random

db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="",
    database="port_data"
)

cursor = db.cursor()

# =========================
# CARGO - 1000 RECORDS
# =========================

for i in range(1, 1001):
    sql = """
    INSERT INTO cargo
    (cargo_id, commodity, demand_tonnes, min_parcel_size, max_tranches)
    VALUES (%s, %s, %s, %s, %s)
    """

    values = (
        f"C{i:04d}",
        random.choice([
            "Iron Ore", "Coal", "Steel", "Grain",
            "Cement", "Bauxite", "Limestone", "Fertilizer"
        ]),
        random.randint(20000, 200000),
        random.randint(5000, 30000),
        random.randint(1, 5)
    )

    cursor.execute(sql, values)

print("Cargo inserted: 1000")


# =========================
# PORTS - 1000 RECORDS
# =========================

for i in range(1, 1001):
    sql = """
    INSERT INTO ports
    (port_id, name, draft_limit, loa_limit, beam_limit,
     berths, port_cost_per_tonne)
    VALUES (%s, %s, %s, %s, %s, %s, %s)
    """

    values = (
        f"P{i:04d}",
        f"Port {i}",
        round(random.uniform(6, 15), 2),
        random.randint(180, 320),
        random.randint(25, 50),
        random.randint(2, 12),
        round(random.uniform(8, 25), 2)
    )

    cursor.execute(sql, values)

print("Ports inserted: 1000")


# =========================
# VESSELS - 1000 RECORDS
# =========================

for i in range(1, 1001):

    vessel_class = random.choice([
        "Handysize",
        "Panamax",
        "Capesize"
    ])

    if vessel_class == "Handysize":
        dwt = random.randint(30000, 45000)
        draft = round(random.uniform(6.5, 8), 2)
        loa = random.randint(170, 200)
        beam = random.randint(25, 32)
        capacity = random.randint(25000, 40000)
        cost = random.randint(15, 20)

    elif vessel_class == "Panamax":
        dwt = random.randint(60000, 80000)
        draft = round(random.uniform(8.5, 10.5), 2)
        loa = random.randint(210, 230)
        beam = random.randint(30, 33)
        capacity = random.randint(50000, 70000)
        cost = random.randint(20, 25)

    else:
        dwt = random.randint(120000, 180000)
        draft = round(random.uniform(12, 15), 2)
        loa = random.randint(270, 300)
        beam = random.randint(40, 46)
        capacity = random.randint(100000, 150000)
        cost = random.randint(27, 35)

    sql = """
    INSERT INTO vessels
    (vessel_id, vessel_class, dwt, draft, loa, beam,
     capacity, charter_cost_per_tonne)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """

    values = (
        f"V{i:04d}",
        vessel_class,
        dwt,
        draft,
        loa,
        beam,
        capacity,
        cost
    )

    cursor.execute(sql, values)

print("Vessels inserted: 1000")


# =========================
# SCENARIOS - 1000 RECORDS
# =========================

for i in range(1, 1001):

    sql = """
    INSERT INTO scenarios
    (scenario_id, probability, freight_rate,
     fuel_cost, weather_delay_days)
    VALUES (%s, %s, %s, %s, %s)
    """

    values = (
        f"S{i:04d}",
        round(random.uniform(0.05, 0.50), 2),
        random.randint(450, 750),
        random.randint(80, 150),
        random.randint(0, 7)
    )

    cursor.execute(sql, values)

print("Scenarios inserted: 1000")


# =========================
# SAVE
# =========================

db.commit()

cursor.close()
db.close()

print("\nALL 4000 RECORDS INSERTED SUCCESSFULLY!")