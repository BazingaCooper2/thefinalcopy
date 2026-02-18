import React, { useEffect, useState } from "react";
import { getEmpId } from "../utils/emp";
import API_URL from '../config/api';

export default function ClockIn() {
    const [currentShift, setCurrentShift] = useState(null);
    const [availableShifts, setAvailableShifts] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [msg, setMsg] = useState("");
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [taskBusy, setTaskBusy] = useState({});

    const empId = getEmpId();
    
    useEffect(() => {
        if (empId) init();
    }, [empId]);

    if (!empId) return null;

    async function init() {
        try {
            // Check if already clocked into a shift
            const statusRes = await fetch(
                `${API_URL}/employee/${empId}/clock-status`
            );
            const statusData = await statusRes.json();

            if (!statusRes.ok) throw new Error("Failed to load clock status");

            if (statusData.clocked_in) {
                // They're already clocked in - show that shift
                setCurrentShift(statusData.shift);
                await fetchTasks(statusData.shift.shift_id);
            } else {
                // Not clocked in - show available shifts for today
                await fetchAvailableShifts();
            }
        } catch (e) {
            setMsg("❌ " + e.message);
        } finally {
            setLoading(false);
        }
    }

    async function fetchAvailableShifts() {
        try {
            const res = await fetch(
                `${API_URL}/employee/${empId}/today-shifts`
            );
            const data = await res.json();

            if (!res.ok) throw new Error("Failed to load shifts");

            // Filter to only show scheduled shifts (not clocked in/out already)
            const scheduledShifts = data.shifts?.filter(
                s => s.shift_status === "Scheduled"
            ) || [];
            
            setAvailableShifts(scheduledShifts);
        } catch (e) {
            setMsg("❌ " + e.message);
        }
    }

    async function fetchTasks(shiftId) {
        const res = await fetch(
            `${API_URL}/tasks?shift_id=${shiftId}`
        );
        const data = await res.json();
        if (res.ok && data.success) setTasks(data.tasks);
    }

    async function handleClockIn(shiftId) {
        setBusy(true);
        setMsg("");

        try {
            const clockRes = await fetch(
                `${API_URL}/shift/clock-in`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        emp_id: empId,
                        shift_id: shiftId
                    })
                }
            );

            if (!clockRes.ok) {
                const err = await clockRes.json();
                throw new Error(err.error || "Clock-in failed");
            }

            // Reload to show the active shift
            await init();
            setMsg("✅ Clocked in");
        } catch (e) {
            setMsg("❌ " + e.message);
        } finally {
            setBusy(false);
        }
    }

    async function handleTaskComplete(taskId) {
        setTaskBusy(p => ({ ...p, [taskId]: true }));

        // Optimistic UI
        setTasks(prev =>
            prev.map(t =>
                t.task_id === taskId ? { ...t, status: true } : t
            )
        );

        try {
            const res = await fetch(
                `${API_URL}/task-complete`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ task_id: taskId })
                }
            );
            if (!res.ok) throw new Error("Task update failed");
        } catch (e) {
            // Rollback on error
            setTasks(prev =>
                prev.map(t =>
                    t.task_id === taskId ? { ...t, status: false } : t
                )
            );
            setMsg("❌ " + e.message);
        } finally {
            setTaskBusy(p => ({ ...p, [taskId]: false }));
        }
    }

    async function handleClockOut() {
        setBusy(true);
        setMsg("");

        try {
            if (tasks.some(t => !t.status)) {
                throw new Error("Complete all tasks before clocking out");
            }

            const res = await fetch(
                `${API_URL}/shift/clock-out`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        emp_id: empId,
                        shift_id: currentShift.shift_id
                    })
                }
            );

            if (!res.ok) throw new Error("Clock-out failed");

            setCurrentShift(null);
            setTasks([]);
            setMsg("✅ Clocked out");
            
            // Reload to show remaining shifts
            await fetchAvailableShifts();
        } catch (e) {
            setMsg("❌ " + e.message);
        } finally {
            setBusy(false);
        }
    }

    function formatTime(timeStr) {
        if (!timeStr) return "";
        const [hours, minutes] = timeStr.split(":");
        const h = parseInt(hours);
        const ampm = h >= 12 ? "PM" : "AM";
        const displayHour = h % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    }

    if (loading) {
        return <div className="p-4">Loading…</div>;
    }

    return (
        <div className="p-4">
            <h3>Clock In / Clock Out</h3>

            {/* Show shift picker if not clocked in */}
            {!currentShift && availableShifts.length > 0 && (
                <div className="mb-4">
                    <h5>Select a shift to clock in:</h5>
                    <div className="list-group">
                        {availableShifts.map(shift => (
                            <button
                                key={shift.shift_id}
                                className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                                disabled={busy}
                                onClick={() => handleClockIn(shift.shift_id)}
                            >
                                <div>
                                    <strong>Shift #{shift.shift_id}</strong>
                                    <div className="text-muted">
                                        {formatTime(shift.shift_start_time)} - {formatTime(shift.shift_end_time)}
                                    </div>
                                </div>
                                <span className="badge bg-primary">Clock In →</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* No shifts available */}
            {!currentShift && availableShifts.length === 0 && (
                <div className="alert alert-info">
                    No shifts available to clock in right now.
                </div>
            )}

            {/* Currently clocked in - show tasks */}
            {currentShift && (
                <>
                    <div className="alert alert-success mb-3">
                        <strong>🟢 Currently clocked in</strong>
                        <div className="mt-2">
                            <strong>Shift #{currentShift.shift_id}</strong>
                            <br />
                            {formatTime(currentShift.shift_start_time)} - {formatTime(currentShift.shift_end_time)}
                        </div>
                    </div>

                    <h5>Tasks for this shift:</h5>
                    <table className="table table-bordered">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Task</th>
                                <th className="text-center">Done</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="text-center text-muted">
                                        No tasks assigned for this shift
                                    </td>
                                </tr>
                            )}
                            {tasks.map((t, i) => (
                                <tr
                                    key={t.task_id}
                                    className={!t.status ? "table-warning" : ""}
                                >
                                    <td>{i + 1}</td>
                                    <td>{t.details}</td>
                                    <td className="text-center">
                                        <input
                                            type="checkbox"
                                            checked={t.status}
                                            disabled={
                                                t.status ||
                                                taskBusy[t.task_id]
                                            }
                                            onChange={() =>
                                                handleTaskComplete(t.task_id)
                                            }
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <button
                        className="btn btn-outline-secondary"
                        disabled={busy}
                        onClick={handleClockOut}
                    >
                        Clock Out
                    </button>
                </>
            )}

            {msg && (
                <div className={`alert mt-3 ${msg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`}>
                    {msg}
                </div>
            )}
        </div>
    );
}