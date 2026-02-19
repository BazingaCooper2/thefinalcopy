from supabase import create_client, Client
from flask import Flask, jsonify, request, session
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
from datetime import timedelta, datetime, timezone
from datetime import date
from datetime import timezone
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
def utc_now_iso():
    return datetime.utcnow().isoformat()

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
    total_employees = supabase.table("employee_final") \
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

@app.route('/scheduled', methods=['GET'])
def schedule():
    date_param    = request.args.get("date", datetime.utcnow().date().isoformat())
    service_param = request.args.get("service")

    employees_q = supabase.table("employee_final").select("*")
    if service_param:
        employees_q = employees_q.ilike("service_type", f"%{service_param}%")

    clients      = supabase.table("client").select("*").execute().data      or []
    employees    = employees_q.execute().data                                or []
    all_shifts   = supabase.table("shift").select("*").execute().data       or []
    daily_shifts = supabase.table("daily_shift").select("*").execute().data or []
    all_leaves   = supabase.table("leaves").select("*").execute().data      or []

    # index leaves by emp_id
    leaves_by_emp = {}
    for lv in all_leaves:
        leaves_by_emp.setdefault(lv.get("emp_id"), []).append(lv)

    # enrich shifts with leave flags
    enriched_shifts = []
    for s in all_shifts:
        eid   = s.get("emp_id")
        sdate = (s.get("date") or s.get("shift_start_time") or "")[:10]
        emp_leave = next(
            (lv for lv in leaves_by_emp.get(eid, [])
             if lv.get("leave_start_date","") <= sdate <= lv.get("leave_end_date","")),
            None
        )
        s["is_leave"]    = emp_leave is not None
        s["leave_reason"] = emp_leave["leave_reason"] if emp_leave else ""
        enriched_shifts.append(s)

    # compute capacity stats per employee for the requested date
    try:
        req_date = datetime.strptime(date_param, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        req_date = datetime.utcnow().replace(tzinfo=timezone.utc)

    week_mon = req_date - timedelta(days=req_date.weekday())
    week_sun = week_mon + timedelta(days=6)

    shifts_by_emp = {}
    for s in all_shifts:
        eid = s.get("emp_id")
        if eid:
            shifts_by_emp.setdefault(eid, []).append(s)

    def _shift_hrs(s):
        start = parse_datetime(s.get("shift_start_time"))
        end   = parse_datetime(s.get("shift_end_time"))
        if start and end and end > start:
            return (end - start).total_seconds() / 3600
        return 0.0

    def _date_str(s):
        return (s.get("date") or s.get("shift_start_time") or "")[:10]

    enriched_employees = []
    for emp in employees:
        eid        = emp["emp_id"]
        daily_cap  = float(emp.get("max_daily_cap")  or 13)
        weekly_cap = float(emp.get("max_weekly_cap") or 48)
        min_daily  = float(emp.get("min_daily_cap")  or 0)
        ot_cap     = float(emp.get("ot_weekly_cap")  or weekly_cap)

        daily_used = weekly_used = 0.0
        for s in shifts_by_emp.get(eid, []):
            hrs = _shift_hrs(s)
            if _date_str(s) == date_param:
                daily_used += hrs
            sdt = parse_datetime(s.get("date") or s.get("shift_start_time"))
            if sdt:
                sdt_naive = sdt.replace(tzinfo=timezone.utc) if sdt.tzinfo is None else sdt
                if week_mon <= sdt_naive <= week_sun:
                    weekly_used += hrs

        on_leave_today = any(
            lv.get("leave_start_date","") <= date_param <= lv.get("leave_end_date","")
            for lv in leaves_by_emp.get(eid, [])
        )
        leave_info_today = next(
            (lv for lv in leaves_by_emp.get(eid, [])
             if lv.get("leave_start_date","") <= date_param <= lv.get("leave_end_date","")),
            None
        )

        enriched_employees.append({
            **emp,
            "on_leave_today": on_leave_today,
            "leave_info":     leave_info_today,
            "capacity": {
                "daily_used":    round(daily_used,  2),
                "daily_cap":     daily_cap,
                "daily_remain":  round(max(daily_cap  - daily_used,  0), 2),
                "daily_pct":     round(min(daily_used  / daily_cap  * 100, 100), 1) if daily_cap  else 0,
                "weekly_used":   round(weekly_used, 2),
                "weekly_cap":    weekly_cap,
                "weekly_remain": round(max(weekly_cap - weekly_used, 0), 2),
                "weekly_pct":    round(min(weekly_used / weekly_cap * 100, 100), 1) if weekly_cap else 0,
                "ot_threshold":  ot_cap,
                "is_ot":         weekly_used > ot_cap,
                "is_over_daily":  daily_used  > daily_cap,
                "is_over_weekly": weekly_used > weekly_cap,
                "min_daily":     min_daily,
                "is_under_min_daily": daily_used < min_daily and min_daily > 0,
            }
        })

    return jsonify({
        "client":      clients,
        "employee":    enriched_employees,
        "shift":       enriched_shifts,
        "daily_shift": daily_shifts,
        "leaves":      all_leaves,
        "_meta": {
            "snapshot_date": date_param,
            "generated_at":  datetime.utcnow().isoformat() + "Z",
        }
    })
@app.route('/submit', methods=['POST'])
def edit_schedule():
    data = request.json
    s_id = data.get('shift_id')
    emp_id = data.get('emp_id')
    shift_date = data.get('shift_date')
    
    def flexible_parse(t_str):
        return t_str.replace('T', ' ').split('.')[0] # Standardizes to YYYY-MM-DD HH:MM:SS

    full_start = flexible_parse(data['shift_start_time'])
    full_end = flexible_parse(data['shift_end_time'])

    # --- NEW CAPACITY ENFORCEMENT ---
    if emp_id and shift_date:
        # 1. Calculate duration of the incoming shift update
        start_dt = parse_datetime(data['shift_start_time'])
        end_dt = parse_datetime(data['shift_end_time'])
        
        if start_dt and end_dt:
            new_duration_hrs = (end_dt - start_dt).total_seconds() / 3600
            
            # 2. Calculate existing hours for this employee on this day
            # EXCLUDING the current shift (s_id) to avoid double-counting
            existing_shifts = supabase.table("shift") \
                .select("shift_start_time, shift_end_time") \
                .eq("emp_id", emp_id) \
                .eq("date", shift_date) \
                .neq("shift_id", s_id) \
                .execute()
            
            total_existing_hrs = 0
            for s in existing_shifts.data:
                s_start = parse_datetime(s["shift_start_time"])
                s_end = parse_datetime(s["shift_end_time"])
                if s_start and s_end:
                    total_existing_hrs += (s_end - s_start).total_seconds() / 3600
            
            # 3. Block update if it exceeds 15 hours
            emp = supabase.table("employee_final") \
                .select("max_daily_cap, max_weekly_cap") \
                .eq("emp_id", emp_id) \
                .single() \
                .execute()

            daily_cap = float(emp.data.get("max_daily_cap") or 15)

            weekly_cap = emp.data["max_weekly_cap"] if emp.data["max_weekly_cap"] else 48

            existing_daily = get_daily_total_hours(emp_id, shift_date)
            existing_weekly = get_weekly_total_hours(emp_id, shift_date)

            if (existing_daily + new_duration_hrs) > daily_cap:
                return jsonify({"error": "Daily capacity exceeded"}), 400

            if (existing_weekly + new_duration_hrs) > weekly_cap:
                return jsonify({"error": "Weekly capacity exceeded"}), 400
    # --------------------------------

    # Update the shift table with ALL fields
    supabase.table("shift").update({
        "shift_start_time": full_start,
        "shift_end_time": full_end,
        "emp_id": emp_id,
        "date": shift_date,
        "shift_status": "Scheduled"
    }).eq("shift_id", s_id).execute()

    # Sync the changes to the daily view
    supabase.rpc("update_daily_shifts", {}).execute()
    
    return jsonify({"status": "success", "message": "Shift updated"})

@app.route('/delete_shift', methods=['POST'])
def delete_shift():
    data = request.json
    s_id = data.get('shift_id')
    
    if not s_id:
        return jsonify({"error": "No shift_id provided"}), 400
    
    # Delete from Supabase
    supabase.table("shift").delete().eq("shift_id", s_id).execute()
    
    # Sync the changes to the daily view
    supabase.rpc("update_daily_shifts", {}).execute()
    
    return jsonify({"message": "Shift deleted successfully"}), 200

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
    if not tstr:
        return None

    try:
        tstr = str(tstr).strip()

        # ISO format with T
        if "T" in tstr:
            # Normalize: replace Z, then pad single-digit hour (T9: -> T09:)
            normalized = tstr.replace("Z", "+00:00")
            # Fix single-digit hour: e.g. T9:30 -> T09:30
            import re
            normalized = re.sub(r'T(\d):', r'T0\1:', normalized)
            return datetime.fromisoformat(normalized)

        # Date + time with space
        if " " in tstr:
            try:
                return datetime.strptime(tstr, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
            except ValueError:
                return datetime.strptime(tstr, "%Y-%m-%d %H:%M").replace(tzinfo=timezone.utc)

        # Date-only (YYYY-MM-DD)
        if len(tstr) == 10 and tstr[4] == "-" and tstr[7] == "-":
            return datetime.strptime(tstr, "%Y-%m-%d").replace(tzinfo=timezone.utc)

        # Time only (HH:MM or HH:MM:SS)
        today = datetime.utcnow().date()
        try:
            return datetime.strptime(f"{today} {tstr}", "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        except ValueError:
            return datetime.strptime(f"{today} {tstr}", "%Y-%m-%d %H:%M").replace(tzinfo=timezone.utc)

    except Exception as e:
        print(f"Time parse error for '{tstr}': {e}")
        return None

def overlaps(em, cdate, client_start_time, client_end_time, dsst, dset, ssst, sset, sdate):
    if not dsst or not dset:
        return False

    client_start_dt = parse_datetime(client_start_time)
    client_end_dt   = parse_datetime(client_end_time)
    dsst_dt         = parse_datetime(dsst)
    dset_dt         = parse_datetime(dset)

    if not all([client_start_dt, client_end_dt, dsst_dt, dset_dt]):
        return False

    # Overlap with daily shift
    if not (client_start_dt < dset_dt and client_end_dt > dsst_dt):
        return False

    # No secondary shift → valid
    if not ssst or not sset:
        return True

    ssst_dt = parse_datetime(ssst)
    sset_dt = parse_datetime(sset)

    if not ssst_dt or not sset_dt:
        return True

    # Exclude overlap with secondary shift
    if client_start_dt < sset_dt and client_end_dt > ssst_dt:
        return False

    return True


def get_employees_for_shift(dateofshift):
    print("Hi3")
    today = dateofshift  # or use date.today()
    print("Today date is: ", today)

    # Join equivalent needs to be handled in Supabase: fetch and merge in Python
    employee = supabase.table("employee_final").select("emp_id,seniority, employee_type").order("seniority", desc=True).execute()
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

def get_daily_total_hours(emp_id, shift_date):
    day_start = datetime.strptime(shift_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)

    res = supabase.table("shift") \
        .select("shift_start_time, shift_end_time") \
        .eq("emp_id", emp_id) \
        .execute()

    total = 0

    for s in res.data:
        start = parse_datetime(s["shift_start_time"])
        end = parse_datetime(s["shift_end_time"])
        if not start or not end:
            continue

        overlap_start = max(start, day_start)
        overlap_end = min(end, day_end)

        if overlap_start < overlap_end:
            total += (overlap_end - overlap_start).total_seconds() / 3600

    return total


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
        
        # Calculate the duration of the current incoming shift in hours
        incoming_start = parse_datetime(ch["shift_start_time"])
        incoming_end = parse_datetime(ch["shift_end_time"])
        incoming_duration = (incoming_end - incoming_start).total_seconds() / 3600

        eligible = []
        for e in employeetab:
            # Check for physical time overlap first (your existing logic)
            is_available = overlaps(
                e, ch["date"], ch["shift_start_time"], ch["shift_end_time"],
                e["dsst"], e["dset"], e["ssst"], e["sset"], e["sdate"]
            )
            
            if is_available:
                # Check current hours already assigned to this employee for this day
                # We reuse your existing get_daily_total_hours logic here
                current_assigned_hours = get_daily_total_hours(e["emp_id"], ch["date"])
                
                # Check if adding this shift stays within the 15-hour cap
                daily_hours = get_daily_total_hours(e["emp_id"], ch["date"])
                weekly_hours = get_weekly_total_hours(e["emp_id"], ch["date"])

                emp = supabase.table("employee_final") \
                    .select("max_daily_cap, max_weekly_cap") \
                    .eq("emp_id", e["emp_id"]) \
                    .single() \
                    .execute()

                daily_cap = float(emp.data.get("max_daily_cap") or 15)

                weekly_cap = emp.data["max_weekly_cap"] if emp.data["max_weekly_cap"] else 48

                if (daily_hours + incoming_duration) <= daily_cap and \
                (weekly_hours + incoming_duration) <= weekly_cap:
                    eligible.append(e)

        # --------------------------------

        if not eligible:
            print(f"[NO MATCH] No eligible employee or max capacity (15h) reached for shift {shift_id}")
            continue

        # 3️⃣ Rank employees
        eligible.sort(
            key=lambda e: EMPLOYMENT_PRIORITY.get(e["employee_type"], 99)
        )

        best_employee = eligible[0]

        # 4️⃣ Time check
        shift_start = parse_datetime(ch["shift_start_time"])

        if not shift_start:
            print(f"[SKIP] Invalid shift_start_time for shift {shift_id}")
            continue

        hours_to_shift = (
            shift_start - datetime.utcnow().replace(tzinfo=timezone.utc)
        ).total_seconds() / 3600


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
                "sent_at": utc_now_iso()
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
        "response_time": utc_now_iso()
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
            "sent_at": utc_now_iso()
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
        "response_time": utc_now_iso()
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
    newemp_id = supabase.table("employee_final").select("emp_id").order("emp_id", desc=True).limit(1).execute().data[0]["emp_id"] + 1
    response = supabase.table("employee_final").insert({
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
        response = supabase.table("employee_final").select("*").eq("emp_id", emp_id).execute()
        
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

def write_capacity_log(emp_id: int, shift_id: int, shift_date: str, hours_worked: float):
    """
    Upsert a row into employee_capacity_log for this shift.
    Calculates OT based on ot_weekly_cap for the employee.
    """
    try:
        emp = supabase.table("employee_final") \
            .select("max_daily_cap, max_weekly_cap, ot_weekly_cap") \
            .eq("emp_id", emp_id) \
            .single() \
            .execute().data

        if not emp:
            return

        ot_cap     = float(emp.get("ot_weekly_cap")  or emp.get("max_weekly_cap") or 48)
        weekly_cap = float(emp.get("max_weekly_cap") or 48)

        week_date  = datetime.strptime(shift_date, "%Y-%m-%d")
        week_mon   = week_date - timedelta(days=week_date.weekday())
        week_sun   = week_mon  + timedelta(days=6)

        existing_week = supabase.table("employee_capacity_log") \
            .select("hours_worked") \
            .eq("emp_id", emp_id) \
            .gte("log_date", week_mon.strftime("%Y-%m-%d")) \
            .lte("log_date", week_sun.strftime("%Y-%m-%d")) \
            .neq("shift_id", shift_id) \
            .execute().data or []

        week_hrs_so_far = sum(float(r["hours_worked"]) for r in existing_week)
        week_total      = week_hrs_so_far + hours_worked

        is_overtime = week_total > ot_cap
        ot_hours    = round(max(week_total - ot_cap, 0), 2) if is_overtime else 0.0

        supabase.table("employee_capacity_log").upsert({
            "emp_id":       emp_id,
            "shift_id":     shift_id,
            "log_date":     shift_date,
            "hours_worked": round(hours_worked, 2),
            "is_overtime":  is_overtime,
            "ot_hours":     ot_hours,
            "log_type":     "shift",
            "updated_at":   utc_now_iso(),
        }, on_conflict="emp_id,shift_id").execute()

        print(f"[CAPACITY LOG] emp={emp_id} shift={shift_id} {hours_worked:.2f}h OT={is_overtime}")

    except Exception as e:
        print(f"[CAPACITY LOG ERROR] {e}")

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
        "clock_in": utc_now_iso(),
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

    clock_out_time = utc_now_iso()
    supabase.table("shift").update({
        "shift_status": "Clocked out",
        "clock_out": clock_out_time
    }).eq("shift_id", shift_id).execute()

    # ── Write to immutable capacity log ──────────────────────────
    shift_full = supabase.table("shift") \
        .select("shift_start_time, shift_end_time, date, clock_in") \
        .eq("shift_id", shift_id) \
        .single().execute().data

    if shift_full and shift_full.get("clock_in"):
        clock_in_dt  = parse_datetime(shift_full["clock_in"])
        clock_out_dt = parse_datetime(clock_out_time)
        if clock_in_dt and clock_out_dt and clock_out_dt > clock_in_dt:
            actual_hours = (clock_out_dt - clock_in_dt).total_seconds() / 3600
            shift_date   = (shift_full.get("date") or shift_full.get("shift_start_time") or "")[:10]
            write_capacity_log(emp_id, shift_id, shift_date, actual_hours)

    return jsonify({"status": "clocked_out"}), 200
@app.route("/employee/<int:emp_id>/today-shifts", methods=["GET"])
def get_today_shifts(emp_id):
    """
    Get ALL shifts for an employee today (not just the first one).
    Returns shifts ordered by start time so they can choose which to clock into.
    """
    try:
        today = datetime.utcnow().date().isoformat()

        res = (
            supabase
            .table("shift")
            .select(
                "shift_id, client_id, shift_start_time, shift_end_time, shift_status, clock_in, clock_out"
            )
            .eq("emp_id", emp_id)
            .eq("date", today)
            .order("shift_start_time")
            .execute()
        )

        return jsonify({
            "success": True,
            "shifts": res.data or [],
            "count": len(res.data) if res.data else 0
        }), 200

    except Exception as e:
        print("TODAY SHIFTS ERROR:", e)
        return jsonify({
            "success": False,
            "error": str(e),
            "shifts": []
        }), 500

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

        now = utc_now_iso()

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

        res = query.order("task_id", desc=True).execute()

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

@app.route("/task-update", methods=["PUT"])
def task_update():
    try:
        data = request.json
        task_id = data.get("task_id")
        details = data.get("details")

        if not task_id or not details:
            return jsonify({
                "success": False,
                "message": "task_id and details are required"
            }), 400

        res = supabase.table("tasks").update({
            "details": details
        }).eq("task_id", task_id).execute()

        return jsonify({
            "success": True,
            "message": "Task updated successfully",
            "data": res.data
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route("/task-delete", methods=["DELETE"])
def task_delete():
    try:
        task_id = request.args.get("task_id")

        if not task_id:
            return jsonify({
                "success": False,
                "message": "task_id is required"
            }), 400

        supabase.table("tasks").delete().eq("task_id", task_id).execute()

        return jsonify({
            "success": True,
            "message": "Task deleted successfully"
        }), 200

    except Exception as e:
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

        now = utc_now_iso()

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

@app.route("/client-tasks/<int:client_id>", methods=["GET"])
def get_client_tasks(client_id):
    try:
        # 1. Get all shift IDs for this client
        shifts = supabase.table("shift").select("shift_id").eq("client_id", client_id).execute()
        
        if not shifts.data:
            return jsonify({
                "success": True, 
                "tasks": []
            }), 200
            
        shift_ids = [s['shift_id'] for s in shifts.data]
        
        if not shift_ids:
             return jsonify({
                "success": True, 
                "tasks": []
            }), 200

        # 2. Get tasks for these shifts
        tasks = supabase.table("tasks").select("*").in_("shift_id", shift_ids).order("task_id", desc=True).execute()
        
        return jsonify({
            "success": True, 
            "tasks": tasks.data
        }), 200

    except Exception as e:
        print("GET CLIENT TASKS ERROR:", e)
        return jsonify({
            "success": False, 
            "message": str(e)
        }), 500

@app.route('/employees/simple', methods=['GET'])
def get_employees_simple():
    """Get simple employee list for dropdowns"""
    try:
        response = supabase.table("employee_final") \
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

    # Fetch employees
    employees = supabase.table("employee_final").select("*").execute().data

    # Active shifts (currently ongoing)
    shifts = supabase.table("daily_shift") \
        .select("*") \
        .lte("shift_start_time", now_str) \
        .gte("shift_end_time", now_str) \
        .execute().data

    # Active leaves (today)
    leaves = supabase.table("leaves") \
        .select("*") \
        .lte("leave_start_date", today_str) \
        .gte("leave_end_date", today_str) \
        .execute().data

    result = []

    for emp in employees:

        status = resolve_employee_status(
            emp["emp_id"],
            shifts,
            leaves
        )

        result.append({
            "emp_id": emp["emp_id"],
            "first_name": emp.get("first_name"),
            "last_name": emp.get("last_name", ""),
            "phone": emp.get("phone"),
            "email": emp.get("email"),
            "designation": emp.get("designation") or emp.get("job_title"),

            # Location info
            "service_type": emp.get("service_type"),
            "city": emp.get("city"),
            "state": emp.get("state"),

            # Proper employee type (FIXED)
            "employee_type": emp.get("status"),  # your DB stores FT/PT here

            # Department / Cross training
            "department": emp.get("department") or [],

            # Computed availability status
            "status_label": status,

            # Preserve original DB status if needed
            "Employee_status": emp.get("Employee_status"),

            # Optional additional useful fields
            "seniority": emp.get("seniority"),
            "joining_date": emp.get("joining_date"),
        })

    return result

@app.route("/dashboard/employee-status", methods=["GET"])
def employee_status_stats():
    from datetime import datetime

    today = datetime.utcnow().date().isoformat()

    # Total employees
    total_employees = (
        supabase.table("employee_final")
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
    try:
        combined_reports = []

        # 1. Injury Reports
        injuries = supabase.table("injury_reports").select("*").execute().data
        for item in injuries:
            # Map/Normalize
            item["report_type"] = "Injury"
            # Ensure date is present (fallback to created_at if necessary)
            if not item.get("date") and item.get("injury_date"):
                item["date"] = item["injury_date"]
            
            # Frontend expects 'severity' - logic: Injury is usually serious or medical? 
            # We can leave it empty or set based on 'medical_attention_required'
            if item.get("medical_attention_required"):
                item["severity"] = "Medical Attention"
            else:
                item["severity"] = "Injury"

        combined_reports.extend(injuries)

        # 2. Incident Reports
        incidents = supabase.table("incident_reports").select("*").execute().data
        for item in incidents:
            item["report_type"] = "Incident"
            # Map fields to match 'injury_reports' schema expected by frontend
            item["date"] = item.get("incident_date") or item.get("created_at")
            item["location"] = item.get("incident_location")
            item["description"] = item.get("incident_description")
            item["reporting_employee"] = item.get("reporter_name")
            # "injured_person" for incident might be 'who_involved'
            item["injured_person"] = item.get("who_involved")
            item["severity"] = "Incident"
            
        combined_reports.extend(incidents)

        # 3. Hazard Reports
        hazards = supabase.table("hazard_near_miss_reports").select("*").execute().data
        for item in hazards:
            item["report_type"] = "Hazard"
            item["date"] = item.get("incident_date") or item.get("created_at")
            item["location"] = item.get("incident_location")
            item["description"] = item.get("hazard_details")
            item["reporting_employee"] = item.get("reporter_name")
            item["injured_person"] = "N/A (Hazard)"
            item["severity"] = item.get("hazard_rating") # e.g. "Major", "Minor"

        combined_reports.extend(hazards)

        return jsonify(combined_reports)

    except Exception as e:
        print(f"GET INJURY REPORTS ERROR: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/injury_reports/<int:id>", methods=["DELETE"])
def delete_injury_report(id):
    try:
        r_type = request.args.get("type", "Injury")
        table = "injury_reports"

        if r_type == "Hazard":
            table = "hazard_near_miss_reports"
        elif r_type == "Incident":
            table = "incident_reports"

        supabase.table(table).delete().eq("id", id).execute()
        return jsonify({"success": True, "message": f"{r_type} Report deleted successfully"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


SUPERVISOR_EMAIL = "hemangee4700@gmail.com"

@app.route("/send_injury_report", methods=["POST"])
def send_injury_report():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request"}), 400

    report_type = data.get("report_type")

    if report_type == "hazard":
        return send_hazard_report(data)

    if report_type == "hazard-followup":
        return update_hazard_followup(data)

    if report_type == "incident":
        return create_incident(data)

    if report_type == "incident-followup":
        return send_incident_followup(data)

    if report_type == "injury":
        return report_injury(data)

    if report_type == "injury-followup":
        return injury_followup(data)

    return jsonify({"error": "Unsupported report type"}), 400


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
            "created_at": utc_now_iso()
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
Please log in to review and complete supervisor follow-up.
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
            "incident_location": payload.get("incident_location"),

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
    try:
        injury_data = {
            "date": payload.get("date_of_injury"),

            "injured_person": payload.get("emp_name"),
            "reporting_employee": payload.get("reporter_name"),
            "location": payload.get("location"),
            "description": payload.get("injury_description"),

            "status": "submitted",

            # Reporting details
            "reported_date": payload.get("date_reported"),
            "reported_time": payload.get("time_of_injury"),
            "delay_reason": payload.get("delay_reason"),

            # Injury details
            "injury_date": payload.get("date_of_injury"),
            "injury_time": payload.get("time_of_injury_detail"),
            "time_left_work": payload.get("time_left_work"),
            "program": payload.get("program"),

            # Medical
            "medical_attention_required": payload.get("medical_attention_required") == "Yes",
            "rtw_package_taken": payload.get("rtw_package_taken") == "Yes",

            # Body parts
            "injured_body_parts": payload.get("body_parts", []),

            # Witness
            "witness_remarks": payload.get("witness_remarks"),
            "witness_name": payload.get("witness_name"),
            "witness_phone": payload.get("witness_phone"),
            "witness_signature": {
                "signature": payload.get("witness_signature")
            },
            "witness_date": payload.get("witness_date"),
            "witness_time": payload.get("witness_time"),

            # HCP
            "hcp_name": payload.get("hcp_name_title"),
            "hcp_address": payload.get("hcp_address"),
            "hcp_phone": payload.get("hcp_phone"),

            # Reporter & employee info
            "reporter_name": payload.get("reporter_name"),
            "reported_to_supervisor_name": payload.get("reported_to_supervisor"),

            "emp_name": payload.get("emp_name"),
            "emp_phone": payload.get("emp_phone"),
            "emp_email": payload.get("emp_email"),
            "emp_address": payload.get("emp_address"),

            "client_involved": payload.get("client_involved"),

            # Employee confirmation
            "employee_signature": {
                "signed": payload.get("confirmation_signed"),
                "signature": payload.get("employee_signature")
            },
            "employee_sign_date": payload.get("sign_date"),

            # FAF
            "faf_form_brought": payload.get("faf_form_brought") == "Yes",

            # Flags
            "supervisor_notified": True if payload.get("reported_to_supervisor") else False,
            "created_at": utc_now_iso()
        }

        response = supabase.table("injury_reports") \
            .insert(injury_data) \
            .execute()
        
        if not response.data:
             return jsonify({"success": False, "message": "Failed to save injury report"}), 500

        data = response.data[0]
        injury_id = data["id"]
        
        # Safe access for email construction
        body_parts_list = data.get("injured_body_parts") or []
        if isinstance(body_parts_list, str): # Handle case if DB returns string
             body_parts_str = body_parts_list
        else:
             body_parts_str = ", ".join(body_parts_list)

        email_body = f"""
        Injury Report Submitted Successfully

        Injury Report ID: {injury_id}

        Employee Name: {data.get("emp_name")}
        Date of Injury: {data.get("date_of_injury") or data.get("injury_date")}
        Time of Injury: {data.get("time_of_injury_detail") or data.get("injury_time")}
        Location: {data.get("location")}

        Body Parts Involved:
        {body_parts_str}

        Description:
        {data.get("injury_description") or data.get("description")}

        Reporter: {data.get("reporter_name")}
        Supervisor Notified: {data.get("reported_to_supervisor_name") or data.get("reported_to_supervisor")}

        Please retain this ID for future reference.
        Please log in to review and complete supervisor follow-up.
        """

        try:
            send_email(
                subject=f"Injury Report Submitted (ID: {injury_id})",
                body=email_body
            )
        except Exception as email_err:
            print(f"Inury Report Email Error: {email_err}")

        return jsonify({
            "success": True,
            "injury_report_id": injury_id
        }), 201

    except Exception as e:
        print(f"REPORT INJURY ERROR: {e}")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

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

        <p><em>Submitted on {utc_now_iso("%Y-%m-%d %H:%M UTC")}</em></p>
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



def get_weekly_total_hours(emp_id, any_date_str):
    any_date = datetime.strptime(any_date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    week_start = any_date - timedelta(days=any_date.weekday())
    week_end = week_start + timedelta(days=7)

    res = supabase.table("shift") \
        .select("shift_start_time, shift_end_time") \
        .eq("emp_id", emp_id) \
        .execute()

    total = 0

    for s in res.data:
        start = parse_datetime(s["shift_start_time"])
        end = parse_datetime(s["shift_end_time"])
        if not start or not end:
            continue

        overlap_start = max(start, week_start)
        overlap_end = min(end, week_end)

        if overlap_start < overlap_end:
            total += (overlap_end - overlap_start).total_seconds() / 3600

    return total


@app.route("/add_client_shift", methods=["POST"])
def add_client_shift():
    data = request.json
    try:
        emp_id = data.get('emp_id')
        shift_date = data.get("shift_date")
        client_id = data.get('client_id')
        requested_shift_type = data.get("shift_type", "regular") # Get the type from frontend

        # --- 1. OUTREACH TRAVEL GUARD ---
        if client_id:
            client_res = supabase.table("client").select("service_type").eq("client_id", client_id).single().execute()
            client_service = client_res.data.get("service_type", "") if client_res.data else ""
            
            # Block travel shift if service is not Outreach
            if requested_shift_type == "travel" and client_service.lower() != "outreach":
                return jsonify({
                    "error": f"Travel blocks are only allowed for Outreach services. This client is registered under: {client_service}"
                }), 400
        # --------------------------------

        # --- NEW CAPACITY CHECK ---
        if emp_id:
            new_start = parse_datetime(data['shift_start_time'])
            new_end = parse_datetime(data['shift_end_time'])
            
            if new_start and new_end:
                new_duration_hrs = (new_end - new_start).total_seconds() / 3600
                existing_hours = get_daily_total_hours(int(emp_id), shift_date)
                
                emp = supabase.table("employee_final") \
                    .select("max_daily_cap") \
                    .eq("emp_id", emp_id) \
                    .single() \
                    .execute()

                daily_cap = float(emp.data.get("max_daily_cap") or 15)


                if (existing_hours + new_duration_hrs) > daily_cap:
                    return jsonify({
                        "error": f"Maximum shifts allocated: Employee is already at {existing_hours:.1f}h. This addition would exceed the 15h daily limit."
                    }), 400
        # --------------------------

        # --- INSERT PAYLOAD ---
        # Note: Ensure your Supabase 'shift' table has a column named 'shift_type'
        insert_payload = {
            "client_id": int(client_id),
            "emp_id": int(emp_id) if emp_id else None,
            "shift_start_time": data['shift_start_time'].replace('T', ' '),
            "shift_end_time": data['shift_end_time'].replace('T', ' '),
            "date": shift_date,
            "shift_status": data.get("shift_status", "Scheduled"),
            "shift_type": requested_shift_type # Save the specific type (travel/outreach)
        }

        result = supabase.table("shift").insert(insert_payload).execute()
        
        if not result.data:
             return jsonify({"error": "Database rejection. Check your data constraints."}), 500

        supabase.rpc("update_daily_shifts", {}).execute()
        return jsonify({"message": "Client shift added successfully"}), 200

    except Exception as e:
        print(f"ERROR in /add_client_shift: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/add_employee_shift", methods=["POST"])
def add_employee_shift():
    data = request.get_json()
    try:
        supabase.table("daily_shift").insert({
            "emp_id": data["emp_id"],
            "shift_date": data["shift_date"],
            "shift_start_time": data["shift_start_time"].replace(' ','T')+"Z",
            "shift_end_time": data["shift_end_time"].replace(' ','T')+"Z",
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
    emp = supabase.table("employee_final").select("*").eq("emp_id", emp_id).execute()
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
    
    emp_id = req["emp_id"]
    leave_type = req["type"]
    start_date = req["start_date"]
    end_date = req["end_date"]
    start_time = req["start_time"]
    end_time = req["end_time"]
    description = req["description"]
    
    # 1️⃣ Insert leave record
    leave_result = supabase.table("leaves").insert({
        "emp_id": emp_id,
        "leave_type": leave_type,
        "leave_start_date": start_date,
        "leave_end_date": end_date,
        "leave_reason": description,
        "leave_start_time": start_time,
        "leave_end_time": end_time,
    }).execute()
    
    # 2️⃣ Get employee's service type/location
    emp_res = supabase.table("employee_final") \
        .select("service_type, department") \
        .eq("emp_id", emp_id) \
        .single() \
        .execute()
    
    employee_location = emp_res.data.get("service_type") if emp_res.data else None
    
    # 3️⃣ Process leave and reschedule affected shifts
    affected_shifts = leave_processing(
        emp_id, 
        start_date, 
        end_date, 
        start_time, 
        end_time,
        employee_location
    )
    
    return jsonify({
        "message": "Unavailability added and shifts rescheduled",
        "affected_shifts": len(affected_shifts)
    }), 200


def leave_processing(emp_id, leave_start_date, leave_end_date, leave_start_time, leave_end_time, employee_location=None):
    """
    Process leave application and CREATE RECOMMENDATIONS for conflicting shifts.
    Does NOT auto-assign - marks shifts with ⚠️ and creates records for supervisor review.
    """
    
    def to_hhmm(t):
        """Extract HH:MM from various time formats"""
        if isinstance(t, str):
            if ' ' in t:
                t = t.split(' ')[1]
            if 'T' in t:
                t = t.split('T')[1]
            return t[:5]
        return t.strftime('%H:%M') if hasattr(t, 'strftime') else str(t)[:5]

    def to_date(d):
        """Convert date string to YYYY-MM-DD"""
        if isinstance(d, str):
            return d.split('T')[0] if 'T' in d else d.split(' ')[0]
        return d.strftime('%Y-%m-%d') if hasattr(d, 'strftime') else str(d)

    def overlaps(shift_start, shift_end, leave_start, leave_end, shift_date, leave_start_date, leave_end_date):
        """Check if shift overlaps with leave period"""
        shift_date_str = to_date(shift_date)
        
        # Check if the shift date falls within the leave date range
        if not (leave_start_date <= shift_date_str <= leave_end_date):
            return False
        
        s_start = to_hhmm(shift_start)
        s_end = to_hhmm(shift_end)
        l_start = to_hhmm(leave_start)
        l_end = to_hhmm(leave_end)
        
        # Standard overlap logic: Start of A < End of B AND End of A > Start of B
        return not (s_end <= l_start or s_start >= l_end)

    # 1️⃣ Fetch all assigned shifts for this employee that are currently scheduled
    assigned_shifts = supabase.table("shift") \
        .select("*") \
        .eq("emp_id", emp_id) \
        .eq("shift_status", "Scheduled") \
        .execute().data

    # 2️⃣ Find affected shifts and flag them
    affected_shifts = []
    for shift in assigned_shifts:
        if overlaps(
            shift["shift_start_time"], 
            shift["shift_end_time"], 
            leave_start_time, 
            leave_end_time,
            shift["date"],
            leave_start_date,
            leave_end_date
        ):
            # --- CLEANUP: Delete old pending recommendations for this specific shift ---
            supabase.table("shift_reassignment_recommendations") \
                .delete() \
                .eq("shift_id", shift["shift_id"]) \
                .eq("status", "pending") \
                .execute()

            # --- FLAG: Mark shift with the exact string your Frontend (DailySchedule.js) looks for ---
            supabase.table("shift").update({
                "shift_status": "⚠️ Conflicting Leave"
            }).eq("shift_id", shift["shift_id"]).execute()
            
            affected_shifts.append(shift)
            print(f"[LEAVE CONFLICT] Shift {shift['shift_id']} flagged for reassignment")

    # 3️⃣ Generate new recommendations for each affected shift
    if affected_shifts:
        print(f"[AI RANKING] Generating substitute options for {len(affected_shifts)} shifts")
        for shift in affected_shifts:
            generate_reassignment_recommendations(shift, emp_id)

    return affected_shifts

def generate_reassignment_recommendations(shift, original_emp_id):
    """
    Generate ranked list of recommended employees for shift reassignment.
    Stores recommendations in a new table for supervisor review.
    """
    
    shift_id = shift["shift_id"]
    shift_date = shift["date"]
    
    # Get shift location from client
    shift_location = None
    if shift.get("client_id"):
        client = supabase.table("client") \
            .select("service_type") \
            .eq("client_id", shift["client_id"]) \
            .single() \
            .execute()
        
        shift_location = client.data.get("service_type") if client.data else None
    
    # Get eligible employees for this shift
    employeetab = get_employees_for_shift(shift_date)
    
    # Calculate duration
    incoming_start = parse_datetime(shift["shift_start_time"])
    incoming_end = parse_datetime(shift["shift_end_time"])
    incoming_duration = (incoming_end - incoming_start).total_seconds() / 3600

    eligible = []
    for e in employeetab:
        # Skip the employee on leave
        if e["emp_id"] == original_emp_id:
            continue
        
        # ✅ TIME AVAILABILITY CHECK
        is_available = overlaps(
            e, shift_date, shift["shift_start_time"], shift["shift_end_time"],
            e["dsst"], e["dset"], e["ssst"], e["sset"], e["sdate"]
        )
        
        if not is_available:
            continue

        # ✅ LOCATION/SERVICE TYPE CHECK
        if shift_location:
            emp_full = supabase.table("employee_final") \
                .select("service_type, department, seniority, employee_type") \
                .eq("emp_id", e["emp_id"]) \
                .single() \
                .execute()
            
            if emp_full.data:
                emp_service = emp_full.data.get("service_type", "")
                emp_dept = emp_full.data.get("department", "")
                
                # Location matching logic
                location_match = False
                
                # Neeve locations
                if shift_location in ["85 Neeve", "87 Neeve"]:
                    if "NV" in emp_dept or "Neeve" in emp_service:
                        location_match = True
                
                # Willow Place
                elif "Willow" in shift_location:
                    if "WP" in emp_dept or "Willow" in emp_service:
                        location_match = True
                
                # Outreach
                elif "Outreach" in shift_location:
                    if "OR" in emp_dept or "Outreach" in emp_service:
                        location_match = True
                
                # Assisted Living
                elif "Assisted" in shift_location or "Supported" in shift_location:
                    if any(x in emp_dept for x in ["Assisted", "Supported", "ALS"]):
                        location_match = True
                else:
                    location_match = True
                
                if not location_match:
                    continue
                
                # Store employee data for scoring
                e["seniority"] = emp_full.data.get("seniority", 0)
                e["employee_type"] = emp_full.data.get("employee_type", "Casual")

        # ✅ CAPACITY CHECK
        daily_hours = get_daily_total_hours(e["emp_id"], shift_date)
        weekly_hours = get_weekly_total_hours(e["emp_id"], shift_date)

        emp = supabase.table("employee_final") \
            .select("max_daily_cap, max_weekly_cap") \
            .eq("emp_id", e["emp_id"]) \
            .single() \
            .execute()

        daily_cap = float(emp.data.get("max_daily_cap") or 15)
        weekly_cap = emp.data.get("max_weekly_cap") or 48

        if (daily_hours + incoming_duration) <= daily_cap and \
           (weekly_hours + incoming_duration) <= weekly_cap:
            
            # Calculate hours remaining
            e["hours_remaining"] = daily_cap - (daily_hours + incoming_duration)
            e["daily_hours"] = daily_hours
            
            eligible.append(e)

    if not eligible:
        print(f"[NO RECOMMENDATIONS] No eligible employees for shift {shift_id}")
        return

    # 3️⃣ RANK RECOMMENDATIONS
    EMPLOYMENT_PRIORITY = {
        "Full Time": 1,
        "Part Time": 2,
        "Casual": 3
    }
    
    # Multi-factor scoring
    for e in eligible:
        score = 0
        
        # Factor 1: Employment type (30 points)
        emp_type_score = {
            "Full Time": 30,
            "Part Time": 20,
            "Casual": 10
        }
        score += emp_type_score.get(e.get("employee_type"), 0)
        
        # Factor 2: Seniority (20 points max)
        score += min(e.get("seniority", 0), 20)
        
        # Factor 3: Available capacity (30 points max)
        # More remaining hours = better
        capacity_score = (e.get("hours_remaining", 0) / 15) * 30
        score += capacity_score
        
        # Factor 4: Current daily load (20 points)
        # Less loaded = better
        load_score = 20 - ((e.get("daily_hours", 0) / 15) * 20)
        score += load_score
        
        e["recommendation_score"] = round(score, 2)
    
    # Sort by score
    eligible.sort(key=lambda x: x["recommendation_score"], reverse=True)
    
    # 4️⃣ STORE RECOMMENDATIONS (top 5)
    recommendations = []
    for i, emp in enumerate(eligible[:5]):
        rec = {
            "shift_id": shift_id,
            "original_emp_id": original_emp_id,
            "recommended_emp_id": emp["emp_id"],
            "rank": i + 1,
            "score": emp["recommendation_score"],
            "reason": f"{emp.get('employee_type', 'N/A')} | {emp.get('daily_hours', 0):.1f}h used | {emp.get('hours_remaining', 0):.1f}h remaining",
            "status": "pending",  # pending | approved | rejected
            "created_at": utc_now_iso()
        }
        recommendations.append(rec)
    
    # Insert into recommendations table
    supabase.table("shift_reassignment_recommendations").insert(recommendations).execute()
    
    print(f"[RECOMMENDATIONS CREATED] {len(recommendations)} options for shift {shift_id}")

@app.route("/shift/<int:shift_id>/recommendations", methods=["GET"])
def get_shift_recommendations(shift_id):
    """
    Get all reassignment recommendations for a specific shift.
    Returns ranked list of employees.
    """
    try:
        # Get shift details
        shift = supabase.table("shift") \
            .select("*") \
            .eq("shift_id", shift_id) \
            .single() \
            .execute()
        
        if not shift.data:
            return jsonify({"error": "Shift not found"}), 404
        
        # Get recommendations
        recs = supabase.table("shift_reassignment_recommendations") \
            .select("*") \
            .eq("shift_id", shift_id) \
            .eq("status", "pending") \
            .order("rank") \
            .execute()
        
        if not recs.data:
            return jsonify({
                "shift": shift.data,
                "recommendations": [],
                "message": "No recommendations available"
            }), 200
        
        # Enrich with employee details
        emp_ids = [r["recommended_emp_id"] for r in recs.data]
        employees = {
            e["emp_id"]: e
            for e in supabase.table("employee_final")
            .select("emp_id, first_name, last_name, service_type, employee_type, seniority")
            .in_("emp_id", emp_ids)
            .execute()
            .data
        }
        
        # Get client details
        client = None
        if shift.data.get("client_id"):
            client_res = supabase.table("client") \
                .select("client_id, first_name, last_name, name") \
                .eq("client_id", shift.data["client_id"]) \
                .single() \
                .execute()
            client = client_res.data if client_res.data else None
        
        enriched_recs = []
        for rec in recs.data:
            emp = employees.get(rec["recommended_emp_id"])
            if emp:
                enriched_recs.append({
                    "recommendation_id": rec["recommendation_id"],
                    "rank": rec["rank"],
                    "score": rec["score"],
                    "reason": rec["reason"],
                    "employee": {
                        "emp_id": emp["emp_id"],
                        "name": f"{emp['first_name']} {emp['last_name']}",
                        "service_type": emp.get("service_type"),
                        "employee_type": emp.get("employee_type"),
                        "seniority": emp.get("seniority")
                    }
                })
        
        return jsonify({
            "shift": {
                "shift_id": shift.data["shift_id"],
                "date": shift.data["date"],
                "start_time": shift.data["shift_start_time"],
                "end_time": shift.data["shift_end_time"],
                "status": shift.data["shift_status"],
                "client": client
            },
            "original_employee": {
                "emp_id": shift.data.get("emp_id"),
                "reason": "On Leave"
            },
            "recommendations": enriched_recs
        }), 200
        
    except Exception as e:
        print(f"GET RECOMMENDATIONS ERROR: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/reassignments/pending", methods=["GET"])
def get_pending_reassignments():
    """
    Get all shifts with pending reassignment recommendations.
    Batched version — 4 queries total regardless of conflict count.
    """
    try:
        conflict_shifts = (
            supabase.table("shift")
            .select("*")
            .eq("shift_status", "⚠️ Conflicting Leave")
            .execute()
            .data or []
        )

        if not conflict_shifts:
            return jsonify({"pending_count": 0, "conflicts": []}), 200

        shift_ids  = [s["shift_id"]  for s in conflict_shifts]
        client_ids = list({s["client_id"] for s in conflict_shifts if s.get("client_id")})
        emp_ids    = list({s["emp_id"]    for s in conflict_shifts if s.get("emp_id")})

        # batch fetch recommendations count
        rec_rows = (
            supabase.table("shift_reassignment_recommendations")
            .select("shift_id")
            .in_("shift_id", shift_ids)
            .eq("status", "pending")
            .execute()
            .data or []
        )
        rec_counts = {}
        for r in rec_rows:
            sid = r["shift_id"]
            rec_counts[sid] = rec_counts.get(sid, 0) + 1

        # batch fetch clients
        clients = {}
        if client_ids:
            for c in (
                supabase.table("client")
                .select("client_id, first_name, last_name, name")
                .in_("client_id", client_ids)
                .execute()
                .data or []
            ):
                clients[c["client_id"]] = c

        # batch fetch employees
        emps = {}
        if emp_ids:
            for e in (
                supabase.table("employee_final")
                .select("emp_id, first_name, last_name")
                .in_("emp_id", emp_ids)
                .execute()
                .data or []
            ):
                emps[e["emp_id"]] = e

        conflicts = []
        for s in conflict_shifts:
            c   = clients.get(s.get("client_id")) or {}
            emp = emps.get(s.get("emp_id"))       or {}
            conflicts.append({
                "shift_id":              s["shift_id"],
                "date":                  s["date"],
                "start_time":            s["shift_start_time"],
                "end_time":              s["shift_end_time"],
                "client_name":           c.get("name") or f"{c.get('first_name','')} {c.get('last_name','')}".strip() or "Unknown",
                "original_employee":     f"{emp.get('first_name','')} {emp.get('last_name','')}".strip() or "Unassigned",
                "recommendations_count": rec_counts.get(s["shift_id"], 0),
            })

        return jsonify({"pending_count": len(conflicts), "conflicts": conflicts}), 200

    except Exception as e:
        print(f"GET PENDING REASSIGNMENTS ERROR: {e}")
        return jsonify({"error": str(e)}), 500
    
@app.route("/reassignment/approve", methods=["POST"])
def approve_reassignment():
    """
    Supervisor approves a recommended reassignment.
    """
    data = request.json
    
    shift_id = data.get("shift_id")
    recommended_emp_id = data.get("recommended_emp_id")
    
    if not shift_id or not recommended_emp_id:
        return jsonify({"error": "shift_id and recommended_emp_id required"}), 400
    
    try:
        # 1️⃣ Update shift assignment
        supabase.table("shift").update({
            "emp_id": recommended_emp_id,
            "shift_status": "Scheduled"
        }).eq("shift_id", shift_id).execute()

        # 1b️⃣ Pre-log scheduled hours so capacity reflects reassignment immediately
        shift_meta = supabase.table("shift") \
            .select("shift_start_time, shift_end_time, date") \
            .eq("shift_id", shift_id).single().execute().data
        if shift_meta:
            s = parse_datetime(shift_meta["shift_start_time"])
            e = parse_datetime(shift_meta["shift_end_time"])
            if s and e and e > s:
                hrs        = (e - s).total_seconds() / 3600
                shift_date = (shift_meta.get("date") or shift_meta.get("shift_start_time") or "")[:10]
                write_capacity_log(recommended_emp_id, shift_id, shift_date, hrs)
        
        # 2️⃣ Mark all recommendations as processed
        supabase.table("shift_reassignment_recommendations").update({
            "status": "approved"
        }).eq("shift_id", shift_id).eq("recommended_emp_id", recommended_emp_id).execute()
        
        supabase.table("shift_reassignment_recommendations").update({
            "status": "rejected"
        }).eq("shift_id", shift_id).neq("recommended_emp_id", recommended_emp_id).execute()
        
        # 3️⃣ Notify employee
        notify_employee(recommended_emp_id, {
            "type": "shift_assigned",
            "shift_id": shift_id,
            "message": "You have been assigned to cover a shift."
        })
        
        return jsonify({
            "success": True,
            "message": "Reassignment approved",
            "shift_id": shift_id,
            "new_emp_id": recommended_emp_id
        }), 200
        
    except Exception as e:
        print(f"APPROVE REASSIGNMENT ERROR: {e}")
        return jsonify({"error": str(e)}), 500
@app.route("/reassignment/reject-all", methods=["POST"])
def reject_all_recommendations():
    """
    Supervisor rejects all recommendations - will assign manually.
    """
    data = request.json
    shift_id = data.get("shift_id")
    
    if not shift_id:
        return jsonify({"error": "shift_id required"}), 400
    
    try:
        # Mark shift as unassigned for manual handling
        supabase.table("shift").update({
            "emp_id": None,
            "shift_status": "Unassigned"
        }).eq("shift_id", shift_id).execute()
        
        # Mark all recommendations as rejected
        supabase.table("shift_reassignment_recommendations").update({
            "status": "rejected"
        }).eq("shift_id", shift_id).execute()
        
        return jsonify({
            "success": True,
            "message": "All recommendations rejected. Shift marked for manual assignment."
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def assign_tasks_with_location(changes):
    """
    Enhanced version of assign_tasks that respects employee locations.
    """
    for ch in changes["new_clients"]:
        shift_id = ch["shift_id"]
        shift_location = ch.get("_location")  # Location tag from leave_processing

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

        # 2️⃣ Get eligible employees
        employeetab = get_employees_for_shift(ch["date"])
        
        # Calculate duration
        incoming_start = parse_datetime(ch["shift_start_time"])
        incoming_end = parse_datetime(ch["shift_end_time"])
        incoming_duration = (incoming_end - incoming_start).total_seconds() / 3600

        eligible = []
        for e in employeetab:
            # ✅ TIME AVAILABILITY CHECK
            is_available = overlaps(
                e, ch["date"], ch["shift_start_time"], ch["shift_end_time"],
                e["dsst"], e["dset"], e["ssst"], e["sset"], e["sdate"]
            )
            
            if not is_available:
                continue

            # ✅ LOCATION/SERVICE TYPE CHECK
            if shift_location:
                emp_full = supabase.table("employee_final") \
                    .select("service_type, department") \
                    .eq("emp_id", e["emp_id"]) \
                    .single() \
                    .execute()
                
                if emp_full.data:
                    emp_service = emp_full.data.get("service_type", "")
                    emp_dept = emp_full.data.get("department", "")
                    
                    # Location matching logic
                    location_match = False
                    
                    # Neeve locations
                    if shift_location in ["85 Neeve", "87 Neeve"]:
                        if "NV" in emp_dept or "Neeve" in emp_service:
                            location_match = True
                    
                    # Willow Place
                    elif "Willow" in shift_location:
                        if "WP" in emp_dept or "Willow" in emp_service:
                            location_match = True
                    
                    # Outreach
                    elif "Outreach" in shift_location:
                        if "OR" in emp_dept or "Outreach" in emp_service:
                            location_match = True
                    
                    # Assisted Living
                    elif "Assisted" in shift_location or "Supported" in shift_location:
                        if any(x in emp_dept for x in ["Assisted", "Supported", "ALS"]):
                            location_match = True
                    else:
                        # If no specific match found, allow as fallback
                        location_match = True
                    
                    if not location_match:
                        print(f"[SKIP] Employee {e['emp_id']} not eligible for location {shift_location}")
                        continue

            # ✅ CAPACITY CHECK
            daily_hours = get_daily_total_hours(e["emp_id"], ch["date"])
            weekly_hours = get_weekly_total_hours(e["emp_id"], ch["date"])

            emp = supabase.table("employee_final") \
                .select("max_daily_cap, max_weekly_cap") \
                .eq("emp_id", e["emp_id"]) \
                .single() \
                .execute()

            daily_cap = float(emp.data.get("max_daily_cap") or 15)
            weekly_cap = emp.data.get("max_weekly_cap") or 48

            if (daily_hours + incoming_duration) <= daily_cap and \
               (weekly_hours + incoming_duration) <= weekly_cap:
                eligible.append(e)

        if not eligible:
            print(f"[NO MATCH] No eligible employee for shift {shift_id} at location {shift_location}")
            continue

        # 3️⃣ Rank employees (Full Time > Part Time > Casual)
        EMPLOYMENT_PRIORITY = {
            "Full Time": 1,
            "Part Time": 2,
            "Casual": 3
        }
        
        eligible.sort(key=lambda e: EMPLOYMENT_PRIORITY.get(e.get("employee_type"), 99))
        best_employee = eligible[0]

        # 4️⃣ Time-based assignment logic
        shift_start = parse_datetime(ch["shift_start_time"])
        if not shift_start:
            print(f"[SKIP] Invalid shift_start_time for shift {shift_id}")
            continue

        hours_to_shift = (shift_start - datetime.utcnow().replace(tzinfo=timezone.utc)).total_seconds() / 3600

        # 🟢 AUTO-ASSIGN (<24h)
        if hours_to_shift < 24:
            supabase.table("shift").update({
                "emp_id": best_employee["emp_id"],
                "shift_status": "Scheduled"
            }).eq("shift_id", shift_id).execute()

            supabase.table("shift_offers").update({
                "status": "expired"
            }).eq("shift_id", shift_id).execute()

            notify_employee(best_employee["emp_id"], {
                "type": "shift_reassigned",
                "shift_id": shift_id,
                "message": "Shift reassigned due to colleague's leave."
            })

            print(f"[AUTO-ASSIGN] Shift {shift_id} → emp {best_employee['emp_id']}")
            continue

        # 🟠 OFFER FLOW (>=24h)
        supabase.table("shift_offers").upsert({
            "shift_id": shift_id,
            "emp_id": best_employee["emp_id"],
            "status": "sent",
            "offer_order": 1,
            "sent_at": utc_now_iso()
        }, on_conflict="shift_id,emp_id").execute()

        supabase.table("shift").update({
            "shift_status": "Offer Sent"
        }).eq("shift_id", shift_id).execute()

        notify_employee(best_employee["emp_id"], {
            "type": "shift_offer",
            "shift_id": shift_id,
            "message": "A shift is available due to colleague's leave."
        })

        print(f"[OFFER] Shift {shift_id} → emp {best_employee['emp_id']}")


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
        update_result = supabase.table("employee_final").update(data).eq("emp_id", emp_id).execute()

        return jsonify({"status": "success", "updated": update_result.data}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

SHIFT_CONVENTIONS = {
    "85 Neeve": {"day": "d", "noon": "n", "evening": "e"},
    "87 Neeve": {"day": "d", "noon": "n", "evening": "e"},
    "Willow Place": {"day": "D", "noon": "N", "evening": "E"},
    "Outreach": {"day": "O", "noon": "O", "evening": "O", "travel": "T"} 
}

SHIFT_TYPE_MAP = {
    "vacation": "vacation",
    "float": "float",
    "unavailability": "unavailable",
    "flw-training": "flw-training",
    "gil-training": "gil",
    "flw-rtw": "flw-rtw",
    "open": "open",
    "travel": "travel",    # New
    "outreach": "outreach",
    "leave": "leave",
    "sick": "sick",
    "bereavement": "bereavement",
    "training": "flw-training" # Added as a safety fallback
}

def flexible_parse(t_str):
    if not t_str: return None
    try:
        # Standardize: Replace 'T' with space, remove 'Z', ignore offset
        clean = str(t_str).replace('T', ' ').replace('Z', '').split('+')[0]
        # Try parsing with time first
        if ' ' in clean:
            return datetime.strptime(clean.split('.')[0], "%Y-%m-%d %H:%M:%S")
        # Fallback to just date
        return datetime.strptime(clean, "%Y-%m-%d")
    except Exception:
        return None

@app.route("/masterSchedule/<service>", methods=["GET"])
def masterSchedule(service: str):
    try:
        from urllib.parse import unquote
        # 1. Standardize the service name from URL encoding
        decoded_service = unquote(service).strip()
        
        # 2. Fetch employees for this service
        emp_res = supabase.table("employee_final").select("*").ilike("service_type", decoded_service).execute()
        employees = emp_res.data or []
        
        if not employees:
            return jsonify({"weeks": [], "employees": []}), 200

        start_date = date.today()
        dates = [start_date + timedelta(days=i) for i in range(42)]
        output_employees = []

        for emp in employees:
            emp_id = emp.get("emp_id")
            
            # Fetch shifts and leaves within the 6-week window
            shift_res = supabase.table("daily_shift").select("*").eq("emp_id", emp_id).gte("shift_date", dates[0].isoformat()).lte("shift_date", dates[-1].isoformat()).execute()
            leave_res = supabase.table("leaves").select("*").eq("emp_id", emp_id).gte("leave_start_date", dates[0].isoformat()).lte("leave_end_date", dates[-1].isoformat()).execute()
            
            shift_map = {s.get("shift_date"): s for s in (shift_res.data or [])}
            
            # 3. Process Leaves (Priority overlay)
            leave_map = {}
            for leave in (leave_res.data or []):
                l_start = flexible_parse(leave.get("leave_start_date"))
                l_end = flexible_parse(leave.get("leave_end_date"))
                if l_start and l_end:
                    curr = l_start.date()
                    stop = l_end.date()
                    while curr <= stop:
                        leave_map[curr] = leave
                        curr += timedelta(days=1)

            emp_calendar = []
            for d in dates:
                # Check for Leave first
                if d in leave_map:
                    l_val = leave_map[d].get("leave_type", "").lower()
                    s_key = "sick" if "sick" in l_val else ("vacation" if "vacation" in l_val else "leave")
                    emp_calendar.append({
                        "time": "", 
                        "type": SHIFT_TYPE_MAP.get(s_key, "unavailable"), 
                        "training": False
                    })
                    continue

                # Check for regular Shifts
                shift = shift_map.get(d.isoformat())
                if not shift:
                    emp_calendar.append({"time": "", "type": "open", "training": False})
                    continue

                # 4. Process Shift Codes (Day/Noon/Evening)
                try:
                    s_dt = flexible_parse(shift.get("shift_start_time"))
                    e_dt = flexible_parse(shift.get("shift_end_time"))
                    
                    if not s_dt or not e_dt:
                        time_code = ""
                    elif decoded_service.lower() == "outreach":
                        time_code = f"{s_dt.strftime('%H:%M')}-{e_dt.strftime('%H:%M')}"
                    else:
                        # Determine Shift Convention code
                        noon = s_dt.replace(hour=12, minute=0, second=0)
                        evening = s_dt.replace(hour=18, minute=0, second=0)
                        code = "day" if e_dt <= noon else ("noon" if s_dt > noon and e_dt <= evening else "evening")
                        
                        # Safe dictionary lookup with a fallback
                        conv = SHIFT_CONVENTIONS.get(decoded_service, {"day": "d", "noon": "n", "evening": "e"})
                        time_code = conv.get(code, "?")
                except Exception:
                    time_code = "ERR"

                emp_calendar.append({
                    "id": shift.get("shift_id"),
                    "time": time_code,
                    "type": SHIFT_TYPE_MAP.get(shift.get("shift_type", "open"), "flw-rtw"),
                    "training": shift.get("training", False)
                })

            output_employees.append({
                "id": emp_id,
                "name": emp.get("first_name", "Unknown"),
                "address": emp.get("address", ""),
                "shifts": emp_calendar
            })

        return jsonify({
            "weeks": [d.strftime("%d-%b") for d in dates],
            "employees": output_employees
        })

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

def get_6_week_dates(start_date: date):
    """Generates a list of 42 date objects starting from the given date."""
    return [start_date + timedelta(days=i) for i in range(42)]

@app.route("/update_master_shift", methods=["POST"])
# def update_master_shift():
#     try:
#         data = request.get_json()

#         emp_id = data.get("emp_id")
#         shift_type = data.get("shift_type")
#         shift_date = data.get("shift_date")
#         start_time = data.get("shift_start_time")
#         end_time = data.get("shift_end_time")
#         prev_type = data.get("type")

#         if not emp_id or not shift_type or not shift_date:
#             return jsonify({"error": "Missing required fields"}), 400

#         start_dt = f"{shift_date} {start_time}"
#         end_dt = f"{shift_date} {end_time}"

#         DAILY_SHIFT_TYPES = {
#             "flw-rtw",
#             "flw-training",
#             "gil",
#             "float",
#             "open"
#         }

#         LEAVE_TYPES = {
#             "leave",
#             "vacation",
#             "sick",
#             "bereavement",
#             "unavailable"
#         }

#         if prev_type == "open":

#             # 🟢 DAILY SHIFT
#             if shift_type in DAILY_SHIFT_TYPES:
#                 supabase.table("daily_shift").insert({
#                     "emp_id": emp_id,
#                     "shift_date": shift_date,
#                     "shift_start_time": f"{shift_date}T{start_time}:00Z",
#                     "shift_end_time": f"{shift_date}T{end_time}:00Z",
#                     "shift_type": shift_type
#                 }).execute()

#             # 🔴 LEAVE
#             elif shift_type in LEAVE_TYPES:
#                 supabase.table("leaves").insert({
#                     "emp_id": emp_id,
#                     "leave_start_date": shift_date,
#                     "leave_end_date": shift_date,
#                     "leave_start_time": f"{shift_date}T{start_time}:00Z",
#                     "leave_end_time": f"{shift_date}T{end_time}:00Z",
#                     "leave_type": shift_type
#                 }).execute()
#         else:
#             supabase.table("daily_shift") \
#                 .delete() \
#                 .eq("emp_id", emp_id) \
#                 .eq("shift_date", shift_date) \
#                 .execute()

#             supabase.table("leaves") \
#                 .delete() \
#                 .eq("emp_id", emp_id) \
#                 .eq("leave_start_date", shift_date) \
#                 .execute()

#             # Then insert updated version
#             if shift_type in LEAVE_TYPES:
#                 supabase.table("leaves").insert({
#                     "emp_id": emp_id,
#                     "leave_start_date": shift_date,
#                     "leave_end_date": shift_date,
#                     "leave_start_time": start_time,
#                     "leave_end_time": end_time,
#                     "leave_type": shift_type
#                 }).execute()
#             else:
#                 supabase.table("daily_shift").insert({
#                     "emp_id": emp_id,
#                     "shift_date": shift_date,
#                     "shift_start_time": f"{shift_date}T{start_time}:00Z",
#                     "shift_end_time": f"{shift_date}T{end_time}:00Z",
#                     "shift_type": shift_type
#                 }).execute()

#             return jsonify({"message": "Existing shift updated"}), 200
        

#         return jsonify({"message": "Shift updated successfully"}), 200

#     except Exception as e:
#         print("ERROR:", e)
#         return jsonify({"error": str(e)}), 500


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
                    "shift_start_time": f"{start_time.replace(' ','T')}Z",
                    "shift_end_time": f"{end_time.replace(' ','T')}Z",
                    "shift_type": shift_type
                }).execute()

            # 🔴 LEAVE
            elif shift_type in LEAVE_TYPES:
                supabase.table("leaves").insert({
                    "emp_id": emp_id,
                    "leave_start_date": shift_date,
                    "leave_end_date": shift_date,
                    "leave_start_time": start_time,
                    "leave_end_time": end_time,
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
                    "shift_start_time": f"{start_time.replace(' ','T')}Z",
                    "shift_end_time": f"{end_time.replace(' ','T')}Z",
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
        .table("employee_final")
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
            for e in supabase.table("employee_final")
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
        "response_time": utc_now_iso()
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
            "sent_at": utc_now_iso()
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


@app.route("/schedule/check-updates", methods=["GET"])
def check_schedule_updates():
    """
    Lightweight endpoint to check if schedule has changed.
    Returns timestamp of last modification.
    """
    try:
        # Get most recent shift modification
        recent_shift = supabase.table("shift") \
            .select("shift_id, shift_status") \
            .order("shift_id", desc=True) \
            .limit(1) \
            .execute()
        
        # Get most recent leave addition
        recent_leave = supabase.table("leaves") \
            .select("leave_id") \
            .order("leave_id", desc=True) \
            .limit(1) \
            .execute()
        
        return jsonify({
            "success": True,
            "last_shift_id": recent_shift.data[0]["shift_id"] if recent_shift.data else 0,
            "last_leave_id": recent_leave.data[0]["leave_id"] if recent_leave.data else 0,
            "timestamp": utc_now_iso()
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
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
        for e in supabase.table("employee_final")
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



# ============================================
# FLW EMPLOYEE SCHEDULE API ENDPOINTS
# Add these to your Flask app.py file
# ============================================

# ============================================
# FLW EMPLOYEE SCHEDULE API ENDPOINTS
# Add these to your Flask app.py file
# ============================================

@app.route("/employee/<int:emp_id>/schedule", methods=["GET"])
def get_employee_schedule(emp_id):
    """
    Get employee schedule for a specific week
    Query params:
    - week_offset: integer (0 = current week, 1 = next week, -1 = previous week)
    
    Returns: Weekly schedule with client shifts
    """
    try:
        week_offset = int(request.args.get("week_offset", 0))
        
        # Calculate date range for the requested week
        today = datetime.utcnow().date()
        current_day = today.weekday()  # Monday = 0, Sunday = 6
        
        # Get Monday of the requested week
        monday = today - timedelta(days=current_day) + timedelta(weeks=week_offset)
        sunday = monday + timedelta(days=6)
        
        monday_str = monday.isoformat()
        sunday_str = sunday.isoformat()
        
        # Fetch daily shifts for this employee in the date range
        daily_shifts_res = (
            supabase.table("daily_shift")
            .select("*")
            .eq("emp_id", emp_id)
            .gte("shift_date", monday_str)
            .lte("shift_date", sunday_str)
            .execute()
        )
        
        # Fetch assigned client shifts in the date range
        client_shifts_res = (
            supabase.table("shift")
            .select("""
                shift_id,
                client_id,
                date,
                shift_start_time,
                shift_end_time,
                shift_status,
                shift_type
            """)
            .eq("emp_id", emp_id)
            .gte("date", monday_str)
            .lte("date", sunday_str)
            .execute()
        )
        
        # Get client names for the shifts
        client_shifts = client_shifts_res.data or []
        client_ids = list({s["client_id"] for s in client_shifts if s.get("client_id")})
        
        clients = {}
        if client_ids:
            clients_res = (
                supabase.table("client")
                .select("client_id, first_name, last_name, name, address_line1")
                .in_("client_id", client_ids)
                .execute()
            )
            clients = {
                c["client_id"]: {
                    "name": c.get("name") or f'{c["first_name"]} {c["last_name"]}',
                    "location": c.get("address_line1")
                }
                for c in clients_res.data
            }
        
        # Format the response
        schedule = []
        for shift in client_shifts:
            client_info = clients.get(shift["client_id"], {"name": "Unknown", "location": ""})
            
            # Parse times for display - handle multiple formats
            def safe_parse_time(time_str):
                if not time_str:
                    return ""
                try:
                    # Try ISO format with Z
                    if 'T' in str(time_str):
                        dt = datetime.fromisoformat(str(time_str).replace('Z', '+00:00'))
                        return dt.strftime("%H:%M")
                    # Try space-separated format
                    elif ' ' in str(time_str):
                        dt = datetime.strptime(str(time_str).split('.')[0], "%Y-%m-%d %H:%M:%S")
                        return dt.strftime("%H:%M")
                    # Just time format
                    else:
                        return str(time_str)[:5]  # Return HH:MM
                except Exception as e:
                    print(f"Time parse error for '{time_str}': {e}")
                    return ""
            
            schedule.append({
                "shift_id": shift["shift_id"],
                "date": shift["date"],
                "start_time": safe_parse_time(shift["shift_start_time"]),
                "end_time": safe_parse_time(shift["shift_end_time"]),
                "client_name": client_info["name"],
                "client_id": shift["client_id"],
                "location": client_info["location"],
                "shift_type": shift.get("shift_type", "regular"),
                "shift_status": shift["shift_status"]
            })
        
        return jsonify({
            "success": True,
            "week_start": monday_str,
            "week_end": sunday_str,
            "schedules": schedule
        }), 200
        
    except Exception as e:
        print(f"GET EMPLOYEE SCHEDULE ERROR: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/employee/<int:emp_id>/upcoming-shifts", methods=["GET"])
def get_employee_upcoming_shifts(emp_id):
    """
    Get employee's upcoming shifts (next 30 days)
    Useful for showing what's coming up beyond the current week
    """
    try:
        today = datetime.utcnow().date().isoformat()
        end_date = (datetime.utcnow() + timedelta(days=30)).date().isoformat()
        
        # Fetch upcoming shifts
        shifts_res = (
            supabase.table("shift")
            .select("""
                shift_id,
                client_id,
                date,
                shift_start_time,
                shift_end_time,
                shift_status,
                shift_type
            """)
            .eq("emp_id", emp_id)
            .gte("date", today)
            .lte("date", end_date)
            .order("date")
            .order("shift_start_time")
            .execute()
        )
        
        shifts = shifts_res.data or []
        
        # Get client names
        client_ids = list({s["client_id"] for s in shifts if s.get("client_id")})
        
        clients = {}
        if client_ids:
            clients_res = (
                supabase.table("client")
                .select("client_id, first_name, last_name, name, address_line1")
                .in_("client_id", client_ids)
                .execute()
            )
            clients = {
                c["client_id"]: {
                    "name": c.get("name") or f'{c["first_name"]} {c["last_name"]}',
                    "location": c.get("address_line1")
                }
                for c in clients_res.data
            }
        
        # Format response
        upcoming = []
        for shift in shifts:
            client_info = clients.get(shift["client_id"], {"name": "Unknown", "location": ""})
            
            # Safe time parsing
            def safe_parse_time(time_str):
                if not time_str:
                    return ""
                try:
                    if 'T' in str(time_str):
                        dt = datetime.fromisoformat(str(time_str).replace('Z', '+00:00'))
                        return dt.strftime("%H:%M")
                    elif ' ' in str(time_str):
                        dt = datetime.strptime(str(time_str).split('.')[0], "%Y-%m-%d %H:%M:%S")
                        return dt.strftime("%H:%M")
                    else:
                        return str(time_str)[:5]
                except Exception as e:
                    print(f"Time parse error: {e}")
                    return ""
            
            upcoming.append({
                "shift_id": shift["shift_id"],
                "date": shift["date"],
                "start_time": safe_parse_time(shift["shift_start_time"]),
                "end_time": safe_parse_time(shift["shift_end_time"]),
                "client_name": client_info["name"],
                "location": client_info["location"],
                "shift_type": shift.get("shift_type", "regular"),
                "shift_status": shift["shift_status"]
            })
        
        return jsonify({
            "success": True,
            "upcoming_shifts": upcoming,
            "total": len(upcoming)
        }), 200
        
    except Exception as e:
        print(f"GET UPCOMING SHIFTS ERROR: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/employee/<int:emp_id>/schedule-summary", methods=["GET"])
def get_employee_schedule_summary(emp_id):
    """
    Get summary statistics for employee's schedule
    Returns total shifts, hours, and clients for current week
    """
    try:
        # Calculate current week range
        today = datetime.utcnow().date()
        monday = today - timedelta(days=today.weekday())
        sunday = monday + timedelta(days=6)
        
        monday_str = monday.isoformat()
        sunday_str = sunday.isoformat()
        
        # Fetch this week's shifts
        shifts_res = (
            supabase.table("shift")
            .select("shift_id, client_id, shift_start_time, shift_end_time")
            .eq("emp_id", emp_id)
            .gte("date", monday_str)
            .lte("date", sunday_str)
            .execute()
        )
        
        shifts = shifts_res.data or []
        
        # Calculate total hours
        total_hours = 0
        for shift in shifts:
            try:
                # Handle different time formats
                start_str = shift["shift_start_time"]
                end_str = shift["shift_end_time"]
                
                # Parse start time
                if 'T' in str(start_str):
                    start = datetime.fromisoformat(str(start_str).replace('Z', '+00:00'))
                elif ' ' in str(start_str):
                    start = datetime.strptime(str(start_str).split('.')[0], "%Y-%m-%d %H:%M:%S")
                else:
                    continue
                
                # Parse end time
                if 'T' in str(end_str):
                    end = datetime.fromisoformat(str(end_str).replace('Z', '+00:00'))
                elif ' ' in str(end_str):
                    end = datetime.strptime(str(end_str).split('.')[0], "%Y-%m-%d %H:%M:%S")
                else:
                    continue
                
                hours = (end - start).total_seconds() / 3600
                total_hours += hours
            except Exception as e:
                print(f"Error calculating hours: {e}")
                continue
        
        # Count unique clients
        unique_clients = len(set(s["client_id"] for s in shifts if s.get("client_id")))
        
        return jsonify({
            "success": True,
            "week_start": monday_str,
            "week_end": sunday_str,
            "total_shifts": len(shifts),
            "total_hours": round(total_hours, 1),
            "unique_clients": unique_clients
        }), 200
        
    except Exception as e:
        print(f"GET SCHEDULE SUMMARY ERROR: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/leaves', methods=['GET'])
def get_leaves():
    date = request.args.get('date')
    if date:
        leaves = supabase.table("leaves") \
            .select("*") \
            .lte("leave_start_date", date) \
            .gte("leave_end_date", date) \
            .execute()
    else:
        leaves = supabase.table("leaves").select("*").execute()
    
    return jsonify(leaves.data or [])

# ─── NEW: capacity + heat-map endpoints ──────────────────────────────────────

@app.route("/schedule/capacity", methods=["GET"])
def schedule_capacity():
    date_param    = request.args.get("date", datetime.utcnow().date().isoformat())
    service_param = request.args.get("service")

    emp_q = supabase.table("employee_final").select(
        "emp_id, first_name, last_name, max_daily_cap, max_weekly_cap, min_daily_cap, ot_weekly_cap, service_type"
    )
    if service_param:
        emp_q = emp_q.ilike("service_type", f"%{service_param}%")

    employees  = emp_q.execute().data or []
    all_shifts = supabase.table("shift").select(
        "shift_id, emp_id, date, shift_start_time, shift_end_time"
    ).execute().data or []

    try:
        req_date = datetime.strptime(date_param, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        req_date = datetime.utcnow().replace(tzinfo=timezone.utc)

    week_mon = req_date - timedelta(days=req_date.weekday())
    week_sun = week_mon + timedelta(days=6)

    shifts_by_emp = {}
    for s in all_shifts:
        eid = s.get("emp_id")
        if eid:
            shifts_by_emp.setdefault(eid, []).append(s)

    def _hrs(s):
        start = parse_datetime(s.get("shift_start_time"))
        end   = parse_datetime(s.get("shift_end_time"))
        return (end - start).total_seconds() / 3600 if start and end and end > start else 0.0

    result = []
    for emp in employees:
        eid        = emp["emp_id"]
        daily_cap  = float(emp.get("max_daily_cap")  or 13)
        weekly_cap = float(emp.get("max_weekly_cap") or 48)
        ot_cap     = float(emp.get("ot_weekly_cap")  or weekly_cap)
        min_daily  = float(emp.get("min_daily_cap")  or 0)

        daily_used = weekly_used = 0.0
        for s in shifts_by_emp.get(eid, []):
            hrs  = _hrs(s)
            sraw = (s.get("date") or s.get("shift_start_time") or "")[:10]
            if sraw == date_param:
                daily_used += hrs
            sdt = parse_datetime(s.get("date") or s.get("shift_start_time"))
            if sdt:
                sdt = sdt.replace(tzinfo=timezone.utc) if sdt.tzinfo is None else sdt
                if week_mon <= sdt <= week_sun:
                    weekly_used += hrs

        daily_pct  = round(min(daily_used  / daily_cap  * 100, 100), 1) if daily_cap  else 0
        weekly_pct = round(min(weekly_used / weekly_cap * 100, 100), 1) if weekly_cap else 0

        status = ("over"      if daily_used > daily_cap or weekly_used > weekly_cap
             else "ot"        if weekly_used > ot_cap
             else "warning"   if daily_pct >= 80 or weekly_pct >= 80
             else "under_min" if daily_used < min_daily and min_daily > 0
             else "ok")

        result.append({
            "emp_id":       eid,
            "name":         f"{emp['first_name']} {emp.get('last_name','')}".strip(),
            "service_type": emp.get("service_type"),
            "daily_used":   round(daily_used,  2),
            "daily_cap":    daily_cap,
            "daily_pct":    daily_pct,
            "weekly_used":  round(weekly_used, 2),
            "weekly_cap":   weekly_cap,
            "weekly_pct":   weekly_pct,
            "ot_threshold": ot_cap,
            "is_ot":        weekly_used > ot_cap,
            "status":       status,
        })

    result.sort(key=lambda x: (0 if x["status"] == "over" else 1, -x["daily_pct"]))
    return jsonify(result), 200


@app.route("/schedule/heat-map", methods=["GET"])
def schedule_heat_map():
    days_param    = min(int(request.args.get("days", 14)), 42)
    service_param = request.args.get("service")
    today         = datetime.utcnow().date()
    date_range    = [(today + timedelta(days=i)).isoformat() for i in range(days_param)]
    d_start, d_end = date_range[0], date_range[-1]

    shifts = (
        supabase.table("shift")
        .select("shift_id, emp_id, client_id, date, shift_start_time, shift_end_time, shift_status")
        .gte("date", d_start)
        .lte("date", d_end)
        .execute()
        .data or []
    )

    emp_q = supabase.table("employee_final").select("emp_id", count="exact")
    if service_param:
        emp_q = emp_q.ilike("service_type", f"%{service_param}%")
    total_employees = emp_q.execute().count or 1

    by_date = {d: [] for d in date_range}
    for s in shifts:
        d = (s.get("date") or s.get("shift_start_time") or "")[:10]
        if d in by_date:
            by_date[d].append(s)

    def _hrs(s):
        start = parse_datetime(s.get("shift_start_time"))
        end   = parse_datetime(s.get("shift_end_time"))
        return (end - start).total_seconds() / 3600 if start and end and end > start else 0.0

    result = []
    for d in date_range:
        day_shifts    = by_date[d]
        total_hrs     = sum(_hrs(s) for s in day_shifts)
        emp_set       = {s["emp_id"]    for s in day_shifts if s.get("emp_id")}
        client_set    = {s["client_id"] for s in day_shifts if s.get("client_id")}
        has_gaps      = any(s["shift_status"] == "Unassigned"          for s in day_shifts)
        has_conflicts = any(s["shift_status"] == "⚠️ Conflicting Leave" for s in day_shifts)
        coverage_pct  = round(min(len(emp_set) / total_employees * 100, 100), 1)
        dt = datetime.strptime(d, "%Y-%m-%d")
        result.append({
            "date":          d,
            "weekday":       dt.strftime("%a"),
            "is_weekend":    dt.weekday() >= 5,
            "total_hours":   round(total_hrs, 1),
            "emp_count":     len(emp_set),
            "client_count":  len(client_set),
            "shift_count":   len(day_shifts),
            "coverage_pct":  coverage_pct,
            "has_gaps":      has_gaps,
            "has_conflicts": has_conflicts,
        })

    return jsonify(result), 200


@app.route("/employee/<int:emp_id>/capacity-timeline", methods=["GET"])
def employee_capacity_timeline(emp_id):
    weeks_param = min(int(request.args.get("weeks", 6)), 12)

    emp = (
        supabase.table("employee_final")
        .select("emp_id, first_name, last_name, max_daily_cap, max_weekly_cap, ot_weekly_cap, min_weekly_cap")
        .eq("emp_id", emp_id)
        .single()
        .execute()
        .data
    )
    if not emp:
        return jsonify({"error": "Employee not found"}), 404

    weekly_cap = float(emp.get("max_weekly_cap") or 48)
    ot_cap     = float(emp.get("ot_weekly_cap")  or weekly_cap)
    min_weekly = float(emp.get("min_weekly_cap") or 0)

    today  = datetime.utcnow().date()
    mon0   = today - timedelta(days=today.weekday())

    all_shifts = (
        supabase.table("shift")
        .select("shift_start_time, shift_end_time, date")
        .eq("emp_id", emp_id)
        .execute()
        .data or []
    )

    def _hrs(s):
        start = parse_datetime(s.get("shift_start_time"))
        end   = parse_datetime(s.get("shift_end_time"))
        return (end - start).total_seconds() / 3600 if start and end and end > start else 0.0

    timeline = []
    for i in range(-1, weeks_param - 1):
        w_start = mon0 + timedelta(weeks=i)
        w_end   = w_start + timedelta(days=6)
        w_hrs   = sum(
            _hrs(s) for s in all_shifts
            if w_start.isoformat() <= (s.get("date") or s.get("shift_start_time") or "")[:10] <= w_end.isoformat()
        )
        timeline.append({
            "week_start":      w_start.isoformat(),
            "week_end":        w_end.isoformat(),
            "label":           f"Wk {w_start.strftime('%b %d')}",
            "hours":           round(w_hrs, 2),
            "cap":             weekly_cap,
            "ot_threshold":    ot_cap,
            "min_weekly":      min_weekly,
            "pct":             round(min(w_hrs / weekly_cap * 100, 100), 1) if weekly_cap else 0,
            "is_ot":           w_hrs > ot_cap,
            "is_over":         w_hrs > weekly_cap,
            "under_min":       w_hrs < min_weekly and min_weekly > 0,
            "is_current_week": i == 0,
        })

    return jsonify({
        "emp_id":       emp["emp_id"],
        "name":         f"{emp['first_name']} {emp.get('last_name','')}".strip(),
        "weekly_cap":   weekly_cap,
        "ot_threshold": ot_cap,
        "min_weekly":   min_weekly,
        "timeline":     timeline,
    }), 200

# ─── CAPACITY LOG READ ENDPOINTS ─────────────────────────────────────────────

@app.route("/employee/<int:emp_id>/capacity", methods=["GET"])
def get_employee_capacity(emp_id):
    """
    GET /employee/<id>/capacity?date=YYYY-MM-DD

    Returns:
      - daily:   hours today vs daily cap
      - weekly:  hours this week vs weekly cap + OT flag
      - total:   all-time hours from the log (payroll running total)
      - payroll_period: hours between ?from= and ?to= for custom payroll windows
    """
    date_param = request.args.get("date", datetime.utcnow().date().isoformat())
    from_param = request.args.get("from")   # optional payroll window start
    to_param   = request.args.get("to")     # optional payroll window end

    emp = supabase.table("employee_final") \
        .select("emp_id, first_name, last_name, max_daily_cap, max_weekly_cap, ot_weekly_cap, min_daily_cap, min_weekly_cap") \
        .eq("emp_id", emp_id).single().execute().data

    if not emp:
        return jsonify({"error": "Employee not found"}), 404

    daily_cap  = float(emp.get("max_daily_cap")  or 13)
    weekly_cap = float(emp.get("max_weekly_cap") or 48)
    ot_cap     = float(emp.get("ot_weekly_cap")  or weekly_cap)
    min_daily  = float(emp.get("min_daily_cap")  or 0)
    min_weekly = float(emp.get("min_weekly_cap") or 0)

    # ── window boundaries ─────────────────────────────────────────
    try:
        req_date = datetime.strptime(date_param, "%Y-%m-%d")
    except ValueError:
        req_date = datetime.utcnow()

    week_mon = req_date - timedelta(days=req_date.weekday())
    week_sun = week_mon + timedelta(days=6)

    # ── fetch log rows ────────────────────────────────────────────
    all_logs = supabase.table("employee_capacity_log") \
        .select("log_date, hours_worked, is_overtime, ot_hours, shift_id") \
        .eq("emp_id", emp_id) \
        .order("log_date", desc=True) \
        .execute().data or []

    # daily
    daily_logs  = [r for r in all_logs if r["log_date"] == date_param]
    daily_used  = sum(float(r["hours_worked"]) for r in daily_logs)

    # weekly
    weekly_logs  = [r for r in all_logs
                    if week_mon.strftime("%Y-%m-%d") <= r["log_date"] <= week_sun.strftime("%Y-%m-%d")]
    weekly_used  = sum(float(r["hours_worked"]) for r in weekly_logs)
    weekly_ot    = sum(float(r["ot_hours"])     for r in weekly_logs)

    # total (all-time payroll running sum)
    total_hours = sum(float(r["hours_worked"]) for r in all_logs)
    total_ot    = sum(float(r["ot_hours"])     for r in all_logs)

    # optional payroll window
    payroll_data = None
    if from_param and to_param:
        period_logs   = [r for r in all_logs if from_param <= r["log_date"] <= to_param]
        payroll_hours = sum(float(r["hours_worked"]) for r in period_logs)
        payroll_ot    = sum(float(r["ot_hours"])     for r in period_logs)
        payroll_data  = {
            "from":            from_param,
            "to":              to_param,
            "hours":           round(payroll_hours, 2),
            "ot_hours":        round(payroll_ot,    2),
            "regular_hours":   round(payroll_hours - payroll_ot, 2),
            "days_worked":     len({r["log_date"] for r in period_logs}),
        }

    return jsonify({
        "emp_id":    emp_id,
        "name":      f"{emp['first_name']} {emp.get('last_name','')}".strip(),
        "daily": {
            "date":        date_param,
            "used":        round(daily_used,  2),
            "cap":         daily_cap,
            "remain":      round(max(daily_cap - daily_used, 0), 2),
            "pct":         round(min(daily_used / daily_cap * 100, 100), 1) if daily_cap else 0,
            "is_over":     daily_used > daily_cap,
            "under_min":   daily_used < min_daily and min_daily > 0,
            "min_cap":     min_daily,
        },
        "weekly": {
            "week_start":  week_mon.strftime("%Y-%m-%d"),
            "week_end":    week_sun.strftime("%Y-%m-%d"),
            "used":        round(weekly_used, 2),
            "cap":         weekly_cap,
            "remain":      round(max(weekly_cap - weekly_used, 0), 2),
            "pct":         round(min(weekly_used / weekly_cap * 100, 100), 1) if weekly_cap else 0,
            "is_over":     weekly_used > weekly_cap,
            "is_ot":       weekly_used > ot_cap,
            "ot_threshold":ot_cap,
            "ot_hours":    round(weekly_ot,   2),
            "under_min":   weekly_used < min_weekly and min_weekly > 0,
            "min_cap":     min_weekly,
        },
        "total": {
            "all_time_hours":   round(total_hours, 2),
            "all_time_ot_hours":round(total_ot,    2),
            "regular_hours":    round(total_hours - total_ot, 2),
            "log_entries":      len(all_logs),
        },
        "payroll_period": payroll_data,
    }), 200


@app.route("/capacity/team", methods=["GET"])
def get_team_capacity():
    """
    GET /capacity/team?date=YYYY-MM-DD&service=<location>

    Snapshot of every employee's daily + weekly capacity right now.
    Sorted: over-cap first, then OT, then warning, then ok.
    """
    date_param    = request.args.get("date", datetime.utcnow().date().isoformat())
    service_param = request.args.get("service")

    emp_q = supabase.table("employee_final").select(
        "emp_id, first_name, last_name, max_daily_cap, max_weekly_cap, ot_weekly_cap, min_daily_cap, min_weekly_cap, service_type"
    )
    if service_param:
        emp_q = emp_q.ilike("service_type", f"%{service_param}%")
    employees = emp_q.execute().data or []

    if not employees:
        return jsonify([]), 200

    emp_ids = [e["emp_id"] for e in employees]

    try:
        req_date = datetime.strptime(date_param, "%Y-%m-%d")
    except ValueError:
        req_date = datetime.utcnow()
    week_mon = req_date - timedelta(days=req_date.weekday())
    week_sun = week_mon + timedelta(days=6)

    # Batch fetch all relevant log rows in ONE query
    logs = supabase.table("employee_capacity_log") \
        .select("emp_id, log_date, hours_worked, ot_hours") \
        .in_("emp_id", emp_ids) \
        .gte("log_date", week_mon.strftime("%Y-%m-%d")) \
        .lte("log_date", week_sun.strftime("%Y-%m-%d")) \
        .execute().data or []

    # index by emp_id
    logs_by_emp = {}
    for r in logs:
        logs_by_emp.setdefault(r["emp_id"], []).append(r)

    STATUS_ORDER = {"over": 0, "ot": 1, "warning": 2, "under_min": 3, "ok": 4}
    result = []

    for emp in employees:
        eid        = emp["emp_id"]
        daily_cap  = float(emp.get("max_daily_cap")  or 13)
        weekly_cap = float(emp.get("max_weekly_cap") or 48)
        ot_cap     = float(emp.get("ot_weekly_cap")  or weekly_cap)
        min_daily  = float(emp.get("min_daily_cap")  or 0)
        min_weekly = float(emp.get("min_weekly_cap") or 0)

        emp_logs   = logs_by_emp.get(eid, [])
        daily_used = sum(float(r["hours_worked"]) for r in emp_logs if r["log_date"] == date_param)
        weekly_used= sum(float(r["hours_worked"]) for r in emp_logs)
        weekly_ot  = sum(float(r["ot_hours"])     for r in emp_logs)

        status = ("over"      if daily_used > daily_cap or weekly_used > weekly_cap
             else "ot"        if weekly_used > ot_cap
             else "warning"   if (daily_used / daily_cap > 0.8 if daily_cap else False) or (weekly_used / weekly_cap > 0.8 if weekly_cap else False)
             else "under_min" if (daily_used < min_daily and min_daily > 0)
             else "ok")

        result.append({
            "emp_id":        eid,
            "name":          f"{emp['first_name']} {emp.get('last_name','')}".strip(),
            "service_type":  emp.get("service_type"),
            "status":        status,
            "daily": {
                "used":    round(daily_used,  2),
                "cap":     daily_cap,
                "pct":     round(min(daily_used / daily_cap * 100, 100), 1) if daily_cap else 0,
                "is_over": daily_used > daily_cap,
            },
            "weekly": {
                "used":         round(weekly_used, 2),
                "cap":          weekly_cap,
                "pct":          round(min(weekly_used / weekly_cap * 100, 100), 1) if weekly_cap else 0,
                "is_over":      weekly_used > weekly_cap,
                "is_ot":        weekly_used > ot_cap,
                "ot_hours":     round(weekly_ot, 2),
                "ot_threshold": ot_cap,
            },
        })

    result.sort(key=lambda x: (STATUS_ORDER.get(x["status"], 99), -x["weekly"]["used"]))
    return jsonify(result), 200


@app.route("/capacity/payroll-report", methods=["GET"])
def payroll_report():
    """
    GET /capacity/payroll-report?from=YYYY-MM-DD&to=YYYY-MM-DD&service=<location>

    Payroll export — one row per employee with:
      regular hours, OT hours, total hours, days worked
    for the given date window.
    """
    from_param    = request.args.get("from")
    to_param      = request.args.get("to")
    service_param = request.args.get("service")

    if not from_param or not to_param:
        return jsonify({"error": "from and to date params required"}), 400

    emp_q = supabase.table("employee_final").select(
        "emp_id, first_name, last_name, payroll_no, employee_type, service_type, salary_base, ot_weekly_cap"
    )
    if service_param:
        emp_q = emp_q.ilike("service_type", f"%{service_param}%")
    employees = emp_q.execute().data or []

    if not employees:
        return jsonify({"report": [], "period": {"from": from_param, "to": to_param}}), 200

    emp_ids = [e["emp_id"] for e in employees]

    logs = supabase.table("employee_capacity_log") \
        .select("emp_id, log_date, hours_worked, ot_hours, shift_id") \
        .in_("emp_id", emp_ids) \
        .gte("log_date", from_param) \
        .lte("log_date", to_param) \
        .execute().data or []

    logs_by_emp = {}
    for r in logs:
        logs_by_emp.setdefault(r["emp_id"], []).append(r)

    report = []
    for emp in employees:
        eid       = emp["emp_id"]
        emp_logs  = logs_by_emp.get(eid, [])
        total_hrs = sum(float(r["hours_worked"]) for r in emp_logs)
        ot_hrs    = sum(float(r["ot_hours"])     for r in emp_logs)
        reg_hrs   = total_hrs - ot_hrs
        days      = len({r["log_date"] for r in emp_logs})

        report.append({
            "emp_id":        eid,
            "payroll_no":    emp.get("payroll_no"),
            "name":          f"{emp['first_name']} {emp.get('last_name','')}".strip(),
            "service_type":  emp.get("service_type"),
            "employee_type": emp.get("status"),
            "regular_hours": round(reg_hrs,   2),
            "ot_hours":      round(ot_hrs,    2),
            "total_hours":   round(total_hrs, 2),
            "days_worked":   days,
            "shifts_logged": len(emp_logs),
        })

    report.sort(key=lambda x: x["name"])
    return jsonify({
        "period":        {"from": from_param, "to": to_param},
        "generated_at":  datetime.utcnow().isoformat() + "Z",
        "employee_count":len(report),
        "report":        report,
    }), 200

# --- Run ---
if __name__ == '__main__':
    app.run(debug=True)