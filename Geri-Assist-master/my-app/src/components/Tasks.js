import React, { useEffect, useState } from "react";
import API_URL from '../config/api';

export default function Tasks() {
    const [tasks, setTasks] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [shiftId, setShiftId] = useState("");
    const [details, setDetails] = useState("");
    const [msg, setMsg] = useState("");
    const [busy, setBusy] = useState(false);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [filterStatus, setFilterStatus] = useState("all"); // all, pending, completed
    const [showAssignForm, setShowAssignForm] = useState(false);

    // Edit state
    const [editingTask, setEditingTask] = useState(null);
    const [editDetails, setEditDetails] = useState("");

    // Initial Data Fetch
    useEffect(() => {
        fetchTasks();
        fetchShifts();
    }, []);

    // Fetch Tasks
    async function fetchTasks() {
        try {
            setLoadingTasks(true);
            const res = await fetch(`${API_URL}/tasks?status=${filterStatus === 'all' ? '' : filterStatus}`);
            const data = await res.json();
            if (data.success) {
                setTasks(data.tasks);
            }
        } catch (err) {
            console.error("Failed to load tasks", err);
        } finally {
            setLoadingTasks(false);
        }
    }

    // Reload tasks when filter changes
    useEffect(() => {
        fetchTasks();
    }, [filterStatus]);

    // Fetch Shifts for Dropdown
    async function fetchShifts() {
        try {
            const res = await fetch(`${API_URL}/shifts-for-tasks`);
            const data = await res.json();
            if (data.shifts) {
                setShifts(data.shifts);
                if (data.live_shifts?.length > 0 && !shiftId) {
                    setShiftId(String(data.live_shifts[0].shift_id));
                }
            }
        } catch (err) {
            console.error("Failed to load shifts", err);
        }
    }

    const [title, setTitle] = useState("");

    // Submit Task
    async function submitTask(e) {
        e.preventDefault();
        setMsg("");
        setBusy(true);

        // Combine title and details since backend only has 'details'
        const fullDetails = title ? `**${title}**\n${details}` : details;

        try {
            const res = await fetch(`${API_URL}/task-assign`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    shift_id: Number(shiftId),
                    details: fullDetails
                })
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || "Task assignment failed");
            }

            setDetails("");
            setTitle(""); // Reset title
            setMsg("✅ Task assigned successfully");
            fetchTasks(); // Refresh list immediately
            setTimeout(() => setMsg(""), 3000);

        } catch (err) {
            setMsg("❌ " + err.message);
        } finally {
            setBusy(false);
        }
    }

    // Delete Task
    async function deleteTask(taskId) {
        if (!window.confirm("Are you sure you want to delete this task?")) return;

        try {
            const res = await fetch(`${API_URL}/task-delete?task_id=${taskId}`, {
                method: "DELETE"
            });
            const data = await res.json();

            if (data.success) {
                fetchTasks();
            } else {
                alert("Failed to delete task: " + data.message);
            }
        } catch (err) {
            console.error(err);
            alert("Error deleting task");
        }
    }

    // Start Editing
    const handleEditClick = (task) => {
        setEditingTask(task);
        setEditDetails(task.details);
    };

    // Save Edit
    async function saveEdit() {
        if (!editingTask) return;

        try {
            const res = await fetch(`${API_URL}/task-update`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    task_id: editingTask.task_id,
                    details: editDetails
                })
            });
            const data = await res.json();

            if (data.success) {
                setEditingTask(null);
                setEditDetails("");
                fetchTasks();
            } else {
                alert("Failed to update task: " + data.message);
            }
        } catch (err) {
            console.error(err);
            alert("Error updating task");
        }
    }

    // Format Date Helper
    const formatDate = (isoString) => {
        if (!isoString) return "N/A";
        return new Date(isoString).toLocaleString('en-US', {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="container-fluid p-4 animate-fadeIn" style={{ background: '#f8fafc', minHeight: '100vh' }}>

            {/* Header Section */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold text-dark mb-1">
                        <i className="bi bi-clipboard-check me-2 text-primary"></i>
                        Task Management
                    </h2>
                    <p className="text-muted mb-0">Monitor tasks and assign new ones to employee shifts</p>
                </div>
                <button
                    className={`btn ${showAssignForm ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => setShowAssignForm(!showAssignForm)}
                >
                    <i className={`bi ${showAssignForm ? 'bi-x-lg' : 'bi-plus-lg'} me-2`}></i>
                    {showAssignForm ? "Close Form" : "Assign New Task"}
                </button>
            </div>

            <div className="row g-4">

                {/* Left Column: Task List */}
                <div className={showAssignForm ? "col-lg-8" : "col-12"}>
                    <div className="card border-0 shadow-sm">
                        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                            <h5 className="fw-bold mb-0 text-dark">Task List</h5>

                            {/* Filter Controls */}
                            <div className="btn-group btn-group-sm">
                                <button
                                    className={`btn ${filterStatus === 'all' ? 'btn-dark' : 'btn-outline-secondary'}`}
                                    onClick={() => setFilterStatus('all')}
                                >
                                    All
                                </button>
                                <button
                                    className={`btn ${filterStatus === 'pending' ? 'btn-warning' : 'btn-outline-secondary'}`}
                                    onClick={() => setFilterStatus('pending')}
                                >
                                    Pending
                                </button>
                                <button
                                    className={`btn ${filterStatus === 'completed' ? 'btn-success' : 'btn-outline-secondary'}`}
                                    onClick={() => setFilterStatus('completed')}
                                >
                                    Completed
                                </button>
                            </div>
                        </div>

                        <div className="card-body p-0">
                            {loadingTasks ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary" role="status"></div>
                                    <p className="mt-2 text-muted">Loading tasks...</p>
                                </div>
                            ) : tasks.length === 0 ? (
                                <div className="text-center py-5">
                                    <i className="bi bi-clipboard-x text-muted" style={{ fontSize: '3rem' }}></i>
                                    <p className="mt-3 text-muted">No tasks found for this filter.</p>
                                </div>
                            ) : (
                                <div className="list-group list-group-flush">
                                    {tasks.map((task) => (
                                        <div key={task.task_id} className="list-group-item p-3 task-item">
                                            <div className="d-flex justify-content-between align-items-start">
                                                <div className="flex-grow-1">
                                                    <div className="d-flex align-items-center gap-2 mb-1">
                                                        <span className="badge bg-light text-dark border">#{task.task_code || task.task_id}</span>
                                                        <span className={`badge ${task.status ? 'bg-success' : 'bg-warning text-dark'}`}>
                                                            {task.status ? 'Completed' : 'Pending'}
                                                        </span>
                                                        <span className="small text-muted">
                                                            <i className="bi bi-clock me-1"></i>
                                                            {formatDate(task.task_created)}
                                                        </span>
                                                    </div>
                                                    <p className="mb-2 fw-medium text-dark lead fs-6">
                                                        {task.details}
                                                    </p>
                                                    <div className="small text-muted">
                                                        <i className="bi bi-calendar-event me-1"></i> Shift #{task.shift_id}
                                                        {task.task_completed && (
                                                            <span className="ms-3 text-success">
                                                                <i className="bi bi-check-circle-fill me-1"></i>
                                                                Completed: {formatDate(task.task_completed)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="d-flex gap-2 ms-3">
                                                    <button
                                                        className="btn btn-outline-primary btn-sm"
                                                        onClick={() => handleEditClick(task)}
                                                        title="Edit Task"
                                                    >
                                                        <i className="bi bi-pencil"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-outline-danger btn-sm"
                                                        onClick={() => deleteTask(task.task_id)}
                                                        title="Delete Task"
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Assign Form (Conditional) */}
                {showAssignForm && (
                    <div className="col-lg-4 animate-slideLeft">
                        <div className="card border-0 shadow-sm sticky-top" style={{ top: '20px' }}>
                            <div className="card-header bg-primary text-white">
                                <h5 className="mb-0 fw-bold"><i className="bi bi-plus-circle me-2"></i>Assign New Task</h5>
                            </div>
                            <div className="card-body p-4">
                                <form onSubmit={submitTask}>

                                    {/* Shift Selection */}
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Select Active Shift</label>
                                        <select
                                            className="form-select border-primary"
                                            value={shiftId}
                                            onChange={(e) => setShiftId(e.target.value)}
                                            required
                                        >
                                            <option value="">-- Choose Active Shift --</option>
                                            {shifts.length > 0 ? (
                                                shifts.map((shift) => (
                                                    <option key={shift.shift_id} value={shift.shift_id}>
                                                        #{shift.shift_id} • Emp: {shift.emp_id} • Client: {shift.client_id} ({shift.shift_status})
                                                    </option>
                                                ))
                                            ) : (
                                                <option disabled>No active shifts found for today</option>
                                            )}
                                        </select>
                                        <div className="form-text text-muted small">
                                            <i className="bi bi-info-circle me-1"></i>
                                            Showing scheduled & clocked-in shifts for today.
                                        </div>
                                    </div>

                                    {/* Task Title (New) */}
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Task Title</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="e.g., Administer Medication"
                                            required
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                        />
                                        <div className="form-text">Will be saved as part of the task details.</div>
                                    </div>

                                    {/* Task Priority (Visual only for now unless DB supported) */}
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Priority</label>
                                        <div className="btn-group w-100" role="group">
                                            <input type="radio" className="btn-check" name="priority" id="prio-low" autoComplete="off" defaultChecked />
                                            <label className="btn btn-outline-success" htmlFor="prio-low">Low</label>

                                            <input type="radio" className="btn-check" name="priority" id="prio-med" autoComplete="off" />
                                            <label className="btn btn-outline-warning text-dark" htmlFor="prio-med">Medium</label>

                                            <input type="radio" className="btn-check" name="priority" id="prio-high" autoComplete="off" />
                                            <label className="btn btn-outline-danger" htmlFor="prio-high">High</label>
                                        </div>
                                    </div>

                                    {/* Detailed Description */}
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Task Description & Instructions</label>
                                        <textarea
                                            className="form-control"
                                            rows={5}
                                            value={details}
                                            onChange={(e) => setDetails(e.target.value)}
                                            placeholder=" detailed instructions for the employee..."
                                            required
                                            style={{ resize: 'none' }}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-primary w-100 fw-bold py-2 shadow-sm"
                                        disabled={busy || !shiftId}
                                    >
                                        {busy ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                Assigning...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-send-plus-fill me-2"></i> Assign Task
                                            </>
                                        )}
                                    </button>

                                    {msg && (
                                        <div className={`mt-3 alert ${msg.includes('❌') ? 'alert-danger' : 'alert-success'} text-center mb-0 p-2 small`}>
                                            {msg}
                                        </div>
                                    )}
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Modal / Overlay */}
            {editingTask && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header bg-light">
                                <h5 className="modal-title fw-bold">Edit Task</h5>
                                <button type="button" className="btn-close" onClick={() => setEditingTask(null)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <div className="mb-3">
                                    <label className="form-label fw-bold">Task Details</label>
                                    <textarea
                                        className="form-control"
                                        rows={6}
                                        value={editDetails}
                                        onChange={(e) => setEditDetails(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setEditingTask(null)}>Cancel</button>
                                <button type="button" className="btn btn-primary" onClick={saveEdit}>Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
