import React, { useEffect, useState } from "react";

export default function Tasks() {
    const [shifts, setShifts] = useState([]);
    const [shiftId, setShiftId] = useState("");
    const [details, setDetails] = useState("");
    const [msg, setMsg] = useState("");
    const [busy, setBusy] = useState(false);
    const [loadingShifts, setLoadingShifts] = useState(true);

    // 1️⃣ Fetch usable shifts on load (GLOBAL, today)
    useEffect(() => {
        async function fetchShifts() {
            try {
                const res = await fetch(
                    "http://127.0.0.1:5000/shifts-for-tasks"
                );
                const data = await res.json();

                if (!res.ok) {
                    throw new Error("Failed to fetch shifts");
                }

                const allShifts = data.shifts || [];
                setShifts(allShifts);

                // Default to first live shift if present
                if (data.live_shifts && data.live_shifts.length > 0) {
                    setShiftId(String(data.live_shifts[0].shift_id));
                }

            } catch (err) {
                setMsg("❌ Failed to load shifts");
            } finally {
                setLoadingShifts(false);
            }
        }

        fetchShifts();
    }, []);

    // 2️⃣ Submit task
    async function submitTask(e) {
        e.preventDefault();
        setMsg("");
        setBusy(true);

        try {
            const res = await fetch(
                "http://127.0.0.1:5000/task-assign",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        shift_id: Number(shiftId),
                        details
                    })
                }
            );

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || "Task assignment failed");
            }

            setDetails("");
            setMsg("✅ Task assigned successfully");

        } catch (err) {
            setMsg("❌ " + err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="p-4">
            <h3>Assign Task to Shift</h3>

            {loadingShifts ? (
                <p>Loading shifts…</p>
            ) : (
                <form onSubmit={submitTask} style={{ maxWidth: 500 }}>
                    {/* Shift dropdown */}
                    <div className="mb-3">
                        <label className="form-label">Select Shift</label>
                        <select
                            className="form-select"
                            value={shiftId}
                            onChange={(e) => setShiftId(e.target.value)}
                            required
                        >
                            <option value="">Select a shift</option>
                            {shifts.map((shift) => (
                                <option
                                    key={shift.shift_id}
                                    value={shift.shift_id}
                                >
                                    #{shift.shift_id} — Emp {shift.emp_id} — Client {shift.client_id} ({shift.shift_status})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Task description */}
                    <div className="mb-3">
                        <label className="form-label">Task</label>
                        <textarea
                            className="form-control"
                            rows={3}
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            placeholder="Describe the task to be done"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={busy || !shiftId}
                    >
                        {busy ? "Assigning..." : "Assign Task"}
                    </button>

                    {msg && (
                        <div className="mt-3 alert alert-info">
                            {msg}
                        </div>
                    )}
                </form>
            )}
        </div>
    );
}
