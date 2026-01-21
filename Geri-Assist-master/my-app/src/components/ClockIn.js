import React, { useEffect, useState } from "react";
import { getEmpId } from "../utils/emp";


export default function ClockIn() {
    const [shift, setShift] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [msg, setMsg] = useState("");
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [taskBusy, setTaskBusy] = useState({});

    const empId = getEmpId();

    // 🔁 Restore state on refresh
    useEffect(() => {
        init();
    }, []);

    async function init() {
        try {
            const res = await fetch(
                `http://127.0.0.1:5000/employee/${empId}/clock-status`
            );
            const data = await res.json();

            if (!res.ok) throw new Error("Failed to load clock status");

            if (data.clocked_in) {
                setShift(data.shift);
                await fetchTasks(data.shift.shift_id);
            }
        } catch (e) {
            setMsg("❌ " + e.message);
        } finally {
            setLoading(false);
        }
    }

    async function fetchTasks(shiftId) {
        const res = await fetch(
            `http://127.0.0.1:5000/tasks?shift_id=${shiftId}`
        );
        const data = await res.json();
        if (res.ok && data.success) setTasks(data.tasks);
    }

    // ✅ CLOCK IN (scheduled → clocked in)
    async function handleClockIn() {
        setBusy(true);
        setMsg("");

        try {
            // 1️⃣ Get today’s assigned shift
            const sRes = await fetch(
                `http://127.0.0.1:5000/employee/${empId}/live-shift`
            );
            const sData = await sRes.json();

            if (!sRes.ok || !sData.live) {
                throw new Error("No shift scheduled for today");
            }

            // 2️⃣ Clock it in
            const clockRes = await fetch(
                "http://127.0.0.1:5000/shift/clock-in",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        emp_id: empId,
                        shift_id: sData.shift.shift_id
                    })
                }
            );

            if (!clockRes.ok) {
                const err = await clockRes.json();
                throw new Error(err.error || "Clock-in failed");
            }

            // 3️⃣ Reload truth
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

        // optimistic UI
        setTasks(prev =>
            prev.map(t =>
                t.task_id === taskId ? { ...t, status: true } : t
            )
        );

        try {
            const res = await fetch(
                "http://127.0.0.1:5000/task/complete",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ task_id: taskId })
                }
            );
            if (!res.ok) throw new Error("Task update failed");
        } catch (e) {
            // rollback
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
                "http://127.0.0.1:5000/shift/clock-out",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        emp_id: empId,
                        shift_id: shift.shift_id
                    })
                }
            );

            if (!res.ok) throw new Error("Clock-out failed");

            setShift(null);
            setTasks([]);
            setMsg("✅ Clocked out");
        } catch (e) {
            setMsg("❌ " + e.message);
        } finally {
            setBusy(false);
        }
    }

    if (loading) {
        return <div className="p-4">Loading…</div>;
    }

    return (
        <div className="p-4">
            <h3>Clock In / Clock Out</h3>

            {!shift && (
                <button
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={handleClockIn}
                >
                    Clock In
                </button>
            )}

            {shift && (
                <>
                    <div className="mb-3">
                        <strong>Shift:</strong> #{shift.shift_id}
                    </div>

                    <table className="table table-bordered">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Task</th>
                                <th className="text-center">Done</th>
                            </tr>
                        </thead>
                        <tbody>
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
                <div className="alert alert-info mt-3">
                    {msg}
                </div>
            )}
        </div>
    );
}
