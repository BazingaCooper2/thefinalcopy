import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import EmployeeAttachments from "./EmployeeAttachments.js";
import EmployeeUnavailability from "./EmployeeUnavailability.js";
import EmployeeAvailability from "./EmployeeAvailability.js";
import EmployeeCustomPayRates from "./EmployeeCustomPayRates.js";
import EmployeeEmploymentSettings from "./EmployeeSettings.js";
import NotificationSettings from "./EmployeeNotification.js";
import API_URL from '../config/api';

const EmployeeDetailsEach = () => {
    const { id } = useParams();

    const [employee, setEmployee] = useState(null);
    const [shifts, setShifts] = useState([]);
    const [dailyShift, setDailyShift] = useState([]);
    const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
    const [resolution, setResolution] = useState(15);

    useEffect(() => {
        fetch(`${API_URL}/employees/${id}`)
            .then((res) => res.json())
            .then((data) => {
                setEmployee(data.employee[0] || null);
                setShifts(data.shift || []);
                setDailyShift(data.dailyshift || []);
            })
            .catch((err) => console.error("Error fetching employee:", err));
    }, [id]);

    const days = getWeekDays(weekStart);
    const hours = generateHours();

    // ---------------- UTILITIES ----------------
    function toMinutesOfDay(str) {
        if (!str) return 0;
        let timePart = str.includes("T") ? str.split("T")[1] : str.includes(" ") ? str.split(" ")[1] : str;
        const [h, m] = timePart.split(":").map(Number);
        return h * 60 + m;
    }

    function getPosition(timeStr) {
        return toMinutesOfDay(timeStr) - 7 * 60;
    }

    function changeWeek(amount) {
        const newDate = new Date(weekStart);
        newDate.setDate(newDate.getDate() + amount * 7);
        setWeekStart(newDate);
    }

    function generateHours() {
        let arr = [];
        for (let h = 7; h <= 22; h++) arr.push(`${String(h).padStart(2, "0")}:00`);
        return arr;
    }

    function getWeekStart(d) {
        const date = new Date(d);
        const day = date.getDay();
        return new Date(date.setDate(date.getDate() - day));
    }

    function getWeekDays(start) {
        const days = [];
        for (let i = 0; i < 14; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            days.push(d);
        }
        return days;
    }

    function formatDay(date) {
        return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    }

    function formatRange(start) {
        const end = new Date(start);
        end.setDate(start.getDate() + 13);
        return `${formatDay(start)} – ${formatDay(end)}`;
    }

    // ---------------- TAB STATE ----------------
    const [activeTab, setActiveTab] = useState("overview");
    const [activeSubTab, setActiveSubTab] = useState("availability");

    // ---------------- DAY COLUMN ----------------
    function DayColumn({ day, shifts }) {
        const dayStr = day.toISOString().slice(0, 10);
        const todaysShifts = shifts.filter(s => s.shift_start_time.slice(0, 10) === dayStr);
        return (
            <div className="ed-column-container">
                {todaysShifts.map((shift) => {
                    const top = getPosition(shift.shift_start_time);
                    const height = getPosition(shift.shift_end_time) - top;
                    return (
                        <OverlayTrigger
                            key={shift.shift_id}
                            placement="top"
                            overlay={
                                <Tooltip>
                                    {shift.shift_start_time.slice(11, 16)} – {shift.shift_end_time.slice(11, 16)}
                                    <br />Client ID: {shift.client_id}
                                </Tooltip>
                            }>
                            <div
                                className="ed-shift-block"
                                style={{ top, height, zIndex: 10, position: "absolute", cursor: "pointer" }}
                            />
                        </OverlayTrigger>
                    );
                })}
            </div>
        );
    }

    if (!employee) return (
        <div className="ed-loading">
            <div className="ed-spinner" />
            <span>Loading employee…</span>
        </div>
    );

    // Derived values
    const initials = `${employee.first_name?.[0] || ""}${employee.last_name?.[0] || ""}`;
    const fullName = `${employee.first_name} ${employee.last_name}`;
    const empType = employee.status || "Full Time";
    const typeColor = empType === "Full Time" ? "#10b981" : empType === "Part Time" ? "#3b82f6" : "#f59e0b";
    const statusColor = employee.Employee_status === "Active" ? "#10b981" : "#ef4444";
    const weeklyCapPct = employee.max_weekly_cap ? Math.min(Math.round((shifts.length * 4) / employee.max_weekly_cap * 100), 100) : 0;

    const tabs = [
        { key: "overview", label: "Overview", icon: "bi-person-lines-fill" },
        { key: "schedule", label: "Schedule", icon: "bi-calendar3" },
        { key: "employment", label: "Employment", icon: "bi-briefcase" },
    ];

    const employmentSubTabs = [
        { key: "availability", label: "Availability", icon: "bi-clock" },
        { key: "unavailability", label: "Leave & Unavailability", icon: "bi-calendar-x" },
        { key: "custom_pay_rates", label: "Pay Rates", icon: "bi-currency-dollar" },
        { key: "attachments", label: "Attachments", icon: "bi-paperclip" },
        { key: "settings", label: "Settings", icon: "bi-gear" },
        { key: "notification", label: "Notifications", icon: "bi-bell" },
    ];

    return (
        <>
            <style>{`
                /* ── Design tokens ─────────────────────────────────── */
                :root {
                    --ed-bg: #f0f2f7;
                    --ed-surface: #ffffff;
                    --ed-surface2: #f7f8fc;
                    --ed-border: #e4e7f0;
                    --ed-text: #1a1d2e;
                    --ed-muted: #7c8db5;
                    --ed-accent: #4f46e5;
                    --ed-accent2: #818cf8;
                    --ed-radius: 14px;
                    --ed-radius-sm: 8px;
                    --ed-shadow: 0 2px 12px rgba(79,70,229,0.07);
                    --ed-shadow-lg: 0 8px 32px rgba(79,70,229,0.12);
                    font-family: 'DM Sans', 'Segoe UI', sans-serif;
                }

                /* ── Loading ───────────────────────────────────────── */
                .ed-loading {
                    display: flex; flex-direction: column; align-items: center;
                    justify-content: center; min-height: 60vh; gap: 16px;
                    color: var(--ed-muted); font-size: 0.9rem;
                }
                .ed-spinner {
                    width: 36px; height: 36px; border-radius: 50%;
                    border: 3px solid var(--ed-border);
                    border-top-color: var(--ed-accent);
                    animation: ed-spin 0.8s linear infinite;
                }
                @keyframes ed-spin { to { transform: rotate(360deg); } }

                /* ── Layout ────────────────────────────────────────── */
                .ed-wrap { max-width: 1200px; margin: 0 auto; padding: 28px 20px; }

                /* ── Profile Card ──────────────────────────────────── */
                .ed-profile-card {
                    background: var(--ed-surface);
                    border: 1px solid var(--ed-border);
                    border-radius: var(--ed-radius);
                    box-shadow: var(--ed-shadow);
                    overflow: hidden;
                    margin-bottom: 24px;
                }
                .ed-profile-header {
                    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4f46e5 100%);
                    padding: 32px 32px 0;
                    position: relative;
                }
                .ed-avatar-row {
                    display: flex; align-items: flex-end; gap: 20px;
                    padding-bottom: 0;
                }
                .ed-avatar {
                    width: 76px; height: 76px; border-radius: 18px;
                    background: rgba(255,255,255,0.18);
                    border: 2px solid rgba(255,255,255,0.3);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 1.6rem; font-weight: 700; color: white;
                    letter-spacing: -1px; flex-shrink: 0;
                    backdrop-filter: blur(8px);
                }
                .ed-profile-info { flex: 1; padding-bottom: 20px; }
                .ed-profile-name {
                    font-size: 1.4rem; font-weight: 700; color: white;
                    margin: 0 0 6px; letter-spacing: -0.3px;
                }
                .ed-profile-meta {
                    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
                }
                .ed-badge {
                    display: inline-flex; align-items: center; gap: 5px;
                    padding: 3px 10px; border-radius: 20px; font-size: 0.72rem;
                    font-weight: 600; letter-spacing: 0.3px;
                }
                .ed-badge-white {
                    background: rgba(255,255,255,0.15);
                    color: rgba(255,255,255,0.9);
                    border: 1px solid rgba(255,255,255,0.2);
                }
                .ed-badge-status {
                    background: rgba(16,185,129,0.2);
                    color: #6ee7b7;
                    border: 1px solid rgba(16,185,129,0.3);
                }
                .ed-badge-inactive {
                    background: rgba(239,68,68,0.2);
                    color: #fca5a5;
                    border: 1px solid rgba(239,68,68,0.3);
                }
                .ed-sub-info {
                    margin-top: 8px; font-size: 0.8rem; color: rgba(255,255,255,0.55);
                    display: flex; gap: 16px; flex-wrap: wrap;
                }
                .ed-sub-info span { display: flex; align-items: center; gap: 5px; }

                /* ── Tabs ──────────────────────────────────────────── */
                .ed-tabs {
                    display: flex; gap: 0; padding: 0 32px;
                    border-top: 1px solid rgba(255,255,255,0.08);
                }
                .ed-tab {
                    display: flex; align-items: center; gap: 7px;
                    padding: 13px 18px; font-size: 0.82rem; font-weight: 600;
                    color: rgba(255,255,255,0.5); cursor: pointer;
                    border-bottom: 2px solid transparent; transition: all 0.2s;
                    background: none; border-left: none; border-right: none; border-top: none;
                    white-space: nowrap;
                }
                .ed-tab:hover { color: rgba(255,255,255,0.8); }
                .ed-tab.active {
                    color: white;
                    border-bottom-color: #818cf8;
                }

                /* ── Tab Body ──────────────────────────────────────── */
                .ed-tab-body { padding: 28px 32px; }

                /* ── Stat Cards ────────────────────────────────────── */
                .ed-stats-row {
                    display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 14px; margin-bottom: 24px;
                }
                .ed-stat-card {
                    background: var(--ed-surface2);
                    border: 1px solid var(--ed-border);
                    border-radius: var(--ed-radius-sm);
                    padding: 16px 18px;
                }
                .ed-stat-label {
                    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
                    letter-spacing: 0.6px; color: var(--ed-muted); margin-bottom: 6px;
                }
                .ed-stat-value {
                    font-size: 1.25rem; font-weight: 700; color: var(--ed-text);
                    letter-spacing: -0.5px;
                }
                .ed-stat-sub { font-size: 0.75rem; color: var(--ed-muted); margin-top: 2px; }

                /* ── Info Grid ─────────────────────────────────────── */
                .ed-info-grid {
                    display: grid; grid-template-columns: 1fr 1fr;
                    gap: 0; border: 1px solid var(--ed-border);
                    border-radius: var(--ed-radius-sm); overflow: hidden;
                }
                .ed-info-row {
                    display: contents;
                }
                .ed-info-row > div {
                    padding: 12px 16px;
                    border-bottom: 1px solid var(--ed-border);
                    font-size: 0.83rem;
                }
                .ed-info-row:last-child > div { border-bottom: none; }
                .ed-info-row > div:first-child {
                    border-right: 1px solid var(--ed-border);
                }
                .ed-info-key {
                    font-weight: 600; color: var(--ed-muted); font-size: 0.75rem;
                    text-transform: uppercase; letter-spacing: 0.4px;
                    margin-bottom: 2px;
                }
                .ed-info-val {
                    color: var(--ed-text); font-weight: 500;
                }

                /* ── Section heading ───────────────────────────────── */
                .ed-section-title {
                    font-size: 0.8rem; font-weight: 700; text-transform: uppercase;
                    letter-spacing: 0.7px; color: var(--ed-muted);
                    margin: 24px 0 12px; display: flex; align-items: center; gap: 8px;
                }
                .ed-section-title::after {
                    content: ''; flex: 1; height: 1px; background: var(--ed-border);
                }

                /* ── Cap bar ───────────────────────────────────────── */
                .ed-cap-bar-wrap { margin-top: 8px; }
                .ed-cap-bar-labels {
                    display: flex; justify-content: space-between;
                    font-size: 0.75rem; color: var(--ed-muted); margin-bottom: 5px;
                }
                .ed-cap-track {
                    height: 7px; background: var(--ed-border);
                    border-radius: 99px; overflow: hidden;
                }
                .ed-cap-fill {
                    height: 100%; border-radius: 99px;
                    transition: width 0.4s ease;
                    background: linear-gradient(90deg, #4f46e5, #818cf8);
                }

                /* ── Dept chips ────────────────────────────────────── */
                .ed-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
                .ed-chip {
                    padding: 4px 12px; border-radius: 20px; font-size: 0.75rem;
                    font-weight: 600; background: #ede9fe; color: #4f46e5;
                    border: 1px solid #c4b5fd;
                }

                /* ── Schedule Grid ─────────────────────────────────── */
                .ed-sched-controls {
                    display: flex; align-items: center; gap: 12px;
                    margin-bottom: 20px; flex-wrap: wrap;
                }
                .ed-sched-controls select {
                    padding: 6px 10px; border: 1px solid var(--ed-border);
                    border-radius: var(--ed-radius-sm); font-size: 0.8rem;
                    background: var(--ed-surface); color: var(--ed-text);
                }
                .ed-week-nav {
                    display: flex; align-items: center; gap: 10px; margin-left: auto;
                }
                .ed-week-btn {
                    width: 32px; height: 32px; border-radius: 8px;
                    border: 1px solid var(--ed-border); background: var(--ed-surface);
                    cursor: pointer; display: flex; align-items: center; justify-content: center;
                    font-size: 0.75rem; color: var(--ed-muted);
                    transition: all 0.15s;
                }
                .ed-week-btn:hover { background: var(--ed-accent); color: white; border-color: var(--ed-accent); }
                .ed-week-label { font-size: 0.82rem; font-weight: 600; color: var(--ed-text); white-space: nowrap; }

                .ed-schedule-grid { display: flex; flex-direction: column; border: 1px solid var(--ed-border); border-radius: var(--ed-radius-sm); overflow: hidden; }
                .ed-schedule-header { display: flex; border-bottom: 1px solid var(--ed-border); background: var(--ed-surface2); }
                .ed-time-col-h { width: 56px; flex-shrink: 0; }
                .ed-day-col-header {
                    flex: 1; min-width: 0; padding: 8px 4px;
                    text-align: center; font-size: 0.7rem; font-weight: 600;
                    color: var(--ed-muted); border-left: 1px solid var(--ed-border);
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .ed-schedule-body { display: flex; overflow-x: auto; }
                .ed-time-col {
                    width: 56px; flex-shrink: 0;
                    border-right: 1px solid var(--ed-border);
                }
                .ed-time-cell {
                    height: 60px; padding: 2px 6px; font-size: 0.65rem;
                    color: var(--ed-muted); border-bottom: 1px solid var(--ed-border);
                    display: flex; align-items: flex-start; justify-content: flex-end;
                }
                .ed-day-col { flex: 1; min-width: 80px; border-left: 1px solid var(--ed-border); }
                .ed-day-grid { position: relative; height: 900px; }
                .ed-column-container { position: absolute; inset: 0; }
                .ed-shift-block {
                    position: absolute; left: 2px; right: 2px;
                    background: linear-gradient(135deg, #4f46e5, #818cf8);
                    border-radius: 5px; opacity: 0.85;
                    transition: opacity 0.15s;
                }
                .ed-shift-block:hover { opacity: 1; }
                .ed-daily-shift {
                    position: absolute; left: 2px; right: 2px;
                    background: linear-gradient(135deg, #059669, #34d399);
                    border-radius: 5px; opacity: 0.75; font-size: 0.62rem;
                    color: white; padding: 2px 4px; overflow: hidden;
                }

                /* ── Employment sidebar layout ─────────────────────── */
                .ed-emp-layout { display: flex; gap: 0; }
                .ed-emp-sidebar {
                    width: 200px; flex-shrink: 0;
                    border-right: 1px solid var(--ed-border);
                    padding: 4px 0;
                }
                .ed-emp-sidebar-item {
                    display: flex; align-items: center; gap: 9px;
                    padding: 10px 16px; font-size: 0.8rem; font-weight: 500;
                    color: var(--ed-muted); cursor: pointer;
                    border-left: 2px solid transparent; transition: all 0.15s;
                }
                .ed-emp-sidebar-item:hover { color: var(--ed-text); background: var(--ed-surface2); }
                .ed-emp-sidebar-item.active {
                    color: var(--ed-accent); background: #eef2ff;
                    border-left-color: var(--ed-accent);
                }
                .ed-emp-sidebar-item i { font-size: 0.85rem; }
                .ed-emp-content { flex: 1; padding: 8px 24px; min-width: 0; }
            `}</style>

            <div className="ed-wrap">
                <div className="ed-profile-card">

                    {/* ── Header ── */}
                    <div className="ed-profile-header">
                        <div className="ed-avatar-row">
                            <div className="ed-avatar">{initials}</div>
                            <div className="ed-profile-info">
                                <h2 className="ed-profile-name">{fullName}</h2>
                                <div className="ed-profile-meta">
                                    <span
                                        className="ed-badge"
                                        style={{
                                            background: employee.Employee_status === "Active"
                                                ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                                            color: employee.Employee_status === "Active" ? "#6ee7b7" : "#fca5a5",
                                            border: `1px solid ${employee.Employee_status === "Active"
                                                ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`
                                        }}>
                                        <i className={`bi ${employee.Employee_status === "Active" ? "bi-check-circle-fill" : "bi-x-circle-fill"}`} />
                                        {employee.Employee_status || "Active"}
                                    </span>
                                    <span className="ed-badge ed-badge-white">
                                        <i className="bi bi-person-badge" />
                                        {empType}
                                    </span>
                                    {employee.service_type && (
                                        <span className="ed-badge ed-badge-white">
                                            <i className="bi bi-geo-alt" />
                                            {employee.service_type}
                                        </span>
                                    )}
                                    {employee.payroll_no && (
                                        <span className="ed-badge ed-badge-white">
                                            <i className="bi bi-hash" />
                                            {employee.payroll_no}
                                        </span>
                                    )}
                                </div>
                                <div className="ed-sub-info">
                                    {employee.designation && <span><i className="bi bi-briefcase" />{employee.designation}</span>}
                                    {employee.city && <span><i className="bi bi-building" />{employee.city}{employee.state ? `, ${employee.state}` : ""}</span>}
                                    {employee.joining_date && (
                                        <span><i className="bi bi-calendar-check" />
                                            Since {new Date(employee.joining_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                                        </span>
                                    )}
                                    <span><i className="bi bi-person-circle" />ID: {employee.emp_id}</span>
                                </div>
                            </div>
                        </div>

                        {/* ── Tab bar ── */}
                        <div className="ed-tabs">
                            {tabs.map(t => (
                                <button
                                    key={t.key}
                                    className={`ed-tab${activeTab === t.key ? " active" : ""}`}
                                    onClick={() => setActiveTab(t.key)}>
                                    <i className={`bi ${t.icon}`} />
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Tab Body ── */}
                    <div className="ed-tab-body">

                        {/* ═══════════════ OVERVIEW ═══════════════ */}
                        {activeTab === "overview" && (
                            <div>
                                {/* Stat cards */}
                                <div className="ed-stats-row">
                                    <div className="ed-stat-card">
                                        <div className="ed-stat-label">Daily Cap</div>
                                        <div className="ed-stat-value">{employee.max_daily_cap || "—"}h</div>
                                        <div className="ed-stat-sub">Max per day</div>
                                    </div>
                                    <div className="ed-stat-card">
                                        <div className="ed-stat-label">Weekly Cap</div>
                                        <div className="ed-stat-value">{employee.max_weekly_cap || "—"}h</div>
                                        <div className="ed-stat-sub">OT threshold: {employee.ot_weekly_cap || "—"}h</div>
                                    </div>
                                    <div className="ed-stat-card">
                                        <div className="ed-stat-label">Seniority</div>
                                        <div className="ed-stat-value">{employee.seniority ?? "—"}</div>
                                        <div className="ed-stat-sub">Points</div>
                                    </div>
                                    <div className="ed-stat-card">
                                        <div className="ed-stat-label">Emp Role</div>
                                        <div className="ed-stat-value" style={{ fontSize: "0.85rem", marginTop: "3px" }}>
                                            {employee.emp_role || "—"}
                                        </div>
                                        <div className="ed-stat-sub">{employee.job_title || ""}</div>
                                    </div>
                                    <div className="ed-stat-card">
                                        <div className="ed-stat-label">Total Shifts</div>
                                        <div className="ed-stat-value">{shifts.length}</div>
                                        <div className="ed-stat-sub">On record</div>
                                    </div>
                                </div>

                                {/* Contact & Employment Details */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

                                    {/* Contact info */}
                                    <div>
                                        <div className="ed-section-title">Contact</div>
                                        <div className="ed-info-grid">
                                            <div className="ed-info-row">
                                                <div>
                                                    <div className="ed-info-key">Email</div>
                                                    <div className="ed-info-val">{employee.email || "—"}</div>
                                                </div>
                                                <div>
                                                    <div className="ed-info-key">Phone</div>
                                                    <div className="ed-info-val">{employee.phone || "—"}</div>
                                                </div>
                                            </div>
                                            <div className="ed-info-row">
                                                <div>
                                                    <div className="ed-info-key">Address</div>
                                                    <div className="ed-info-val">{employee.address || "—"}</div>
                                                </div>
                                                <div>
                                                    <div className="ed-info-key">City / Province</div>
                                                    <div className="ed-info-val">
                                                        {[employee.city, employee.state, employee.zip].filter(Boolean).join(", ") || "—"}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="ed-info-row">
                                                <div>
                                                    <div className="ed-info-key">Time Zone</div>
                                                    <div className="ed-info-val">{employee.time_zone || "—"}</div>
                                                </div>
                                                <div>
                                                    <div className="ed-info-key">Gender</div>
                                                    <div className="ed-info-val">{employee.gender || "—"}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Employment details */}
                                    <div>
                                        <div className="ed-section-title">Employment</div>
                                        <div className="ed-info-grid">
                                            <div className="ed-info-row">
                                                <div>
                                                    <div className="ed-info-key">Employee Type</div>
                                                    <div className="ed-info-val">{empType}</div>
                                                </div>
                                                <div>
                                                    <div className="ed-info-key">Status</div>
                                                    <div className="ed-info-val" style={{ color: statusColor, fontWeight: 600 }}>
                                                        {employee.Employee_status || "Active"}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="ed-info-row">
                                                <div>
                                                    <div className="ed-info-key">Start Date</div>
                                                    <div className="ed-info-val">
                                                        {employee.joining_date
                                                            ? new Date(employee.joining_date).toLocaleDateString("en-CA")
                                                            : "—"}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="ed-info-key">Payroll #</div>
                                                    <div className="ed-info-val">{employee.payroll_no || "—"}</div>
                                                </div>
                                            </div>
                                            <div className="ed-info-row">
                                                <div>
                                                    <div className="ed-info-key">Supervisor ID</div>
                                                    <div className="ed-info-val">{employee.supervisor_id || "—"}</div>
                                                </div>
                                                <div>
                                                    <div className="ed-info-key">Overtime Rule</div>
                                                    <div className="ed-info-val">{employee.overtime_rule || "—"}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Departments */}
                                        {employee.department?.length > 0 && (
                                            <>
                                                <div className="ed-section-title" style={{ marginTop: 18 }}>Departments / Cross-training</div>
                                                <div className="ed-chips">
                                                    {employee.department.map((d, i) => (
                                                        <span key={i} className="ed-chip">{d}</span>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Capacity section */}
                                <div className="ed-section-title" style={{ marginTop: 28 }}>Capacity Limits</div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                                    {[
                                        { label: "Daily", used: null, cap: employee.max_daily_cap, min: employee.min_daily_cap, sub: `Min: ${employee.min_daily_cap ?? "—"}h` },
                                        { label: "Weekly", used: null, cap: employee.max_weekly_cap, min: employee.min_weekly_cap, sub: `OT threshold: ${employee.ot_weekly_cap ?? "—"}h` },
                                    ].map(c => (
                                        <div key={c.label} className="ed-stat-card">
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                                <span className="ed-stat-label" style={{ margin: 0 }}>{c.label} Capacity</span>
                                                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--ed-text)" }}>{c.cap ?? "—"}h</span>
                                            </div>
                                            <div className="ed-cap-track">
                                                <div className="ed-cap-fill" style={{ width: "0%" }} />
                                            </div>
                                            <div style={{ fontSize: "0.72rem", color: "var(--ed-muted)", marginTop: 5 }}>{c.sub}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ═══════════════ SCHEDULE ═══════════════ */}
                        {activeTab === "schedule" && (
                            <div>
                                <div className="ed-sched-controls">
                                    <label style={{ fontSize: "0.8rem", color: "var(--ed-muted)", fontWeight: 600 }}>Resolution</label>
                                    <select value={resolution} onChange={e => setResolution(Number(e.target.value))}>
                                        <option value={15}>15 min</option>
                                        <option value={30}>30 min</option>
                                        <option value={60}>60 min</option>
                                    </select>
                                    <div className="ed-week-nav">
                                        <button className="ed-week-btn" onClick={() => changeWeek(-1)}>◀</button>
                                        <span className="ed-week-label">{formatRange(weekStart)}</span>
                                        <button className="ed-week-btn" onClick={() => changeWeek(1)}>▶</button>
                                    </div>
                                </div>

                                <div className="ed-schedule-grid">
                                    {/* Header */}
                                    <div className="ed-schedule-header">
                                        <div className="ed-time-col-h" />
                                        {days.map(d => (
                                            <div className="ed-day-col-header" key={d.toISOString()}>
                                                {formatDay(d)}
                                            </div>
                                        ))}
                                    </div>
                                    {/* Body */}
                                    <div className="ed-schedule-body">
                                        <div className="ed-time-col">
                                            {hours.map(h => (
                                                <div className="ed-time-cell" key={h}>{h}</div>
                                            ))}
                                        </div>
                                        {days.map(day => {
                                            const dateKey = day.toISOString().slice(0, 10);
                                            return (
                                                <div className="ed-day-col" key={dateKey}>
                                                    <div className="ed-day-grid">
                                                        <DayColumn day={day} shifts={shifts} />
                                                        {dailyShift
                                                            .filter(ds => ds.shift_date === dateKey)
                                                            .map(ds => {
                                                                const top = getPosition(ds.shift_start_time);
                                                                const height = getPosition(ds.shift_end_time) - top;
                                                                return (
                                                                    <div
                                                                        key={`daily-${ds.shift_id}`}
                                                                        className="ed-daily-shift"
                                                                        style={{ top, height }}>
                                                                        <div style={{ fontWeight: 700 }}>Daily</div>
                                                                        <div>{ds.shift_start_time.slice(11, 16)}–{ds.shift_end_time.slice(11, 16)}</div>
                                                                    </div>
                                                                );
                                                            })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Legend */}
                                <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: "0.75rem", color: "var(--ed-muted)" }}>
                                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <span style={{ width: 12, height: 12, borderRadius: 3, background: "linear-gradient(135deg,#4f46e5,#818cf8)", display: "inline-block" }} />
                                        Client shift
                                    </span>
                                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <span style={{ width: 12, height: 12, borderRadius: 3, background: "linear-gradient(135deg,#059669,#34d399)", display: "inline-block" }} />
                                        Daily shift
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════ EMPLOYMENT ═══════════════ */}
                        {activeTab === "employment" && (
                            <div className="ed-emp-layout">
                                <div className="ed-emp-sidebar">
                                    {employmentSubTabs.map(st => (
                                        <div
                                            key={st.key}
                                            className={`ed-emp-sidebar-item${activeSubTab === st.key ? " active" : ""}`}
                                            onClick={() => setActiveSubTab(st.key)}>
                                            <i className={`bi ${st.icon}`} />
                                            {st.label}
                                        </div>
                                    ))}
                                </div>
                                <div className="ed-emp-content">
                                    {activeSubTab === "availability"      && <EmployeeAvailability emp={employee} />}
                                    {activeSubTab === "unavailability"    && <EmployeeUnavailability emp={employee} />}
                                    {activeSubTab === "custom_pay_rates"  && <EmployeeCustomPayRates emp={employee} />}
                                    {activeSubTab === "attachments"       && <EmployeeAttachments emp={employee} />}
                                    {activeSubTab === "settings"          && <EmployeeEmploymentSettings emp={employee} />}
                                    {activeSubTab === "notification"      && <NotificationSettings emp={employee} />}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </>
    );
};

export default EmployeeDetailsEach;