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


const EmployeeDetailsEach = () => {
    const { id } = useParams();

    const [employee, setEmployee] = useState(null);
    const [shifts, setShifts] = useState([]);
    const [dailyShift, setDailyShift] = useState([]);

    const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
    const [resolution, setResolution] = useState(15);

    // ---------------- FETCH EMPLOYEE DATA ----------------
    useEffect(() => {
        fetch(`http://127.0.0.1:5000/employees/${id}`)
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
    //const currentDate = new Date().toISOString().slice(0, 10);

    // ---------------- UTILITIES ----------------

    function toMinutesOfDay(str) {
        if (!str) return 0;

        let timePart = str.includes("T")
            ? str.split("T")[1]
            : str.includes(" ")
                ? str.split(" ")[1]
                : str;

        const [h, m] = timePart.split(":").map(Number);
        return h * 60 + m;
    }

    function getPosition(timeStr) {
        const minutes = toMinutesOfDay(timeStr);
        return minutes - 7 * 60; // 7:00 AM baseline
    }

    function dailyShiftSegments(shift) {
        const start = toMinutesOfDay(shift.shift_start_time);
        const end = toMinutesOfDay(shift.shift_end_time);
        return [
            {
                type: "daily_shift",
                span: end - start,
                item: shift,
            },
        ];
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
        const diff = date.getDate() - day;
        return new Date(date.setDate(diff));
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
        return date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
        });
    }

    function formatRange(start) {
        const end = new Date(start);
        end.setDate(start.getDate() + 13);
        return `${formatDay(start)} – ${formatDay(end)}`;
    }

    // ---------------- DAY COLUMN COMPONENT ----------------
    function DayColumn({ day, shifts }) {
        const dayStr = day.toISOString().slice(0, 10);

        const todaysShifts = shifts.filter(
            (s) => s.shift_start_time.slice(0, 10) === dayStr
        );

        return (
            <div className="column-container">
                {todaysShifts.map((shift) => {
                    const top = getPosition(shift.shift_start_time);
                    const height = getPosition(shift.shift_end_time) - top;

                    return (

                        //<div
                        //    className="shift-block bg-primary bg-opacity-75 text-white rounded p-1"
                        //    style={{ top, height }}
                        //    key={shift.shift_id}>
                            <OverlayTrigger
                                placement="top"
                                overlay={
                                    <Tooltip>
                                        {shift.shift_start_time.slice(11, 16)} – {shift.shift_end_time.slice(11, 16)}
                                        <br />
                                        Client ID: {shift.client_id}
                                    </Tooltip>
                                }>
                                <div
                                    className="shift-block bg-primary text-white rounded"
                                    style={{
                                        top,
                                        height,
                                        zIndex: 10,
                                        position: "absolute",
                                        cursor: "pointer",
                                        opacity: 0.9
                                    }}
                                ></div>
                            </OverlayTrigger>

                        //    <div className="fw-bold" >
                        //        {shift.shift_start_time.slice(11, 16)} – {shift.shift_end_time.slice(11, 16)}
                        //    </div>
                        //    <div>Client: {shift.client_id}</div>
                        //</div>
                    );

                })}
            </div>
        );
    }

    // ---------------- TAB STATE ----------------
    const [showtab, setShowtab] = useState({
        overview: true,
        demographics: false,
        skills: false,
        forms: false,
        schedule: false,
        timesheet: false,
        employment: false,
        tasks: false,
        clients: false,
    });
    const [showsubtab, setShowsubtab] = useState({
        employee_notes: false,
        contacts: false,
        ratings: false,
        contact_tracking: false,
        attachments: true,
        custom_pay_rates: false,
        availability: true,
        unavailability: false,
        settings: false,
        notification: false,
    });

    const handleShow = (tab) => {
        setShowtab((prev) => {
            const reset = Object.fromEntries(Object.keys(prev).map((k) => [k, false]));
            return { ...reset, [tab]: true };
        });
    };
    const handleShowsub = (tab) => {
        setShowsubtab((prev) => {
            const reset = Object.fromEntries(Object.keys(prev).map((k) => [k, false]));
            return { ...reset, [tab]: true };
        });
    };

    // ---------------- RENDER ----------------

    if (!employee) return <div className="text-center mt-5">Loading…</div>;

    return (
        <div className="container my-4">

            {/* PROFILE HEADER */}
            <div className="employee-profile shadow-sm p-4 mt-4">
                <div className="d-flex align-items-center">
                    <img
                        src="https://via.placeholder.com/80"
                        className="rounded-circle me-3"
                        alt="Employee"
                    />
                    <div>
                        <h3 className="fw-bold">
                            {employee.first_name} {employee.last_name}
                        </h3>
                        <span className="badge bg-success">{employee.status}</span>
                        <div className="text-muted small mt-2">
                            {employee.designation} • {employee.city} •{" "}
                            {employee.service_type} • <strong>Emp ID:</strong>{" "}
                            {employee.emp_id}
                        </div>
                    </div>
                </div>

                {/* TABS */}
                <div className="mt-4 border-bottom pb-2 d-flex gap-4 fw-semibold">
                    {[
                        "overview",
                        "demographics",
                        "clients",
                        "skills",
                        "forms",
                        "schedule",
                        "timesheet",
                        "employment",
                        "tasks",
                    ].map((tab) => (
                        <span
                            key={tab}
                            className={`tab ${showtab[tab] ? "text-primary border-bottom" : ""}`}
                            style={{ cursor: "pointer" }}
                            onClick={() => handleShow(tab)}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </span>
                    ))}
                </div>

                {/* ------------------ SCHEDULE TAB ------------------ */}
                {showtab.schedule && (
                    <div className="d-flex flex-column mt-4">

                        {/* CONTROLS */}
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <select
                                className="form-select form-select-sm"
                                style={{ width: 110 }}
                                value={resolution}
                                onChange={(e) => setResolution(Number(e.target.value))}
                            >
                                <option value={15}>15 min</option>
                                <option value={30}>30 min</option>
                                <option value={60}>60 min</option>
                            </select>

                            <button className="btn btn-outline-primary" onClick={() => changeWeek(-1)}>
                                ◀
                            </button>
                            <span className="fw-bold">{formatRange(weekStart)}</span>
                            <button className="btn btn-outline-primary" onClick={() => changeWeek(1)}>
                                ▶
                            </button>
                        </div>

                        {/* SCHEDULE GRID */}
                        <div className="schedule-grid">

                            {/* DAY HEADERS */}
                            <div className="schedule-header">
                                <div className="time-col"></div>
                                {days.map((d) => (
                                    <div className="day-col" key={d.toISOString()}>
                                        {formatDay(d)}
                                    </div>
                                ))}
                            </div>

                            {/* BODY */}
                            <div className="schedule-body">
                                <div className="time-col">
                                    {hours.map((h) => (
                                        <div className="time-cell" key={h}>
                                            {h}
                                        </div>
                                    ))}
                                </div>

                                {days.map((day) => (
                                    <div className="day-col" key={day.toISOString()}>
                                        <DayColumn day={day} shifts={shifts} />

                                        {/* DAILY SHIFT BLOCK */}
                                        {dailyShift
                                            .filter((ds) => ds.shift_date === day.toISOString().slice(0, 10))
                                            .flatMap((ds) => dailyShiftSegments(ds))
                                            .map((seg, idx) => (
                                                <div
                                                    key={`ds-${idx}`}
                                                    className="shift-block bg-info bg-opacity-25 rounded"
                                                    style={{
                                                        top: getPosition(seg.item.shift_start_time),
                                                        height:
                                                            getPosition(seg.item.shift_end_time) -
                                                            getPosition(seg.item.shift_start_time),
                                                        zIndex: 1,         // 🔥 Push it behind client shifts
                                                        position: "absolute"
                                                    }}
                                                >
                                                    <strong className="text-primary">Daily Shift</strong><br></br>
                                                    <span>{seg.item.shift_start_time} - {seg.item.shift_end_time}</span>
                                                </div>

                                            ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                {showtab.overview && (
                    <div>
                    <div className="d-flex align-items-center">
                    <img
                        src="https://via.placeholder.com/80"
                        className="rounded-circle me-3"
                        alt="Employee"
                    />
                    <div>
                        <h5 className="fw-bold">
                            {employee.first_name} {employee.last_name}
                        </h5>
                        <div className="text-muted small mt-2">
                            {employee.designation}</div>
                        <div className="text-muted small mt-2">{employee.city}</div>
                        <div className="text-muted small mt-2">{employee.service_type}</div>
                        <div className="text-muted small mt-2"><strong>Emp ID:</strong>{employee.emp_id}</div>
                        
                    </div>
                </div>
                    <div className="mt-2 border-bottom pb-1 d-flex gap-3 fw">
                        {[
                            "employee_notes",
                            "contacts",
                            "ratings",
                            "attachments",
                            "contact_tracking",
                        ].map((tab2) => (
                            <span
                                key={tab2}
                                className={`tab ${showsubtab[tab2] ? "text-primary border-bottom" : ""}`}
                                style={{ cursor: "pointer" }}
                                onClick={() => handleShowsub(tab2)}
                            >
                                {tab2.charAt(0).toUpperCase() + tab2.slice(1)}
                            </span>
                        ))}</div>  
                    </div>
                )}
                {showtab.overview && showsubtab.attachments && <EmployeeAttachments emp={employee} />}
                {showtab.employment  && <div className="d-flex mt-4">

                    {/* LEFT SIDEBAR */}
                    <div className="border-end pe-4" style={{ width: "220px" }}>
                        {/*<div className="fw mb-2">Custom Pay Rates</div>*/}
                        {/*<div className="fw text-primary mb-2">Unavailability</div>*/}
                        {/*<div className="fw mb-2">Availability</div>*/}
                        {/*<div className="fw mb-2">Employment Settings</div>*/}
                        {/*<div className="fw mb-2">Notification Settings</div>*/}
                        {[
                            "custom_pay_rates",
                            "availability",
                            "unavailability",
                            "settings",
                            "notification",
                        ].map((tab3) => (
                            <div
                                key={tab3}
                                className={`tab ${showsubtab[tab3] ? "fw mb-2 text-primary border-bottom" : "fw mb-2"}`}
                                style={{ cursor: "pointer" }}
                                onClick={() => handleShowsub(tab3)}
                            >
                                {tab3.charAt(0).toUpperCase() + tab3.slice(1)}
                            </div>
                        ))}
                    </div>

                    {/* RIGHT CONTENT */}
                    <div className="flex-grow-1 ps-4">
                        {showtab.employment && showsubtab.custom_pay_rates && <EmployeeCustomPayRates emp={employee} />}
                        {showtab.employment && showsubtab.unavailability && <EmployeeUnavailability emp={employee} />}
                        {showtab.employment && showsubtab.availability && <EmployeeAvailability emp={employee} />}
                        {showtab.employment && showsubtab.settings && <EmployeeEmploymentSettings emp={employee} />}
                        {showtab.employment && showsubtab.notification && <NotificationSettings emp={employee} />}
                    </div>
                </div>}


            </div>
        </div>
    );
};

export default EmployeeDetailsEach;
