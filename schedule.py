from supabase import create_client, Client
from flask import Flask, jsonify, request, session
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
from datetime import timedelta, datetime
from datetime import date
import os
import firebase_admin
from firebase_admin import messaging, credentials

app = Flask(__name__)
app.secret_key = 'seckey257'
CORS(app)

# Replace with your values
url = "https://asbfhxdomvclwsrekdxi.supabase.co"
# key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYmZoeGRvbXZjbHdzcmVrZHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMjI3OTUsImV4cCI6MjA2OTg5ODc5NX0.0VzbWIc-uxIDhI03g04n8HSPRQ_p01UTJQ1sg8ggigU"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYmZoeGRvbXZjbHdzcmVrZHhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDMyMjc5NSwiZXhwIjoyMDY5ODk4Nzk1fQ.iPXQg3KBXGXNlJwMzv5Novm0Qnc7Y5sPNE4RYxg3wqI"
supabase: Client = create_client(url, key)

cred = credentials.Certificate("./gerriapp-firebase-adminsdk-fbsvc-fe186b01ec.json")
firebase_admin.initialize_app(cred)

# schedule display
@app.route('/scheduled', methods=['GET'])
def schedule():
    clients = supabase.table("client").select("*").execute()
    employees = supabase.table("employee").select("*").execute()
    shifts = supabase.table("shift").select("*").execute()
    daily_shifts = supabase.table("daily_shift").select("*").execute()

    datatosend = {
        "client": clients.data,
        "employee": employees.data,
        "shift": shifts.data,
        "daily_shift": daily_shifts.data
    }
    return jsonify(datatosend)

@app.route('/submit', methods=['POST'])
def edit_schedule():
    data = request.json
    s_id = data['shift_id']

    # 1. Fetch client
    client = supabase.table("client").select("*").eq("client_id", data['client_id']).execute()

    s_time = datetime.strptime(data['shift_start_time'], "%Y-%m-%dT%H:%M")
    e_time = datetime.strptime(data['shift_end_time'], "%Y-%m-%dT%H:%M")

    # 2. Update shift times
    supabase.table("shift").update({
        "shift_start_time": str(s_time),
        "shift_end_time": str(e_time)
    }).eq("shift_id", s_id).execute()

    # 3. Call Postgres function for daily_shift updates
    supabase.rpc("update_daily_shifts", {}).execute()

    # 4. Fetch updated shift
    updated_shift = supabase.table("shift").select("*").eq("client_id", data['client_id']).eq("shift_id", data['shift_id']).execute()

    print("Updated shift:", updated_shift.data)

    return jsonify({
        "client": client.data,
        "updated_shift": updated_shift.data
    })

def send_notification(token, title, body):
    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        token=token,
    )
    response = messaging.send(message)
    print("Notification sent:", response)

@app.route('/newClientSchedule', methods=['GET'])
def newClientSchedule():
    print("Hi")
    changes = detect_changes()

    # If changes found, trigger scheduling function
    if changes["new_clients"]:
        run_scheduling(changes)

    return jsonify(changes)


last_known_clients = set()
last_known_shifts = {}


# ---- Function to check changes ----
def detect_changes():
    global last_known_clients, last_known_shifts

    changes = {"new_clients": [], "updated_shifts": []}

    # 1. Get all client IDs
    clients = supabase.table("client").select("client_id").execute()
    current_clients = {row["client_id"] for row in clients.data}

    # 2. Detect new clients
    new_clients = current_clients - last_known_clients
    if new_clients:
        # Fetch shift details for new clients where shift_status is NULL
        shifts = supabase.table("shift") \
            .select("shift_id","client_id, shift_start_time, shift_end_time") \
            .in_("client_id", list(new_clients)) \
            .is_("shift_status", None) \
            .execute()

        if shifts.data:
            changes["new_clients"].extend(shifts.data)

    last_known_clients = current_clients
    return changes

def parse_datetime(tstr: str) -> datetime:
    for fmt in ("%Y-%m-%d %H:%M", "%d-%m-%Y %H:%M", "%Y-%m-%d %H:%M:%S",  "%d-%m-%Y %H:%M%S"):
        try:
            return datetime.strptime(tstr, fmt)
        except ValueError:
            continue
    raise ValueError(f"Unknown datetime format: {tstr}")

def overlaps(client_start_time, client_end_time, dsst, dset, ssst, sset):
    """Check if time overlaps."""
    if(dsst=="" or dset==""):
        return False
    elif(ssst=="" and sset==""):
        client_start_dt = parse_datetime(client_start_time)
        client_end_dt   = parse_datetime(client_end_time)
        dsst_dt         = parse_datetime(dsst)
        dset_dt         = parse_datetime(dset)
        return ((client_start_dt < client_end_dt
            and client_start_dt >= dsst_dt and client_start_dt <= dset_dt
            and client_end_dt >= dsst_dt and client_end_dt <= dset_dt))
    else:
        client_start_dt = parse_datetime(client_start_time)
        client_end_dt   = parse_datetime(client_end_time)
        dsst_dt         = parse_datetime(dsst)
        dset_dt         = parse_datetime(dset)
        ssst_dt         = parse_datetime(ssst)
        sset_dt         = parse_datetime(sset)
        print(client_start_dt,client_end_dt)
        return (
            (client_start_dt < client_end_dt
            and client_start_dt >= dsst_dt and client_start_dt <= dset_dt
            and client_end_dt >= dsst_dt and client_end_dt <= dset_dt)
            and not ((client_start_dt > ssst_dt and client_start_dt < sset_dt)
                    or (client_end_dt > ssst_dt and client_end_dt < sset_dt))
        )


def get_employees():
    today = "25-09-2025"  # or use date.today()
    print("Today date is: ", today)

    # Join equivalent needs to be handled in Supabase: fetch and merge in Python
    employees = supabase.table("employee").select("emp_id").execute()
    daily_shifts = supabase.table("daily_shift").select("emp_id, shift_start_time, shift_end_time, shift_date").eq("shift_date", str(today)).execute()
    shifts = supabase.table("shift").select("emp_id, shift_start_time, shift_end_time, date").eq("date",str(today)).execute()

    # Merge results into employee dicts
    merged = []
    for e in employees.data:
        emp_id = e["emp_id"]
        ds = next((ds for ds in daily_shifts.data if ds["emp_id"] == emp_id), None)
        s = next((s for s in shifts.data if s["emp_id"] == emp_id), None)
        if ds and s:
            merged.append({
                "emp_id": emp_id,
                "dsst": ds["shift_start_time"],
                "dset": ds["shift_end_time"],
                "ssst": s["shift_start_time"],
                "sset": s["shift_end_time"]
            })
        elif ds and not s:
            merged.append({
                "emp_id": emp_id,
                "dsst": ds["shift_start_time"],
                "dset": ds["shift_end_time"],
                "ssst": "",
                "sset": ""
            })
    print(merged)
    return merged


def assign_tasks(changes):
    employees = get_employees()
    #print(changes["new_clients"][0])
    for ch in changes["new_clients"]:
        print("Hi2",ch)
        eligible = [
            e for e in employees
            if (overlaps(ch['shift_start_time'], ch['shift_end_time'],e['dsst'], e['dset'], e['ssst'], e['sset']))
        ]
        print(eligible)

        if not eligible:
            print(f"No eligible employee for client {ch['client_id']}")
            continue

        print("Eligible employees:", eligible)
        best_employee = eligible[0]  # pick the first one
        print("Assigned employee:", best_employee)

        supabase.table("shift").update({
            "emp_id": best_employee['emp_id'],
            "shift_status": "Scheduled"
        }).eq("client_id", ch['client_id']).eq("shift_id",ch['shift_id']).execute()

        print(f"Assigned task {ch['client_id']} to employee {best_employee['emp_id']}")
        tokens = supabase.table("employee_tokens").select("fcm_token").eq("emp_id", best_employee['emp_id']).execute()
        fcm_tok = tokens.data[0]["fcm_token"].strip()
        print(fcm_tok)
        send_notification(fcm_tok,"New Shift Assigned", f"Shift scheduled from {ch['shift_start_time']} to {ch['shift_end_time']}, time: {datetime.now()}")
        schedule()



# ---- Your Scheduling Logic ----
def run_scheduling(changes):
    print("Scheduling triggered due to changes:", changes)
    assign_tasks(changes)



@app.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    required = ["password", "first_name", "last_name"]
    missing = [k for k in required if not data.get(k)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    # Hash password
    hashed_pw = generate_password_hash(data["password"])

    response = supabase.table("employee").insert({
        "first_name": data["first_name"],
        "last_name": data["last_name"],
        "date_of_birth": data.get("date_of_birth"),
        "gender": data.get("gender"),
        "password": hashed_pw
    }).execute()

    return jsonify({"message": "Registered successfully", "data": response.data}), 201

@app.route('/register/client', methods=['POST'])
def register_client():
    data = request.get_json(silent=True) or {}
    response = supabase.table("client").select("client_id").eq("email",data.get('email')).execute()
    if(response.data):
        return jsonify({"message": f"Client ID already exists {response.data}"}), 409
    else:
        fmt = "%Y-%m-%d"
        dob = data['date_of_birth']
        result = supabase.table("client").select("*", count="exact").execute()
        lastcid = result.count +1
        dateofbirth=dob
        # print(firstname,lastname,gender,dateofbirth)
        response = supabase.table("client").insert({
            "client_id": lastcid,
            "first_name": data['first_name'],
            "last_name": data['last_name'],
            "date_of_birth": dateofbirth,
            "phone": data['phone_number'],
            "gender": data['gender'],
            "name": data['first_name'],
            "address_line1":data['address'],
            "image_url": data['image'],
            "password":data['password'],
            "preferred_language":data['preferred_language']
            }).execute()
        if(response):
            result = (
                supabase.table("shift")
                .select("shift_id")
                .order("shift_id", desc=True)
                .limit(1)
                .execute()
            )

            if result.data:
                last_shift_id = result.data[0]["shift_id"]
            for item in data['shifts']:
                fmt = '%Y-%m-%dT%H:%M:%S'
                add_shift = supabase.table("shift").insert({
                    "shift_id": last_shift_id+1,
                    "date": convDate(item['startDate']),
                    "shift_start_time":convtime(item['startTime']),
                    "shift_end_time":convtime(item['endTime']),
                    "client_id":lastcid
                }).execute()
                last_shift_id = last_shift_id+1
        newClientSchedule()
        return jsonify({"message": "Registered successfully"}), 201
def convtime(tinp):
    #day, month, rest = tinp.split("-")
    dat, time = tinp.split("T")
    conv_time= dat+" "+time
    return conv_time
def convDate(dt):
    year, month, day = dt.split("-")
    conv_dt = day+"-"+month+"-"+year
    return conv_dt



@app.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    emp_id = data.get("employeeId")
    password = data.get("password")

    if not emp_id or not password:
        return jsonify({"error": "employeeId and password are required"}), 400

    response = supabase.table("employee").select("password").eq("emp_id", emp_id).execute()

    if not response.data:
        return jsonify({"error": "Invalid credentials"}), 400

    stored_pw = response.data[0]["password"]

    if not check_password_hash(stored_pw, password):
        return jsonify({"error": "Invalid credentials"}), 400

    session['emp_id'] = emp_id
    return jsonify({"message": "Login successful"}), 200



@app.route('/protected')
def protected():
    if 'emp_id' in session:
        return jsonify({'message': f'Welcome, user {session['emp_id']}!'})
    else:
        return jsonify({'message': 'Unauthorized'}), 401


@app.route('/logout')
def logout():
    session.pop('emp_id', None)
    return jsonify({'message': 'Logged out successfully'})


# --- Run ---
if __name__ == '__main__':
    app.run(debug=True)

