from supabase import create_client, Client
from flask import Flask, jsonify, request, session
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
from datetime import timedelta, datetime
from datetime import date
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import calendar
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import json
import asyncio

app_notif = FastAPI()

active_connections = {}  # emp_id -> WebSocket


app = Flask(__name__)
app.secret_key = 'seckey257'
CORS(app)

# Replace with your values
url = "https://asbfhxdomvclwsrekdxi.supabase.co"
# key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYmZoeGRvbXZjbHdzcmVrZHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMjI3OTUsImV4cCI6MjA2OTg5ODc5NX0.0VzbWIc-uxIDhI03g04n8HSPRQ_p01UTJQ1sg8ggigU"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYmZoeGRvbXZjbHdzcmVrZHhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDMyMjc5NSwiZXhwIjoyMDY5ODk4Nzk1fQ.iPXQg3KBXGXNlJwMzv5Novm0Qnc7Y5sPNE4RYxg3wqI"
supabase: Client = create_client(url, key)

@app.route('/dashboard/stats', methods=['GET'])
def dashboard_stats():
    now = datetime.utcnow()
    today = now.date().isoformat()

    # 1️⃣ Scheduled Visits (Today)
    scheduled = supabase.table("shift") \
        .select("shift_id", count="exact") \
        .eq("date", today) \
        .eq("shift_status", "Scheduled") \
        .execute().count

    # 2️⃣ Clocked-in Employees
    clocked_in = (
        supabase.table("shift")
        .select("shift_id", count="exact")
        .eq("shift_status", "Clocked in")
        .gte("clock_in", f"{today}T00:00:00Z")
        .execute()
        .count
    )




    # 3️⃣ Accepted Offers
    accepted_offers = (
            supabase.table("shift_offers")
            .select("offers_id", count="exact")
            .eq("status", "sent")
            .gte("sent_at", f"{today}T00:00:00Z")
            .lt("sent_at", f"{today}T23:59:59.999999Z")
            .execute()
            .count
        )


    # 4️⃣ Employees On Leave
    on_leave = supabase.table("leaves") \
        .select("emp_id", count="exact") \
        .lte("leave_start_date", today) \
        .gte("leave_end_date", today) \
        .execute().count

    # 5️⃣ Sick Leave
    sick_leave = supabase.table("leaves") \
        .select("emp_id", count="exact") \
        .eq("leave_type", "Sick") \
        .lte("leave_start_date", today) \
        .gte("leave_end_date", today) \
        .execute().count

    # 6️⃣ Available Employees
    total_employees = supabase.table("employee") \
        .select("emp_id", count="exact") \
        .execute().count

    unavailable_now = supabase.table("leaves") \
        .select("emp_id", count="exact") \
        .lte("leave_start_date", today) \
        .gte("leave_end_date", today) \
        .execute().count

    available = total_employees - (clocked_in + on_leave)

    return jsonify([
        { "label": "Schedule Visits", "value": scheduled, "color": "card-purple" },
        { "label": "Clocked-in", "value": clocked_in, "color": "card-cyan" },
        { "label": "Offers Sent", "value": accepted_offers, "color": "card-purple" },
        { "label": "Available", "value": max(available, 0), "color": "card-green" },
        { "label": "On Leave", "value": on_leave, "color": "card-orange" },
        { "label": "Unavailable - Sick", "value": sick_leave, "color": "card-orange" }
    ])

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

    s_time = datetime.strptime(data['shift_start_time'], "%Y-%m-%dT%H:%M:%S")
    e_time = datetime.strptime(data['shift_end_time'], "%Y-%m-%dT%H:%M:%S")
    print(e_time)
    # 2. Update shift times
    supabase.table("shift").update({
        "shift_start_time": str(s_time)[:19] + "Z",
        "shift_end_time": str(e_time)[:19] + "Z"
    }).eq("shift_id", s_id).execute()

    # 3. Call Postgres function for daily_shift updates
    supabase.rpc("update_daily_shifts", {}).execute()

    # 4. Fetch updated shift
    updated_shift = supabase.table("shift").select("*").eq("client_id", data['client_id']).eq("shift_id", data['shift_id']).execute()

    print("Updated shift:", updated_shift.data)
    emp_id = updated_shift.data[0]['emp_id']
    print(f"Rescheduled Shift Assigned to employee {emp_id}:", f"Shift Re-scheduled for client id: {data['client_id']} - from {updated_shift.data[0]['shift_start_time']} to {updated_shift.data[0]['shift_end_time']}. Time of reschedule: {datetime.utcnow()}. Do you accept or reject the offer.")
    return jsonify({
        "client": client.data,
        "updated_shift": updated_shift.data
    })

@app.route('/newShiftSchedule', methods=['GET'])
def newShiftSchedule():
    print("Hi")
    changes = detect_unassigned_shifts()

    # If changes found, trigger scheduling function
    if changes["new_clients"]:
        run_scheduling(changes)

    return jsonify(changes)


# ---- Function to check changes ----
def detect_unassigned_shifts():
    global last_known_clients, last_known_shifts

    changes = {"new_clients": [], "updated_shifts": []}

    # 1. Get all client IDs

    # Fetch shift details for new clients where shift_status is NULL
    shifts = supabase.table("shift") \
        .select("shift_id","client_id, shift_start_time, shift_end_time, date") \
        .is_("shift_status", None) \
        .execute()

    if shifts.data:
        changes["new_clients"].extend(shifts.data)

    # last_known_clients = current_clients
    return changes

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
            .select("shift_id","client_id, shift_start_time, shift_end_time, date") \
            .in_("client_id", list(new_clients)) \
            .is_("shift_status", None) \
            .execute()

        if shifts.data:
            changes["new_clients"].extend(shifts.data)

    last_known_clients = current_clients
    return changes

def parse_datetime(tstr: str) -> datetime:
    # Expect ISO 8601 UTC: YYYY-MM-DDTHH:MM[:SS]Z
    return datetime.fromisoformat(tstr.replace("Z", ""))



def normalize_datetime(date_str, time_or_dt):
    # already a datetime → return as-is
    if " " in time_or_dt:
        return time_or_dt
    # only time → prepend date
    return f"{date_str} {time_or_dt}"


def overlaps(em, cdate, client_start_time, client_end_time, dsst, dset, ssst, sset, sdate):
    """
    All inputs MUST be ISO UTC: YYYY-MM-DDTHH:MM[:SS]Z
    """

    if not dsst or not dset:
        return False

    client_start_dt = parse_datetime(client_start_time)
    client_end_dt   = parse_datetime(client_end_time)
    dsst_dt         = parse_datetime(dsst)
    dset_dt         = parse_datetime(dset)

    # Basic overlap with daily shift
    if not (client_start_dt < dset_dt and client_end_dt > dsst_dt):
        return False

    # If no secondary shift, we’re good
    if not ssst or not sset:
        return True

    ssst_dt = parse_datetime(ssst)
    sset_dt = parse_datetime(sset)

    # Exclude overlap with secondary shift
    if client_start_dt < sset_dt and client_end_dt > ssst_dt:
        return False

    return True


def get_employees_for_shift(dateofshift):
    print("Hi3")
    today = dateofshift  # or use date.today()
    print("Today date is: ", today)

    # Join equivalent needs to be handled in Supabase: fetch and merge in Python
    employee = supabase.table("employee").select("emp_id,seniority, employee_type").order("seniority", desc=True).execute()
    daily_shifts = supabase.table("daily_shift").select("emp_id, shift_start_time, shift_end_time, shift_date").eq("shift_date", str(today)).execute()
    shifts = supabase.table("shift").select("emp_id, shift_start_time, shift_end_time, date").eq("date",str(today)).execute()
    leaves_raw = supabase.table("leaves").select("emp_id, leave_start_date, leave_start_time, leave_end_date, leave_end_time").execute().data
    leaves = []
    for lv in leaves_raw:
        start = lv["leave_start_date"]
        end   = lv["leave_end_date"]

        if start <= today <= end:
            leaves.append(lv)

    # Merge results into employee dicts
    merged = []
    for e in employee.data:
        emp_id = e["emp_id"]
        ds = next((ds for ds in daily_shifts.data if ds["emp_id"] == emp_id), None)
        s = next((s for s in shifts.data if s["emp_id"] == emp_id), None)
        emp_leaves = [
        {
            "start": lv['leave_start_time'],
            "end": lv['leave_end_time'],
        }
        for lv in leaves if lv["emp_id"] == emp_id
        ]
        if ds and s:
            merged.append({
                "emp_id": emp_id,
                "dsst": ds["shift_start_time"],
                "dset": ds["shift_end_time"],
                "ssst": s["shift_start_time"],
                "sset": s["shift_end_time"],
                "leaves": emp_leaves,
                "sdate": s["date"],
                "employee_type":e["employee_type"],
            })
        elif ds and not s:
            merged.append({
                "emp_id": emp_id,
                "dsst": ds["shift_start_time"],
                "dset": ds["shift_end_time"],
                "ssst": "",
                "sset": "",
                "leaves": emp_leaves,
                "sdate": "",
                "employee_type":e["employee_type"],
            })
    print(merged)
    return merged

def overlaps_datetime(start1, end1, start2, end2):
    print(start1, end1, start2, end2)
    return start1 < end2 and end1 > start2

EMPLOYMENT_PRIORITY = {
    "Full Time": 1,
    "Part Time": 2,
    "Casual": 3
}

from datetime import datetime

def assign_tasks(changes):
    for ch in changes["new_clients"]:
        shift_id = ch["shift_id"]

        # 0️⃣ HARD GUARD — skip if shift already scheduled
        shift_res = (
            supabase.table("shift")
            .select("shift_status")
            .eq("shift_id", shift_id)
            .single()
            .execute()
        )

        if not shift_res.data or shift_res.data["shift_status"] == "Scheduled":
            print(f"[SKIP] Shift {shift_id} already scheduled")
            continue

        # 1️⃣ HARD GUARD — skip if offers already exist
        existing_offer = (
            supabase.table("shift_offers")
            .select("offers_id")
            .eq("shift_id", shift_id)
            .limit(1)
            .execute()
        )

        if existing_offer.data:
            print(f"[SKIP] Offers already exist for shift {shift_id}")
            continue

        # 2️⃣ Compute eligible employees
        employeetab = get_employees_for_shift(ch["date"])

        eligible = [
            e for e in employeetab
            if overlaps(
                e,
                ch["date"],
                ch["shift_start_time"],
                ch["shift_end_time"],
                e["dsst"],
                e["dset"],
                e["ssst"],
                e["sset"],
                e["sdate"]
            )
        ]

        if not eligible:
            print(f"[NO MATCH] No eligible employee for shift {shift_id}")
            continue

        # 3️⃣ Rank employees
        eligible.sort(
            key=lambda e: EMPLOYMENT_PRIORITY.get(e["employee_type"], 99)
        )

        best_employee = eligible[0]

        # 4️⃣ Time check
        today = date.today()
        shift_start = datetime.strptime(
            f"{today} {ch['shift_start_time']}",
            "%Y-%m-%d %H:%M"
        )

        hours_to_shift = (shift_start - datetime.utcnow()).total_seconds() / 3600

        # 🟢 AUTO-ASSIGN (<24h)
        if hours_to_shift < 24:
            supabase.table("shift").update({
                "emp_id": best_employee["emp_id"],
                "shift_status": "Scheduled"
            }).eq("shift_id", shift_id).execute()

            # expire any accidental offers
            supabase.table("shift_offers").update({
                "status": "expired"
            }).eq("shift_id", shift_id).execute()

            notify_employee(
                best_employee["emp_id"],
                {
                    "type": "shift_offer",
                    "shift_id": shift_id,
                    "message": "Shift auto-assigned."
                }
            )

            print(f"[AUTO] Shift {shift_id} → emp {best_employee['emp_id']}")
            continue

        # 🟠 OFFER FLOW (>=24h)
        supabase.table("shift_offers").upsert(
            {
                "shift_id": shift_id,
                "emp_id": best_employee["emp_id"],
                "status": "sent",
                "offer_order": 1,
                "sent_at": datetime.utcnow().isoformat() + "Z"
            },
            on_conflict="shift_id,emp_id"
        ).execute()

        supabase.table("shift").update({
            "shift_status": "Offer Sent"
        }).eq("shift_id", shift_id).execute()

        notify_employee(
            best_employee["emp_id"],
            {
                "type": "shift_offer",
                "shift_id": shift_id,
                "message": "A shift is available. Accept or Reject."
            }
        )

        print(f"[OFFER] Shift {shift_id} → emp {best_employee['emp_id']}")

def accept_shift_offer(shift_id, emp_id):

    assigned = (
                supabase.table("shift")
                .select("emp_id")
                .eq("shift_id", shift_id)
                .single()
                .execute()
            )


    if assigned.data["emp_id"] is not None:
        return {"error": "Shift already assigned"}


    supabase.table("shift").update({
        "emp_id": emp_id,
        "shift_status": "Scheduled"
    }).eq("shift_id", shift_id).execute()

    supabase.table("shift_offers").update({
        "status": "accepted",
        "response_time": datetime.utcnow().isoformat() + "Z"
    }).eq("shift_id", shift_id).eq("emp_id", emp_id).execute()

    supabase.table("shift_offers").update({
        "status": "expired"
    }).eq("shift_id", shift_id).neq("emp_id", emp_id).execute()

    return {"success": True}

def activate_next_offer(shift_id: int):
    # 1️⃣ Shift guard
    shift_res = (
        supabase.table("shift")
        .select("shift_status, date, shift_start_time, shift_end_time")
        .eq("shift_id", shift_id)
        .single()
        .execute()
    )

    if not shift_res.data:
        print(f"[ERROR] Shift {shift_id} not found")
        return

    if shift_res.data["shift_status"] == "Scheduled":
        print(f"[SKIP] Shift {shift_id} already scheduled")
        return

    # 2️⃣ Last offer must be rejected
    last_offer = (
        supabase.table("shift_offers")
        .select("status")
        .eq("shift_id", shift_id)
        .order("offer_order", desc=True)
        .limit(1)
        .execute()
        .data
    )

    if not last_offer or last_offer[0]["status"] != "rejected":
        print("[SKIP] Last offer not rejected")
        return

    # 3️⃣ Previously tried employees
    tried = (
        supabase.table("shift_offers")
        .select("emp_id, offer_order")
        .eq("shift_id", shift_id)
        .execute()
        .data
        or []
    )

    tried_emp_ids = {o["emp_id"] for o in tried}
    max_order = max(
        [o["offer_order"] for o in tried if o.get("offer_order")],
        default=0
    )
    next_order = max_order + 1

    shift = shift_res.data

    # 4️⃣ Eligible employees
    employeetab = get_employees_for_shift(shift["date"])

    eligible = [
        e for e in employeetab
        if e["emp_id"] not in tried_emp_ids
        and overlaps(
            e,
            shift["date"],
            shift["shift_start_time"],
            shift["shift_end_time"],
            e["dsst"],
            e["dset"],
            e["ssst"],
            e["sset"],
            e["sdate"]
        )
    ]

    if not eligible:
        supabase.table("shift").update({
            "shift_status": "Unassigned"
        }).eq("shift_id", shift_id).execute()

        print(f"[FAILED] No employees left for shift {shift_id}")
        return

    eligible.sort(
        key=lambda e: EMPLOYMENT_PRIORITY.get(e["employee_type"], 99)
    )

    next_employee = eligible[0]

    # 5️⃣ UPSERT offer
    supabase.table("shift_offers").upsert(
        {
            "shift_id": shift_id,
            "emp_id": next_employee["emp_id"],
            "status": "sent",
            "offer_order": next_order,
            "sent_at": datetime.utcnow().isoformat() + "Z"
        },
        on_conflict="shift_id,emp_id"
    ).execute()

    supabase.table("shift").update({
        "shift_status": "Offer Sent"
    }).eq("shift_id", shift_id).execute()

    notify_employee(
        next_employee["emp_id"],
        {
            "type": "shift_offer",
            "shift_id": shift_id,
            "message": "A shift is available. Accept or Reject."
        }
    )

    print(f"[NEXT] Shift {shift_id} → emp {next_employee['emp_id']} (order {next_order})")


# ---- Your Scheduling Logic ----
def run_scheduling(changes):
    print("Scheduling triggered due to changes:", changes)
    assign_tasks(changes)

@app_notif.websocket("/ws/{emp_id}")
async def websocket_endpoint(websocket: WebSocket, emp_id: int):
    await websocket.accept()
    active_connections[int(emp_id)] = websocket
    print(f"[WS CONNECTED] emp_id={emp_id}")

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.pop(int(emp_id), None)
        print(f"[WS DISCONNECTED] emp_id={emp_id}")

async def send_offer_notification(emp_id, shift_id):
    ws = active_connections.get(emp_id)
    if ws:
        await ws.send_text(json.dumps({
            "type": "shift_offer",
            "shift_id": shift_id,
            "message": "A shift is available. Accept or Reject."
        }))

def notify_employee(emp_id: int, payload: dict):
    ws = active_connections.get(emp_id)
    if not ws:
        print(f"[WS OFFLINE] emp_id={emp_id}")
        return

    async def _send():
        await ws.send_text(json.dumps(payload))

    asyncio.create_task(_send())

@app.route("/shift_offer/respond", methods=["POST"])
def respond_to_offer():
    data = request.json

    shift_id = data.get("shift_id")
    emp_id = data.get("emp_id")
    new_status = data.get("status")  # accepted / rejected

    if not shift_id or not emp_id or new_status not in ["accepted", "rejected"]:
        return jsonify({"error": "Invalid payload"}), 400

    # Fetch the offer
    offer_res = supabase.table("shift_offers") \
        .select("status") \
        .eq("shift_id", shift_id) \
        .eq("emp_id", emp_id) \
        .single() \
        .execute()

    offer = offer_res.data
    if not offer:
        return jsonify({"error": "Offer not found"}), 404

    if offer["status"] != "sent":
        return jsonify({"error": "Offer already responded"}), 409

    # Update offer
    supabase.table("shift_offers").update({
        "status": new_status,
        "response_time": datetime.utcnow().isoformat() + "Z"
    }).eq("shift_id", shift_id).eq("emp_id", emp_id).execute()

    if new_status == "accepted":
        accept_shift_offer(shift_id, emp_id)

        notify_employee(
            emp_id,
            {
                "type": "offer_result",
                "status": "accepted",
                "shift_id": shift_id
            }
        )
        return jsonify({"status": "assigned"}), 200

    # rejected
    activate_next_offer(shift_id)
    return jsonify({"status": "rejected"}), 200




def send_welcome_email(to_email, first_name, emp_id):
    # TODO: Configure these with your actual SMTP settings or environment variables
    sender_email = "sample@gmail.com" 
    sender_password = "sample123"
    smtp_server = "smtp.gmail.com"
    smtp_port = 587

    subject = "Welcome to ZaqenCare - Your Employee ID"
    body = f"""
    Hello {first_name},

    Welcome to ZaqenCare!

    Your Employee ID is: {emp_id}

    Please use this ID along with your password to login to the portal.

    Best regards,
    ZaqenCare Team
    """

    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, sender_password)
        text = msg.as_string()
        server.sendmail(sender_email, to_email, text)
        server.quit()
        print(f"Email sent to {to_email}")
    except Exception as e:
        print(f"Failed to send email: {e}")

@app.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    required = ["password", "first_name", "last_name", "email"]
    missing = [k for k in required if not data.get(k)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    # Storing plain text to match existing login logic
    hashed_pw = data["password"] 
    newemp_id = supabase.table("employee").select("emp_id").order("emp_id", desc=True).limit(1).execute().data[0]["emp_id"] + 1
    response = supabase.table("employee").insert({
        "first_name": data["first_name"],
        "last_name": data["last_name"],
        "date_of_birth": data.get("date_of_birth"),
        "gender": data.get("gender"),
        "password": hashed_pw,
        "email": data.get("email")
    }).execute()

    if data.get("email"):
        send_welcome_email(data["email"], data["first_name"], newemp_id)

    # Map weekday names to numbers
    days_map = {
        "Monday": 0,
        "Tuesday": 1,
        "Wednesday": 2,
        "Thursday": 3,
        "Friday": 4,
        "Saturday": 5,
        "Sunday": 6
    }

    week_daily_timeline = data.get("weekshift")
    newshift_id = 1

    # Fetch the latest emp_daily_id (if any)
    response = supabase.table("employee_daily_timeline") \
        .select("emp_daily_id") \
        .order("emp_daily_id", desc=True) \
        .limit(1) \
        .execute()

    # Check if any data is returned
    if response.data and len(response.data) > 0:
        newshift_id = response.data[0]["emp_daily_id"] + 1
    today = datetime.utcnow().date()
    for item in week_daily_timeline:
        day_item = item.get("day")
        day_num = days_map.get(day_item)
        day_diff = (day_num - today.weekday() + 7) % 7
        shift_date = today + timedelta(days=day_diff)
        yr, mm, dd = str(shift_date).split("-")
        final_date = shift_date.strftime("%Y-%m-%d")
        for ind,sh in enumerate(item.get("shifts")):
            resp = supabase.table("employee_daily_timeline").insert({
                "emp_daily_id": newshift_id,
                "emp_id": newemp_id,
                "shift_start_time":str(sh["start"]),
                "shift_end_time":str(sh["end"]),
                "week_day": day_item
            }).execute()
            
            ds = supabase.table("daily_shift").insert({
                "shift_date": str(final_date),
                "emp_id": newemp_id,
                "shift_type": "flw-rtw",
                "shift_start_time": f"{shift_date} {sh['start']}:00",
                "shift_end_time": f"{shift_date} {sh['end']}:00"
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
        week_app_idx = supabase.table("client_weekly_schedule").select("*", count="exact").execute()
        if(response):
            print(data['weekshift'])
            weekdetail = data['weekshift']
            weekidx = week_app_idx.count + 1
            for ind,item in enumerate(weekdetail):
                if item["shifts"] != []:
                    for i, timeshift in enumerate(item["shifts"]):
                        weekres = (
                            supabase.table("client_weekly_schedule")
                            .insert({
                                "week_schedule_id":weekidx,
                                "client_id":lastcid,
                                "week_day":item["day"],
                                "end_time":timeshift["end"],
                                "start_time":timeshift["start"]})
                            .execute()
                        )
                        weekidx = weekidx + 1
                        print(weekres.data)
            client_id = response.data[0]["client_id"]
            return jsonify({
                "message": "Client registered successfully",
                "client_id": client_id
            }), 200
        return jsonify({"message": "Registered successfully"}), 201

@app.route('/prepareSchedule', methods=['POST'])
def prepare_schedule():
    data = request.get_json()
    client_id = data.get("client_id")
    weekshift = data.get("weekshift", [])

    today = datetime.utcnow().date()
    total_weeks = 1  # You can make this dynamic
    inserted_shifts = []

    # Map weekday names to numbers
    days_map = {
        "Monday": 0,
        "Tuesday": 1,
        "Wednesday": 2,
        "Thursday": 3,
        "Friday": 4,
        "Saturday": 5,
        "Sunday": 6
    }
    newshift_id = supabase.table("shift").select("shift_id").order("shift_id", desc=True).limit(1).execute().data[0]["shift_id"] + 1
    for ws in weekshift:
        day_name = ws.get("day")
        day_num = days_map.get(day_name)
        if day_num is None:
            break
        if len(ws.get("shifts")) > 0:
            for sh in ws.get("shifts"):
                start_time = sh.get("start")
                end_time = sh.get("end")
                # Generate next 4 occurrences of this day
                for week in range(total_weeks):
                    day_diff = (day_num - today.weekday() + 7) % 7 + (week * 7)
                    shift_date = today + timedelta(days=day_diff)

                    shift_start = start_time
                    shift_end = end_time
                    yr, mm, dd = str(shift_date).split("-")
                    final_date = shift_date.strftime("%Y-%m-%d")
                    response = supabase.table("shift").insert({
                        "shift_id": newshift_id,
                        "client_id": client_id,
                        "shift_start_time": shift_start,
                        "shift_end_time": shift_end,
                        "shift_status": "Unassigned",
                        "emp_id": None,
                        "date": str(final_date)
                    }).execute()
                    newshift_id = newshift_id + 1
                    inserted_shifts.append({
                        "date": str(shift_date),
                        "start": start_time,
                        "end": end_time
                    })
                    # print(get_employees().get_data(as_text=True))
                    changes = {"new_clients": [], "updated_shifts": []}
                    shifts = supabase.table("shift") \
                            .select("shift_id","client_id, shift_start_time, shift_end_time, date") \
                            .eq("client_id", client_id) \
                            .eq("shift_status", "Unassigned") \
                            .execute()

                    if shifts.data:
                        changes["new_clients"].extend(shifts.data)
                    print("Shift changes",changes)
                    run_scheduling(changes)
            
        if not day_name:
            continue
    return jsonify({
        "message": f"Prepared {len(inserted_shifts)} shifts for Client {client_id}.",
        "details": inserted_shifts
    })



@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data received"}), 400
            
        emp_id_str = data.get("employeeId")
        password = data.get("password")
        
        # Convert to int safely
        try:
            emp_id = int(emp_id_str)
        except:
            return jsonify({"error": "Employee ID must be a number"}), 400
            
        if not emp_id or not password:
            return jsonify({"error": "Employee ID and password required"}), 400

        # Fetch employee
        response = supabase.table("employee").select("*").eq("emp_id", emp_id).execute()
        
        if not response.data:
            return jsonify({"error": "Employee not found"}), 400
            
        employee = response.data[0]
        
        # PLAIN TEXT PASSWORD (matches your DB)
        if employee["password"] != password:
            return jsonify({"error": "Wrong password"}), 400

        # Simple token (no JWT complexity)
        token = f"token_{employee['emp_id']}_{employee.get('emp_role', 'WORKER')}"
        
        return jsonify({
            "success": True,
            "message": "Login OK",
            "token": token,
            "user": {
                "emp_id": employee["emp_id"],
                "emp_role": employee.get("emp_role", "WORKER"),
                "first_name": employee["first_name"],
                "email": employee.get("email", "")
            }
        }), 200
        
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({"error": str(e)}), 500



@app.route('/protected')
def protected():
    if 'emp_id' in session:
        return jsonify({'message': f"Welcome, user {session['emp_id']}!"})
    else:
        return jsonify({'message': 'Unauthorized'}), 401


@app.route('/logout', methods=["POST"])
def logout():
    auth_header = request.headers["Authorization"]
    """auth_header = request.headers.get("Authorization")
    print(auth_header)"""
    if not auth_header:
        return jsonify({"success": False, "message": "No token provided"}), 400

    #token = auth_header.replace("Bearer ", "")

    # OPTIONAL: store token in blacklist table (recommended)
    # supabase.table("token_blacklist").insert({"token": token}).execute()

    return jsonify({
        "success": True,
        "message": "Logged out successfully"
    })

def require_supervisor(f):
    def decorated(*args, **kwargs):
        if 'emp_role' not in session:
            return jsonify({"error": "Unauthorized"}), 401
        if session['emp_role'] not in ['SUPERVISOR', 'MANAGER', 'ADMIN']:
            return jsonify({"error": "Supervisor access required"}), 403
        return f(*args, **kwargs)
    return decorated

@app.route('/clients', methods=['GET'])
def get_clients():
    try:
        response = supabase.table("client").select("""
            client_id, first_name, last_name, name, phone, email, 
            address_line1, address_line2, city, province, zip_code,
            service_type, date_of_birth, gender, preferred_language,
            notes, risks, client_coordinator_name, image_url,
            care_mgmt, doctor, nurse, coordinator_notes,
            individual_service, tasks, instructions, payroll_data,
            emergency_contacts, primary_diagnosis, medical_notes,
            wheelchair_user, has_catheter, requires_oxygen, progress_notes
        """).execute()

        return jsonify({
            "success": True,
            "clients": response.data,
            "count": len(response.data)
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/clients/<int:client_id>', methods=['GET'])
def get_client_by_id(client_id):
    try:
        response = supabase.table("client").select("""
            client_id, first_name, last_name, name, phone, email, 
            address_line1, address_line2, city, province, zip_code,
            service_type, date_of_birth, gender, preferred_language,
            notes, risks, client_coordinator_name, image_url,
            care_mgmt, doctor, nurse, coordinator_notes,
            individual_service, tasks, instructions, payroll_data,
            emergency_contacts, primary_diagnosis, medical_notes,
            wheelchair_user, has_catheter, requires_oxygen, progress_notes
        """).eq("client_id", client_id).single().execute()

        return jsonify({
            "success": True,
            "client": response.data
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Client not found",
            "error": str(e)
        }), 404

@app.route('/clients/<int:client_id>', methods=['PUT'])
def update_client(client_id):
    data = request.get_json()
    try:
        response = supabase.table("client").update(data).eq("client_id", client_id).execute()
        return jsonify({
            "success": True,
            "message": "Client updated successfully",
            "client": response.data[0] if response.data else None
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

####Occupying for clock in and clock out routers
from datetime import datetime
@app.route("/employee/<int:emp_id>/clock-status", methods=["GET"])
def get_clock_status(emp_id):
    try:
        res = (
            supabase
            .table("shift")
            .select(
                "shift_id, client_id, shift_start_time, shift_end_time, shift_status, clock_in"
            )
            .eq("emp_id", emp_id)
            .eq("shift_status", "Clocked in")
            .order("clock_in", desc=True)
            .limit(1)
            .execute()
        )

        if not res.data:
            return jsonify({
                "clocked_in": False
            }), 200

        return jsonify({
            "clocked_in": True,
            "shift": res.data[0]
        }), 200

    except Exception as e:
        print("CLOCK STATUS ERROR:", e)
        return jsonify({
            "clocked_in": False,
            "error": str(e)
        }), 500

@app.route("/shift/clock-in", methods=["POST"])
def clock_in():
    data = request.json
    shift_id = data.get("shift_id")
    emp_id = data.get("emp_id")

    if not shift_id or not emp_id:
        return jsonify({"error": "shift_id and emp_id required"}), 400

    shift = (
        supabase.table("shift")
        .select("shift_id, shift_status")
        .eq("shift_id", shift_id)
        .eq("emp_id", emp_id)
        .execute()
    )

    if not shift.data:
        return jsonify({"error": "Shift not found or not assigned"}), 404

    if shift.data[0]["shift_status"] == "Clocked in":
        return jsonify({"error": "Already clocked in"}), 400

    supabase.table("shift").update({
        "shift_status": "Clocked in",
        "clock_in": datetime.utcnow().isoformat() + "Z",
        "clock_out": None
    }).eq("shift_id", shift_id).execute()

    return jsonify({"status": "clocked_in"}), 200


@app.route("/shift/clock-out", methods=["POST"])
def clock_out():
    data = request.json
    shift_id = data.get("shift_id")
    emp_id = data.get("emp_id")

    if not shift_id or not emp_id:
        return jsonify({"error": "shift_id and emp_id required"}), 400

    shift = (
        supabase.table("shift")
        .select("shift_status, clock_in")
        .eq("shift_id", shift_id)
        .eq("emp_id", emp_id)
        .execute()
    )

    if not shift.data:
        return jsonify({"error": "Shift not found or not assigned"}), 404

    if shift.data[0]["shift_status"] != "Clocked in":
        return jsonify({"error": "Shift is not clocked in"}), 400

    supabase.table("shift").update({
        "shift_status": "Clocked out",
        "clock_out": datetime.utcnow().isoformat() + "Z"
    }).eq("shift_id", shift_id).execute()

    return jsonify({"status": "clocked_out"}), 200


@app.route("/dashboard/clock-stats", methods=["GET"])
def clock_stats():
    from datetime import datetime

    now = datetime.utcnow()
    today = now.date().isoformat()

    # Fetch today's shifts with clock times
    shifts = (
        supabase.table("shift")
        .select("clock_in, clock_out")
        .gte("clock_in", f"{today}T00:00:00Z")
        .lt("clock_in", f"{today}T23:59:59.999999Z")
        .execute()
        .data
    )

    # Hour buckets (6 AM – 6 PM like your UI)
    hours = list(range(6, 19))
    timeline = []

    for h in hours:
        label = f"{h if h <= 12 else h - 12} {'AM' if h < 12 else 'PM'}"

        clocked_in = 0
        clocked_out = 0

        for s in shifts:
            if s["clock_in"]:
                cin_hour = datetime.fromisoformat(s["clock_in"]).hour
                if cin_hour == h:
                    clocked_in += 1

            if s["clock_out"]:
                cout_hour = datetime.fromisoformat(s["clock_out"]).hour
                if cout_hour == h:
                    clocked_out += 1

        timeline.append({
            "time": label,
            "clockedIn": clocked_in,
            "clockedOut": clocked_out
        })

    # Totals for pie chart
    total_clocked_in = (
        supabase.table("shift")
        .select("shift_id", count="exact")
        .eq("shift_status", "Clocked in")
        .execute()
        .count
    )

    total_clocked_out = (
        supabase.table("shift")
        .select("shift_id", count="exact")
        .eq("shift_status", "Clocked out")
        .gte("clock_out", f"{today}T00:00:00Z")
        .execute()
        .count
    )

    return jsonify({
        "timeline": timeline,
        "totals": {
            "clockedIn": total_clocked_in,
            "clockedOut": total_clocked_out
        }
    })


######Tasks
@app.route("/task-assign", methods=["POST"])
def task_assign():
    try:
        data = request.get_json()

        shift_id = data.get("shift_id")
        details = data.get("details")

        if not shift_id or not details:
            return jsonify({
                "success": False,
                "message": "shift_id and details are required"
            }), 400

        now = datetime.utcnow().isoformat() + "Z"

        task_payload = {
            "shift_id": shift_id,
            "details": details,
            "status": False,              # not completed
            "comment": "Task scheduled, not started",
            "task_code": f"T{int(datetime.utcnow().timestamp())}",
            "task_created": now,
            "task_completed": None
        }

        res = supabase.table("tasks").insert(task_payload).execute()

        if not res.data:
            return jsonify({
                "success": False,
                "message": "Failed to create task"
            }), 500

        return jsonify({
            "success": True,
            "task": res.data[0]
        }), 201

    except Exception as e:
        print("TASK ASSIGN ERROR:", e)
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route("/tasks", methods=["GET"])
def get_tasks():
    try:
        status = request.args.get("status")   # completed | pending | all
        shift_id = request.args.get("shift_id")

        query = supabase.table("tasks").select("*")

        # Status filter
        if status == "completed":
            query = query.eq("status", True)
        elif status == "pending":
            query = query.eq("status", False)
        # else: all → no filter

        # Optional shift filter
        if shift_id:
            query = query.eq("shift_id", int(shift_id))

        res = query.order("task_created", desc=True).execute()

        return jsonify({
            "success": True,
            "tasks": res.data
        }), 200

    except Exception as e:
        print("GET TASKS ERROR:", e)
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route("/task-complete", methods=["POST"])
def task_complete():
    try:
        data = request.get_json()

        task_id = data.get("task_id")

        if not task_id:
            return jsonify({
                "success": False,
                "message": "task_id is required"
            }), 400

        now = datetime.utcnow().isoformat() + "Z"

        res = (
            supabase
            .table("tasks")
            .update({
                "status": True,
                "comment":"Task Completed",
                "task_completed": now
            })
            .eq("task_id", task_id)
            .execute()
        )

        if not res.data:
            return jsonify({
                "success": False,
                "message": "Task not found or already completed"
            }), 404

        return jsonify({
            "success": True,
            "task": res.data[0]
        }), 200

    except Exception as e:
        print("TASK COMPLETE ERROR:", e)
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


#######employes

@app.route('/employees/simple', methods=['GET'])
def get_employees_simple():
    """Get simple employee list for dropdowns"""
    try:
        response = supabase.table("employee") \
            .select("emp_id, first_name, last_name, employee_type, service_type") \
            .execute()

        return jsonify(response.data), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/employees', methods=['GET'])
def get_employees():
    try:
        # Fetch all employees
        response = get_employees_with_status()
        


        if response:
            return response
        return jsonify({"error": str(response)}), 400
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

STATUS_CONFIG = { "TRAINING": {"label": "TRN", "color": "green"}, "FLW-RTW": {"label": "FLW", "color": "green"}, "LEAVE": {"label": "LV", "color": "red"}, "CLOCKED_IN": {"label": "IN", "color": "orange"}, "CLOCKED_OUT": {"label": "OUT", "color": "aqua"}, "OFFER_SENT": {"label": "OFR", "color": "purple"}, "WAITING": {"label": "WT", "color": "gray"} }

def resolve_employee_status(emp_id, shifts, leaves):

    # 1️⃣ Training / FLW / RTW
    for s in shifts:
        if s["emp_id"] == emp_id and s["shift_type"] in ["training", "flw-rtw"]:
            return STATUS_CONFIG["TRAINING"]

    # 2️⃣ Leave
    for l in leaves:
        if l["emp_id"] == emp_id:
            return STATUS_CONFIG["LEAVE"]

    # 3️⃣ Clocked In
    '''for a in attendance:
        if a["emp_id"] == emp_id and a.get("clock_in") and not a.get("clock_out"):
            return STATUS_CONFIG["CLOCKED_IN"]

    # 4️⃣ Clocked Out
    for a in attendance:
        if a["emp_id"] == emp_id and a.get("clock_out"):
            return STATUS_CONFIG["CLOCKED_OUT"]

    # 5️⃣ Offer Sent
    for o in offers:
        if o["emp_id"] == emp_id:
            return STATUS_CONFIG["OFFER_SENT"]'''

    # 6️⃣ Waiting
    return STATUS_CONFIG["WAITING"]
def get_employees_with_status():

    now = datetime.utcnow()
    now_str = now.strftime("%Y-%m-%d %H:%M:%S")

    today = date.today()
    today_str = today.strftime("%Y-%m-%d")
    employees = supabase.table("employee").select("*").execute().data
    shifts = supabase.table("daily_shift") \
        .select("*") \
        .lte("shift_start_time", now_str) \
        .gte("shift_end_time", now_str) \
        .execute().data

    leaves = supabase.table("leaves") \
        .select("*") \
        .lte("leave_start_date", today_str) \
        .gte("leave_end_date", today_str) \
        .execute().data
    #attendance = supabase.table("attendance").select("*").execute().data
    #offers = supabase.table("offers").eq("status", "sent").execute().data

    result = []

    for emp in employees:
        status = resolve_employee_status(
            emp["emp_id"],
            shifts,
            leaves,
            
        )

        result.append({
            "emp_id": emp["emp_id"],
            "first_name": emp["first_name"],
            "last_name": emp.get("last_name", ""),
            "service_type": emp.get("service_type"),
            "status": status,
            "employmee_type":emp.get("employee_type"),
            "department": emp.get("department"),   
        })

    return result
@app.route("/dashboard/employee-status", methods=["GET"])
def employee_status_stats():
    from datetime import datetime

    today = datetime.utcnow().date().isoformat()

    # Total employees
    total_employees = (
        supabase.table("employee")
        .select("emp_id", count="exact")
        .execute()
        .count
    )

    # On Leave today
    on_leave = (
        supabase.table("leaves")
        .select("emp_id", count="exact")
        .lte("leave_start_date", today)
        .gte("leave_end_date", today)
        .execute()
        .count
    )

    # Currently clocked in
    clocked_in = (
        supabase.table("shift")
        .select("shift_id", count="exact")
        .eq("shift_status", "Clocked in")
        .execute()
        .count
    )

    unavailable = clocked_in
    available = max(total_employees - (on_leave + unavailable), 0)

    return jsonify([
        { "name": "Available", "value": available, "color": "#06b6d4" },
        { "name": "Unavailable", "value": unavailable, "color": "#8b5cf6" },
        { "name": "On Leave", "value": on_leave, "color": "#f97316" }
    ])

        
@app.route("/injury_reports", methods=["GET"])
def get_injury_reports():
    response = supabase.table("injury_reports").select("*").execute()
    return jsonify(response.data)


SUPERVISOR_EMAIL = "hemangee4700@gmail.com"

@app.route("/send_injury_report", methods=["POST"])
def send_injury_report():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request"}), 400
    if data.get("report_type") == "hazard":
        send_hazard_report(data)
    if data.get("report_type") == "hazard-followup":
        return update_hazard_followup(data)
    if data.get("report_type") == "incident":
        return create_incident(data)
    if data.get("report_type") == "incident-followup":
        return send_incident_followup(data)
    if data.get("report_type") == "injury":
        return report_injury(data)
    if data.get("report_type") == "injury-followup":
        return injury_followup(data)
    else:
        print(data)
    return data


def send_hazard_report(payload):
    report_type = payload.get("report_type")

    if report_type != "hazard":
        return jsonify({"error": "Unsupported report type"}), 400

    try:
        # 🔹 Map frontend payload → table schema
        record = {
            "reporter_name": payload.get("reporter_name"),
            "reported_date": payload.get("reported_date"),
            "reported_time": payload.get("reported_time"),
            "incident_date": payload.get("incident_date"),
            "incident_time": payload.get("incident_time"),
            "incident_location": payload.get("incident_location"),
            "documented_on_hazard_board": payload.get("on_hazard_board") == "Yes",
            "delay_reason": payload.get("delay_reason"),
            "hazard_rating": payload.get("hazard_rating"),
            "hazard_types": payload.get("hazards", []),
            "hazard_details": payload.get("hazard_details"),
            "immediate_action": payload.get("conversations_and_actions"),
            "workers_involved": payload.get("workers_involved"),
            "clients_involved": payload.get("clients_involved"),
            "others_involved": payload.get("others_involved"),
            "confirmation_signed": payload.get("confirmation_signed", False),
            "witness_name": payload.get("witness_name"),
            "witness_statement": payload.get("witness_statement"),
            "witness_date": payload.get("witness_date"),
            "witness_time": payload.get("witness_time"),
            "status": "submitted",
            "created_at": datetime.utcnow().isoformat() + "Z"
        }

        # 🔹 Insert into Supabase
        result = supabase.table("hazard_near_miss_reports").insert(record).execute()
        hazard = result.data[0]
        hazard_id = hazard["id"]
        # 🔹 Build email body
        email_body = f"""
New Hazard / Near Miss Report Submitted

Hazard Id: {hazard_id}
Reporter: {record['reporter_name']}
Incident Date: {record['incident_date']} {record['incident_time']}
Location: {record['incident_location']}

Hazard Rating: {record['hazard_rating']}
Hazards: {', '.join(record['hazard_types'])}

Details:
{record['hazard_details']}

Immediate Actions:
{record['immediate_action']}

Workers Involved: {record['workers_involved']}
Clients Involved: {record['clients_involved']}

Witness: {record['witness_name']}
"""

        send_email(
            subject="New Hazard / Near Miss Report",
            body=email_body
        )

        return jsonify({"success": True, "message": "Hazard report submitted"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

def update_hazard_followup(payload):
    hazard_id = payload.get("hazard_id")

    if not hazard_id:
        return jsonify({"error": "hazard_id is required"}), 400

    update_data = {
        "supervisor_rec": payload.get("supervisor_rec"),
        "supervisor_signature": payload.get("supervisor_signature"),
        "supervisor_sign_date": payload.get("supervisor_sign_date"),
        "supervisor_sign_time": payload.get("supervisor_sign_time"),

        "manager_followup": payload.get("manager_followup"),
        "manager_signature": payload.get("manager_signature"),
        "manager_sign_date": payload.get("manager_sign_date"),

        "jhsc_rec": payload.get("jhsc_rec"),
        "worker_co_chair_signature": payload.get("worker_co_chair_signature"),
        "management_co_chair_signature": payload.get("management_co_chair_signature"),
        "worker_co_chair_date": payload.get("worker_co_chair_date"),
        "management_co_chair_date": payload.get("management_co_chair_date"),

        # update status if needed
        "status": "manager_reviewed"
    }

    # Remove None values (VERY IMPORTANT)
    update_data = {k: v for k, v in update_data.items() if v is not None}

    result = (
        supabase
        .table("hazard_near_miss_reports")
        .update(update_data)
        .eq("id", hazard_id)
        .execute()
    )

    if not result.data:
        return jsonify({"error": "Hazard report not found"}), 404

    subject = f"Hazard / Near Miss Report #{hazard_id}"

    body = f"""
A new Hazard / Near Miss has been reported.

Report ID: {hazard_id}

Employee: {update_data.get("employee_name")}
Date: {update_data.get("date")} {update_data.get("time")}
Location: {update_data.get("location")}
Hazard Type: {update_data.get("hazard_type")}
Injury: {update_data.get("injury")}

Description:
{update_data.get("description")}

Status: Reported

Please review and complete supervisor follow-up.
"""

    send_email(
        subject=subject,
        body=body
    )

    return jsonify({
        "success": True,
        "message": "Hazard follow-up updated",
        "hazard_id": hazard_id
    }), 200

def create_incident(payload):
    try:
        insert_data = {
            "reporter_name": payload.get("reporter_name"),
            "job_title": payload.get("job_title"),
            "telephone": payload.get("telephone"),
            "email": payload.get("email"),
            "work_location": payload.get("work_location"),
            "supervisor_notified": payload.get("supervisor_notified"),
            "date_reported": payload.get("date_reported"),
            "time_reported": payload.get("time_reported"),
            "confirmation_signed": payload.get("confirmation_signed"),
            "reporter_signature": payload.get("reporter_signature"),
            "date_signed": payload.get("date_signed"),

            "workers": payload.get("workers"),
            "clients": payload.get("clients"),
            "others": payload.get("others"),

            "withness_name": payload.get("witness_name"),
            "witness_job_title": payload.get("witness_job_title"),
            "witness_contact": payload.get("witness_contact"),

            "incident_date": payload.get("date_of_incident"),
            "incident_time": payload.get("time_of_incident"),
            "incident_location": payload.get("location"),

            "incident_description": payload.get("incident_description"),
            "who_involved": payload.get("who_involved"),
            "who_reported": payload.get("who_reported"),

            "witness_statement": payload.get("witness_statement"),
            "personal_observation": payload.get("personal_observation"),
            "sequence_of_events": payload.get("sequence_of_events"),
            "client_concerns": payload.get("client_concerns"),
            "client_condition": payload.get("client_condition"),
            "injuries": payload.get("injuries"),

            # boolean column
            "environmental_hazards": bool(payload.get("environmental_hazards")),

            "immediate_actions": payload.get("immediate_actions"),
            "who_was_informed": payload.get("who_informed"),

            "worker_name_bottom": payload.get("worker_name_bottom"),
            "date_of_incident_bottom": payload.get("date_of_incident_bottom"),
            "client_name_bottom": payload.get("client_name_bottom"),
            "time_of_incident_bottom": payload.get("time_of_incident_bottom"),

            "status": "reported"
        }

        result = (
            supabase
            .table("incident_reports")
            .insert(insert_data)
            .execute()
        )

        if not result.data:
            return jsonify({"error": "Failed to create incident report"}), 500

        incident = result.data[0]
        incident_id = incident["id"]

        subject = f"Incident Report #{incident_id}"

        body = f"""
    A new Incident Report has been submitted.

    Incident ID: {incident_id}

    Reporter: {incident.get("reporter_name")}
    Date Reported: {incident.get("date_reported")} {incident.get("time_reported")}
    Incident Date: {incident.get("incident_date")} {incident.get("incident_time")}
    Location: {incident.get("incident_location")}

    Description:
    {incident.get("incident_description")}

    Who Involved:
    {incident.get("who_involved")}

    Immediate Actions:
    {incident.get("immediate_actions")}

    Status: Reported

    Please log in to review and complete supervisor follow-up.
    """

        send_email(
            subject=subject,
            body=body
        )
        return jsonify({"success": True, "message": "Incident report submitted"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

def send_incident_followup(request):
    data = request

    report_type = data.get("report_type")

    if report_type != "incident-followup":
        return jsonify({
            "success": False,
            "message": "Invalid report_type"
        }), 400

    incident_id = data.get("incident_id")

    if not incident_id:
        return jsonify({
            "success": False,
            "message": "incident_id is required"
        }), 400

    # 🔹 Build UPDATE payload (only follow-up columns)
    update_payload = {
        "reported_to_supervisor_by": data.get("reported_to_supervisor_by"),
        "reported_to_supervisor_time": data.get("reported_to_supervisor_time"),
        "supervisor_witness_statement": data.get("supervisor_witness_statement"),
        "reporting_delays": data.get("reporting_delays"),
        "verified_info": data.get("verified_info"),
        "factual_summary": data.get("factual_summary"),
        "immediate_risks": data.get("immediate_risks"),
        "hr_followup": data.get("hr_followup"),
        "supervisor_steps": data.get("supervisor_steps"),
        "further_followup": data.get("further_followup"),
        "prevention_recs": data.get("prevention_recs"),
        "supervisor_signature": data.get("supervisor_signature"),
        "supervisor_sign_date": data.get("supervisor_sign_date"),
        "supervisor_sign_time": data.get("supervisor_sign_time"),
        "manager_followup": data.get("manager_followup"),
        "manager_signature": data.get("manager_signature"),
        "manager_sign_date": data.get("manager_sign_date"),
        "status": "Closed"
    }

    # Remove None values (important)
    update_payload = {k: v for k, v in update_payload.items() if v is not None}

    # 1️⃣ Update incident record
    update_res = (
        supabase
        .table("incident_reports")
        .update(update_payload)
        .eq("id", incident_id)
        .execute()
    )

    if not update_res.data:
        return jsonify({
            "success": False,
            "message": "Incident not found"
        }), 404

    # 2️⃣ Fetch updated incident (for email)
    incident = (
        supabase
        .table("incident_reports")
        .select("*")
        .eq("id", incident_id)
        .single()
        .execute()
        .data
    )

    subject = f"Incident Follow-up Completed | ID #{incident['id']}"

    body = f"""
INCIDENT FOLLOW-UP REPORT

Incident ID: {incident['id']}

Reported To Supervisor By:
{incident.get('reported_to_supervisor_by', '-')}

Supervisor Witness Statement:
{incident.get('supervisor_witness_statement', '-')}

Reporting Delays:
{incident.get('reporting_delays', '-')}

Verified Information:
{incident.get('verified_info', '-')}

Factual Summary:
{incident.get('factual_summary', '-')}

Immediate Risks:
{incident.get('immediate_risks', '-')}

HR Follow-up:
{incident.get('hr_followup', '-')}

Supervisor Steps:
{incident.get('supervisor_steps', '-')}

Further Follow-up:
{incident.get('further_followup', '-')}

Prevention Recommendations:
{incident.get('prevention_recs', '-')}

Supervisor Signed On:
{incident.get('supervisor_sign_date')} {incident.get('supervisor_sign_time')}

Manager Follow-up:
{incident.get('manager_followup', '-')}

Manager Signed On:
{incident.get('manager_sign_date', '-')}

Status:
{incident.get('status', '-')}

---
This is a system-generated follow-up notification.
"""

    send_email(
        subject=subject,
        body=body
    )

    return jsonify({
        "success": True,
        "message": "Incident follow-up submitted successfully",
        "incident_id": incident_id
    }), 200

def report_injury(payload):
    payload = request.json  # assuming Flask

    injury_data = {
        "date": payload["date_of_injury"],

        "injured_person": payload["emp_name"],
        "reporting_employee": payload["reporter_name"],
        "location": payload["location"],
        "description": payload["injury_description"],

        "status": "submitted",

        # Reporting details
        "reported_date": payload["date_reported"],
        "reported_time": payload["time_of_injury"],
        "delay_reason": payload["delay_reason"],

        # Injury details
        "injury_date": payload["date_of_injury"],
        "injury_time": payload["time_of_injury_detail"],
        "time_left_work": payload["time_left_work"],
        "program": payload["program"],

        # Medical
        "medical_attention_required": payload["medical_attention_required"] == "Yes",
        "rtw_package_taken": payload["rtw_package_taken"] == "Yes",

        # Body parts
        "injured_body_parts": payload.get("body_parts", []),

        # Witness
        "witness_remarks": payload["witness_remarks"],
        "witness_name": payload["witness_name"],
        "witness_phone": payload["witness_phone"],
        "witness_signature": {
            "signature": payload["witness_signature"]
        },
        "witness_date": payload["witness_date"],
        "witness_time": payload["witness_time"],

        # HCP
        "hcp_name": payload["hcp_name_title"],
        "hcp_address": payload["hcp_address"],
        "hcp_phone": payload["hcp_phone"],

        # Reporter & employee info
        "reporter_name": payload["reporter_name"],
        "reported_to_supervisor_name": payload["reported_to_supervisor"],

        "emp_name": payload["emp_name"],
        "emp_phone": payload["emp_phone"],
        "emp_email": payload["emp_email"],
        "emp_address": payload["emp_address"],

        "client_involved": payload["client_involved"],

        # Employee confirmation
        "employee_signature": {
            "signed": payload["confirmation_signed"],
            "signature": payload["employee_signature"]
        },
        "employee_sign_date": payload["sign_date"],

        # FAF
        "faf_form_brought": payload["faf_form_brought"] == "Yes",

        # Flags
        "supervisor_notified": True if payload["reported_to_supervisor"] else False
    }

    response = supabase.table("injury_reports") \
        .insert(injury_data) \
        .execute()
    data = response.data[0]
    injury_id = response.data[0]["id"]
    email_body = f"""
    Injury Report Submitted Successfully

    Injury Report ID: {injury_id}

    Employee Name: {data.get("emp_name")}
    Date of Injury: {data.get("date_of_injury")}
    Time of Injury: {data.get("time_of_injury_detail")}
    Location: {data.get("location")}

    Body Parts Involved:
    {", ".join(data.get("body_parts", []))}

    Description:
    {data.get("injury_description")}

    Reporter: {data.get("reporter_name")}
    Supervisor Notified: {data.get("reported_to_supervisor")}

    Please retain this ID for future reference.
    """

    send_email(
        subject=f"Injury Report Submitted (ID: {injury_id})",
        body=email_body
    )

    return jsonify({
        "success": True,
        "injury_report_id": injury_id
    }), 201

def injury_followup(payload):
    payload = request.json

    injury_report_id = payload.get("injury_report_id")

    if not injury_report_id:
        return jsonify({"success": False, "message": "injury_report_id is required"}), 400

    try:
       
        update_data = {
            "rtw_initiated": yes_no_to_bool(payload.get("rtw_initiated")),
            "investigation_started": yes_no_to_bool(payload.get("investigation_started")),
            "copy_provided_to_hr": yes_no_to_bool(payload.get("copy_provided_to_hr")),

            "supervisor_actions": payload.get("supervisor_steps_resolve"),
            "supervisor_signature": payload.get("supervisor_signature"),
            "supervisor_sign_date": payload.get("supervisor_sign_date"),
            "supervisor_sign_time": payload.get("supervisor_sign_time"),

            "manager_recommendations": payload.get("manager_recommendations"),
            "manager_signature": payload.get("manager_signature"),
            "manager_sign_date": payload.get("manager_sign_date"),
            "manager_sign_time": payload.get("manager_sign_time"),

            # Optional status update
            "status": "submitted"
        }

        # Remove None values (important)
        update_data = {k: v for k, v in update_data.items() if v is not None}

        update_response = (
            supabase.table("injury_reports")
            .update(update_data)
            .eq("id", injury_report_id)
            .execute()
        )

        if not update_response.data:
            return jsonify({
                "success": False,
                "message": "Injury report not found"
            }), 404

        
        report = (
            supabase.table("injury_reports")
            .select("*")
            .eq("id", injury_report_id)
            .single()
            .execute()
            .data
        )

        subject = f"Injury Report Follow-Up Submitted (ID: {injury_report_id})"

        email_body = f"""
        <h3>Injury Report Follow-Up</h3>

        <p><strong>Report ID:</strong> {injury_report_id}</p>
        <p><strong>RTW Initiated:</strong> {payload.get("rtw_initiated")}</p>
        <p><strong>Investigation Started:</strong> {payload.get("investigation_started")}</p>
        <p><strong>Copy Provided to HR:</strong> {payload.get("copy_provided_to_hr")}</p>

        <hr/>

        <h4>Supervisor</h4>
        <p>{payload.get("supervisor_steps_resolve")}</p>

        <h4>Manager Recommendations</h4>
        <p>{payload.get("manager_recommendations")}</p>

        <p><em>Submitted on {datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")}</em></p>
        """

        send_email(
            subject=subject,
            body=email_body
        )
        return jsonify({
            "success": True,
            "message": "Injury follow-up updated and email sent",
            "injury_report_id": injury_report_id
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

def yes_no_to_bool(value):
    if value is None:
        return None
    return value.lower() == "yes"

def send_email(subject, body):
    sender = "hemangee4700@gmail.com"
    recipients = ["hemangee4700@gmail.com"]

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = ", ".join(recipients)

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login("hemangee4700@gmail.com", "hvvm jfdz rkjs ynly")
        server.send_message(msg)


@app.route("/add_client_shift", methods=["POST"])
def add_client_shift():
    data = request.get_json()
    try:
        supabase.table("shift").insert({
            "client_id": data["client_id"],
            "emp_id":data["emp_id"],
            "shift_start_time": data["shift_start_time"][:19] + "Z",
            "shift_end_time": data["shift_end_time"][:19] + "Z",
            "date":data["shift_date"],
            "shift_status": data['shift_status'],
        }).execute()

        return jsonify({"message": "Client shift added"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/add_employee_shift", methods=["POST"])
def add_employee_shift():
    data = request.get_json()
    try:
        supabase.table("daily_shift").insert({
            "emp_id": data["emp_id"],
            "shift_date": data["shift_date"],
            "shift_start_time": data["shift_start_time"],
            "shift_end_time": data["shift_end_time"],
            "shift_type": data["shift_type"]
        }).execute()

        return jsonify({"message": "Employee daily shift added"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/generate_next_month_shifts", methods=["POST"])
def generate_next_month_shifts():
    try:
        data = request.get_json()
        emp_id = data.get("emp_id")

        if not emp_id:
            return jsonify({"error": "emp_id is required"}), 400

        # 1️⃣ Fetch weekly shift template
        timeline_res = (
            supabase.table("employee_daily_timeline")
            .select("week_day, shift_start_time, shift_end_time")
            .eq("emp_id", emp_id)
            .execute()
        )

        if not timeline_res.data:
            return jsonify({"error": "No weekly timeline found"}), 404

        timeline_map = {
            row["week_day"].capitalize(): {
                "start": row["shift_start_time"],
                "end": row["shift_end_time"]
            }
            for row in timeline_res.data
        }

        # 2️⃣ Find last scheduled shift date
        last_shift_res = (
            supabase.table("daily_shift")
            .select("shift_date")
            .eq("emp_id", emp_id)
            .order("shift_date", desc=True)
            .limit(1)
            .execute()
        )

        if last_shift_res.data:
            start_date = datetime.strptime(
                last_shift_res.data[0]["shift_date"], "%Y-%m-%d"
            ) + timedelta(days=1)
        else:
            start_date = datetime.utcnow()

        # 3️⃣ End date = 6 weeks (42 days)
        end_date = start_date + timedelta(days=41)

        # 4️⃣ Generate shifts
        new_entries = []
        current_date = start_date

        while current_date <= end_date:
            weekday = current_date.strftime("%A")

            if weekday in timeline_map:
                date_str = current_date.strftime("%Y-%m-%d")
                start_time = timeline_map[weekday]["start"]
                end_time = timeline_map[weekday]["end"]

                new_entries.append({
                    "emp_id": emp_id,
                    "shift_date": date_str,
                    "shift_start_time": f"{date_str} {start_time}",
                    "shift_end_time": f"{date_str} {end_time}",
                    "shift_type": "flw-rtw"
                })

            current_date += timedelta(days=1)

        # 5️⃣ Insert into Supabase
        if new_entries:
            supabase.table("daily_shift").insert(new_entries).execute()

        return jsonify({
            "message": "Next 6 weeks schedule generated",
            "count": len(new_entries),
            "from": start_date.strftime("%Y-%m-%d"),
            "to": end_date.strftime("%Y-%m-%d")
        }), 200

    except Exception as e:
        print("Error generating shifts:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/client_generate_next_month_shifts", methods=["POST"])
def client_generate_next_month_shifts():
    try:
        data = request.get_json()
        client_id = data.get("client_id")

        if not client_id:
            return jsonify({"error": "client_id is required"}), 400

        # 1️⃣ Fetch weekly schedule template
        weekly_timeline = (
            supabase.table("client_weekly_schedule")
            .select("week_day, start_time, end_time")
            .eq("client_id", client_id)
            .execute()
        )

        if not weekly_timeline.data:
            return jsonify({"error": "No weekly schedule found for client"}), 404

        timeline_map = {
            row["week_day"].capitalize(): {
                "start": row["start_time"],
                "end": row["end_time"]
            }
            for row in weekly_timeline.data
        }

        # 2️⃣ Find last scheduled date
        last_shift_res = (
            supabase.table("shift")
            .select("date")
            .eq("client_id", client_id)
            .order("date", desc=True)
            .limit(1)
            .execute()
        )

        if last_shift_res.data:
            start_date = datetime.strptime(
                last_shift_res.data[0]["date"], "%Y-%m-%d"
            ) + timedelta(days=1)
        else:
            start_date = datetime.utcnow()

        # 3️⃣ 6-week window
        end_date = start_date + timedelta(days=41)

        # 4️⃣ Generate shifts
        new_entries = []
        current_date = start_date

        while current_date <= end_date:
            weekday = current_date.strftime("%A")

            if weekday in timeline_map:
                date_str = current_date.strftime("%Y-%m-%d")
                start_time = timeline_map[weekday]["start"][:5]
                end_time = timeline_map[weekday]["end"][:5]

                new_entries.append({
                    "client_id": client_id,
                    "date": date_str,
                    "shift_start_time": f"{date_str}T{start_time}:00Z",
                    "shift_end_time": f"{date_str}T{end_time}:00Z",
                })

            current_date += timedelta(days=1)

        # 5️⃣ Insert into Supabase
        if new_entries:
            supabase.table("shift").insert(new_entries).execute()

        return jsonify({
            "message": "Next 6 weeks shifts generated",
            "count": len(new_entries),
            "from": start_date.strftime("%Y-%m-%d"),
            "to": end_date.strftime("%Y-%m-%d")
        }), 200

    except Exception as e:
        print("Error generating shifts:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/employees/<int:emp_id>")
def get_employee_with_id(emp_id):
    emp = supabase.table("employee").select("*").eq("emp_id", emp_id).execute()
    shift = supabase.table("shift").select("*").eq("emp_id", emp_id).execute()
    dailyshift = supabase.table("daily_shift").select("*").eq("emp_id", emp_id).execute()
    data = {
        "employee": emp.data,
        "shift": shift.data,
        "dailyshift": dailyshift.data,
    }
    return jsonify(data)

@app.route("/unavailability/<emp_id>", methods=["GET"])
def get_unavailability(emp_id):
    data = supabase.table("leaves").select("*").eq("emp_id", emp_id).execute()
    return jsonify({ "unavailability": data.data })

@app.route("/add_unavailability", methods=["POST"])
def add_unavailability():
    req = request.get_json()

    supabase.table("leaves").insert({
        "emp_id": req["emp_id"],
        "leave_type": req["type"],
        "leave_start_date": req["start_date"],
        "leave_end_date": req["end_date"],
        "leave_reason": req["description"],
        "leave_start_time": req["start_time"],
        "leave_end_time": req["end_time"],
    }).execute()
    leave_processing(req["emp_id"],req["start_date"],req["end_date"],req["start_time"],req["end_time"]);

    return jsonify({"message": "Unavailability added successfully"})
def leave_processing(emp_id,leave_start_date,leave_end_date,leave_start_time,leave_end_time):
    # Convert full timestamps
    leave_start = leave_start_time
    leave_end = leave_end_time

    # 2️⃣ Fetch existing assigned shifts
    assigned_shifts = supabase.table("shift") \
        .select("*") \
        .eq("emp_id", emp_id) \
        .eq("shift_status", "Scheduled") \
        .execute().data

    def to_hhmm(t):
        """
        Accepts 'HH:MM', 'HH:MM:SS', or 'YYYY-MM-DD HH:MM[:SS]'
        Returns 'HH:MM'
        """
        if isinstance(t, str):
            if ' ' in t:
                t = t.split(' ')[1]
            return t[:5]
        return t.strftime('%H:%M')
    def to_dt(d):
        return datetime.fromisoformat(d).strftime("%Y-%m-%d")


    def overlaps(s, e, ls, le, sd, lsd, led):
        sd = to_dt(sd)
        s = to_hhmm(s)
        e = to_hhmm(e)
        ls = to_hhmm(ls)
        le = to_hhmm(le)
        if sd >= lsd and sd <= led:
            return not (e <= ls or s >= le)
        return False

    # 3️⃣ Find affected shifts → mark them unassigned
    unassigned = []
    for s in assigned_shifts:
        if overlaps(s["shift_start_time"], s["shift_end_time"], leave_start, leave_end, s["date"], leave_start_date, leave_end_date):
            supabase.table("shift").update({
                "emp_id": None,
                "shift_status": "Unassigned"
            }).eq("shift_id", s["shift_id"]).execute()
            unassigned.append(s)

    # 4️⃣ Auto-reschedule the unassigned items
    if unassigned:
        changes = {"new_clients": unassigned}
        print("Unassigned", changes)
        assign_tasks(changes)

    return jsonify({
        "message": "Leave applied & affected shifts rescheduled",
        "unassigned_count": len(unassigned)
    }), 200

@app.route("/update_unavailability/<int:leave_id>", methods=["PUT"])
def update_unavailability(leave_id):
    data = request.json
    supabase.table("leaves").update(data).eq("leave_id", leave_id).execute()
    return jsonify({"message": "updated"}), 200

@app.route("/delete_unavailability/<int:leave_id>", methods=["DELETE"])
def delete_unavailability(leave_id):
    supabase.table("leaves").delete().eq("leave_id", leave_id).execute()
    return jsonify({"message": "deleted"}), 200

@app.route("/update_employee_settings/<emp_id>", methods=["POST"])
def update_employee_settings(emp_id):
    data = request.json
    print(data.keys(), data.values())
    clean_data = {}

    for key, value in data.items():

        # Remove invalid values
        if value in [None, "", "undefined", "null", "NaN"]:
            continue

        # TRY to convert number strings safely
        try:
            if isinstance(value, str) and value.isdigit():
                clean_data[key] = int(value)
            else:
                clean_data[key] = value
        except:
            # If conversion fails, skip this field
            continue

    if not clean_data:
        return jsonify({"status": "error", "message": "No valid fields to update"}), 400
    print(data)
    try:
        update_result = supabase.table("employee").update(data).eq("emp_id", emp_id).execute()

        return jsonify({"status": "success", "updated": update_result.data}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/masterSchedule/<service>", methods=["GET"])
def masterSchedule(service: str):
    print(service)
    emp_res = supabase.table("employee") \
        .select("emp_id, first_name, address") \
        .eq("service_type", service) \
        .execute()
    employees = emp_res.data

    start_date = date.today()
    dates = get_6_week_dates(start_date)

    output_employees = []

    for emp in employees:
        print(emp["first_name"])
        shifts = []
        #print(dates[-1])
        # 3️⃣ Get all shifts for this employee in date range
        shift_res = supabase.table("daily_shift") \
            .select("*") \
            .eq("emp_id", emp["emp_id"]) \
            .gte("shift_date", dates[0]) \
            .lte("shift_date", dates[-1]) \
            .execute()
        #print(shift_res)
        shift_map = {
            s["shift_date"]: s for s in shift_res.data
        }
        
        for d in dates:
            #print(shift_map[str(d)])
            shift = shift_map.get(d.isoformat())
            print(shift)
            if not shift:
                # open shift / empty
                shifts.append({
                    "time": "",
                    "type": "open",
                    "training": False
                })
                continue
            
            # 4️⃣ Apply shift notation
            shift_date = datetime.fromisoformat(shift["shift_date"])
            start_time = datetime.fromisoformat(shift["shift_start_time"])
            end_time = datetime.fromisoformat(shift["shift_end_time"])

            if service == "Outreach":
                time_code = f"{start_time.strftime('%H:%M:%S')}-{end_time.strftime('%H:%M:%S')}"

            else:
                noon_cutoff = shift_date.replace(hour=12, minute=0, second=0)
                evening_cutoff = shift_date.replace(hour=18, minute=0, second=0)

                if end_time <= noon_cutoff:
                    shift["shift_code"] = "day"        # d
                elif start_time > noon_cutoff and end_time <= evening_cutoff:
                    shift["shift_code"] = "noon"       # n
                else:
                    shift["shift_code"] = "evening"    # e

                time_code = SHIFT_CONVENTIONS[service][shift["shift_code"]]
            
            shifts.append({
                "time": time_code,
                "type": SHIFT_TYPE_MAP.get(shift["shift_type"], "flw-rtw"),
                "training": shift.get("training", False)
            })
        
        leave_res = supabase.table("leaves") \
            .select("*") \
            .eq("emp_id", emp["emp_id"]) \
            .gte("leave_start_date", dates[0]) \
            .lte("leave_end_date", dates[-1]) \
            .execute()
        leaves = leave_res.data or []
        print(leaves)
        leave_map = {}

        for leave in leaves:
            start = datetime.fromisoformat(leave["leave_start_date"]).date()
            end = datetime.fromisoformat(leave["leave_end_date"]).date()

            d = start
            while d <= end:
                leave_map[d] = leave
                d += timedelta(days=1)

        for idx,d in enumerate(dates):
            if d in leave_map:
                leave = leave_map[d]

                leave_type = leave.get("leave_type", "").lower()
                
                # Determine shift type (color)
                if leave_type == "sick paid" or leave_type == "sick unpaid":
                    shift_type = SHIFT_TYPE_MAP["sick"]
                elif leave_type == "maternity/paternity leave" or leave_type == "wsib leave (with seniority)" or leave_type == "esa leave + seniority" or leave_type == "unpaid leave + no seniority":
                    shift_type = SHIFT_TYPE_MAP["leave"]
                elif leave_type == "bereavement paid" or leave_type == "bereavement unpaid":
                    shift_type = SHIFT_TYPE_MAP["bereavement"]
                elif leave_type == "vacation ft hourly - pay only" or leave_type == "vacation pt and casual - seniority only":  # keeping your DB spelling
                    shift_type = SHIFT_TYPE_MAP["vacation"]
                elif leave_type == "float day":
                    shift_type = SHIFT_TYPE_MAP["float"]
                else:
                    shift_type = SHIFT_TYPE_MAP["unavailability"]

                # Override shift
                shifts[idx]={
                    "time": "",              # no d/n/e for leave
                    "type": shift_type,
                    "training": False
                }
                continue

        
        output_employees.append({
        "id": emp["emp_id"],
        "name": emp["first_name"],
        "address": emp["address"],
        "shifts": shifts
        })

    data= jsonify({
        "weeks": [d.strftime("%d-%b") for d in dates],
        "employees": output_employees
    })
    print(data)
    return data

SHIFT_CONVENTIONS = {
    "85 Neeve": {"day": "d", "noon": "n", "evening": "e"},
    "87 Neeve": {"day": "d",  "noon": "n",  "evening": "e"},
    "Willow Place": {"day": "D", "noon": "N", "evening": "E"},
    "Outreach": None  # handled separately
}
SHIFT_TYPE_MAP = {
    "vacation": "vacation",
    "float": "float",
    "unavailability": "unavailable",
    "flw-training": "flw-training",
    "gil-training": "gil",
    "flw-rtw": "flw-rtw",
    "open": "open",
    "leave": "leave",
    "sick": "sick",
    "bereavement": "bereavement",
}
def get_6_week_dates(start_date: date):
    return [start_date + timedelta(days=i) for i in range(42)]

@app.route("/update_master_shift", methods=["POST"])
def update_master_shift():
    try:
        data = request.get_json()

        emp_id = data.get("emp_id")
        shift_type = data.get("shift_type")
        shift_date = data.get("shift_date")
        start_time = data.get("shift_start_time")
        end_time = data.get("shift_end_time")
        prev_type = data.get("type")

        if not emp_id or not shift_type or not shift_date:
            return jsonify({"error": "Missing required fields"}), 400

        start_dt = f"{shift_date} {start_time}"
        end_dt = f"{shift_date} {end_time}"

        DAILY_SHIFT_TYPES = {
            "flw-rtw",
            "flw-training",
            "gil",
            "float",
            "open"
        }

        LEAVE_TYPES = {
            "leave",
            "vacation",
            "sick",
            "bereavement",
            "unavailable"
        }

        if prev_type == "open":

            # 🟢 DAILY SHIFT
            if shift_type in DAILY_SHIFT_TYPES:
                supabase.table("daily_shift").insert({
                    "emp_id": emp_id,
                    "shift_date": shift_date,
                    "shift_start_time": f"{shift_date}T{start_time}:00Z",
                    "shift_end_time": f"{shift_date}T{end_time}:00Z",
                    "shift_type": shift_type
                }).execute()

            # 🔴 LEAVE
            elif shift_type in LEAVE_TYPES:
                supabase.table("leaves").insert({
                    "emp_id": emp_id,
                    "leave_start_date": shift_date,
                    "leave_end_date": shift_date,
                    "leave_start_time": f"{shift_date}T{start_time}:00Z",
                    "leave_end_time": f"{shift_date}T{end_time}:00Z",
                    "leave_type": shift_type
                }).execute()
        else:
            supabase.table("daily_shift") \
                .delete() \
                .eq("emp_id", emp_id) \
                .eq("shift_date", shift_date) \
                .execute()

            supabase.table("leaves") \
                .delete() \
                .eq("emp_id", emp_id) \
                .eq("leave_start_date", shift_date) \
                .execute()

            # Then insert updated version
            if shift_type in LEAVE_TYPES:
                supabase.table("leaves").insert({
                    "emp_id": emp_id,
                    "leave_start_date": shift_date,
                    "leave_end_date": shift_date,
                    "leave_start_time": start_time,
                    "leave_end_time": end_time,
                    "leave_type": shift_type
                }).execute()
            else:
                supabase.table("daily_shift").insert({
                    "emp_id": emp_id,
                    "shift_date": shift_date,
                    "shift_start_time": f"{shift_date}T{start_time}:00Z",
                    "shift_end_time": f"{shift_date}T{end_time}:00Z",
                    "shift_type": shift_type
                }).execute()

            return jsonify({"message": "Existing shift updated"}), 200
        

        return jsonify({"message": "Shift updated successfully"}), 200

    except Exception as e:
        print("ERROR:", e)
        return jsonify({"error": str(e)}), 500

###Shift related

@app.route("/employee/<int:emp_id>/live-shift", methods=["GET"])
def get_live_shift(emp_id):
    try:
        today = datetime.utcnow().date().isoformat()

        res = (
            supabase
            .table("shift")
            .select(
                "shift_id, client_id, shift_start_time, shift_end_time, shift_status, clock_in"
            )
            .eq("emp_id", emp_id)
            .eq("date", today)
            .order("shift_start_time")
            .limit(1)
            .execute()
        )

        if not res.data:
            return jsonify({
                "live": False
            }), 200

        return jsonify({
            "live": True,
            "shift": res.data[0]
        }), 200

    except Exception as e:
        print("LIVE SHIFT ERROR:", e)
        return jsonify({
            "live": False,
            "error": str(e)
        }), 500



@app.route("/shifts-for-tasks", methods=["GET"])
def shifts_for_tasks_today():
    today = datetime.utcnow().date().isoformat()

    # 1️⃣ All LIVE shifts (clocked in right now)
    live_res = (
        supabase.table("shift")
        .select(
            "shift_id, emp_id, client_id, shift_start_time, shift_end_time, shift_status, clock_in"
        )
        .eq("shift_status", "Clocked in")
        .is_("clock_out", "null")
        .eq("date", today)
        .execute()
    )

    # 2️⃣ All TODAY shifts that can have tasks (Scheduled + Clocked in)
    shifts_res = (
        supabase.table("shift")
        .select(
            "shift_id, emp_id, client_id, shift_start_time, shift_end_time, shift_status"
        )
        .eq("date", today)
        .in_("shift_status", ["Scheduled", "Clocked in"])
        .order("shift_start_time")
        .execute()
    )

    return jsonify({
        "live_shifts": live_res.data or [],
        "shifts": shifts_res.data or []
    }), 200
def get_employee_role(emp_id: int) -> str:
    res = (
        supabase
        .table("employee")
        .select("emp_role")
        .eq("emp_id", emp_id)
        .single()
        .execute()
    )

    if not res.data:
        raise Exception("Employee not found")

    return res.data.get("emp_role", "WORKER")

SUPERVISOR_ROLES = {"SUPERVISOR", "MANAGER", "ADMIN"}
@app.route("/shift-offers", methods=["GET"])
def get_shift_offers():
    try:
        emp_id = request.args.get("emp_id", type=int)
        if not emp_id:
            return jsonify({"error": "emp_id required"}), 400

        role = get_employee_role(emp_id)

        query = supabase.table("shift_offers").select(
            "offers_id, emp_id, shift_id, status, sent_at, response_time, offer_order"
        )

        # 👷 Workers → only their offers
        if role not in SUPERVISOR_ROLES:
            query = query.eq("emp_id", emp_id)

        offers = query.order("sent_at", desc=True).execute().data or []

        if not offers:
            return jsonify([]), 200

        emp_ids = list({o["emp_id"] for o in offers})
        shift_ids = list({o["shift_id"] for o in offers})

        employees = {
            e["emp_id"]: e
            for e in supabase.table("employee")
            .select("emp_id, first_name, last_name, employee_type")
            .in_("emp_id", emp_ids)
            .execute()
            .data
        }

        shifts = {
            s["shift_id"]: s
            for s in supabase.table("shift")
            .select("shift_id, date, shift_start_time, shift_end_time, shift_status")
            .in_("shift_id", shift_ids)
            .execute()
            .data
        }

        return jsonify({
            "is_supervisor": role in SUPERVISOR_ROLES,
            "role": role,
            "offers": [
                {
                    "offer_id": o["offers_id"],
                    "status": o["status"],
                    "order": o["offer_order"],
                    "sent_at": o["sent_at"],
                    "responded_at": o["response_time"],
                    "employee": employees.get(o["emp_id"]),
                    "shift": shifts.get(o["shift_id"]),
                }
                for o in offers
            ]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route("/shift_offer/force-assign", methods=["POST"])
def force_assign_shift():
    data = request.json

    shift_id = data.get("shift_id")
    emp_id = data.get("emp_id")

    if not shift_id or not emp_id:
        return jsonify({"error": "shift_id and emp_id required"}), 400

    # 1️⃣ Guard: shift must exist
    shift = (
        supabase.table("shift")
        .select("emp_id")
        .eq("shift_id", shift_id)
        .single()
        .execute()
        .data
    )

    if not shift:
        return jsonify({"error": "Shift not found"}), 404

    if shift["emp_id"] is not None:
        return jsonify({"error": "Shift already assigned"}), 409

    # 2️⃣ Assign shift
    supabase.table("shift").update({
        "emp_id": emp_id,
        "shift_status": "Scheduled"
    }).eq("shift_id", shift_id).execute()

    # 3️⃣ Update offers
    supabase.table("shift_offers").update({
        "status": "accepted",
        "response_time": datetime.utcnow().isoformat() + "Z"
    }).eq("shift_id", shift_id).eq("emp_id", emp_id).execute()

    supabase.table("shift_offers").update({
        "status": "expired"
    }).eq("shift_id", shift_id).neq("emp_id", emp_id).execute()

    # 4️⃣ Notify employee
    notify_employee(
        emp_id,
        {
            "type": "offer_result",
            "status": "assigned",
            "shift_id": shift_id
        }
    )

    return jsonify({
        "success": True,
        "message": "Shift force assigned"
    }), 200
@app.route("/shift_offer/manual", methods=["POST"])
def manual_shift_offer():
    data = request.json

    shift_id = data.get("shift_id")
    emp_id = data.get("emp_id")

    if not shift_id or not emp_id:
        return jsonify({"error": "shift_id and emp_id required"}), 400

    # 1️⃣ Guard: shift must exist and not already assigned
    shift = (
        supabase.table("shift")
        .select("emp_id, shift_status")
        .eq("shift_id", shift_id)
        .single()
        .execute()
        .data
    )

    if not shift:
        return jsonify({"error": "Shift not found"}), 404

    if shift["emp_id"] is not None:
        return jsonify({"error": "Shift already assigned"}), 409

    # 2️⃣ Compute next offer_order
    existing = (
        supabase.table("shift_offers")
        .select("offer_order")
        .eq("shift_id", shift_id)
        .execute()
        .data
    )

    max_order = max(
        [o["offer_order"] for o in existing if o.get("offer_order")],
        default=0
    )

    next_order = max_order + 1

    # 3️⃣ UPSERT offer
    supabase.table("shift_offers").upsert(
        {
            "shift_id": shift_id,
            "emp_id": emp_id,
            "status": "sent",
            "offer_order": next_order,
            "sent_at": datetime.utcnow().isoformat() + "Z"
        },
        on_conflict="shift_id,emp_id"
    ).execute()

    # 4️⃣ Update shift state
    supabase.table("shift").update({
        "shift_status": "Offer Sent"
    }).eq("shift_id", shift_id).execute()

    # 5️⃣ Notify employee
    notify_employee(
        emp_id,
        {
            "type": "shift_offer",
            "shift_id": shift_id,
            "message": "A shift is available. Accept or Reject."
        }
    )

    return jsonify({
        "success": True,
        "message": "Offer sent manually",
        "offer_order": next_order
    }), 200


###ADMIN
@app.route("/admin/shift", methods=["POST"])
def admin_add_shift():
    data = request.json

    client_id = data["client_id"]
    date_ = data["date"]              # YYYY-MM-DD (UTC)
    start = data["start_time"]        # HH:MM
    end = data["end_time"]

    # Create shift
    shift = supabase.table("shift").insert({
        "client_id": client_id,
        "date": date_,
        "shift_start_time": f"{date_}T{start}:00Z",
        "shift_end_time": f"{date_}T{end}:00Z",
        "shift_status": "Unassigned",
        "emp_id": None
    }).execute().data[0]

    # Auto schedule
    changes = {
        "new_clients": [{
            "shift_id": shift["shift_id"],
            "client_id": client_id,
            "date": date_,
            "shift_start_time": shift["shift_start_time"],
            "shift_end_time": shift["shift_end_time"]
        }]
    }

    assign_tasks(changes)

    updated = supabase.table("shift") \
        .select("shift_id, emp_id, shift_status") \
        .eq("shift_id", shift["shift_id"]) \
        .single() \
        .execute().data

    return jsonify({
        "shift_id": updated["shift_id"],
        "status": updated["shift_status"],
        "emp_id": updated["emp_id"]
    }), 201
@app.route("/admin/shift/<int:shift_id>", methods=["DELETE"])
def admin_delete_shift(shift_id):
    supabase.table("shift_offers").delete().eq("shift_id", shift_id).execute()
    supabase.table("shift").delete().eq("shift_id", shift_id).execute()

    return jsonify({
        "shift_id": shift_id,
        "deleted": True
    }), 200
@app.route("/admin/shift/<int:shift_id>/reassign", methods=["POST"])
def admin_reassign_shift(shift_id):
    # Unassign
    supabase.table("shift").update({
        "emp_id": None,
        "shift_status": "Unassigned"
    }).eq("shift_id", shift_id).execute()

    supabase.table("shift_offers").update({
        "status": "expired"
    }).eq("shift_id", shift_id).execute()

    # Re-run scheduling
    shift = supabase.table("shift").select("*").eq("shift_id", shift_id).single().execute().data
    assign_tasks({
        "new_clients": [shift]
    })

    updated = supabase.table("shift") \
        .select("shift_status, emp_id") \
        .eq("shift_id", shift_id) \
        .single() \
        .execute().data

    return jsonify({
        "shift_id": shift_id,
        "status": updated["shift_status"],
        "emp_id": updated["emp_id"]
    }), 200
@app.route("/admin/shift/<int:shift_id>/force", methods=["POST"])
def admin_force_assign(shift_id):
    emp_id = request.json["emp_id"]

    supabase.table("shift").update({
        "emp_id": emp_id,
        "shift_status": "Scheduled"
    }).eq("shift_id", shift_id).execute()

    supabase.table("shift_offers").update({
        "status": "expired"
    }).eq("shift_id", shift_id).execute()

    notify_employee(emp_id, {
        "type": "offer_result",
        "status": "assigned",
        "shift_id": shift_id
    })

    return jsonify({
        "shift_id": shift_id,
        "status": "Scheduled",
        "emp_id": emp_id,
        "mode": "forced"
    }), 200
@app.route("/admin/shift/<int:shift_id>/resolve", methods=["POST"])
def admin_resolve_shift(shift_id):
    shift = supabase.table("shift").select("*").eq("shift_id", shift_id).single().execute().data

    if shift["shift_status"] == "Offer Sent":
        activate_next_offer(shift_id)
    else:
        assign_tasks({"new_clients": [shift]})

    updated = supabase.table("shift") \
        .select("shift_status, emp_id") \
        .eq("shift_id", shift_id) \
        .single() \
        .execute().data

    return jsonify({
        "shift_id": shift_id,
        "status": updated["shift_status"],
        "emp_id": updated["emp_id"]
    }), 200
@app.route("/admin/shifts/bulk", methods=["POST"])
def admin_bulk_add():
    data = request.json

    client_id = data["client_id"]
    dates = data["dates"]
    start = data["start_time"]
    end = data["end_time"]

    created = []

    for d in dates:
        shift = supabase.table("shift").insert({
            "client_id": client_id,
            "date": d,
            "shift_start_time": f"{d}T{start}:00Z",
            "shift_end_time": f"{d}T{end}:00Z",
            "shift_status": "Unassigned",
            "emp_id": None
        }).execute().data[0]

        created.append(shift)

    assign_tasks({"new_clients": created})

    return jsonify({
        "created": len(created)
    }), 201
@app.route("/admin/shifts/reassign", methods=["POST"])
def admin_bulk_reassign():
    shift_ids = request.json["shift_ids"]

    processed = 0
    for sid in shift_ids:
        supabase.table("shift").update({
            "emp_id": None,
            "shift_status": "Unassigned"
        }).eq("shift_id", sid).execute()

        shift = supabase.table("shift").select("*").eq("shift_id", sid).single().execute().data
        assign_tasks({"new_clients": [shift]})
        processed += 1

    return jsonify({
        "processed": processed
    }), 200
@app.route("/admin/shifts", methods=["GET"])
def admin_shifts():
    date_ = request.args.get("date")
    status = request.args.get("status")

    q = supabase.table("shift").select("*")

    if date_:
        q = q.eq("date", date_)
    if status:
        q = q.eq("shift_status", status)

    return jsonify(q.order("shift_start_time").execute().data), 200
@app.route("/admin/dashboard/shift-health", methods=["GET"])
def admin_shift_health():
    return jsonify({
        "unassigned": supabase.table("shift").select("shift_id", count="exact")
            .eq("shift_status", "Unassigned").execute().count,
        "offers_pending": supabase.table("shift").select("shift_id", count="exact")
            .eq("shift_status", "Offer Sent").execute().count
    })
@app.route("/admin/schedule", methods=["GET"])
def admin_schedule():
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    status = request.args.get("status")

    if not start_date or not end_date:
        return jsonify({"error": "start_date and end_date required"}), 400

    q = supabase.table("shift").select("""
        shift_id,
        date,
        shift_start_time,
        shift_end_time,
        shift_status,
        emp_id,
        client_id
    """).gte("date", start_date).lte("date", end_date)

    if status:
        q = q.eq("shift_status", status)

    shifts = q.order("date").order("shift_start_time").execute().data or []

    if not shifts:
        return jsonify([]), 200

    client_ids = list({s["client_id"] for s in shifts if s["client_id"]})
    emp_ids = list({s["emp_id"] for s in shifts if s["emp_id"]})

    clients = {
        c["client_id"]: c
        for c in supabase.table("client")
        .select("client_id, first_name, last_name, name")
        .in_("client_id", client_ids)
        .execute().data
    }

    employees = {
        e["emp_id"]: e
        for e in supabase.table("employee")
        .select("emp_id, first_name, last_name")
        .in_("emp_id", emp_ids)
        .execute().data
    }

    result = []
    for s in shifts:
        client = clients.get(s["client_id"])
        emp = employees.get(s["emp_id"]) if s["emp_id"] else None

        result.append({
            "shift_id": s["shift_id"],
            "date": s["date"],
            "start_time": s["shift_start_time"],
            "end_time": s["shift_end_time"],
            "status": s["shift_status"],
            "client": {
                "id": client["client_id"],
                "name": client.get("name") or f"{client['first_name']} {client['last_name']}"
            } if client else None,
            "employee": {
                "id": emp["emp_id"],
                "name": f"{emp['first_name']} {emp['last_name']}"
            } if emp else None
        })

    return jsonify(result), 200

@app.route("/admin/dashboard", methods=["GET"])
def admin_dashboard_view():
    now = datetime.utcnow()
    today = now.date().isoformat()
    next_24h = (now + timedelta(hours=24)).isoformat() + "Z"

    # 1️⃣ Unassigned shifts
    unassigned = (
        supabase.table("shift")
        .select(
            "shift_id, client_id, date, shift_start_time, shift_end_time, shift_status"
        )
        .eq("shift_status", "Unassigned")
        .order("date")
        .execute()
        .data
        or []
    )

    # 2️⃣ Offer sent (pending)
    offer_sent = (
        supabase.table("shift")
        .select(
            "shift_id, client_id, date, shift_start_time, shift_end_time, shift_status"
        )
        .eq("shift_status", "Offer Sent")
        .order("date")
        .execute()
        .data
        or []
    )

    # 3️⃣ Starting soon (next 24h, not completed)
    starting_soon = (
        supabase.table("shift")
        .select(
            "shift_id, client_id, date, shift_start_time, shift_end_time, shift_status"
        )
        .gte("shift_start_time", now.isoformat() + "Z")
        .lte("shift_start_time", next_24h)
        .neq("shift_status", "Clocked out")
        .order("shift_start_time")
        .execute()
        .data
        or []
    )

    # Collect client names
    client_ids = list({
        s["client_id"]
        for s in (unassigned + offer_sent + starting_soon)
        if s.get("client_id")
    })

    clients = {}
    if client_ids:
        res = (
            supabase.table("client")
            .select("client_id, first_name, last_name, name")
            .in_("client_id", client_ids)
            .execute()
            .data
        )
        clients = {
            c["client_id"]: c.get("name") or f'{c["first_name"]} {c["last_name"]}'
            for c in res
        }

    # Helper to normalize shift for frontend
    def normalize(s):
        return {
            "shift_id": s["shift_id"],
            "date": s["date"],
            "start": s["shift_start_time"][11:16],
            "end": s["shift_end_time"][11:16],
            "client_name": clients.get(s["client_id"], "—"),
            "shift_status": s["shift_status"],
        }

    return jsonify({
        "counts": {
            "unassigned": len(unassigned),
            "offer_sent": len(offer_sent),
            "starting_soon": len(starting_soon),
        },
        "unassigned_shifts": [normalize(s) for s in unassigned],
        "offer_sent_shifts": [normalize(s) for s in offer_sent],
        "starting_soon_shifts": [normalize(s) for s in starting_soon],
    })


# --- Run ---
if __name__ == '__main__':
    app.run(debug=True)

